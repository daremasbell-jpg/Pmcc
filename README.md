import { NextResponse } from 'next/server';
import {
  getQuote, getHistory, getOptionsChain,
  calcIVRank, calcTrend, calcPMCCScore,
  suggestLEAP, suggestShortCall,
} from '@/lib/yahoo';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker')?.toUpperCase()?.trim();

  if (!ticker || !/^[A-Z]{1,10}$/.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 });
  }

  try {
    // Fetch all data in parallel
    const [quote, history] = await Promise.all([
      getQuote(ticker),
      getHistory(ticker, '1y'),
    ]);

    // Calculate indicators
    const ivData    = calcIVRank(history);
    const trendData = calcTrend(history);

    // Fetch options chain (near-term for short call, far-term for LEAP)
    let leapSuggestion = null;
    let shortCallSuggestion = null;
    let optionsLiquidity = 'Unknown';
    let expirationDates = [];

    try {
      const options = await getOptionsChain(ticker);
      expirationDates = options.expirationDates || [];

      // Short call: use nearest expiry that's 7-30 DTE
      const now = Date.now() / 1000;
      const shortExpiry = expirationDates.find(ts => {
        const daysOut = (ts - now) / 86400;
        return daysOut >= 7 && daysOut <= 35;
      });

      // LEAP: use expiry 12-24 months out
      const leapExpiry = expirationDates.find(ts => {
        const daysOut = (ts - now) / 86400;
        return daysOut >= 300 && daysOut <= 730;
      }) || expirationDates[expirationDates.length - 1];

      if (shortExpiry) {
        const shortOpts = await getOptionsChain(ticker, shortExpiry);
        shortCallSuggestion = suggestShortCall(quote.price, shortOpts.calls);
        const totalOI = shortOpts.calls.reduce((s, c) => s + (c.openInterest || 0), 0);
        optionsLiquidity = totalOI > 10000 ? 'High' : totalOI > 2000 ? 'Medium' : 'Low';
      }

      if (leapExpiry) {
        const leapOpts = await getOptionsChain(ticker, leapExpiry);
        leapSuggestion = suggestLEAP(quote.price, leapOpts.calls);
      }
    } catch (optErr) {
      console.warn('Options fetch failed:', optErr.message);
    }

    // Score
    const pmccScore = calcPMCCScore({
      ivRank:           ivData.ivRank,
      trend:            trendData.trend,
      price:            quote.price,
      week52Low:        quote.week52Low,
      week52High:       quote.week52High,
      volume:           quote.volume,
      optionsLiquidity,
    });

    // Breakeven
    const leapCost       = leapSuggestion?.lastPrice || 0;
    const shortPremium   = shortCallSuggestion?.premium || 0;
    const breakevenPrice = leapSuggestion
      ? ((leapSuggestion.strike + leapCost) - shortPremium).toFixed(2)
      : null;
    const monthsToBreakeven = shortPremium > 0
      ? Math.ceil(leapCost / shortPremium).toString() + ' months'
      : 'N/A';

    // PMCC verdict
    let verdict = '';
    let recommendation = 'NEUTRAL';
    if (pmccScore >= 80) { verdict = 'Strong PMCC candidate — good IV, liquid options, bullish trend'; recommendation = 'STRONG BUY'; }
    else if (pmccScore >= 65) { verdict = 'Decent PMCC candidate — meets most criteria'; recommendation = 'BUY'; }
    else if (pmccScore >= 50) { verdict = 'Marginal — some criteria missing, trade with caution'; recommendation = 'NEUTRAL'; }
    else { verdict = 'Poor PMCC candidate — consider waiting for better setup'; recommendation = 'AVOID'; }

    // Pros / cons
    const pros = [], cons = [];
    if (ivData.ivRank >= 30 && ivData.ivRank <= 60) pros.push(`IV Rank ${ivData.ivRank} — ideal range for PMCC premium`);
    else if (ivData.ivRank < 30) cons.push(`Low IV Rank (${ivData.ivRank}) — short call premiums may be weak`);
    else cons.push(`High IV Rank (${ivData.ivRank}) — LEAP cost is elevated`);
    if (trendData.trend === 'Bullish') pros.push('Bullish trend — favors PMCC directional bias');
    else if (trendData.trend === 'Bearish') cons.push('Bearish trend — PMCC at risk of LEAP losing value');
    if (optionsLiquidity === 'High') pros.push('High options liquidity — tight spreads, easy fills');
    else if (optionsLiquidity === 'Low') cons.push('Low options liquidity — wide spreads hurt profitability');
    if (quote.price >= 20 && quote.price <= 300) pros.push('Price range ideal for affordable LEAP cost');
    else if (quote.price > 300) cons.push('High stock price means expensive LEAP capital requirement');
    if (quote.volume > 1000000) pros.push(`High avg volume (${(quote.volume / 1e6).toFixed(1)}M) — liquid underlying`);

    return NextResponse.json({
      ticker,
      companyName:    quote.longName || quote.shortName,
      currentPrice:   quote.price,
      prevClose:      quote.prevClose,
      change1d:       quote.change1d,
      week52High:     quote.week52High,
      week52Low:      quote.week52Low,
      volume:         quote.volume,
      priceSource:    'Yahoo Finance',
      priceAsOf:      new Date().toLocaleTimeString(),
      trend:          trendData.trend,
      trendDetail:    trendData.trendDetail,
      ema20:          trendData.ema20,
      ema50:          trendData.ema50,
      ret1m:          trendData.ret1m,
      ret3m:          trendData.ret3m,
      ivRank:         ivData.ivRank,
      ivPercentile:   ivData.ivPercentile,
      ivLevel:        ivData.ivLevel,
      hv30:           ivData.hv30,
      optionsLiquidity,
      leapRecommendation: leapSuggestion ? {
        strike:        leapSuggestion.strike,
        estimatedCost: leapSuggestion.estimatedCost,
        delta:         leapSuggestion.delta,
        openInterest:  leapSuggestion.openInterest,
        impliedVol:    leapSuggestion.impliedVol,
        rationale:     `Deep ITM strike at ~82% of current price for high delta exposure`,
      } : null,
      shortCallRecommendation: shortCallSuggestion ? {
        strike:           shortCallSuggestion.strike,
        estimatedPremium: shortCallSuggestion.estimatedPremium,
        delta:            shortCallSuggestion.delta,
        openInterest:     shortCallSuggestion.openInterest,
        spreadPct:        shortCallSuggestion.spreadPct,
        yieldOnLeap:      leapCost > 0 ? `${((shortPremium / leapCost) * 100).toFixed(1)}%` : 'N/A',
        rationale:        `~7% OTM strike targeting 0.20-0.25 delta for income with room to run`,
      } : null,
      breakeven: {
        priceAtExpiry:    breakevenPrice,
        timeToBreakeven:  monthsToBreakeven,
        detail:           `LEAP cost $${(leapCost * 100).toFixed(0)} ÷ monthly premium $${(shortPremium * 100).toFixed(0)}`,
      },
      pmccScore,
      scoreBreakdown: {
        ivEnvironment: ivData.ivRank >= 30 && ivData.ivRank <= 60 ? 20 : ivData.ivRank >= 20 ? 14 : 8,
        liquidity:     quote.volume > 5000000 ? 25 : quote.volume > 1000000 ? 20 : 12,
        trend:         trendData.trend === 'Bullish' ? 25 : trendData.trend === 'Neutral' ? 15 : 5,
        premiumYield:  optionsLiquidity === 'High' ? 20 : optionsLiquidity === 'Medium' ? 12 : 5,
        riskReward:    quote.price >= 20 && quote.price <= 300 ? 10 : 5,
      },
      pros,
      cons,
      verdict,
      recommendation,
      dataSource: 'Yahoo Finance (free, real-time)',
    });

  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to fetch data' }, { status: 500 });
  }
}
