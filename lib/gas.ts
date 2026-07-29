// Server-only helper for calling the Google Apps Script backend.
// Never import this from a Client Component — it reads secret env vars.

const GAS_URL = process.env.GAS_URL as string;
const GAS_TOKEN = process.env.GAS_TOKEN as string;

if (!GAS_URL || !GAS_TOKEN) {
  // Fails loudly at build/runtime rather than silently returning empty data.
  console.warn('GAS_URL or GAS_TOKEN is not set. Add them in .env.local / Vercel settings.');
}

export async function gasGet(action: string, params: Record<string, string> = {}) {
  if (!GAS_URL) {
    throw new Error('GAS_URL environment variable is not set or empty.');
  }
  const url = new URL(GAS_URL);
  url.searchParams.set('action', action);
  url.searchParams.set('token', GAS_TOKEN);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Apps Script GET failed: ${res.status}`);
  return res.json();
}

export async function gasPost(action: string, body: Record<string, unknown> = {}) {
  if (!GAS_URL) {
    throw new Error('GAS_URL environment variable is not set or empty.');
  }
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // avoids Apps Script CORS preflight issues
    body: JSON.stringify({ action, token: GAS_TOKEN, ...body }),
  });
  if (!res.ok) throw new Error(`Apps Script POST failed: ${res.status}`);
  return res.json();
}
