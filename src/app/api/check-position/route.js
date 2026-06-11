import { NextResponse } from 'next/server';
import { getQuote } from '@/lib/yahoo';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const pos = await request.json();
    if (!pos?.ticker) return NextResponse.json({ error: 'Position data required' }, { status: 400 });

    const quote = await getQuote(pos.ticker);
    const price = quote.price;

    const activeCall = pos.callHistory?.find(c => c.status === 'open');
    const dte = activeCall
      ? Math.max(0, Math.ceil((new Date(activeCall.expiry) - new Date()) / 86400000))
      : 0;

    const totalCollected = (pos.callHistory || []).reduce((s, c) => s + Number(c.premium || 0), 0);
    const adjustedBasis  = Math.max(0, Number(pos.leapCost) - totalCollected);

    // Determine urgency
    const alerts = [];
    let urgency = 'Low';
    let shortCallStatus = 'Hold';
    let leapStatus = 'Healthy';
    let rollSuggestion = 'N/A';
    let nextCallIdea = '';

    if (activeCall) {
      const sc  = Number(activeCall.strike);
      const pct = ((price - sc) / sc) * 100;

      if (dte <= 0) {
        alerts.push('Short call has expired — close or roll immediately');
        urgency = 'Critical'; shortCallStatus = 'Close';
      } else if (dte <= 3) {
        alerts.push(`Only ${dte} DTE remaining — act now`);
        urgency = 'Critical'; shortCallStatus = 'Roll Now';
      } else if (dte <= 7) {
        alerts.push(`${dte} DTE — begin planning your roll`);
        urgency = 'High'; shortCallStatus = 'Roll Soon';
      } else if (dte <= 14) {
        alerts.push(`${dte} DTE — monitor daily`);
        urgency = 'Medium'; shortCallStatus = 'Monitor';
      }

      if (price >= sc) {
        alerts.push(`⚠ Price $${price} is ABOVE short strike $${sc} — assignment risk!`);
        urgency = 'Critical'; shortCallStatus = 'Roll Now';
      } else if (pct >= -3) {
        alerts.push(`Price $${price} within 3% of short strike $${sc}`);
        if (urgency !== 'Critical') { urgency = 'High'; shortCallStatus = 'Roll Soon'; }
      }

      // Roll suggestion
      const newStrike = Math.round(price * 1.07 / 5) * 5;
      rollSuggestion = `Roll to $${newStrike}C, 21 DTE — collect additional premium`;
      nextCallIdea   = `$${newStrike}C · 21 DTE`;
    }

    // LEAP health check
    const leapStrike = Number(pos.leapStrike);
    if (price < leapStrike * 0.90) {
      leapStatus = 'Danger';
      alerts.push(`Price $${price} is significantly below LEAP strike $${leapStrike} — LEAP losing value`);
      if (urgency !== 'Critical') urgency = 'High';
    } else if (price < leapStrike * 0.97) {
      leapStatus = 'Monitor';
      alerts.push(`Price approaching LEAP strike — monitor closely`);
    }

    // P&L estimate
    const leapCostDollars    = Number(pos.leapCost) * 100;
    const collectedDollars   = totalCollected * 100;
    const currentLeapValue   = Math.max(0, (price - leapStrike) + Number(pos.leapCost) * 0.7) * 100;
    const pnlEstimate        = `Premiums collected: $${collectedDollars.toFixed(0)} · Adjusted basis: $${(adjustedBasis * 100).toFixed(0)}`;

    const summaryParts = [];
    if (urgency === 'Low' || urgency === 'Medium') {
      summaryParts.push(`Position looks healthy at $${price}.`);
      if (activeCall) summaryParts.push(`Short call has ${dte} DTE — continue holding.`);
    } else {
      summaryParts.push(`Action needed: ${shortCallStatus} the short call.`);
      if (rollSuggestion !== 'N/A') summaryParts.push(rollSuggestion + '.');
    }

    return NextResponse.json({
      ticker:          pos.ticker,
      currentPrice:    price,
      change1d:        quote.change1d,
      priceSource:     'Yahoo Finance',
      dte,
      leapStatus,
      shortCallStatus,
      urgency,
      alerts,
      rollSuggestion,
      nextCallIdea,
      summary:         summaryParts.join(' '),
      pnlEstimate,
      adjustedBasis:   `$${(adjustedBasis * 100).toFixed(0)}`,
      totalCollected:  `$${collectedDollars.toFixed(0)}`,
    });

  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
