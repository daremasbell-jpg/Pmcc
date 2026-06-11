import { NextResponse } from 'next/server';
import { loadUserData } from '@/lib/db';
import { getQuote } from '@/lib/yahoo';
import { sendAlertEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// This endpoint is called by Vercel Cron at 8am every day.
// It can also be called manually by visiting /api/alert-check?secret=YOUR_SECRET
export async function GET(request) {
  const { searchParams } = new URL(request.url);

  // Security: require a secret token to prevent unauthorized triggers
  const secret = searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const alertEmail = process.env.ALERT_EMAIL;
  const userId     = process.env.USER_ID;

  if (!alertEmail) return NextResponse.json({ error: 'ALERT_EMAIL not configured' }, { status: 500 });
  if (!userId)     return NextResponse.json({ error: 'USER_ID not configured' }, { status: 500 });

  try {
    // Load saved positions
    const userData  = await loadUserData(userId);
    const positions = (userData.positions || []).filter(p => p.status === 'active');

    if (positions.length === 0) {
      return NextResponse.json({ message: 'No active positions to check', sent: false });
    }

    // Check each position with live price
    const checked = await Promise.all(positions.map(async (pos) => {
      try {
        const quote      = await getQuote(pos.ticker);
        const activeCall = pos.callHistory?.find(c => c.status === 'open');
        const dte        = activeCall
          ? Math.max(0, Math.ceil((new Date(activeCall.expiry) - new Date()) / 86400000))
          : null;

        // Compute urgency
        let urgency = 'Low', shortCallStatus = 'Hold', rollSuggestion = 'N/A', summary = '';

        if (activeCall) {
          const sc  = Number(activeCall.strike);
          const pct = ((quote.price - sc) / sc) * 100;

          if (dte <= 0)        { urgency = 'Critical'; shortCallStatus = 'Close';    summary = 'Short call expired — close or roll now'; }
          else if (dte <= 3)   { urgency = 'Critical'; shortCallStatus = 'Roll Now'; summary = `Only ${dte} DTE — roll immediately`; }
          else if (dte <= 7)   { urgency = 'High';     shortCallStatus = 'Roll Soon'; summary = `${dte} DTE — begin planning your roll`; }
          else if (dte <= 14)  { urgency = 'Medium';   shortCallStatus = 'Monitor';  summary = `${dte} DTE — monitor closely`; }
          else                 {                                                      summary = `${dte} DTE — holding well`; }

          if (quote.price >= sc)     { urgency = 'Critical'; summary = `⚠ Price $${quote.price} is ITM above strike $${sc} — assignment risk!`; }
          else if (pct >= -3)        { if (urgency !== 'Critical') urgency = 'High'; summary = `Price within 3% of short strike $${sc}`; }

          const newStrike  = Math.round(quote.price * 1.07 / 5) * 5;
          rollSuggestion   = urgency === 'Critical' || urgency === 'High'
            ? `Roll to $${newStrike}C, 21 DTE`
            : 'N/A';
        } else {
          urgency = 'Medium';
          summary = 'No open short call — consider selling a new call';
        }

        // P&L tracking
        const totalCollected    = (pos.callHistory || []).reduce((s, c) => s + Number(c.premium || 0), 0);
        const adjustedBasis     = Math.max(0, Number(pos.leapCost) - totalCollected) * 100;

        return {
          ticker:         pos.ticker,
          leapStrike:     pos.leapStrike,
          leapExpiry:     pos.leapExpiry,
          currentPrice:   quote.price,
          change1d:       quote.change1d,
          dte,
          urgency,
          shortCallStatus,
          rollSuggestion,
          summary,
          totalCollected: (totalCollected * 100).toFixed(0),
          adjustedBasis:  adjustedBasis.toFixed(0),
        };
      } catch (e) {
        return { ticker: pos.ticker, urgency: 'Low', summary: `Could not fetch data: ${e.message}` };
      }
    }));

    // Sort by urgency
    const urgencyOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    checked.sort((a, b) => (urgencyOrder[a.urgency] ?? 4) - (urgencyOrder[b.urgency] ?? 4));

    const hasUrgent = checked.some(p => p.urgency === 'Critical' || p.urgency === 'High');
    const date      = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const subject   = hasUrgent
      ? `🚨 PMCC Alert — ${checked.filter(p => p.urgency === 'Critical' || p.urgency === 'High').length} Position(s) Need Action — ${date}`
      : `✅ PMCC Daily Summary — All Clear — ${date}`;

    await sendAlertEmail({ to: alertEmail, subject, positions: checked, date });

    return NextResponse.json({
      message:   'Alert email sent',
      sent:      true,
      positions: checked.length,
      urgent:    checked.filter(p => p.urgency === 'Critical' || p.urgency === 'High').length,
      to:        alertEmail,
    });

  } catch (err) {
    console.error('Alert check failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
