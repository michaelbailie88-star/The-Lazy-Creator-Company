// .github/scripts/notify-new-post.js
//
// Run by .github/workflows/notify-new-blog-post.yml on every push to main
// that touches content/blog-posts.json. Compares the current version of
// that file against the version at HEAD^ (the commit before this push).
// Any post whose slug exists now but didn't before is treated as newly
// published, and triggers a real Brevo campaign send to the blog
// subscriber list -- this is what makes "get new posts by email" (the
// promise on blog.html) actually true, rather than just a one-time
// welcome message.
//
// Requires these GitHub Actions repository secrets:
//   BREVO_API_KEY     — same key used by the Netlify functions
//   BREVO_BLOG_LIST_ID — numeric ID of the Brevo list this sends to
//
// If there is no previous version to diff against (e.g. the very first
// commit that ever added this file), nothing is sent -- there's no way to
// know what counts as "new" with no prior state, and we'd rather stay
// silent than accidentally blast every existing post as if it were new.

const { execSync } = require('child_process');

const SENDER = { name: 'The Lazy Creator Co', email: 'thelazycreatorco@gmail.com' };
const SITE = 'https://thelazycreatorcompany.com';
const BLUE = '#0F6E96';
const FILE_PATH = 'content/blog-posts.json';

function getPreviousFileContent() {
  try {
    return execSync(`git show HEAD^:${FILE_PATH}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
  } catch (err) {
    // No parent commit, or the file didn't exist at HEAD^ -- either way,
    // there's nothing safe to diff against.
    console.log('No previous version of blog-posts.json to compare against. Skipping (nothing to treat as "new").');
    return null;
  }
}

function stripMarkdown(text) {
  return text
    .replace(/\\\n/g, ' ')            // explicit markdown line breaks
    .replace(/#{1,6}\s*/g, '')        // headers
    .replace(/\*\*(.+?)\*\*/g, '$1')  // bold
    .replace(/\*(.+?)\*/g, '$1')      // italic
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links -> just the text
    .replace(/\s+/g, ' ')             // collapse whitespace/newlines
    .trim();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function excerpt(body, maxLen = 320) {
  const clean = stripMarkdown(body || '');
  const truncated = clean.length <= maxLen ? clean : clean.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
  return escapeHtml(truncated);
}

function notificationEmailHtml(post) {
  const postUrl = `${SITE}/blog.html#post-${post.slug}`;
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="background-color:#111318;padding:28px 40px;text-align:center;">
              <span style="color:#ffffff;font-size:15px;font-weight:bold;letter-spacing:0.03em;">THE LAZY CREATOR COMPANY</span>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 8px 40px;">
              <p style="margin:0 0 6px 0;color:${BLUE};font-size:12px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;">New Post</p>
              <h1 style="margin:0 0 18px 0;color:#1a1a1a;font-size:26px;line-height:1.3;">${escapeHtml(post.title)}</h1>
              <div style="color:#333333;font-size:15px;line-height:1.6;">
                <p>${excerpt(post.body)}</p>
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 8px 0;">
                <tr>
                  <td style="background-color:${BLUE};border-radius:8px;">
                    <a href="${postUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;">Read the Full Post &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 32px 40px;border-top:1px solid #eeeeee;">
              <p style="color:#999999;font-size:12px;margin:0;">The Lazy Creator Company &middot; thelazycreatorcompany.com<br>
              You're receiving this because you subscribed to blog updates at thelazycreatorcompany.com. {{unsubscribe}}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendCampaign(post, apiKey, listId) {
  const createRes = await fetch('https://api.brevo.com/v3/emailCampaigns', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      name: `New post: ${post.title} (${post.slug})`,
      subject: `New post: ${post.title}`,
      sender: SENDER,
      type: 'classic',
      htmlContent: notificationEmailHtml(post),
      recipients: { listIds: [listId] },
    }),
  });

  if (!createRes.ok) {
    const body = await createRes.text();
    throw new Error(`Brevo campaign create failed (${createRes.status}): ${body}`);
  }
  const created = await createRes.json();
  const campaignId = created.id;
  console.log(`Created campaign ${campaignId} for post "${post.title}"`);

  const sendRes = await fetch(`https://api.brevo.com/v3/emailCampaigns/${campaignId}/sendNow`, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      Accept: 'application/json',
    },
  });

  if (!sendRes.ok) {
    const body = await sendRes.text();
    throw new Error(`Brevo campaign send failed (${sendRes.status}) for campaign ${campaignId}: ${body}`);
  }
  console.log(`Sent campaign ${campaignId} for post "${post.title}"`);
}

async function main() {
  const apiKey = process.env.BREVO_API_KEY;
  const listId = parseInt(process.env.BREVO_BLOG_LIST_ID, 10);

  if (!apiKey) throw new Error('BREVO_API_KEY is not set');
  if (!listId || Number.isNaN(listId)) throw new Error('BREVO_BLOG_LIST_ID is not set or not numeric');

  const currentRaw = require('fs').readFileSync(FILE_PATH, 'utf-8');
  const current = JSON.parse(currentRaw);
  const currentPosts = current.posts || [];

  const previousRaw = getPreviousFileContent();
  if (previousRaw === null) {
    console.log('Nothing to do.');
    return;
  }

  let previousPosts = [];
  try {
    previousPosts = JSON.parse(previousRaw).posts || [];
  } catch (err) {
    console.log('Previous version of blog-posts.json was not valid JSON. Treating as no prior state -- skipping.');
    return;
  }

  const previousSlugs = new Set(previousPosts.map((p) => p.slug).filter(Boolean));
  const newPosts = currentPosts.filter((p) => p.slug && !previousSlugs.has(p.slug));

  if (newPosts.length === 0) {
    console.log('No new posts detected (blog-posts.json changed, but no new slugs found). Nothing to send.');
    return;
  }

  console.log(`Found ${newPosts.length} new post(s): ${newPosts.map((p) => p.slug).join(', ')}`);

  for (const post of newPosts) {
    await sendCampaign(post, apiKey, listId);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
