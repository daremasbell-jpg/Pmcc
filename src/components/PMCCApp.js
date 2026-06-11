'use client';
import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { fetchAnalysis, fetchRecommendations, getCachedAnalysis, setCachedAnalysis, clearCachedAnalysis } from '@/lib/api';
import { ScoreRing, Badge, Box, Spinner, ErrorBox } from './ui';

// TrackerTab uses localStorage — load client-side only
const TrackerTab = dynamic(() => import('./TrackerTab'), { ssr: false });

// ─── RECOMMEND CARD ───────────────────────────────────────────────────────────
function RecommendCard({ pick, index }) {
  const s  = Number(pick.pmccScore) || 0;
  const sc = s >= 80 ? '#00e5a0' : s >= 65 ? '#f0c040' : '#ff5555';
  const tc = pick.trend === 'Bullish' ? 'green' : pick.trend === 'Bearish' ? 'red' : 'yellow';
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
      animation: `fadeUp 0.4s ease ${index * 0.07}s both` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color: '#fff' }}>{pick.ticker}</span>
            <Badge label={pick.trend || '—'} color={tc} />
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{pick.companyName} · {pick.sector}</div>
        </div>
        <ScoreRing score={s} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Box label="PRICE"        value={pick.currentPrice ? `$${pick.currentPrice}` : '—'} />
        <Box label="IV RANK"      value={pick.ivRank ?? '—'} />
        <Box label="WEEKLY YIELD" value={pick.weeklyYield || '—'} />
        <Box label="LEAP COST"    value={pick.leapCost || '—'} />
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>SETUP</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>📈 {pick.leapSuggestion || '—'}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>📉 {pick.shortCallSuggestion || '—'}</div>
      </div>
      {pick.pros?.length > 0 && (
        <div>{pick.pros.slice(0, 2).map((p, i) => (
          <div key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 2 }}>✓ {p}</div>
        ))}</div>
      )}
      <div style={{ background: s >= 80 ? 'rgba(0,229,160,0.07)' : s >= 65 ? 'rgba(240,192,64,0.07)' : 'rgba(255,85,85,0.07)',
        border: `1px solid ${sc}33`, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: sc, fontStyle: 'italic' }}>
        {pick.verdict || '—'}
      </div>
    </div>
  );
}

