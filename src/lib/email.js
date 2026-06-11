/**
 * Email alerts via Resend (free tier: 3,000 emails/month).
 * Set RESEND_API_KEY in your Vercel environment variables.
 * Set ALERT_EMAIL to the address you want alerts sent to.
 */

export async function sendAlertEmail({ to, subject, positions, date }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not set in environment variables');

  const html = buildEmailHTML({ positions, date });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    'PMCC Analyzer <alerts@pmcc-alerts.com>',
      to:      [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || `Resend error ${res.status}`);
  }

  return await res.json();
}

function urgencyColor(urgency) {
  return { Critical: '#ff4444', High: '#ff8c00', Medium: '#f0c040', Low: '#00e5a0' }[urgency] || '#888';
}

function urgencyEmoji(urgency) {
  return { Critical: '🚨', High: '⚠️', Medium: '📢', Low: '✅' }[urgency] || 'ℹ️';
}

function buildEmailHTML({ positions, date }) {
  const urgent   = positions.filter(p => p.urgency === 'Critical' || p.urgency === 'High');
  const moderate = positions.filter(p => p.urgency === 'Medium');
  const healthy  = positions.filter(p => p.urgency === 'Low' || !p.urgency);

  const positionRows = positions.map(p => `
    <tr style="border-bottom: 1px solid #1e2535;">
      <td style="padding: 12px 16px;">
        <div style="font-family: monospace; font-size: 16px; font-weight: 800; color: #ffffff;">${p.ticker}</div>
        <div style="font-size: 11px; color: #666; margin-top: 2px;">LEAP $${p.leapStrike}C · ${p.leapExpiry}</div>
      </td>
      <td style="padding: 12px 16px; text-align: center;">
        <div style="font-family: monospace; font-size: 15px; font-weight: 700; color: #ffffff;">$${p.currentPrice || '—'}</div>
        ${p.change1d != null ? `<div style="font-size: 11px; color: ${p.change1d >= 0 ? '#00e5a0' : '#ff5555'};">${p.change1d >= 0 ? '+' : ''}${p.change1d}%</div>` : ''}
      </td>
      <td style="padding: 12px 16px; text-align: center;">
        <div style="font-family: monospace; font-size: 14px; color: ${p.dte <= 7 ? '#ff5555' : p.dte <= 14 ? '#f0c040' : '#00e5a0'}; font-weight: 700;">${p.dte != null ? `${p.dte}d` : '—'}</div>
        <div style="font-size: 10px; color: #555;">DTE</div>
      </td>
      <td style="padding: 12px 16px; text-align: center;">
        <span style="background: ${urgencyColor(p.urgency)}22; border: 1px solid ${urgencyColor(p.urgency)}55; color: ${urgencyColor(p.urgency)}; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 700;">
          ${urgencyEmoji(p.urgency)} ${p.urgency || 'OK'}
        </span>
      </td>
      <td style="padding: 12px 16px;">
        <div style="font-size: 12px; color: #aaa; line-height: 1.5;">${p.summary || p.shortCallStatus || '—'}</div>
        ${p.rollSuggestion && p.rollSuggestion !== 'N/A' ? `<div style="font-size: 11px; color: #60a5fa; margin-top: 4px;">🔄 ${p.rollSuggestion}</div>` : ''}
      </td>
      <td style="padding: 12px 16px; text-align: right;">
        <div style="font-size: 11px; color: #555;">Collected</div>
        <div style="font-family: monospace; font-size: 13px; color: #00e5a0; font-weight: 700;">$${p.totalCollected || '0'}</div>
        <div style="font-size: 10px; color: #444;">adj basis: $${p.adjustedBasis || '—'}</div>
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0c10;font-family:'Segoe UI',system-ui,sans-serif;color:#ffffff;">

  <div style="max-width:700px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
      <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#00e5a0,#0070f3);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">⚡</div>
      <div>
        <div style="font-size:20px;font-weight:800;letter-spacing:-0.5px;">PMCC Daily Alert</div>
        <div style="font-size:12px;color:#555;">${date} · ${positions.length} active position${positions.length !== 1 ? 's' : ''}</div>
      </div>
    </div>

    <!-- Summary banner -->
    ${urgent.length > 0 ? `
    <div style="background:rgba(255,68,68,0.1);border:1px solid rgba(255,68,68,0.3);border-radius:10px;padding:14px 16px;margin-bottom:16px;">
      <div style="font-size:14px;font-weight:700;color:#ff4444;margin-bottom:6px;">🚨 ${urgent.length} Position${urgent.length > 1 ? 's' : ''} Need Immediate Action</div>
      ${urgent.map(p => `<div style="font-size:12px;color:#ff8080;margin-bottom:2px;">• <strong>${p.ticker}</strong>: ${p.summary || p.shortCallStatus}</div>`).join('')}
    </div>` : `
    <div style="background:rgba(0,229,160,0.07);border:1px solid rgba(0,229,160,0.2);border-radius:10px;padding:14px 16px;margin-bottom:16px;">
      <div style="font-size:14px;font-weight:700;color:#00e5a0;">✅ All Positions Healthy Today</div>
      <div style="font-size:12px;color:#555;margin-top:4px;">No urgent actions required.</div>
    </div>`}

    <!-- Position table -->
    <div style="background:#0f1219;border:1px solid #1e2535;border-radius:12px;overflow:hidden;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#0a0c10;border-bottom:1px solid #1e2535;">
            <th style="padding:10px 16px;text-align:left;font-size:10px;color:#444;letter-spacing:1.5px;font-weight:600;">POSITION</th>
            <th style="padding:10px 16px;text-align:center;font-size:10px;color:#444;letter-spacing:1.5px;font-weight:600;">PRICE</th>
            <th style="padding:10px 16px;text-align:center;font-size:10px;color:#444;letter-spacing:1.5px;font-weight:600;">DTE</th>
            <th style="padding:10px 16px;text-align:center;font-size:10px;color:#444;letter-spacing:1.5px;font-weight:600;">STATUS</th>
            <th style="padding:10px 16px;text-align:left;font-size:10px;color:#444;letter-spacing:1.5px;font-weight:600;">ACTION</th>
            <th style="padding:10px 16px;text-align:right;font-size:10px;color:#444;letter-spacing:1.5px;font-weight:600;">P&L</th>
          </tr>
        </thead>
        <tbody>
          ${positionRows}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="text-align:center;font-size:11px;color:#333;line-height:1.6;">
      <div>PMCC Analyzer · Daily Alert · ${date}</div>
      <div style="margin-top:4px;">⚠ For informational purposes only. Not financial advice.</div>
    </div>

  </div>
</body>
</html>`;
}
