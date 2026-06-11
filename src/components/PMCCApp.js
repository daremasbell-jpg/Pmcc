'use client';
import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';

const TrackerTab = dynamic(() => import('./TrackerTab'), { ssr: false });

// ─── SHARED UI ────────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const s = Number(score) || 0;
  const color = s >= 80 ? '#00e5a0' : s >= 60 ? '#f0c040' : '#ff5555';
  const r = 26, circ = 2 * Math.PI * r, fill = (Math.min(s, 100) / 100) * circ;
  return (
    <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
      <svg width="68" height="68" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color, fontSize: 17, fontWeight: 700, fontFamily: 'monospace', lineHeight: 1 }}>{s}</span>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 8, letterSpacing: 1 }}>SCORE</span>
      </div>
    </div>
  );
}

function Badge({ label, color }) {
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
      padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

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

function Spinner({ size = 40 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%',
      border: '3px solid rgba(255,255,255,0.08)', borderTopColor: '#00e5a0',
      animation: 'spin 0.8s linear infinite' }} />
  );
}

function ErrorBox({ message, onRetry }) {
  return (
    <div style={{ background: 'rgba(255,85,85,0.1)', border: '1px solid rgba(255,85,85,0.3)',
      borderRadius: 10, padding: '12px 14px', color: '#ff8080', fontSize: 12, marginBottom: 16 }}>
      ⚠ {message}
      {onRetry && (
        <button onClick={onRetry} style={{ marginLeft: 12, background: 'none',
          border: '1px solid #ff8080', color: '#ff8080', borderRadius: 6,
          padding: '2px 10px', fontSize: 11, cursor: 'pointer' }}>
          Retry
        </button>
      )}
    </div>
  );
}

// ─── RECOMMEND CARD ───────────────────────────────────────────────────────────
function RecommendCard({ pick, index }) {
  const s  = Number(pick.pmccScore) || 0;
  const sc = s >= 80 ? '#00e5a0' : s >= 65 ? '#f0c040' : '#ff5555';
  const tc = pick.trend === 'Bullish' ? 'green' : pick.trend === 'Bearish' ? 'red' : 'yellow';
  const changeColor = pick.change1d >= 0 ? '#00e5a0' : '#ff5555';
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
      animation: `fadeUp 0.4s ease ${index * 0.06}s both` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 19, fontWeight: 800, color: '#fff' }}>{pick.ticker}</span>
            <Badge label={pick.trend} color={tc} />
          </div>
          <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11 }}>{pick.companyName} · {pick.sector}</div>
        </div>
        <ScoreRing score={s} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
        <Box label="PRICE" value={`$${pick.currentPrice}`}
          sub={<span style={{ color: changeColor }}>{pick.change1d >= 0 ? '+' : ''}{pick.change1d}% today</span>} />
        <Box label="IV RANK" value={`${pick.ivRank}`} sub={pick.ivLevel} />
        <Box label="LEAP COST EST" value={pick.leapCost} />
        <Box label="OPTIONS" value={pick.optionsLiquidity} accent={pick.optionsLiquidity === 'High'} />
      </div>
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginBottom: 5 }}>SUGGESTED SETUP</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 3 }}>📈 {pick.leapSuggestion}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>📉 {pick.shortCallSuggestion}</div>
      </div>
      {pick.pros?.length > 0 && (
        <div>{pick.pros.slice(0, 2).map((p, i) => (
          <div key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>✓ {p}</div>
        ))}</div>
      )}
      <div style={{ background: s >= 80 ? 'rgba(0,229,160,0.07)' : s >= 65 ? 'rgba(240,192,64,0.07)' : 'rgba(255,85,85,0.07)',
        border: `1px solid ${sc}33`, borderRadius: 8, padding: '7px 11px', fontSize: 11, color: sc, fontStyle: 'italic' }}>
        {pick.verdict}
      </div>
    </div>
  );
}

