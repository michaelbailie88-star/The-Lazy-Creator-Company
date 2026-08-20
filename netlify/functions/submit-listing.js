// netlify/functions/submit-listing.js
//
// Receives the Creator Marketplace submission form. Writes a "pending"
// entry to content/marketplace-pending.json in the GitHub repo. It does
// NOT go live yet — that happens in stripe-webhook.js once the matching
// payment comes in, matched by email.
//
// Requires these Netlify environment variables:
//   GITHUB_TOKEN  — a token with repo write access (Contents API)
//   GITHUB_REPO   — "owner/repo", e.g. "michaelbailie88-star/The-Lazy-Creator-Company"

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

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, message: 'Submission recorded. Pay to activate your listing.' }),
    };
  } catch (err) {
    console.error('submit-listing error:', err);
    return { statusCode: 502, body: JSON.stringify({ error: 'Could not record submission. Try again shortly.' }) };
  }
};
