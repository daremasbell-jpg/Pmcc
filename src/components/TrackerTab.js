'use client';
import { useState, useEffect, useCallback } from 'react';
import { loadPositions, savePositions, computeAlerts } from '@/lib/storage';

const sleep = ms => new Promise(r => setTimeout(r, ms));

function Box({ label, value, sub, accent }) {
  return (
    <div style={{ background: accent ? 'rgba(0,229,160,0.07)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${accent ? 'rgba(0,229,160,0.2)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 9, padding: '8px 11px' }}>
      <div style={{ color: 'rgba(255,255,255,0.33)', fontSize: 9, letterSpacing: 1.5, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: accent ? '#00e5a0' : '#fff' }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.33)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function AlertPill({ level, msg }) {
  const s = {
    critical: ['rgba(255,85,85,0.15)',  'rgba(255,85,85,0.4)',  '#ff5555', '🚨'],
    high:     ['rgba(251,146,60,0.15)', 'rgba(251,146,60,0.4)', '#fb923c', '⚠️'],
    medium:   ['rgba(240,192,64,0.12)', 'rgba(240,192,64,0.3)', '#f0c040', '📢'],
    low:      ['rgba(96,165,250,0.1)',  'rgba(96,165,250,0.25)','#60a5fa', 'ℹ️'],
  }[level] || ['rgba(96,165,250,0.1)', 'rgba(96,165,250,0.25)', '#60a5fa', 'ℹ️'];
  return (
    <div style={{ background: s[0], border: `1px solid ${s[1]}`, borderRadius: 8, padding: '6px 11px', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
      <span style={{ flexShrink: 0, fontSize: 11 }}>{s[3]}</span>
      <span style={{ fontSize: 11, color: s[2], lineHeight: 1.5 }}>{msg}</span>
    </div>
  );
}

function FormInput({ label, placeholder, value, onChange, type = 'text', required }) {
  return (
    <div>
      {label && <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', marginBottom: 3, display: 'block', letterSpacing: 0.5 }}>{label}{required && ' *'}</label>}
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 7, padding: '8px 10px', color: '#fff', fontSize: 12, fontFamily: 'monospace', boxSizing: 'border-box' }} />
    </div>
  );
}

function CallHistoryTable({ calls, onCloseCall }) {
  if (!calls?.length) return <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>No calls logged yet.</div>;
  const sc = { open: '#00e5a0', expired: '#60a5fa', closed: 'rgba(255,255,255,0.3)', assigned: '#ff5555' };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>{['#','Strike','Expiry','DTE','Premium','Status',''].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '4px 7px', color: 'rgba(255,255,255,0.28)',
              fontSize: 9, letterSpacing: 0.5, borderBottom: '1px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap' }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {calls.map((c, i) => (
            <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={{ padding: '6px 7px', color: 'rgba(255,255,255,0.28)' }}>{i + 1}</td>
              <td style={{ padding: '6px 7px', fontFamily: 'monospace', color: '#fff', fontWeight: 600 }}>${c.strike}</td>
              <td style={{ padding: '6px 7px', color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap' }}>{c.expiry}</td>
              <td style={{ padding: '6px 7px', color: 'rgba(255,255,255,0.45)' }}>{c.dteSold || '—'}</td>
              <td style={{ padding: '6px 7px', fontFamily: 'monospace', color: '#00e5a0', fontWeight: 600 }}>${Number(c.premium).toFixed(2)}</td>
              <td style={{ padding: '6px 7px' }}><span style={{ color: sc[c.status] || '#fff', fontSize: 10, fontWeight: 600 }}>{c.status}</span></td>
              <td style={{ padding: '6px 7px' }}>
                {c.status === 'open' && (
                  <button onClick={() => onCloseCall(c.id)} style={{ background: 'rgba(0,229,160,0.1)',
                    border: '1px solid rgba(0,229,160,0.25)', borderRadius: 5, padding: '2px 8px',
                    color: '#00e5a0', fontSize: 10, cursor: 'pointer' }}>Close</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AddCallForm({ ticker, suggestion, onAdd, onCancel }) {
  const [f, setF] = useState({ strike: suggestion?.strike || '', expiry: '', premium: suggestion?.premium || '', dteSold: suggestion?.dte || '' });
  const [err, setErr] = useState('');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const submit = () => {
    if (!f.strike || !f.expiry || !f.premium) { setErr('Fill in strike, expiry and premium'); return; }
    onAdd({ id: Date.now().toString(), strike: Number(f.strike), expiry: f.expiry, premium: Number(f.premium), dteSold: f.dteSold || '—', status: 'open', soldDate: new Date().toISOString().split('T')[0] });
  };
  return (
    <div style={{ background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', marginBottom: 8 }}>📉 Sell New Call on {ticker}</div>
      {suggestion?.text && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 8, fontStyle: 'italic' }}>Suggestion: {suggestion.text}</div>}
      {err && <div style={{ color: '#ff8080', fontSize: 11, marginBottom: 6 }}>⚠ {err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 7, marginBottom: 8 }}>
        <FormInput label="STRIKE *"       type="number" placeholder="185"  value={f.strike}  onChange={v => set('strike', v)} />
        <FormInput label="EXPIRY *"       type="date"                       value={f.expiry}  onChange={v => set('expiry', v)} />
        <FormInput label="PREMIUM/SHARE *" type="number" placeholder="0.85" value={f.premium} onChange={v => set('premium', v)} />
        <FormInput label="DTE SOLD"       type="number" placeholder="21"   value={f.dteSold} onChange={v => set('dteSold', v)} />
      </div>
      <div style={{ display: 'flex', gap: 7 }}>
        <button onClick={submit} style={{ flex: 1, background: 'linear-gradient(135deg,#60a5fa,#0070f3)', border: 'none', borderRadius: 7, padding: '8px', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Log Call</button>
        <button onClick={onCancel} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

function AddPositionForm({ onAdd, onCancel }) {
  const today = new Date().toISOString().split('T')[0];
  const [f, setF] = useState({ ticker: '', leapStrike: '', leapExpiry: '', leapCost: '', scStrike: '', scExpiry: '', scPremium: '', scDTE: '', openDate: today, notes: '' });
  const [err, setErr] = useState('');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const submit = () => {
    if (!f.ticker || !f.leapStrike || !f.leapExpiry || !f.leapCost) { setErr('Fill in ticker and all LEAP fields'); return; }
    const firstCall = (f.scStrike && f.scExpiry && f.scPremium) ? [{
      id: Date.now().toString(), strike: Number(f.scStrike), expiry: f.scExpiry,
      premium: Number(f.scPremium), dteSold: f.scDTE || '—', status: 'open', soldDate: f.openDate,
    }] : [];
    onAdd({ id: Date.now().toString(), ticker: f.ticker.toUpperCase().trim(), leapStrike: Number(f.leapStrike), leapExpiry: f.leapExpiry, leapCost: Number(f.leapCost), openDate: f.openDate, notes: f.notes, callHistory: firstCall, status: 'active', lastChecked: null, lastCheckData: null, lastCheckPrice: null });
  };
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,229,160,0.22)', borderRadius: 14, padding: 18 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#00e5a0', marginBottom: 14 }}>➕ Add New PMCC Position</div>
      {err && <div style={{ background: 'rgba(255,85,85,0.1)', border: '1px solid rgba(255,85,85,0.3)', borderRadius: 7, padding: '7px 10px', color: '#ff8080', fontSize: 11, marginBottom: 10 }}>⚠ {err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <FormInput label="TICKER *" placeholder="NVDA" value={f.ticker} onChange={v => set('ticker', v.toUpperCase())} />
        <FormInput label="OPEN DATE" type="date" value={f.openDate} onChange={v => set('openDate', v)} />
      </div>
      <div style={{ background: 'rgba(0,229,160,0.04)', border: '1px solid rgba(0,229,160,0.12)', borderRadius: 9, padding: 12, marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: '#00e5a0', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>📈 LONG LEAP</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <FormInput label="STRIKE *"     type="number" placeholder="150"   value={f.leapStrike} onChange={v => set('leapStrike', v)} />
          <FormInput label="EXPIRY *"     type="date"                       value={f.leapExpiry} onChange={v => set('leapExpiry', v)} />
          <FormInput label="COST/SHARE *" type="number" placeholder="24.00" value={f.leapCost}   onChange={v => set('leapCost', v)} />
        </div>
      </div>
      <div style={{ background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.12)', borderRadius: 9, padding: 12, marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: '#60a5fa', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
          📉 FIRST SHORT CALL <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.28)' }}>(optional)</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          <FormInput label="STRIKE"        type="number" placeholder="185"  value={f.scStrike}   onChange={v => set('scStrike', v)} />
          <FormInput label="EXPIRY"        type="date"                      value={f.scExpiry}   onChange={v => set('scExpiry', v)} />
          <FormInput label="PREMIUM/SHARE" type="number" placeholder="0.85" value={f.scPremium}  onChange={v => set('scPremium', v)} />
          <FormInput label="DTE SOLD"      type="number" placeholder="21"   value={f.scDTE}      onChange={v => set('scDTE', v)} />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <FormInput label="NOTES (optional)" placeholder="Earnings, support levels…" value={f.notes} onChange={v => set('notes', v)} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={submit} style={{ flex: 1, background: 'linear-gradient(135deg,#00e5a0,#0070f3)', border: 'none', borderRadius: 9, padding: '10px', color: '#000', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Save Position</button>
        <button onClick={onCancel} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, color: 'rgba(255,255,255,0.45)', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

function PositionCard({ pos, onUpdate, onClose, onDelete, checking, onCheck }) {
  const [expanded, setExpanded] = useState(false);
  const [showAddCall, setShowAddCall] = useState(false);
  const activeCall = pos.callHistory?.find(c => c.status === 'open');
  const allCalls   = pos.callHistory || [];
  const alerts     = computeAlerts(pos);
  const cd         = pos.lastCheckData;
  const totalPremiumPS = allCalls.reduce((s, c) => s + Number(c.premium || 0), 0);
  const leapCostDollars = (Number(pos.leapCost) * 100).toFixed(0);
  const totalDollars = (totalPremiumPS * 100).toFixed(0);
  const adjBasis = Math.max(0, Number(pos.leapCost) - totalPremiumPS) * 100;
  const recoupedPct = Math.min(100, (totalPremiumPS / Number(pos.leapCost)) * 100).toFixed(0);
  const dte = activeCall ? Math.max(0, Math.ceil((new Date(activeCall.expiry) - new Date()) / 86400000)) : null;
  const dteColor = dte === null ? 'rgba(255,255,255,0.3)' : dte <= 3 ? '#ff5555' : dte <= 7 ? '#fb923c' : dte <= 14 ? '#f0c040' : '#00e5a0';
  const hasCrit = alerts.some(a => a.level === 'critical');
  const hasHigh = alerts.some(a => a.level === 'high');

  const handleAddCall    = call => { onUpdate({ ...pos, callHistory: [...allCalls, call] }); setShowAddCall(false); };
  const handleCloseCall  = id   => onUpdate({ ...pos, callHistory: allCalls.map(c => c.id === id ? { ...c, status: 'closed',  closedDate: new Date().toISOString().split('T')[0] } : c) });
  const handleExpireCall = id   => onUpdate({ ...pos, callHistory: allCalls.map(c => c.id === id ? { ...c, status: 'expired' } : c) });
  const nextSuggestion   = cd?.nextCallIdea ? { text: cd.nextCallIdea } : null;

  return (
    <div style={{ background: hasCrit ? 'rgba(255,85,85,0.04)' : hasHigh ? 'rgba(251,146,60,0.03)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${hasCrit ? 'rgba(255,85,85,0.28)' : hasHigh ? 'rgba(251,146,60,0.2)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 800, color: '#fff' }}>{pos.ticker}</span>
            {activeCall
              ? <span style={{ fontFamily: 'monospace', fontSize: 11, color: dteColor, background: `${dteColor}18`, border: `1px solid ${dteColor}44`, padding: '1px 8px', borderRadius: 20, fontWeight: 700 }}>{dte}d left</span>
              : <span style={{ fontSize: 10, color: '#f0c040', background: 'rgba(240,192,64,0.1)', border: '1px solid rgba(240,192,64,0.25)', padding: '1px 8px', borderRadius: 20 }}>No open call</span>
            }
            <span style={{ fontSize: 10, color: '#60a5fa', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', padding: '1px 8px', borderRadius: 20 }}>{allCalls.length} call{allCalls.length !== 1 ? 's' : ''} sold</span>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>LEAP ${pos.leapStrike}C · {pos.leapExpiry} · opened {pos.openDate}</div>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          <button onClick={() => onCheck(pos)} disabled={checking}
            style={{ background: checking ? 'rgba(255,255,255,0.04)' : 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: 7, padding: '5px 9px', color: checking ? 'rgba(255,255,255,0.3)' : '#00e5a0', fontSize: 10, cursor: checking ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            {checking ? <><div style={{ width: 9, height: 9, border: '2px solid rgba(0,229,160,0.2)', borderTopColor: '#00e5a0', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />…</> : '🔄 Check'}
          </button>
          <button onClick={() => setExpanded(e => !e)}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '5px 9px', color: 'rgba(255,255,255,0.45)', fontSize: 12, cursor: 'pointer' }}>
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {(expanded ? alerts : alerts.slice(0, 1)).map((a, i) => <AlertPill key={i} level={a.level} msg={a.msg} />)}
          {!expanded && alerts.length > 1 && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', cursor: 'pointer' }} onClick={() => setExpanded(true)}>+{alerts.length - 1} more</div>}
        </div>
      )}

      {/* Financials */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 12 }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: 1.5, marginBottom: 8 }}>FINANCIALS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7, marginBottom: 10 }}>
          <Box label="LEAP COST"  value={`$${leapCostDollars}`} />
          <Box label="COLLECTED"  value={`$${totalDollars}`} accent />
          <Box label="ADJ BASIS"  value={`$${adjBasis.toFixed(0)}`} />
          <Box label="RECOUPED"   value={`${recoupedPct}%`} accent={Number(recoupedPct) >= 50} />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)' }}>Cost basis recovery</span>
            <span style={{ fontSize: 9, color: '#00e5a0', fontFamily: 'monospace' }}>{recoupedPct}%</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 3, height: 5 }}>
            <div style={{ width: `${recoupedPct}%`, height: '100%', background: 'linear-gradient(90deg,#0070f3,#00e5a0)', borderRadius: 3, transition: 'width 1s ease' }} />
          </div>
        </div>
      </div>

      {/* Active short call */}
      {activeCall && (
        <div style={{ background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.18)', borderRadius: 9, padding: 11 }}>
          <div style={{ fontSize: 9, color: '#60a5fa', letterSpacing: 1.5, marginBottom: 7, fontWeight: 700 }}>📉 CURRENT SHORT CALL</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7, marginBottom: 8 }}>
            <Box label="STRIKE"  value={`$${activeCall.strike}`} />
            <Box label="EXPIRES" value={activeCall.expiry?.slice(5)} />
            <Box label="DTE"     value={`${dte}d`} />
            <Box label="PREMIUM" value={`$${(Number(activeCall.premium) * 100).toFixed(0)}`} accent />
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <button onClick={() => handleCloseCall(activeCall.id)} style={{ flex: 1, background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.22)', borderRadius: 7, padding: '7px', color: '#00e5a0', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>✓ Close (bought back)</button>
            <button onClick={() => handleExpireCall(activeCall.id)} style={{ flex: 1, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.22)', borderRadius: 7, padding: '7px', color: '#60a5fa', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>✓ Expired worthless</button>
          </div>
        </div>
      )}

      {/* AI/Live check result */}
      {cd && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: 1 }}>LAST CHECK</span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{pos.lastChecked ? new Date(pos.lastChecked).toLocaleString() : '—'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7, marginBottom: 8 }}>
            <Box label="PRICE"   value={cd.currentPrice ? `$${cd.currentPrice}` : '—'} accent={!!cd.currentPrice} />
            <Box label="LEAP"    value={cd.leapStatus || '—'} accent={cd.leapStatus === 'Healthy'} />
            <Box label="STATUS"  value={cd.shortCallStatus || '—'} />
          </div>
          {cd.rollSuggestion && cd.rollSuggestion !== 'N/A' && (
            <div style={{ background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 7, padding: '7px 10px', fontSize: 11, color: '#93c5fd', marginBottom: 7 }}>
              🔄 {cd.rollSuggestion}
            </div>
          )}
          {cd.summary && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: 5 }}>{cd.summary}</div>}
          {cd.pnlEstimate && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>{cd.pnlEstimate}</div>}
        </div>
      )}

      {/* Sell next call */}
      {!activeCall && !showAddCall && (
        <button onClick={() => setShowAddCall(true)} style={{ background: 'linear-gradient(135deg,rgba(96,165,250,0.13),rgba(0,112,243,0.13))', border: '1px solid rgba(96,165,250,0.28)', borderRadius: 9, padding: '9px', color: '#60a5fa', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
          📉 Sell Next Call Against This LEAP
        </button>
      )}
      {showAddCall && <AddCallForm ticker={pos.ticker} suggestion={nextSuggestion} onAdd={handleAddCall} onCancel={() => setShowAddCall(false)} />}

      {/* Expanded */}
      {expanded && (
        <>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginBottom: 7 }}>CALL HISTORY ({allCalls.length})</div>
            <CallHistoryTable calls={allCalls} onCloseCall={handleCloseCall} />
          </div>
          {activeCall && !showAddCall && (
            <button onClick={() => setShowAddCall(true)} style={{ background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.18)', borderRadius: 7, padding: '7px', color: '#60a5fa', fontSize: 11, cursor: 'pointer' }}>
              + Add another call (roll)
            </button>
          )}
          {pos.notes && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.33)', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>📝 {pos.notes}</div>}
          <div style={{ display: 'flex', gap: 7, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
            <button onClick={() => onClose(pos.id)} style={{ flex: 1, background: 'rgba(0,229,160,0.07)', border: '1px solid rgba(0,229,160,0.18)', borderRadius: 7, padding: '7px', color: '#00e5a0', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>✓ Close Position</button>
            <button onClick={() => onDelete(pos.id)} style={{ padding: '7px 12px', background: 'rgba(255,85,85,0.07)', border: '1px solid rgba(255,85,85,0.18)', borderRadius: 7, color: '#ff8080', fontSize: 11, cursor: 'pointer' }}>🗑</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function TrackerTab() {
  const [positions, setPositions] = useState([]);
  const [showForm,   setShowForm]   = useState(false);
  const [checkingId, setCheckingId] = useState(null);
  const [checkError, setCheckError] = useState(null);
  const [filter,     setFilter]     = useState('active');

  useEffect(() => { setPositions(loadPositions()); }, []);
  useEffect(() => { savePositions(positions); }, [positions]);

  const addPosition    = pos     => { setPositions(p => [pos, ...p]); setShowForm(false); };
  const updatePosition = updated => setPositions(p => p.map(x => x.id === updated.id ? updated : x));
  const closePosition  = id      => setPositions(p => p.map(x => x.id === id ? { ...x, status: 'closed', closedDate: new Date().toISOString().split('T')[0] } : x));
  const deletePosition = id      => setPositions(p => p.filter(x => x.id !== id));

  const checkPosition = async (pos) => {
    setCheckingId(pos.id); setCheckError(null);
    try {
      const res  = await fetch('/api/check-position', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pos) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check failed');
      updatePosition({ ...pos, lastChecked: new Date().toISOString(), lastCheckData: data, lastCheckPrice: data.currentPrice || pos.lastCheckPrice });
    } catch(e) { setCheckError(`${pos.ticker}: ${e.message}`); }
    setCheckingId(null);
  };

  const checkAll = async () => {
    const active = positions.filter(p => p.status === 'active');
    for (let i = 0; i < active.length; i++) {
      await checkPosition(active[i]);
      if (i < active.length - 1) await sleep(1000);
    }
  };

  const filtered     = positions.filter(p => filter === 'all' ? true : p.status === filter);
  const activeCount  = positions.filter(p => p.status === 'active').length;
  const urgentCount  = positions.filter(p => p.status === 'active' && computeAlerts(p).some(a => a.level === 'critical' || a.level === 'high')).length;
  const totalCollected = positions.filter(p => p.status === 'active').reduce((s, p) => s + (p.callHistory || []).reduce((a, c) => a + Number(c.premium || 0), 0) * 100, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7 }}>
        {[
          { val: activeCount, label: 'ACTIVE', bg: 'rgba(0,229,160,0.06)', border: 'rgba(0,229,160,0.15)', color: '#00e5a0' },
          { val: urgentCount, label: 'ALERTS', bg: urgentCount > 0 ? 'rgba(255,85,85,0.08)' : 'rgba(255,255,255,0.03)', border: urgentCount > 0 ? 'rgba(255,85,85,0.22)' : 'rgba(255,255,255,0.07)', color: urgentCount > 0 ? '#ff5555' : 'rgba(255,255,255,0.22)' },
          { val: `$${totalCollected.toFixed(0)}`, label: 'COLLECTED', bg: 'rgba(0,229,160,0.04)', border: 'rgba(0,229,160,0.12)', color: '#00e5a0' },
          { val: positions.filter(p => p.status === 'closed').length, label: 'CLOSED', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' },
        ].map(({ val, label, bg, border, color }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 9, padding: '9px 10px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 800, color }}>{val}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.33)', letterSpacing: 1 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setShowForm(f => !f)} style={{ background: showForm ? 'rgba(255,255,255,0.07)' : 'linear-gradient(135deg,#00e5a0,#0070f3)', border: 'none', borderRadius: 9, padding: '8px 14px', color: showForm ? 'rgba(255,255,255,0.5)' : '#000', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
          {showForm ? '✕ Cancel' : '➕ Add Position'}
        </button>
        {activeCount > 0 && (
          <button onClick={checkAll} disabled={checkingId !== null} style={{ background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: 9, padding: '8px 14px', color: '#00e5a0', fontSize: 12, cursor: 'pointer', fontWeight: 600, opacity: checkingId ? 0.5 : 1 }}>
            🔄 Check All
          </button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
          {['active', 'closed', 'all'].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{ background: filter === s ? 'rgba(255,255,255,0.1)' : 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '5px 10px', color: filter === s ? '#fff' : 'rgba(255,255,255,0.33)', fontSize: 10, cursor: 'pointer', textTransform: 'capitalize' }}>{s}</button>
          ))}
        </div>
      </div>

      {showForm && <AddPositionForm onAdd={addPosition} onCancel={() => setShowForm(false)} />}
      {checkError && <div style={{ background: 'rgba(255,85,85,0.1)', border: '1px solid rgba(255,85,85,0.3)', borderRadius: 9, padding: '9px 12px', color: '#ff8080', fontSize: 11 }}>⚠ {checkError}</div>}

      {filtered.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
          <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13 }}>
            {filter === 'active' ? 'No active positions. Add one to start tracking.' : `No ${filter} positions.`}
          </div>
        </div>
      )}

      {filtered.map(pos => (
        <PositionCard key={pos.id} pos={pos} onUpdate={updatePosition} onClose={closePosition} onDelete={deletePosition} onCheck={checkPosition} checking={checkingId === pos.id} />
      ))}
    </div>
  );
}
