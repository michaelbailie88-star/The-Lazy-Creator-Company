// netlify/functions/send-lead-magnet.js
//
// Called from the client-side JS on each free-resource landing page
// (free-prayers.html, free-evening-prayers.html, free-builder-prayers.html,
// free-website-guide.html, free-shipping-guide.html, free-vault-story.html)
// in addition to the native Netlify Forms submission. Netlify Forms only
// ever stores the submission / notifies the site owner -- it never emails
// the person who filled out the form. This function is what actually does
// that: it sends the requested PDF's download link to the submitted email
// address via Brevo's transactional email API.
//
// Requires this Netlify environment variable:
//   BREVO_API_KEY  — a Brevo API key with "Send emails" permission
//                    (Brevo dashboard -> Settings -> SMTP & API -> API Keys)
//
// Verified sender (must stay a verified sender in the Brevo account):
//   The Lazy Creator Co <thelazycreatorco@gmail.com>

const SENDER = { name: 'The Lazy Creator Co', email: 'thelazycreatorco@gmail.com' };
const SITE = 'https://thelazycreatorcompany.com';

const RUST = '#B0532E';
const BLUE = '#0F6E96';

function emailShell({ accentColor, eyebrow, headline, bodyHtml, pdfUrl, buttonLabel, extraHtml = '' }) {
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
              <p style="margin:0 0 6px 0;color:${accentColor};font-size:12px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;">${eyebrow}</p>
              <h1 style="margin:0 0 18px 0;color:#1a1a1a;font-size:26px;line-height:1.3;">${headline}</h1>
              <div style="color:#333333;font-size:15px;line-height:1.6;">${bodyHtml}</div>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 8px 0;">
                <tr>
                  <td style="background-color:${accentColor};border-radius:8px;">
                    <a href="${pdfUrl}" style="display:inline-block;padding:14px 28px;color:#111318;font-size:15px;font-weight:bold;text-decoration:none;">${buttonLabel} &rarr;</a>
                  </td>
                </tr>
              </table>
              <p style="color:#888888;font-size:12px;margin:18px 0 0 0;">If the button doesn't work, copy and paste this link:<br>
              <a href="${pdfUrl}" style="color:${accentColor};word-break:break-all;">${pdfUrl}</a></p>
              ${extraHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 32px 40px;border-top:1px solid #eeeeee;">
              <p style="color:#999999;font-size:12px;margin:0;">The Lazy Creator Company &middot; thelazycreatorcompany.com<br>
              You're receiving this because you requested this resource at thelazycreatorcompany.com.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const RESOURCES = {
  'morning-prayers': {
    subject: 'Your copy of 7 Morning Prayers for Focus',
    pdf: `${SITE}/assets/pdfs/7-morning-prayers-for-focus.pdf`,
    build: (pdfUrl) => emailShell({
      accentColor: RUST,
      eyebrow: 'Your Free Download',
      headline: 'Here are your 7 Morning Prayers',
      bodyHtml: `<p>Thanks for grabbing this. It's a short prayer for each of the next seven mornings, before the day gets loud.</p>
        <p>Read one each morning, sit with the verse, and let the day's focus line follow you into your actual to-do list.</p>`,
      pdfUrl,
      buttonLabel: 'Download the PDF',
    }),
  },
  'evening-prayers': {
    subject: 'Your copy of 5 Evening Prayers for Rest',
    pdf: `${SITE}/assets/pdfs/5-evening-prayers-for-rest.pdf`,
    build: (pdfUrl) => emailShell({
      accentColor: RUST,
      eyebrow: 'Your Free Download',
      headline: 'Here are your 5 Evening Prayers',
      bodyHtml: `<p>Thanks for grabbing this. It's a short prayer for each of the next five nights, before you close your eyes.</p>
        <p>Read one each night, sit with the verse, and let the release line be the last thing you do before the lights go off.</p>`,
      pdfUrl,
      buttonLabel: 'Download the PDF',
    }),
  },
  'builder-prayers': {
    subject: 'Your copy of 5 Prayers for Building Something New',
    pdf: `${SITE}/assets/pdfs/5-prayers-for-building-something-new.pdf`,
    build: (pdfUrl) => emailShell({
      accentColor: RUST,
      eyebrow: 'Your Free Download',
      headline: 'Here are your 5 Prayers for Building',
      bodyHtml: `<p>Thanks for grabbing this. It's a short prayer for each of the next five mornings &mdash; for whatever you're building right now.</p>
        <p>Read one each morning before you open your laptop, and let the build focus line actually shape the day.</p>`,
      pdfUrl,
      buttonLabel: 'Download the PDF',
    }),
  },
  'website-guide': {
    subject: 'Your copy of How I Build Websites Without Writing Code',
    pdf: `${SITE}/assets/pdfs/how-i-build-websites-without-code.pdf`,
    build: (pdfUrl) => emailShell({
      accentColor: BLUE,
      eyebrow: 'Your Free Guide',
      headline: "Here's How I Build Websites",
      bodyHtml: `<p>Thanks for grabbing this. It's the actual workflow behind this site and every other one I've built &mdash; no code editor, just AI tools directed from my phone and every change verified before it goes live.</p>`,
      pdfUrl,
      buttonLabel: 'Download the Guide',
    }),
  },
  'shipping-guide': {
    subject: 'Your copy of How to Actually Ship a Digital Product',
    pdf: `${SITE}/assets/pdfs/how-to-ship-a-digital-product.pdf`,
    build: (pdfUrl) => emailShell({
      accentColor: BLUE,
      eyebrow: 'Your Free Guide',
      headline: "Here's How to Actually Ship",
      bodyHtml: `<p>Thanks for grabbing this. It's five things that actually get a product shipped, pulled from building digital products across a dozen niches.</p>`,
      pdfUrl,
      buttonLabel: 'Download the Guide',
    }),
  },
  'vault-story': {
    subject: 'Your copy of Behind the Vault',
    pdf: `${SITE}/assets/pdfs/behind-the-vault-case-study.pdf`,
    build: (pdfUrl) => emailShell({
      accentColor: BLUE,
      eyebrow: 'Your Free Case Study',
      headline: "Here's the Story Behind the Vault",
      bodyHtml: `<p>Thanks for grabbing this. It's the real numbers and the real story behind the Activity Vault &mdash; 5,330 activities, five modules, and how a 20-year classroom career turned into a licensed library.</p>`,
      pdfUrl,
      buttonLabel: 'Download the Case Study',
      extraHtml: `<p style="margin-top:14px;"><a href="https://thelazycreatoractivityvault.netlify.app/app.html" style="color:${BLUE};">Or try the free demo of the actual library &rarr;</a></p>`,
    }),
  },
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!process.env.BREVO_API_KEY) {
    console.error('send-lead-magnet: missing BREVO_API_KEY');
    return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured (missing BREVO_API_KEY)' }) };
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { email, resource } = data;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailPattern.test(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid or missing email' }) };
  }

  const entry = RESOURCES[resource];
  if (!entry) {
    return { statusCode: 400, body: JSON.stringify({ error: `Unknown resource: ${resource}` }) };
  }

  const htmlContent = entry.build(entry.pdf);

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
        to: [{ email: email.trim() }],
        subject: entry.subject,
        htmlContent,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Brevo API ${res.status}: ${body}`);
      return { statusCode: 502, body: JSON.stringify({ error: 'Email could not be sent. The direct download link on this page still works.' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('send-lead-magnet error:', err);
    return { statusCode: 502, body: JSON.stringify({ error: 'Email could not be sent. The direct download link on this page still works.' }) };
  }
};
