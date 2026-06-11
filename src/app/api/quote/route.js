import { NextResponse } from 'next/server';
import { getQuote, getHistory, calcIVRank, calcTrend, calcPMCCScore } from '@/lib/yahoo';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker')?.toUpperCase()?.trim();

  if (!ticker || !/^[A-Z]{1,10}$/.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 });
  }

  try {
    const [quote, history] = await Promise.all([
      getQuote(ticker),
      getHistory(ticker, '1y'),
    ]);

    const ivData    = calcIVRank(history);
    const trendData = calcTrend(history);

    // Options liquidity estimated from volume (options fetched client-side)
    const optionsLiquidity = quote.volume > 5000000 ? 'High' : quote.volume > 1000000 ? 'Medium' : 'Low';

    const pmccScore = calcPMCCScore({
      ivRank: ivData.ivRank,
      trend:  trendData.trend,
      price:  quote.price,
      week52Low:  quote.week52Low,
      week52High: quote.week52High,
      volume:     quote.volume,
      optionsLiquidity,
    });

    // PMCC verdict
    let verdict = '', recommendation = 'NEUTRAL';
    if      (pmccScore >= 80) { verdict = 'Strong PMCC candidate — good IV, liquid options, bullish trend'; recommendation = 'STRONG BUY'; }
    else if (pmccScore >= 65) { verdict = 'Decent PMCC candidate — meets most criteria'; recommendation = 'BUY'; }
    else if (pmccScore >= 50) { verdict = 'Marginal — some criteria missing, trade with caution'; recommendation = 'NEUTRAL'; }
    else                      { verdict = 'Poor PMCC candidate — consider waiting for better setup'; recommendation = 'AVOID'; }

    const pros = [], cons = [];
    if (ivData.ivRank >= 30 && ivData.ivRank <= 60) pros.push(`IV Rank ${ivData.ivRank} — ideal range for PMCC`);
    else if (ivData.ivRank < 30) cons.push(`Low IV Rank (${ivData.ivRank}) — short call premiums may be weak`);
    else cons.push(`High IV Rank (${ivData.ivRank}) — LEAP cost is elevated`);
    if (trendData.trend === 'Bullish') pros.push('Bullish trend — favors PMCC directional bias');
    else if (trendData.trend === 'Bearish') cons.push('Bearish trend — PMCC at risk');
    if (optionsLiquidity === 'High') pros.push('High volume — likely liquid options');
    if (quote.price >= 20 && quote.price <= 300) pros.push('Price range ideal for affordable LEAP');
    else if (quote.price > 300) cons.push('High price — expensive LEAP capital required');

    // Suggested strikes (client will fetch actual options, these are targets)
    const leapStrike      = Math.round(quote.price * 0.82 / 5) * 5;
    const shortCallStrike = Math.round(quote.price * 1.07 / 5) * 5;

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
      // Target strikes — options data enriched client-side
      targetLeapStrike:      leapStrike,
      targetShortCallStrike: shortCallStrike,
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
