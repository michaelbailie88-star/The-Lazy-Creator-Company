// netlify/functions/submit-listing.js
//
// Receives the Creator Marketplace submission form. Writes a "pending"
// entry to content/marketplace-pending.json in the GitHub repo. It does
// NOT go live yet — that happens in stripe-webhook.js once the matching
// payment comes in, matched by email.
//
// Also sends a notification email to the site owner (Michael) via Brevo
// so new applications don't sit unnoticed in the GitHub pending file.
// Applicants are redirected straight to the payment page after submitting,
// so this is the only way to know a new (possibly paid) listing needs
// review.
//
// Requires these Netlify environment variables:
//   GITHUB_TOKEN    — a token with repo write access (Contents API)
//   GITHUB_REPO     — "owner/repo", e.g. "michaelbailie88-star/The-Lazy-Creator-Company"
//   BREVO_API_KEY   — same key used by send-lead-magnet.js / subscribe-newsletter.js
//
// If BREVO_API_KEY is missing or the email send fails, the submission is
// still recorded in GitHub as before -- the notification is a nice-to-have
// on top of the core save, not a dependency for it.

const OWNER_EMAIL = 'thelazycreatorco@gmail.com';
const SENDER = { name: 'The Lazy Creator Co', email: OWNER_EMAIL };
const GOLD = '#B08A2E';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function notificationEmailHtml(entry) {
  const rows = [
    ['Creator', entry.creatorName],
    ['Email', entry.creatorEmail],
    ['Social', entry.creatorSocial],
    ['Product', entry.productName],
    ['Price', entry.productPrice],
    ['Link', entry.productLink],
    ['Why it fits', entry.whyFits],
  ];
  const rowsHtml = rows.map(([label, value]) => `
    <tr>
      <td style="padding:8px 12px;color:#888;font-size:13px;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>
      <td style="padding:8px 12px;color:#1a1a1a;font-size:14px;">${escapeHtml(value)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="background-color:#111318;padding:28px 40px;text-align:center;">
              <span style="color:#ffffff;font-size:15px;font-weight:bold;letter-spacing:0.03em;">THE LAZY CREATOR COMPANY</span>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 8px 40px;">
              <p style="margin:0 0 6px 0;color:${GOLD};font-size:12px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;">New Marketplace Application</p>
              <h1 style="margin:0 0 18px 0;color:#1a1a1a;font-size:24px;line-height:1.3;">${escapeHtml(entry.productName)}</h1>
              <div style="color:#333333;font-size:15px;line-height:1.6;">
                <p>${escapeHtml(entry.productDesc)}</p>
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:1px solid #eeeeee;">
                ${rowsHtml}
              </table>
              <p style="color:#888888;font-size:12px;margin:18px 0 0 0;">Recorded to content/marketplace-pending.json. Goes live once matching payment arrives via the Stripe webhook.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendOwnerNotification(entry) {
  if (!process.env.BREVO_API_KEY) {
    console.error('submit-listing: BREVO_API_KEY missing, skipping owner notification');
    return;
  }
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: SENDER,
        to: [{ email: OWNER_EMAIL }],
        subject: `New Marketplace application: ${entry.productName}`,
        htmlContent: notificationEmailHtml(entry),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`submit-listing: Brevo email API ${res.status}: ${body}`);
    }
  } catch (err) {
    console.error('submit-listing: owner notification error:', err);
  }
}

const GITHUB_API = 'https://api.github.com';
const PENDING_PATH = 'content/marketplace-pending.json';
const BRANCH = 'main';

async function githubRequest(path, options = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body}`);
  }
  return res.json();
}

async function getFile(repoPath) {
  try {
    const data = await githubRequest(`/repos/${process.env.GITHUB_REPO}/contents/${repoPath}?ref=${BRANCH}`);
    const content = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
    return { content, sha: data.sha };
  } catch (err) {
    if (String(err.message).includes('404')) return { content: { entries: [] }, sha: null };
    throw err;
  }
}

async function putFile(repoPath, contentObj, sha, message) {
  const body = {
    message,
    content: Buffer.from(JSON.stringify(contentObj, null, 2)).toString('base64'),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;
  return githubRequest(`/repos/${process.env.GITHUB_REPO}/contents/${repoPath}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const required = ['creatorName', 'creatorEmail', 'creatorSocial', 'productName', 'productDesc', 'productPrice', 'productLink', 'whyFits', 'agreedToTerms'];
  const missing = required.filter((k) => !data[k]);
  if (missing.length) {
    return { statusCode: 400, body: JSON.stringify({ error: `Missing fields: ${missing.join(', ')}` }) };
  }
  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured (missing GITHUB_TOKEN/GITHUB_REPO)' }) };
  }

  try {
    const { content, sha } = await getFile(PENDING_PATH);
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      submittedAt: new Date().toISOString(),
      creatorName: data.creatorName,
      creatorEmail: data.creatorEmail.trim().toLowerCase(),
      creatorSocial: data.creatorSocial,
      productName: data.productName,
      productDesc: data.productDesc,
      productPrice: data.productPrice,
      productLink: data.productLink,
      whyFits: data.whyFits,
    };
    content.entries = content.entries || [];
    content.entries.push(entry);
    await putFile(PENDING_PATH, content, sha, `Marketplace: pending submission from ${entry.creatorName}`);

    await sendOwnerNotification(entry);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, message: 'Submission recorded. Pay to activate your listing.' }),
    };
  } catch (err) {
    console.error('submit-listing error:', err);
    return { statusCode: 502, body: JSON.stringify({ error: 'Could not record submission. Try again shortly.' }) };
  }
};
