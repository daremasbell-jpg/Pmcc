/**
 * Yahoo Finance data fetcher — runs server-side only.
 * Uses Yahoo Finance v8 chart API and v7 quote summary.
 * No API key required.
 */

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function yfFetch(url) {
  const res = await fetch(url, { headers: YF_HEADERS, next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Yahoo Finance returned ${res.status} for ${url}`);
  return res.json();
}

// ─── QUOTE (price, volume, market cap, 52w range) ────────────────────────────
export async function getQuote(ticker) {
  const t = ticker.toUpperCase();
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${t}?interval=1d&range=5d`;
  const data = await yfFetch(url);
  const meta  = data?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`No data found for ${t}`);

  const price        = meta.regularMarketPrice || meta.previousClose;
  const prevClose    = meta.previousClose || meta.chartPreviousClose;
  const change1d     = prevClose ? (((price - prevClose) / prevClose) * 100).toFixed(2) : '0.00';
  const week52High   = meta.fiftyTwoWeekHigh || 0;
  const week52Low    = meta.fiftyTwoWeekLow  || 0;

  return {
    ticker:       t,
    price:        Math.round(price * 100) / 100,
    prevClose:    Math.round(prevClose * 100) / 100,
    change1d:     Number(change1d),
    week52High,
    week52Low,
    volume:       meta.regularMarketVolume || 0,
    marketCap:    meta.marketCap || 0,
    currency:     meta.currency || 'USD',
    exchange:     meta.exchangeName || '',
    shortName:    meta.shortName || t,
    longName:     meta.longName  || meta.shortName || t,
  };
}

// ─── HISTORICAL PRICES (for IV rank calculation) ─────────────────────────────
export async function getHistory(ticker, range = '1y') {
  const t   = ticker.toUpperCase();
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${t}?interval=1d&range=${range}`;
  const data = await yfFetch(url);
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No history for ${t}`);

  const timestamps = result.timestamp || [];
  const closes     = result.indicators?.quote?.[0]?.close || [];
  const highs      = result.indicators?.quote?.[0]?.high  || [];
  const lows       = result.indicators?.quote?.[0]?.low   || [];

  return timestamps.map((ts, i) => ({
    date:  new Date(ts * 1000).toISOString().split('T')[0],
    close: closes[i] || 0,
    high:  highs[i]  || 0,
    low:   lows[i]   || 0,
  })).filter(d => d.close > 0);
}

// ─── OPTIONS CHAIN ────────────────────────────────────────────────────────────
export async function getOptionsChain(ticker, expiration) {
  const t   = ticker.toUpperCase();
  const url = expiration
    ? `https://query1.finance.yahoo.com/v7/finance/options/${t}?date=${expiration}`
    : `https://query1.finance.yahoo.com/v7/finance/options/${t}`;
  const data = await yfFetch(url);
  const opt  = data?.optionChain?.result?.[0];
  if (!opt) throw new Error(`No options data for ${t}`);

  return {
    expirationDates: opt.expirationDates || [],
    calls:           opt.options?.[0]?.calls || [],
    puts:            opt.options?.[0]?.puts  || [],
    quote:           opt.quote || {},
  };
}

// ─── IV RANK CALCULATION ─────────────────────────────────────────────────────
// Approximates IV rank using historical volatility percentile
export function calcIVRank(history) {
  if (history.length < 20) return { ivRank: 50, ivPercentile: 50, hv30: 0, hv252: 0 };

  // Calculate 30-day historical volatility windows
  const hvWindows = [];
  for (let i = 30; i < history.length; i++) {
    const window = history.slice(i - 30, i);
    const returns = [];
    for (let j = 1; j < window.length; j++) {
      if (window[j - 1].close > 0) {
        returns.push(Math.log(window[j].close / window[j - 1].close));
      }
    }
    if (returns.length < 2) continue;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1);
    hvWindows.push(Math.sqrt(variance * 252) * 100);
  }

  if (hvWindows.length < 2) return { ivRank: 50, ivPercentile: 50, hv30: 0, hv252: 0 };

  const currentHV = hvWindows[hvWindows.length - 1];
  const minHV     = Math.min(...hvWindows);
  const maxHV     = Math.max(...hvWindows);
  const ivRank    = maxHV === minHV ? 50 : Math.round(((currentHV - minHV) / (maxHV - minHV)) * 100);
  const below     = hvWindows.filter(v => v <= currentHV).length;
  const ivPct     = Math.round((below / hvWindows.length) * 100);

  // HV levels
  const last30  = hvWindows.slice(-1)[0] || 0;
  const last252 = hvWindows.length > 0 ? hvWindows.reduce((a, b) => a + b, 0) / hvWindows.length : 0;

  return {
    ivRank:      Math.min(100, Math.max(0, ivRank)),
    ivPercentile: Math.min(100, Math.max(0, ivPct)),
    hv30:        Math.round(last30 * 10) / 10,
    hv252:       Math.round(last252 * 10) / 10,
    ivLevel:     ivRank < 30 ? 'Low' : ivRank < 60 ? 'Moderate' : 'High',
  };
}

