import { NextResponse } from 'next/server';
import { getQuote, getHistory, calcIVRank, calcTrend, calcPMCCScore, TOP_CANDIDATES } from '@/lib/yahoo';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results = [];

  // Fetch top 10 candidates in parallel batches of 5
  const batch1 = TOP_CANDIDATES.slice(0, 5);
  const batch2 = TOP_CANDIDATES.slice(5, 10);

  async function processTicker(ticker) {
    try {
      const [quote, history] = await Promise.all([
        getQuote(ticker),
        getHistory(ticker, '1y'),
      ]);
      const ivData    = calcIVRank(history);
      const trendData = calcTrend(history);

      // Simple liquidity estimate from volume
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

      // Estimate LEAP cost (rough: 18% of stock price for deep ITM)
      const leapCostEst = `~$${Math.round(quote.price * 0.18 * 100 / 100) * 100}`;
      // Estimate weekly yield (rough: 0.5-1.5% of stock price for 21 DTE call)
      const weeklyYieldEst = `~${(ivData.hv30 * 0.3 / 12).toFixed(1)}%`;

      const pros = [], cons = [];
      if (ivData.ivRank >= 30 && ivData.ivRank <= 60) pros.push(`IV Rank ${ivData.ivRank} — ideal range`);
      if (trendData.trend === 'Bullish') pros.push('Bullish trend');
      if (optionsLiquidity === 'High') pros.push('High options liquidity');
      if (trendData.trend === 'Bearish') cons.push('Bearish — adds risk');
      if (ivData.ivRank < 20) cons.push('Low IV — weak premiums');
      if (quote.price > 400) cons.push('Expensive LEAP capital');

      let leapSuggestion = '';
      const targetStrike = Math.round(quote.price * 0.82 / 5) * 5;
      const now = new Date();
      const jan2027 = `Jan ${now.getFullYear() + (now.getMonth() >= 6 ? 2 : 1)}`;
      leapSuggestion = `Buy ${jan2027} $${targetStrike}C (δ ~0.80)`;

      const shortStrike = Math.round(quote.price * 1.07 / 5) * 5;
      const shortCallSuggestion = `Sell 21-DTE $${shortStrike}C`;

      let verdict = '';
      if (pmccScore >= 80) verdict = 'Strong PMCC candidate';
      else if (pmccScore >= 65) verdict = 'Good PMCC candidate';
      else if (pmccScore >= 50) verdict = 'Marginal — trade with caution';
      else verdict = 'Poor PMCC setup currently';

      results.push({
        ticker,
        companyName:         quote.longName || quote.shortName,
        currentPrice:        quote.price,
        change1d:            quote.change1d,
        sector:              getSector(ticker),
        ivRank:              ivData.ivRank,
        ivLevel:             ivData.ivLevel,
        trend:               trendData.trend,
        ret1m:               trendData.ret1m,
        optionsLiquidity,
        leapSuggestion,
        leapCost:            leapCostEst,
        shortCallSuggestion,
        weeklyYield:         weeklyYieldEst,
        pmccScore,
        pros,
        cons,
        verdict,
      });
    } catch (e) {
      console.warn(`Skipping ${ticker}:`, e.message);
    }
  }

  await Promise.all(batch1.map(processTicker));
  await Promise.all(batch2.map(processTicker));

  // Sort by score descending
  results.sort((a, b) => b.pmccScore - a.pmccScore);

  return NextResponse.json({
    picks:       results.slice(0, 8),
    lastUpdated: new Date().toLocaleString(),
    marketNote:  `Scanned ${results.length} symbols. Top picks ranked by PMCC score. Data from Yahoo Finance.`,
    dataSource:  'Yahoo Finance (free, real-time)',
  });
}

function getSector(ticker) {
  const map = {
    AAPL:'Technology', MSFT:'Technology', NVDA:'Technology', AMD:'Technology',
    AMZN:'Consumer', GOOGL:'Technology', META:'Technology', NFLX:'Media',
    TSLA:'Automotive', CRM:'Technology', ORCL:'Technology', INTC:'Technology',
    QCOM:'Technology', MU:'Technology', AVGO:'Technology', COIN:'Crypto',
    PLTR:'Technology', HOOD:'Finance', SPY:'ETF', QQQ:'ETF',
  };
  return map[ticker] || 'Equity';
}
