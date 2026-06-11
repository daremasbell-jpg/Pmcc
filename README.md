/**
 * Client-side API helpers.
 * All calls go to our own Next.js backend — the Anthropic API key
 * never touches the browser.
 */

const CACHE_KEY = 'pmcc_analysis_cache_v1';
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

// ─── Cache helpers ────────────────────────────────────────────────────────────
export function getCachedAnalysis(ticker) {
  try {
    const raw   = localStorage.getItem(CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    const entry = cache[ticker.toUpperCase()];
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) return null;
    return entry.data;
  } catch { return null; }
}

export function setCachedAnalysis(ticker, data) {
  try {
    const raw   = localStorage.getItem(CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[ticker.toUpperCase()] = { data, ts: Date.now() };
    const keys = Object.keys(cache);
    if (keys.length > 20) delete cache[keys[0]];
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

export function clearCachedAnalysis(ticker) {
  try {
    const raw   = localStorage.getItem(CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    delete cache[ticker.toUpperCase()];
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

// ─── API calls ────────────────────────────────────────────────────────────────
async function apiCall(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    const msg = data?.error || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  return data;
}

export async function fetchRecommendations() {
  return apiCall('/api/recommend');
}

export async function fetchAnalysis(ticker) {
  return apiCall('/api/analyze', {
    method: 'POST',
    body: JSON.stringify({ ticker }),
  });
}

export async function fetchPositionCheck(position) {
  return apiCall('/api/check-position', {
    method: 'POST',
    body: JSON.stringify(position),
  });
}
