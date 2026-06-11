'use client';
import { useState, useEffect } from 'react';

function genUserId() {
  return 'u_' + Math.random().toString(36).slice(2, 18);
}

export default function AlertSettings({ positions }) {
  const [email,     setEmail]     = useState('');
  const [userId,    setUserId]    = useState('');
  const [saved,     setSaved]     = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [testing,   setTesting]   = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error,     setError]     = useState('');

  // Load saved settings from localStorage
  useEffect(() => {
    const storedEmail  = localStorage.getItem('pmcc_alert_email') || '';
    let   storedUserId = localStorage.getItem('pmcc_user_id');
    if (!storedUserId) { storedUserId = genUserId(); localStorage.setItem('pmcc_user_id', storedUserId); }
    setEmail(storedEmail);
    setUserId(storedUserId);
  }, []);

  const saveSettings = async () => {
    if (!email.trim() || !email.includes('@')) { setError('Enter a valid email address'); return; }
    setSaving(true); setError(''); setSaved(false);
    try {
      // Save email locally
      localStorage.setItem('pmcc_alert_email', email.trim());

      // Sync positions + settings to server so cron job can read them
      const res = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          positions,
          settings: { alertEmail: email.trim(), userId },
        }),
      });
      if (!res.ok) throw new Error('Failed to save to server');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch(e) { setError(e.message); }
    setSaving(false);
  };

  const sendTestEmail = async () => {
    if (!email.trim()) { setError('Save your email first'); return; }
    setTesting(true); setTestResult(null); setError('');
    try {
      // Sync positions first
      await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, positions, settings: { alertEmail: email.trim(), userId } }),
      });

      // Check if CRON_SECRET is set — if not, guide user
      const res = await fetch(`/api/alert-check?secret=${encodeURIComponent(localStorage.getItem('pmcc_cron_secret') || '')}`, { method: 'GET' });
      const data = await res.json();
      if (res.status === 401) {
        setTestResult({ ok: false, msg: 'Set your CRON_SECRET in Vercel env vars first (see setup guide below)' });
      } else if (!res.ok) {
        setTestResult({ ok: false, msg: data.error || 'Test failed' });
      } else {
        setTestResult({ ok: true, msg: `✅ Test email sent to ${email}!` });
      }
    } catch(e) { setTestResult({ ok: false, msg: e.message }); }
    setTesting(false);
  };

  const syncPositions = async () => {
    if (!userId) return;
    try {
      await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, positions, settings: { alertEmail: email, userId } }),
      });
    } catch {}
  };

  // Auto-sync positions when they change
  useEffect(() => {
    if (userId && positions?.length > 0) syncPositions();
  }, [positions, userId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Email setup */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>📧 Email Alerts</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16, lineHeight: 1.6 }}>
          Get a daily email every weekday at 8am with a summary of all your positions.
          Urgent alerts (Critical/High) have a special subject line so you see them immediately.
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4, display: 'block', letterSpacing: 0.5 }}>
            YOUR EMAIL ADDRESS
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>

        {error && <div style={{ color: '#ff8080', fontSize: 12, marginBottom: 10 }}>⚠ {error}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={saveSettings} disabled={saving} style={{
            flex: 1, background: saved ? 'rgba(0,229,160,0.15)' : 'linear-gradient(135deg,#00e5a0,#0070f3)',
            border: saved ? '1px solid rgba(0,229,160,0.3)' : 'none',
            borderRadius: 9, padding: '10px', color: saved ? '#00e5a0' : '#000',
            fontWeight: 700, fontSize: 13, cursor: saving ? 'wait' : 'pointer',
          }}>
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Email'}
          </button>
          <button onClick={sendTestEmail} disabled={testing || !email} style={{
            padding: '10px 16px', background: 'rgba(96,165,250,0.1)',
            border: '1px solid rgba(96,165,250,0.25)', borderRadius: 9,
            color: '#60a5fa', fontSize: 13, cursor: testing || !email ? 'not-allowed' : 'pointer',
            opacity: !email ? 0.5 : 1,
          }}>
            {testing ? 'Sending…' : 'Send Test'}
          </button>
        </div>

        {testResult && (
          <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, fontSize: 12,
            background: testResult.ok ? 'rgba(0,229,160,0.08)' : 'rgba(255,85,85,0.08)',
            border: `1px solid ${testResult.ok ? 'rgba(0,229,160,0.2)' : 'rgba(255,85,85,0.2)'}`,
            color: testResult.ok ? '#00e5a0' : '#ff8080' }}>
            {testResult.msg}
          </div>
        )}
      </div>

      {/* Schedule info */}
      <div style={{ background: 'rgba(0,229,160,0.05)', border: '1px solid rgba(0,229,160,0.15)', borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#00e5a0', marginBottom: 10 }}>⏰ Alert Schedule</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'FREQUENCY', value: 'Mon–Fri' },
            { label: 'TIME', value: '8:00 AM ET' },
            { label: 'URGENT ALERTS', value: '🚨 in subject' },
            { label: 'ALL CLEAR', value: '✅ in subject' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Setup guide */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>🔧 One-Time Setup Required</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { step: '1', title: 'Create Resend account', desc: 'Go to resend.com → sign up free → API Keys → Create Key', link: 'https://resend.com' },
            { step: '2', title: 'Add env variables to Vercel', desc: 'In Vercel → Settings → Environment Variables, add these 4 keys:', sub: ['RESEND_API_KEY = your key from Resend', 'ALERT_EMAIL = your email address', 'USER_ID = any word (e.g. "mytrader")', 'CRON_SECRET = any password you choose'] },
            { step: '3', title: 'Update vercel.json cron secret', desc: 'Replace REPLACE_WITH_YOUR_CRON_SECRET in vercel.json with the same value you set for CRON_SECRET' },
            { step: '4', title: 'Redeploy', desc: 'Push to GitHub or click Redeploy in Vercel — cron activates automatically' },
            { step: '5', title: 'Verify domain in Resend (optional)', desc: 'For best deliverability, verify a sending domain. Or use Resend\'s free onboarding.resend.dev address.' },
          ].map(({ step, title, desc, sub, link }) => (
            <div key={step} style={{ display: 'flex', gap: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,229,160,0.15)', border: '1px solid rgba(0,229,160,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#00e5a0', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{step}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                  {desc}
                  {link && <> · <a href={link} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>{link}</a></>}
                </div>
                {sub && (
                  <div style={{ marginTop: 5, background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: '6px 10px' }}>
                    {sub.map((s, i) => <div key={i} style={{ fontSize: 11, fontFamily: 'monospace', color: '#00e5a0', marginBottom: 2 }}>{s}</div>)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User ID display */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>Your User ID (use this for USER_ID env var)</span>
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>{userId}</span>
      </div>

    </div>
  );
}
