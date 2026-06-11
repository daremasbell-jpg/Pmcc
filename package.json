const STORAGE_KEY = 'pmcc_positions_v3';

export function loadPositions() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function savePositions(positions) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {}
}

export function computeAlerts(pos) {
  const alerts = [];
  const activeCall = pos.callHistory?.find(c => c.status === 'open');
  if (!activeCall) return alerts;

  const dte   = Math.max(0, Math.ceil((new Date(activeCall.expiry) - new Date()) / 86400000));
  const price = pos.lastCheckPrice || 0;

  if (dte <= 0)       alerts.push({ level: 'critical', msg: 'Short call EXPIRED — close or roll immediately!' });
  else if (dte <= 3)  alerts.push({ level: 'critical', msg: `Only ${dte} DTE — roll or close NOW` });
  else if (dte <= 7)  alerts.push({ level: 'high',     msg: `${dte} DTE — time to plan your roll` });
  else if (dte <= 14) alerts.push({ level: 'medium',   msg: `${dte} DTE — monitor closely` });

  if (price > 0) {
    const sc  = Number(activeCall.strike);
    const pct = ((price - sc) / sc) * 100;
    if (price >= sc)   alerts.push({ level: 'critical', msg: `$${price} is ITM above $${sc} strike — assignment risk!` });
    else if (pct >= -3) alerts.push({ level: 'high',    msg: `Price within 3% of short strike $${sc}` });
    else if (pct >= -8) alerts.push({ level: 'medium',  msg: `Price approaching short strike $${sc}` });
  }

  return alerts;
}