// ─── ANALYSIS VIEW ────────────────────────────────────────────────────────────
function AnalysisView({ data, onRefresh }) {
  const rm  = { 'STRONG BUY': '#00e5a0', 'BUY': '#4ade80', 'NEUTRAL': '#f0c040', 'AVOID': '#ff5555' };
  const rc  = rm[data.recommendation] || '#60a5fa';
  const score = Number(data.pmccScore) || 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.5s ease both' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontFamily: 'monospace', fontSize: 28, color: '#fff' }}>{data.ticker}</h2>
            <div style={{ padding: '4px 14px', borderRadius: 20, background: `${rc}22`, border: `1px solid ${rc}55`, color: rc, fontSize: 12, fontWeight: 700 }}>
              {data.recommendation || '—'}
            </div>
            {data._fromCache && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '2px 8px' }}>
                📦 cached · {data._cachedAt}
              </span>
            )}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{data.companyName}</div>
        </div>
        <ScoreRing score={score} />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))', gap: 10 }}>
        <Box label="PRICE"     value={data.currentPrice ? `$${data.currentPrice}` : '—'} sub={data.priceAsOf ? `as of ${data.priceAsOf}` : data.priceChange1M} accent={!!data.currentPrice} />
        <Box label="TREND"     value={data.trend || '—'} />
        <Box label="IV RANK"   value={data.ivRank ?? '—'} sub={data.ivLevel} />
        <Box label="IV PCT"    value={data.ivPercentile ? `${data.ivPercentile}%` : '—'} />
        <Box label="LIQUIDITY" value={data.optionsLiquidity || '—'} />
      </div>

      {data.trendDetail && (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
          📈 {data.trendDetail}
        </div>
      )}

      {/* LEAP + Call */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: 'rgba(0,229,160,0.05)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: 12, padding: 16 }}>
          <div style={{ color: '#00e5a0', fontSize: 10, letterSpacing: 1.5, marginBottom: 10, fontWeight: 700 }}>📈 LEAP TO BUY</div>
          <div style={{ color: '#fff', fontFamily: 'monospace', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
            {data.leapRecommendation?.expiration} ${data.leapRecommendation?.strike}C
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 6 }}>
            δ {data.leapRecommendation?.delta} · {data.leapRecommendation?.estimatedCost}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{data.leapRecommendation?.rationale}</div>
        </div>
        <div style={{ background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 12, padding: 16 }}>
          <div style={{ color: '#60a5fa', fontSize: 10, letterSpacing: 1.5, marginBottom: 10, fontWeight: 700 }}>📉 FIRST CALL TO SELL</div>
          <div style={{ color: '#fff', fontFamily: 'monospace', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
            {data.shortCallRecommendation?.dte}-DTE ${data.shortCallRecommendation?.strike}C
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 6 }}>
            {data.shortCallRecommendation?.estimatedPremium} · {data.shortCallRecommendation?.yieldOnLeap} yield
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{data.shortCallRecommendation?.rationale}</div>
        </div>
      </div>

      {/* Breakeven */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, letterSpacing: 1.5, marginBottom: 10 }}>BREAKEVEN</div>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginBottom: 8 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginBottom: 2 }}>PRICE</div>
            <div style={{ fontFamily: 'monospace', fontSize: 18, color: '#fff', fontWeight: 700 }}>
              {data.breakeven?.priceAtExpiry ? `$${data.breakeven.priceAtExpiry}` : '—'}
            </div>
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginBottom: 2 }}>TIME</div>
            <div style={{ fontFamily: 'monospace', fontSize: 14, color: '#f0c040', fontWeight: 600 }}>
              {data.breakeven?.timeToBreakeven || '—'}
            </div>
          </div>
        </div>
        {data.breakeven?.detail && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{data.breakeven.detail}</div>}
      </div>

      {/* Score breakdown */}
      {data.scoreBreakdown && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, letterSpacing: 1.5, marginBottom: 12 }}>SCORE BREAKDOWN</div>
          {Object.entries(data.scoreBreakdown).map(([k, v]) => {
            const labels = { ivEnvironment: 'IV Env', liquidity: 'Liquidity', trend: 'Trend', premiumYield: 'Yield', riskReward: 'Risk/Reward' };
            const maxes  = { ivEnvironment: 20, liquidity: 25, trend: 25, premiumYield: 20, riskReward: 10 };
            const max    = maxes[k] || 25;
            const pct    = Math.min((Number(v) / max) * 100, 100);
            const bc     = pct >= 70 ? '#00e5a0' : pct >= 40 ? '#f0c040' : '#ff5555';
            return (
              <div key={k} style={{ marginBottom: 9 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{labels[k] || k}</span>
                  <span style={{ fontSize: 11, color: bc, fontFamily: 'monospace' }}>{v}/{max}</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: bc, borderRadius: 4, transition: 'width 1s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pros / Cons / Risks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: 'rgba(0,229,160,0.04)', border: '1px solid rgba(0,229,160,0.15)', borderRadius: 12, padding: 14 }}>
          <div style={{ color: '#00e5a0', fontSize: 10, letterSpacing: 1, marginBottom: 8, fontWeight: 700 }}>STRENGTHS</div>
          {(data.pros || []).map((p, i) => <div key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>✓ {p}</div>)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: 'rgba(240,192,64,0.04)', border: '1px solid rgba(240,192,64,0.15)', borderRadius: 12, padding: 14 }}>
            <div style={{ color: '#f0c040', fontSize: 10, letterSpacing: 1, marginBottom: 8, fontWeight: 700 }}>WEAKNESSES</div>
            {(data.cons || []).map((c, i) => <div key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>⚠ {c}</div>)}
          </div>
          <div style={{ background: 'rgba(255,85,85,0.04)', border: '1px solid rgba(255,85,85,0.15)', borderRadius: 12, padding: 14 }}>
            <div style={{ color: '#ff5555', fontSize: 10, letterSpacing: 1, marginBottom: 8, fontWeight: 700 }}>KEY RISKS</div>
            {(data.risks || []).map((r, i) => <div key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>✕ {r}</div>)}
          </div>
        </div>
      </div>

      {/* Verdict */}
      <div style={{ background: `${rc}0d`, border: `1px solid ${rc}30`, borderRadius: 12, padding: 16 }}>
        <div style={{ color: rc, fontSize: 10, letterSpacing: 1.5, marginBottom: 8, fontWeight: 700 }}>ANALYST VERDICT</div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.7 }}>{data.analystNote || data.verdict || '—'}</div>
      </div>

      {data._fromCache && onRefresh && (
        <button onClick={onRefresh} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '8px 16px', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', width: '100%' }}>
          ↺ Refresh analysis (bypass cache)
        </button>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function PMCCApp() {
  const [tab,            setTab]            = useState('tracker');
  const [ticker,         setTicker]         = useState('');
  const [loadingRec,     setLoadingRec]     = useState(false);
  const [loadingAnalyze, setLoadingAnalyze] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [analysis,       setAnalysis]       = useState(null);
  const [recError,       setRecError]       = useState(null);
  const [analyzeError,   setAnalyzeError]   = useState(null);
  const [loadingStep,    setLoadingStep]     = useState('');
  const [countdown,      setCountdown]      = useState(0);
  const requestLock = useRef(false);

  const startCountdown = useCallback((seconds) => {
    setCountdown(seconds);
    const iv = setInterval(() => {
      setCountdown(p => { if (p <= 1) { clearInterval(iv); return 0; } return p - 1; });
    }, 1000);
  }, []);

  const handleError = useCallback((e, setError) => {
    const msg = e.message || 'Unknown error';
    setError(msg);
    if (msg.toLowerCase().includes('rate'))     startCountdown(30);
    if (msg.toLowerCase().includes('overload')) startCountdown(60);
  }, [startCountdown]);

  const loadRec = async () => {
    if (requestLock.current) return;
    requestLock.current = true;
    setLoadingRec(true); setRecError(null);
    setLoadingStep('Scanning markets for top PMCC candidates…');
    try {
      const data = await fetchRecommendations();
      setRecommendations(data);
    } catch(e) { handleError(e, setRecError); }
    setLoadingRec(false); setLoadingStep(''); requestLock.current = false;
  };

  const analyze = async () => {
    const t = ticker.trim().toUpperCase();
    if (!t || requestLock.current) return;

    const cached = getCachedAnalysis(t);
    if (cached) {
      setAnalysis({ ...cached, _fromCache: true, _cachedAt: cached._cachedAt || 'recently' });
      setTab('analyze');
      return;
    }

    requestLock.current = true;
    setLoadingAnalyze(true); setAnalyzeError(null); setAnalysis(null); setTab('analyze');
    setLoadingStep(`Fetching live price & market data for ${t}…`);
    try {
      const data = await fetchAnalysis(t);
      data._cachedAt = new Date().toLocaleTimeString();
      setCachedAnalysis(t, data);
      setAnalysis(data);
    } catch(e) { handleError(e, setAnalyzeError); }
    setLoadingAnalyze(false); setLoadingStep(''); requestLock.current = false;
  };

  const refreshAnalysis = () => {
    const t = ticker.trim().toUpperCase();
    if (t) { clearCachedAnalysis(t); analyze(); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0c10', color: '#fff',
      fontFamily: "'Segoe UI', system-ui, sans-serif", paddingBottom: 60 }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
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
      <div style={{ padding: '22px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9,
            background: 'linear-gradient(135deg,#00e5a0,#0070f3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>PMCC Analyzer</div>
            <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10, letterSpacing: 1.5 }}>
              POOR MAN&apos;S COVERED CALL · AI-POWERED
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', margin: '16px 20px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {[['tracker', '📋 My Trades'], ['recommend', '🔍 Top Picks'], ['analyze', '📊 Analyze']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            background: 'none', border: 'none',
            color: tab === key ? '#00e5a0' : 'rgba(255,255,255,0.4)',
            fontSize: 12, fontWeight: tab === key ? 700 : 400,
            padding: '9px 14px', cursor: 'pointer',
            borderBottom: tab === key ? '2px solid #00e5a0' : '2px solid transparent',
            marginBottom: -1, transition: 'all 0.2s', whiteSpace: 'nowrap',
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: '18px 20px 0' }}>
        {/* Ticker input */}
        {(tab === 'analyze' || tab === 'recommend') && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <input
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && !loadingAnalyze && analyze()}
              placeholder="Ticker (e.g. AAPL, NVDA, SPY…)"
              maxLength={10}
              style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, padding: '11px 14px', color: '#fff', fontSize: 14, fontFamily: 'monospace' }}
            />
            <button onClick={analyze} disabled={loadingAnalyze || !ticker.trim()} style={{
              background: loadingAnalyze ? 'rgba(255,255,255,0.07)' : 'linear-gradient(135deg,#00e5a0,#0070f3)',
              border: 'none', borderRadius: 10, padding: '11px 16px',
              color: loadingAnalyze ? 'rgba(255,255,255,0.4)' : '#000',
              fontWeight: 800, fontSize: 13, cursor: loadingAnalyze || !ticker.trim() ? 'not-allowed' : 'pointer',
              opacity: !ticker.trim() ? 0.5 : 1, minWidth: 88,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
              {loadingAnalyze
                ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff',
                    borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Wait</>
                : 'ANALYZE'}
            </button>
          </div>
        )}

        {/* ── TRACKER ── */}
        {tab === 'tracker' && <TrackerTab />}

        {/* ── TOP PICKS ── */}
        {tab === 'recommend' && (
          <div>
            {recError && <ErrorBox message={recError} onRetry={loadRec} countdown={countdown} />}
            {loadingRec && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', gap: 14 }}>
                <Spinner />
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, animation: 'pulse 1.5s ease infinite', textAlign: 'center' }}>
                  {loadingStep || 'Scanning markets…'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>This may take 15–30 seconds</div>
              </div>
            )}
            {!loadingRec && !recommendations && !recError && (
              <div style={{ textAlign: 'center', padding: '44px 0' }}>
                <div style={{ fontSize: 38, marginBottom: 14 }}>📊</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 24, lineHeight: 1.7 }}>
                  AI scans live market data to surface the<br />best PMCC candidates right now.
                </div>
                <button onClick={loadRec} style={{ background: 'linear-gradient(135deg,#00e5a0,#0070f3)',
                  border: 'none', borderRadius: 12, padding: '13px 28px', color: '#000', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
                  🔍 Find Best PMCC Stocks Now
                </button>
              </div>
            )}
            {!loadingRec && recommendations && (
              <div>
                {recommendations.marketNote && (
                  <div style={{ background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.2)',
                    borderRadius: 10, padding: '10px 14px', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 18 }}>
                    📡 {recommendations.marketNote}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 14 }}>
                  {recommendations.picks?.map((p, i) => <RecommendCard key={p.ticker || i} pick={p} index={i} />)}
                </div>
                <button onClick={loadRec} style={{ marginTop: 20, background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '9px 18px',
                  color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer' }}>
                  ↺ Refresh
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── ANALYZE ── */}
        {tab === 'analyze' && (
          <div>
            {analyzeError && <ErrorBox message={analyzeError} countdown={countdown} />}
            {loadingAnalyze && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', gap: 14 }}>
                <Spinner />
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, animation: 'pulse 1.5s ease infinite', textAlign: 'center', maxWidth: 260 }}>
                  {loadingStep || 'Analyzing…'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>Searching live market data — takes ~20s</div>
              </div>
            )}
            {!loadingAnalyze && analysis && <AnalysisView data={analysis} onRefresh={refreshAnalysis} />}
            {!loadingAnalyze && !analysis && !analyzeError && (
              <div style={{ textAlign: 'center', padding: '44px 0', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                Enter a ticker above and tap ANALYZE.
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ margin: '40px 20px 0', padding: 12, background: 'rgba(255,255,255,0.02)',
        borderRadius: 8, color: 'rgba(255,255,255,0.18)', fontSize: 10, lineHeight: 1.6 }}>
        ⚠ FOR INFORMATIONAL PURPOSES ONLY — Not financial advice. Options trading involves substantial risk. Always do your own due diligence.
      </div>
    </div>
  );
}
