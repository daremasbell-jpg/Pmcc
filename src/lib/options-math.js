/**
 * Options pricing using Black-Scholes model.
 * Used when live options data is unavailable.
 * Gives realistic theoretical prices based on stock price, IV, and time.
 */

function normCDF(x) {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

function erf(x) {
  const a1= 0.254829592, a2=-0.284496736, a3= 1.421413741;
  const a4=-1.453152027, a5= 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);
  return sign * y;
}

/**
 * Black-Scholes call price and Greeks.
 * @param {number} S - Current stock price
 * @param {number} K - Strike price
 * @param {number} T - Time to expiration in years
 * @param {number} r - Risk-free rate (e.g. 0.053 for 5.3%)
 * @param {number} sigma - Implied volatility as decimal (e.g. 0.28 for 28%)
 */
export function blackScholesCall(S, K, T, r, sigma) {
  if (T <= 0) return { price: Math.max(0, S - K), delta: S > K ? 1 : 0, intrinsic: Math.max(0, S-K), extrinsic: 0 };
  if (sigma <= 0) sigma = 0.01;

  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  const price    = S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2);
  const delta    = normCDF(d1);
  const intrinsic = Math.max(0, S - K);
  const extrinsic = Math.max(0, price - intrinsic);

  return {
    price:     Math.round(Math.max(0, price) * 100) / 100,
    delta:     Math.round(delta * 1000) / 1000,
    intrinsic: Math.round(intrinsic * 100) / 100,
    extrinsic: Math.round(extrinsic * 100) / 100,
    d1: Math.round(d1 * 1000) / 1000,
    d2: Math.round(d2 * 1000) / 1000,
  };
}

const RISK_FREE_RATE = 0.053; // ~current 1yr treasury rate

/**
 * Generate LEAP recommendation using Black-Scholes.
 */
export function calcLEAP(stockPrice, hv30, daysOut = 540) {
  // Use HV30 + 15% volatility premium for IV estimate
  const sigma = Math.max(0.12, (hv30 / 100) * 1.15);
  const T     = daysOut / 365;

  // Target delta ~0.80: strike at ~82% of stock price
  const strike = Math.round(stockPrice * 0.82 / 5) * 5;

  const bs = blackScholesCall(stockPrice, strike, T, RISK_FREE_RATE, sigma);
  const costPerContract = Math.round(bs.price * 100);

  return {
    strike,
    daysOut,
    expiration: futureDate(daysOut),
    estimatedCost: `$${costPerContract}`,
    estimatedCostPerShare: `$${bs.price.toFixed(2)}`,
    delta:        bs.delta,
    impliedVol:   `${Math.round(sigma * 100)}%`,
    intrinsicValue: `$${(bs.intrinsic * 100).toFixed(0)}`,
    extrinsicValue: `$${(bs.extrinsic * 100).toFixed(0)}`,
    rationale:    `Deep ITM strike at 82% of price, targeting delta ~0.80`,
    modelUsed:    'Black-Scholes (theoretical)',
  };
}

/**
 * Generate short call recommendation using Black-Scholes.
 */
export function calcShortCall(stockPrice, hv30, dte = 21) {
  const sigma = Math.max(0.12, (hv30 / 100) * 1.10);
  const T     = dte / 365;

  // Target delta ~0.20: strike at ~7% OTM
  const strike = Math.round(stockPrice * 1.07 / 5) * 5;

  const bs = blackScholesCall(stockPrice, strike, T, RISK_FREE_RATE, sigma);
  const premiumPerContract = Math.round(bs.price * 100);

  return {
    strike,
    dte,
    expiration:       futureDate(dte),
    estimatedPremium: `$${premiumPerContract}`,
    premiumPerShare:  `$${bs.price.toFixed(2)}`,
    delta:            bs.delta,
    impliedVol:       `${Math.round(sigma * 100)}%`,
    rationale:        `~7% OTM strike, targeting delta ~0.20 for income with room to run`,
    modelUsed:        'Black-Scholes (theoretical)',
  };
}

/**
 * Calculate full PMCC setup metrics.
 */
export function calcPMCCSetup(stockPrice, hv30) {
  const leap      = calcLEAP(stockPrice, hv30);
  const shortCall = calcShortCall(stockPrice, hv30);

  const leapCost    = parseFloat(leap.estimatedCostPerShare);
  const premium     = parseFloat(shortCall.premiumPerShare);
  const yieldPct    = leapCost > 0 ? ((premium / leapCost) * 100).toFixed(1) : '0';
  const annualized  = leapCost > 0 ? ((premium / leapCost) * 100 * (365 / shortCall.dte)).toFixed(0) : '0';
  const breakeven   = ((leap.strike + leapCost) - premium).toFixed(2);
  const monthsToBreakeven = premium > 0 ? Math.ceil(leapCost / premium) : 'N/A';

  return {
    leap,
    shortCall: {
      ...shortCall,
      yieldOnLeap:  `${yieldPct}%`,
      annualizedYield: `${annualized}%`,
    },
    breakeven: {
      priceAtExpiry:   breakeven,
      timeToBreakeven: `~${monthsToBreakeven} months`,
      detail:          `LEAP $${(leapCost*100).toFixed(0)} ÷ monthly premium $${(premium*100).toFixed(0)}`,
    },
  };
}

function futureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
