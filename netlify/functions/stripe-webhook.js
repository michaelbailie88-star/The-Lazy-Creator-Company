// netlify/functions/stripe-webhook.js
//
// Listens for Stripe's checkout.session.completed event. Matches the
// payer's email against content/marketplace-pending.json. If found,
// moves it into content/marketplace-listings.json (now live) and
// removes it from pending. If no match is found, logs it to
// content/marketplace-unmatched.json instead of silently failing —
// so nothing is ever lost, even if a creator paid with a different
// email than they submitted with.
//
// Requires these Netlify environment variables:
//   STRIPE_SECRET_KEY     — your Stripe secret key
//   STRIPE_WEBHOOK_SECRET — the signing secret for this webhook endpoint
//   GITHUB_TOKEN          — same token as submit-listing.js
//   GITHUB_REPO           — "owner/repo"
//
// Also requires the two Price IDs (not the Payment Link URLs) for the
// monthly and annual plans, so it can label the listing correctly.
// Set these too:
//   STRIPE_PRICE_MONTHLY
//   STRIPE_PRICE_ANNUAL

const Stripe = require('stripe');

const GITHUB_API = 'https://api.github.com';
const PENDING_PATH = 'content/marketplace-pending.json';
const LISTINGS_PATH = 'content/marketplace-listings.json';
const UNMATCHED_PATH = 'content/marketplace-unmatched.json';
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
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return { statusCode: 500, body: 'Server not configured (missing Stripe env vars)' };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      event.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook signature verification failed: ${err.message}` };
  }

  if (stripeEvent.type !== 'checkout.session.completed') {
    return { statusCode: 200, body: 'Ignored (not a checkout.session.completed event)' };
  }

  const session = stripeEvent.data.object;
  const email = (session.customer_details?.email || '').trim().toLowerCase();
  if (!email) {
    return { statusCode: 200, body: 'No email on session — nothing to match' };
  }

  // Determine plan type by comparing the price used against the known price IDs.
  let plan = 'unknown';
  try {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const priceId = lineItems.data[0]?.price?.id;
    if (priceId === process.env.STRIPE_PRICE_MONTHLY) plan = 'monthly';
    else if (priceId === process.env.STRIPE_PRICE_ANNUAL) plan = 'annual';
  } catch (err) {
    console.error('Could not fetch line items:', err.message);
  }

  try {
    const pending = await getFile(PENDING_PATH);
    const idx = (pending.content.entries || []).findIndex((e) => e.creatorEmail === email);

    if (idx === -1) {
      // No matching submission — log it so nothing is silently lost.
      const unmatched = await getFile(UNMATCHED_PATH);
      unmatched.content.entries = unmatched.content.entries || [];
      unmatched.content.entries.push({
        receivedAt: new Date().toISOString(),
        email,
        plan,
        stripeSessionId: session.id,
      });
      await putFile(UNMATCHED_PATH, unmatched.content, unmatched.sha, `Marketplace: unmatched payment from ${email}`);
      return { statusCode: 200, body: 'No matching pending submission — logged to unmatched for manual review' };
    }

    const entry = pending.content.entries[idx];
    pending.content.entries.splice(idx, 1);

    const listings = await getFile(LISTINGS_PATH);
    listings.content.entries = listings.content.entries || [];
    listings.content.entries.push({
      ...entry,
      plan,
      subscribedAt: new Date().toISOString(),
      stripeCustomerId: session.customer,
      stripeSessionId: session.id,
      status: 'live',
    });

    await putFile(LISTINGS_PATH, listings.content, listings.sha, `Marketplace: LIVE listing for ${entry.productName} (${entry.creatorName})`);
    await putFile(PENDING_PATH, pending.content, pending.sha, `Marketplace: cleared pending entry for ${entry.creatorName} (now live)`);

    return { statusCode: 200, body: JSON.stringify({ ok: true, published: entry.productName }) };
  } catch (err) {
    console.error('stripe-webhook error:', err);
    return { statusCode: 502, body: 'Could not process payment (GitHub write failed) — Stripe will retry' };
  }
};