// ─── TREND ANALYSIS ──────────────────────────────────────────────────────────
export function calcTrend(history) {
  if (history.length < 50) return { trend: 'Neutral', trendDetail: 'Insufficient data', ema20: 0, ema50: 0 };

  function ema(prices, period) {
    const k = 2 / (period + 1);
    let val = prices[0];
    for (let i = 1; i < prices.length; i++) {
      val = prices[i] * k + val * (1 - k);
    }
    return val;
  }

  const closes  = history.map(d => d.close);
  const current = closes[closes.length - 1];
  const ema20   = ema(closes, 20);
  const ema50   = ema(closes, 50);
  const ema200  = closes.length >= 200 ? ema(closes, 200) : null;

  // 1-month and 3-month performance
  const price1m  = closes[Math.max(0, closes.length - 21)];
  const price3m  = closes[Math.max(0, closes.length - 63)];
  const ret1m    = ((current - price1m) / price1m * 100).toFixed(1);
  const ret3m    = ((current - price3m) / price3m * 100).toFixed(1);

  let trend = 'Neutral';
  const bullSignals = [
    current > ema20,
    current > ema50,
    ema20   > ema50,
    ema200  ? current > ema200 : false,
    Number(ret1m) > 0,
  ].filter(Boolean).length;

  if (bullSignals >= 4) trend = 'Bullish';
  else if (bullSignals <= 1) trend = 'Bearish';

  const trendDetail = `Price $${current.toFixed(2)} · EMA20 $${ema20.toFixed(2)} · EMA50 $${ema50.toFixed(2)} · 1M: ${ret1m}% · 3M: ${ret3m}%`;

  return {
    trend,
    trendDetail,
    ema20:    Math.round(ema20 * 100) / 100,
    ema50:    Math.round(ema50 * 100) / 100,
    ema200:   ema200 ? Math.round(ema200 * 100) / 100 : null,
    ret1m:    `${ret1m}%`,
    ret3m:    `${ret3m}%`,
  };
}

// ─── PMCC SCORING ENGINE ─────────────────────────────────────────────────────
export function calcPMCCScore({ ivRank, trend, price, week52Low, week52High, volume, optionsLiquidity }) {
  let score = 0;

  // IV environment (20 pts) — sweet spot 30-60
  if (ivRank >= 30 && ivRank <= 60) score += 20;
  else if (ivRank >= 20 && ivRank < 30) score += 14;
  else if (ivRank > 60 && ivRank <= 75) score += 12;
  else if (ivRank > 75) score += 5;
  else score += 8;

  // Trend (25 pts)
  if (trend === 'Bullish') score += 25;
  else if (trend === 'Neutral') score += 15;
  else score += 5;

  // Liquidity / volume (25 pts)
  if (volume > 5000000)       score += 25;
  else if (volume > 1000000)  score += 20;
  else if (volume > 500000)   score += 12;
  else score += 5;

  // Options liquidity (20 pts)
  if (optionsLiquidity === 'High')   score += 20;
  else if (optionsLiquidity === 'Medium') score += 12;
  else score += 5;

  // Price range suitability for PMCC (10 pts)
  if (price >= 20 && price <= 300) score += 10;
  else if (price > 300 && price <= 500) score += 7;
  else score += 3;

  return Math.min(100, score);
}

// ─── SUGGEST LEAP ────────────────────────────────────────────────────────────
export function suggestLEAP(price, calls) {
  if (!calls || calls.length === 0) return null;

  // Target delta ~0.80 → roughly 15-20% ITM strike
  const targetStrike = Math.round(price * 0.82 / 5) * 5;

  // Find nearest strike
  const sorted = [...calls].sort((a, b) =>
    Math.abs((a.strike || 0) - targetStrike) - Math.abs((b.strike || 0) - targetStrike)
  );
  const leap = sorted[0];
  if (!leap) return null;

  const cost = leap.lastPrice || leap.ask || 0;
  const delta = leap.delta || (price > leap.strike ? 0.80 : 0.65);

  return {
    strike:        leap.strike,
    lastPrice:     cost,
    estimatedCost: `$${(cost * 100).toFixed(0)}`,
    delta:         Math.round(delta * 100) / 100,
    impliedVol:    leap.impliedVolatility ? `${(leap.impliedVolatility * 100).toFixed(0)}%` : 'N/A',
    openInterest:  leap.openInterest || 0,
    bid:           leap.bid || 0,
    ask:           leap.ask || 0,
  };
}

// ─── SUGGEST SHORT CALL ───────────────────────────────────────────────────────
export function suggestShortCall(price, calls) {
  if (!calls || calls.length === 0) return null;

  // Target delta ~0.20-0.25 → roughly 5-10% OTM
  const targetStrike = Math.round(price * 1.07 / 5) * 5;

  const sorted = [...calls].sort((a, b) =>
    Math.abs((a.strike || 0) - targetStrike) - Math.abs((b.strike || 0) - targetStrike)
  );
  const call = sorted[0];
  if (!call) return null;

  const premium     = call.lastPrice || call.bid || 0;
  const spreadPct   = call.ask && call.bid ? ((call.ask - call.bid) / call.ask * 100).toFixed(1) : 'N/A';

  return {
    strike:       call.strike,
    premium,
    estimatedPremium: `$${(premium * 100).toFixed(0)}`,
    delta:        call.delta || 0.20,
    impliedVol:   call.impliedVolatility ? `${(call.impliedVolatility * 100).toFixed(0)}%` : 'N/A',
    openInterest: call.openInterest || 0,
    bid:          call.bid || 0,
    ask:          call.ask || 0,
    spreadPct:    `${spreadPct}%`,
  };
}

// ─── TOP PMCC CANDIDATES (screener) ──────────────────────────────────────────
export const TOP_CANDIDATES = [
  'AAPL','MSFT','NVDA','AMZN','GOOGL','META','TSLA',
  'AMD','NFLX','CRM','ORCL','INTC','QCOM','MU','AVGO',
  'SPY','QQQ','COIN','HOOD','PLTR',
];