// ─── ANALYSIS VIEW ────────────────────────────────────────────────────────────
function AnalysisView({ data, onRefresh }) {
  const rm  = { 'STRONG BUY': '#00e5a0', 'BUY': '#4ade80', 'NEUTRAL': '#f0c040', 'AVOID': '#ff5555' };
  const rc  = rm[data.recommendation] || '#60a5fa';
  const score = Number(data.pmccScore) || 0;
  const changeColor = data.change1d >= 0 ? '#00e5a0' : '#ff5555';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'fadeUp 0.4s ease both' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontFamily: 'monospace', fontSize: 26, color: '#fff' }}>{data.ticker}</h2>
            <div style={{ padding: '3px 12px', borderRadius: 20, background: `${rc}22`, border: `1px solid ${rc}55`, color: rc, fontSize: 12, fontWeight: 700 }}>
              {data.recommendation}
            </div>
            {data._fromCache && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '2px 8px' }}>
                📦 cached {data._cachedAt}
              </span>
            )}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{data.companyName}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
            Data: {data.dataSource} · as of {data.priceAsOf}
          </div>
        </div>
        <ScoreRing score={score} />
      </div>

      {/* Key stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))', gap: 8 }}>
        <Box label="PRICE"    value={`$${data.currentPrice}`}
          sub={<span style={{ color: changeColor }}>{data.change1d >= 0 ? '+' : ''}{data.change1d}%</span>} accent />
        <Box label="52W HIGH" value={`$${data.week52High}`} />
        <Box label="52W LOW"  value={`$${data.week52Low}`} />
        <Box label="IV RANK"  value={`${data.ivRank}`} sub={data.ivLevel} />
        <Box label="HV30"     value={`${data.hv30}%`} />
        <Box label="LIQUIDITY" value={data.optionsLiquidity} accent={data.optionsLiquidity === 'High'} />
      </div>

      {/* Trend */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Badge label={data.trend} color={data.trend === 'Bullish' ? 'green' : data.trend === 'Bearish' ? 'red' : 'yellow'} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>1M: {data.ret1m} · 3M: {data.ret3m}</span>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>{data.trendDetail}</div>
      </div>

      {/* LEAP + Short Call */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: 'rgba(0,229,160,0.05)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: 12, padding: 14 }}>
          <div style={{ color: '#00e5a0', fontSize: 10, letterSpacing: 1.5, marginBottom: 8, fontWeight: 700 }}>📈 LEAP TO BUY</div>
          {data.leapRecommendation ? (<>
            <div style={{ color: '#fff', fontFamily: 'monospace', fontSize: 16, fontWeight: 700, marginBottom: 3 }}>
              ${data.leapRecommendation.strike}C
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4 }}>
              Exp: {data.leapRecommendation.expiration}
            </div>
            <div style={{ color: '#00e5a0', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
              {data.leapRecommendation.estimatedCost} est.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Delta: <span style={{ color: '#fff' }}>{data.leapRecommendation.delta}</span></div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>IV: <span style={{ color: '#fff' }}>{data.leapRecommendation.impliedVol}</span></div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Intrinsic: <span style={{ color: '#fff' }}>{data.leapRecommendation.intrinsicValue}</span></div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Extrinsic: <span style={{ color: '#fff' }}>{data.leapRecommendation.extrinsicValue}</span></div>
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>⚡ {data.leapRecommendation.note}</div>
          </>) : <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Data unavailable</div>}
        </div>
        <div style={{ background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 12, padding: 14 }}>
          <div style={{ color: '#60a5fa', fontSize: 10, letterSpacing: 1.5, marginBottom: 8, fontWeight: 700 }}>📉 SHORT CALL TO SELL</div>
          {data.shortCallRecommendation ? (<>
            <div style={{ color: '#fff', fontFamily: 'monospace', fontSize: 16, fontWeight: 700, marginBottom: 3 }}>
              ${data.shortCallRecommendation.strike}C
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4 }}>
              {data.shortCallRecommendation.dte}-DTE · {data.shortCallRecommendation.expiration}
            </div>
            <div style={{ color: '#60a5fa', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
              {data.shortCallRecommendation.estimatedPremium} premium
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Delta: <span style={{ color: '#fff' }}>{data.shortCallRecommendation.delta}</span></div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>IV: <span style={{ color: '#fff' }}>{data.shortCallRecommendation.impliedVol}</span></div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Yield/LEAP: <span style={{ color: '#00e5a0', fontWeight: 700 }}>{data.shortCallRecommendation.yieldOnLeap}</span></div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Annual: <span style={{ color: '#00e5a0', fontWeight: 700 }}>{data.shortCallRecommendation.annualizedYield}</span></div>
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>⚡ {data.shortCallRecommendation.note}</div>
          </>) : <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Data unavailable</div>}
        </div>
      </div>

      {/* Breakeven */}
      {data.breakeven?.priceAtExpiry && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 14 }}>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, letterSpacing: 1.5, marginBottom: 8 }}>BREAKEVEN ANALYSIS</div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 6 }}>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 9, marginBottom: 2 }}>BREAKEVEN PRICE</div>
              <div style={{ fontFamily: 'monospace', fontSize: 18, color: '#fff', fontWeight: 700 }}>${data.breakeven.priceAtExpiry}</div>
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 9, marginBottom: 2 }}>TIME TO RECOVER</div>
              <div style={{ fontFamily: 'monospace', fontSize: 14, color: '#f0c040', fontWeight: 600 }}>{data.breakeven.timeToBreakeven}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{data.breakeven.detail}</div>
        </div>
      )}

      {/* Score breakdown */}
      {data.scoreBreakdown && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 14 }}>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, letterSpacing: 1.5, marginBottom: 10 }}>SCORE BREAKDOWN</div>
          {Object.entries(data.scoreBreakdown).map(([k, v]) => {
            const labels = { ivEnvironment: 'IV Environment', liquidity: 'Volume/Liquidity', trend: 'Trend', premiumYield: 'Options Quality', riskReward: 'Price Suitability' };
            const maxes  = { ivEnvironment: 20, liquidity: 25, trend: 25, premiumYield: 20, riskReward: 10 };
            const max    = maxes[k] || 25;
            const pct    = Math.min((Number(v) / max) * 100, 100);
            const bc     = pct >= 70 ? '#00e5a0' : pct >= 40 ? '#f0c040' : '#ff5555';
            return (
              <div key={k} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{labels[k] || k}</span>
                  <span style={{ fontSize: 11, color: bc, fontFamily: 'monospace' }}>{v}/{max}</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 4, height: 4 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: bc, borderRadius: 4, transition: 'width 1s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pros / Cons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: 'rgba(0,229,160,0.04)', border: '1px solid rgba(0,229,160,0.14)', borderRadius: 10, padding: 12 }}>
          <div style={{ color: '#00e5a0', fontSize: 10, letterSpacing: 1, marginBottom: 7, fontWeight: 700 }}>STRENGTHS</div>
          {(data.pros || []).map((p, i) => <div key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>✓ {p}</div>)}
          {(!data.pros || data.pros.length === 0) && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>None identified</div>}
        </div>
        <div style={{ background: 'rgba(255,85,85,0.04)', border: '1px solid rgba(255,85,85,0.14)', borderRadius: 10, padding: 12 }}>
          <div style={{ color: '#ff5555', fontSize: 10, letterSpacing: 1, marginBottom: 7, fontWeight: 700 }}>RISKS</div>
          {(data.cons || []).map((c, i) => <div key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>⚠ {c}</div>)}
          {(!data.cons || data.cons.length === 0) && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>None identified</div>}
        </div>
      </div>

      {/* Verdict */}
      <div style={{ background: `${rc}0d`, border: `1px solid ${rc}30`, borderRadius: 10, padding: 14 }}>
        <div style={{ color: rc, fontSize: 10, letterSpacing: 1.5, marginBottom: 6, fontWeight: 700 }}>VERDICT</div>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 1.6 }}>{data.verdict}</div>
      </div>

      {/* Refresh */}
      {onRefresh && (
        <button onClick={onRefresh} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '8px', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', width: '100%' }}>
          ↺ Refresh live data
        </button>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function PMCCApp() {
  const [tab,             setTab]             = useState('tracker');
  const [ticker,          setTicker]          = useState('');
  const [loadingRec,      setLoadingRec]      = useState(false);
  const [loadingAnalyze,  setLoadingAnalyze]  = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [analysis,        setAnalysis]        = useState(null);
  const [recError,        setRecError]        = useState(null);
  const [analyzeError,    setAnalyzeError]    = useState(null);
  const [loadingStep,     setLoadingStep]      = useState('');
  const cache = useRef({});

  const loadRec = async () => {
    setLoadingRec(true); setRecError(null);
    setLoadingStep('Scanning top stocks via Yahoo Finance…');
    try {
      const res  = await fetch('/api/screener');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Screener failed');
      setRecommendations(data);
    } catch(e) { setRecError(e.message); }
    setLoadingRec(false); setLoadingStep('');
  };

  const analyze = async (forceFresh = false) => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;

    // Cache check (5 min TTL)
    if (!forceFresh && cache.current[t] && Date.now() - cache.current[t].ts < 300000) {
      setAnalysis({ ...cache.current[t].data, _fromCache: true, _cachedAt: new Date(cache.current[t].ts).toLocaleTimeString() });
      setTab('analyze');
      return;
    }

    setLoadingAnalyze(true); setAnalyzeError(null); setAnalysis(null); setTab('analyze');
    setLoadingStep(`Fetching live data for ${t}…`);
    try {
      const res  = await fetch(`/api/quote?ticker=${t}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      cache.current[t] = { data, ts: Date.now() };
      setAnalysis(data);
    } catch(e) { setAnalyzeError(e.message); }
    setLoadingAnalyze(false); setLoadingStep('');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0c10', color: '#fff',
      fontFamily: "'Segoe UI', system-ui, sans-serif", paddingBottom: 60 }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin   { to { transform:rotate(360deg); } }
        @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }
        input::placeholder { color:rgba(255,255,255,0.2); }
        input:focus { outline:none; }
        button:active { opacity:0.8; }
        input[type=date]::-webkit-calendar-picker-indicator { filter:invert(0.5); }
      `}</style>

      {/* Header */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8,
              background: 'linear-gradient(135deg,#00e5a0,#0070f3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>⚡</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.5 }}>PMCC Analyzer</div>
              <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 9, letterSpacing: 1.5 }}>POOR MAN&apos;S COVERED CALL</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'right' }}>
            Powered by<br />Yahoo Finance · Free
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', margin: '14px 20px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {[['tracker','📋 My Trades'],['recommend','🔍 Top Picks'],['analyze','📊 Analyze']].map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            background: 'none', border: 'none',
            color: tab === key ? '#00e5a0' : 'rgba(255,255,255,0.4)',
            fontSize: 12, fontWeight: tab === key ? 700 : 400,
            padding: '8px 13px', cursor: 'pointer',
            borderBottom: tab === key ? '2px solid #00e5a0' : '2px solid transparent',
            marginBottom: -1, transition: 'all 0.2s', whiteSpace: 'nowrap',
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        {/* Ticker input */}
        {(tab === 'analyze' || tab === 'recommend') && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && !loadingAnalyze && analyze()}
              placeholder="Enter ticker (e.g. AAPL, NVDA, SPY…)" maxLength={10}
              style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, fontFamily: 'monospace' }} />
            <button onClick={() => analyze(false)} disabled={loadingAnalyze || !ticker.trim()} style={{
              background: loadingAnalyze ? 'rgba(255,255,255,0.07)' : 'linear-gradient(135deg,#00e5a0,#0070f3)',
              border: 'none', borderRadius: 10, padding: '10px 16px',
              color: loadingAnalyze ? 'rgba(255,255,255,0.4)' : '#000',
              fontWeight: 800, fontSize: 13, cursor: loadingAnalyze || !ticker.trim() ? 'not-allowed' : 'pointer',
              opacity: !ticker.trim() ? 0.5 : 1, minWidth: 85,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
              {loadingAnalyze
                ? <><div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.2)',
                    borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> …</>
                : 'ANALYZE'}
            </button>
          </div>
        )}

        {/* TRACKER */}
        {tab === 'tracker' && <TrackerTab />}

        {/* TOP PICKS */}
        {tab === 'recommend' && (
          <div>
            {recError && <ErrorBox message={recError} onRetry={loadRec} />}
            {loadingRec && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px 0', gap: 12 }}>
                <Spinner />
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, animation: 'pulse 1.5s ease infinite', textAlign: 'center' }}>
                  {loadingStep}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>Scanning ~10 symbols — takes ~5 seconds</div>
              </div>
            )}
            {!loadingRec && !recommendations && !recError && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
                <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 14, marginBottom: 20, lineHeight: 1.7 }}>
                  Scans top stocks using live Yahoo Finance data.<br />
                  Ranks by IV rank, trend, liquidity, and PMCC score.
                </div>
                <button onClick={loadRec} style={{ background: 'linear-gradient(135deg,#00e5a0,#0070f3)',
                  border: 'none', borderRadius: 12, padding: '12px 26px',
                  color: '#000', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                  🔍 Find Best PMCC Stocks Now
                </button>
              </div>
            )}
            {!loadingRec && recommendations && (
              <div>
                <div style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.15)',
                  borderRadius: 10, padding: '8px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                  <span>📡 {recommendations.marketNote}</span>
                  <span style={{ color: 'rgba(255,255,255,0.25)' }}>{recommendations.lastUpdated}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
                  {recommendations.picks?.map((p, i) => <RecommendCard key={p.ticker} pick={p} index={i} />)}
                </div>
                <button onClick={loadRec} style={{ marginTop: 16, background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 16px',
                  color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>
                  ↺ Refresh
                </button>
              </div>
            )}
          </div>
        )}

        {/* ANALYZE */}
        {tab === 'analyze' && (
          <div>
            {analyzeError && <ErrorBox message={analyzeError} />}
            {loadingAnalyze && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px 0', gap: 12 }}>
                <Spinner />
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, animation: 'pulse 1.5s ease infinite', textAlign: 'center', maxWidth: 260 }}>
                  {loadingStep}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>Usually takes 2–4 seconds</div>
              </div>
            )}
            {!loadingAnalyze && analysis && (
              <AnalysisView data={analysis} onRefresh={() => analyze(true)} />
            )}
            {!loadingAnalyze && !analysis && !analyzeError && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                Enter a ticker above and tap ANALYZE.
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ margin: '40px 20px 0', padding: 10, background: 'rgba(255,255,255,0.02)',
        borderRadius: 8, color: 'rgba(255,255,255,0.17)', fontSize: 10, lineHeight: 1.6 }}>
        ⚠ FOR INFORMATIONAL PURPOSES ONLY — Not financial advice. Options trading involves substantial risk. Always do your own due diligence.
      </div>
    </div>
  );
}
