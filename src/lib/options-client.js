/**
 * Client-side Yahoo Finance options fetcher.
 * Runs in the browser — Yahoo Finance allows browser requests but blocks servers.
 * Uses a CORS proxy to get around browser cross-origin restrictions.
 */

// Public CORS proxies that work reliably
const CORS_PROXY = 'https://corsproxy.io/?';

export async function fetchOptionsChain(ticker) {
  const url = `https://query1.finance.yahoo.com/v7/finance/options/${ticker.toUpperCase()}`;
  try {
    // Try direct first (works in some environments)
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      return parseOptions(data, ticker);
    }
  } catch (_) {}

  // Fallback: CORS proxy
  try {
    const res = await fetch(CORS_PROXY + encodeURIComponent(url));
    if (res.ok) {
      const data = await res.json();
      return parseOptions(data, ticker);
    }
  } catch (_) {}

  return null;
}

function parseOptions(data, ticker) {
  const result = data?.optionChain?.result?.[0];
  if (!result) return null;

  const calls = result.options?.[0]?.calls || [];
  const puts  = result.options?.[0]?.puts  || [];
  const expirationDates = result.expirationDates || [];

  return { calls, puts, expirationDates, ticker };
}

export function findBestLEAP(calls, targetStrike) {
  if (!calls?.length) return null;
  const sorted = [...calls].sort((a, b) =>
    Math.abs((a.strike || 0) - targetStrike) - Math.abs((b.strike || 0) - targetStrike)
  );
  const c = sorted[0];
  if (!c) return null;
  return {
    strike:        c.strike,
    lastPrice:     c.lastPrice || c.ask || 0,
    estimatedCost: `$${((c.lastPrice || c.ask || 0) * 100).toFixed(0)}`,
    delta:         c.delta ? Math.round(c.delta * 100) / 100 : '~0.80',
    impliedVol:    c.impliedVolatility ? `${(c.impliedVolatility * 100).toFixed(0)}%` : 'N/A',
    openInterest:  c.openInterest || 0,
    bid:           c.bid || 0,
    ask:           c.ask || 0,
    spreadPct:     c.ask ? `${(((c.ask - c.bid) / c.ask) * 100).toFixed(1)}%` : 'N/A',
  };
}

export function findBestShortCall(calls, targetStrike) {
  if (!calls?.length) return null;
  const sorted = [...calls].sort((a, b) =>
    Math.abs((a.strike || 0) - targetStrike) - Math.abs((b.strike || 0) - targetStrike)
  );
  const c = sorted[0];
  if (!c) return null;
  const premium = c.lastPrice || c.bid || 0;
  return {
    strike:           c.strike,
    premium,
    estimatedPremium: `$${(premium * 100).toFixed(0)}`,
    delta:            c.delta ? Math.round(c.delta * 100) / 100 : '~0.20',
    impliedVol:       c.impliedVolatility ? `${(c.impliedVolatility * 100).toFixed(0)}%` : 'N/A',
    openInterest:     c.openInterest || 0,
    bid:              c.bid || 0,
    ask:              c.ask || 0,
    spreadPct:        c.ask ? `${(((c.ask - c.bid) / c.ask) * 100).toFixed(1)}%` : 'N/A',
  };
}
