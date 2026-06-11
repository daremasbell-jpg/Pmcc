'use client';

export function ScoreRing({ score }) {
  const s = Number(score) || 0;
  const color = s >= 80 ? '#00e5a0' : s >= 60 ? '#f0c040' : '#ff5555';
  const r = 28, circ = 2 * Math.PI * r, fill = (Math.min(s, 100) / 100) * circ;
  return (
    <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
      <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color, fontSize: 18, fontWeight: 700, fontFamily: 'monospace', lineHeight: 1 }}>{s}</span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, letterSpacing: 1 }}>SCORE</span>
      </div>
    </div>
  );
}

export function Badge({ label, color }) {
  const map = {
    green:  ['rgba(0,229,160,0.12)',  'rgba(0,229,160,0.3)',  '#00e5a0'],
    yellow: ['rgba(240,192,64,0.12)', 'rgba(240,192,64,0.3)', '#f0c040'],
    red:    ['rgba(255,85,85,0.12)',  'rgba(255,85,85,0.3)',  '#ff5555'],
    blue:   ['rgba(96,165,250,0.12)', 'rgba(96,165,250,0.3)', '#60a5fa'],
    orange: ['rgba(251,146,60,0.12)', 'rgba(251,146,60,0.3)', '#fb923c'],
  };
  const [bg, border, text] = map[color] || map.blue;
  return (
    <span style={{ background: bg, border: `1px solid ${border}`, color: text,
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

export function Box({ label, value, sub, accent }) {
  return (
    <div style={{
      background: accent ? 'rgba(0,229,160,0.07)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${accent ? 'rgba(0,229,160,0.2)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 10, padding: '9px 12px',
    }}>
      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: 1.5, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: accent ? '#00e5a0' : '#fff' }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function AlertPill({ level, msg }) {
  const styles = {
    critical: ['rgba(255,85,85,0.15)',  'rgba(255,85,85,0.4)',  '#ff5555', '🚨'],
    high:     ['rgba(251,146,60,0.15)', 'rgba(251,146,60,0.4)', '#fb923c', '⚠️'],
    medium:   ['rgba(240,192,64,0.12)', 'rgba(240,192,64,0.3)', '#f0c040', '📢'],
    low:      ['rgba(96,165,250,0.1)',  'rgba(96,165,250,0.25)','#60a5fa', 'ℹ️'],
  };
  const [bg, border, text, icon] = styles[level] || styles.low;
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8,
      padding: '7px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span style={{ flexShrink: 0, fontSize: 12 }}>{icon}</span>
      <span style={{ fontSize: 12, color: text, lineHeight: 1.5 }}>{msg}</span>
    </div>
  );
}

export function Spinner({ size = 44, color = '#00e5a0' }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: '3px solid rgba(255,255,255,0.08)',
      borderTopColor: color,
      animation: 'spin 0.8s linear infinite',
    }} />
  );
}

export function FormInput({ label, placeholder, value, onChange, type = 'text', required }) {
  return (
    <div>
      {label && (
        <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4,
          display: 'block', letterSpacing: 0.5 }}>
          {label}{required && ' *'}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
          padding: '9px 12px', color: '#fff', fontSize: 13,
          fontFamily: 'monospace', boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

export function ErrorBox({ message, onRetry, countdown }) {
  return (
    <div style={{ background: 'rgba(255,85,85,0.1)', border: '1px solid rgba(255,85,85,0.3)',
      borderRadius: 10, padding: '12px 14px', color: '#ff8080', fontSize: 12, marginBottom: 16 }}>
      <div style={{ marginBottom: countdown > 0 ? 8 : 0 }}>⚠ {message}</div>
      {countdown > 0
        ? <div style={{ color: '#f0c040', fontSize: 11 }}>⏳ Retry in {countdown}s…</div>
        : onRetry && (
          <button onClick={onRetry} style={{ background: 'none', border: '1px solid #ff8080',
            color: '#ff8080', borderRadius: 6, padding: '3px 12px', fontSize: 11,
            cursor: 'pointer', marginTop: 6 }}>
            Retry Now
          </button>
        )
      }
    </div>
  );
}
