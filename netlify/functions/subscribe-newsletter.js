// netlify/functions/subscribe-newsletter.js
//
// Called from the newsletter forms on index.html (newsletter-home) and
// blog.html (newsletter-blog), in addition to the existing native Netlify
// Forms submission (which still records to the dashboard as before).
// Netlify Forms only ever stores the submission -- it never adds the
// person to a real mailing list or emails them anything. This function is
// what actually does both: adds the contact to a real Brevo list (so
// future broadcast emails can reach them) and sends an immediate welcome
// email via Brevo's transactional email API.
//
// Requires these Netlify environment variables:
//   BREVO_API_KEY            — same key used by send-lead-magnet.js
//   BREVO_NEWSLETTER_LIST_ID — the numeric ID of the Brevo list to add
//                              subscribers to (Contacts -> Lists in Brevo;
//                              the list must already exist)
//
// Verified sender (must stay a verified sender in the Brevo account):
//   The Lazy Creator Co <thelazycreatorco@gmail.com>

const SENDER = { name: 'The Lazy Creator Co', email: 'thelazycreatorco@gmail.com' };
const SITE = 'https://thelazycreatorcompany.com';
const GOLD = '#B08A2E';

const SOURCES = new Set(['home', 'blog']);

function welcomeEmailHtml() {
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
              <p style="margin:0 0 6px 0;color:${GOLD};font-size:12px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;">You're In</p>
              <h1 style="margin:0 0 18px 0;color:#1a1a1a;font-size:26px;line-height:1.3;">Welcome to the list</h1>
              <div style="color:#333333;font-size:15px;line-height:1.6;">
                <p>No spam, no daily emails &mdash; just launches and new posts as they happen, same as it says on the site.</p>
                <p>While you're here, there are six free resources you can grab right now &mdash; prayers, guides, and a case study, no strings attached.</p>
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 8px 0;">
                <tr>
                  <td style="background-color:${GOLD};border-radius:8px;">
                    <a href="${SITE}/resources.html" style="display:inline-block;padding:14px 28px;color:#111318;font-size:15px;font-weight:bold;text-decoration:none;">Browse Free Resources &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 32px 40px;border-top:1px solid #eeeeee;">
              <p style="color:#999999;font-size:12px;margin:0;">The Lazy Creator Company &middot; thelazycreatorcompany.com<br>
              You're receiving this because you subscribed at thelazycreatorcompany.com.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!process.env.BREVO_API_KEY) {
    console.error('subscribe-newsletter: missing BREVO_API_KEY');
    return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured (missing BREVO_API_KEY)' }) };
  }
  if (!process.env.BREVO_NEWSLETTER_LIST_ID) {
    console.error('subscribe-newsletter: missing BREVO_NEWSLETTER_LIST_ID');
    return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured (missing BREVO_NEWSLETTER_LIST_ID)' }) };
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { email, source } = data;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailPattern.test(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid or missing email' }) };
  }
  const signupSource = SOURCES.has(source) ? source : 'unknown';

  const listId = parseInt(process.env.BREVO_NEWSLETTER_LIST_ID, 10);
  const trimmedEmail = email.trim();

  // Step 1: add (or update) the contact and put them on the real list.
  try {
    const res = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email: trimmedEmail,
        listIds: [listId],
        updateEnabled: true,
        attributes: { SIGNUP_SOURCE: signupSource },
      }),
    });

    // Brevo returns 204 (created) or 400 duplicate_parameter if the contact
    // already exists -- with updateEnabled:true it should just update them
    // and still return success, but treat "duplicate" as a non-fatal case
    // either way since the contact ending up on the list is what matters.
    if (!res.ok && res.status !== 400) {
      const body = await res.text();
      console.error(`Brevo contacts API ${res.status}: ${body}`);
      return { statusCode: 502, body: JSON.stringify({ error: 'Could not subscribe. Try again shortly.' }) };
    }
  } catch (err) {
    console.error('subscribe-newsletter contact error:', err);
    return { statusCode: 502, body: JSON.stringify({ error: 'Could not subscribe. Try again shortly.' }) };
  }

  // Step 2: send the welcome email. If this fails, the subscription above
  // still succeeded, so report success either way -- the welcome email is
  // a nice-to-have, not the core promise (being on the list is).
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
        to: [{ email: trimmedEmail }],
        subject: "You're in — welcome to The Lazy Creator Company",
        htmlContent: welcomeEmailHtml(),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Brevo email API ${res.status}: ${body}`);
    }
  } catch (err) {
    console.error('subscribe-newsletter welcome email error:', err);
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
