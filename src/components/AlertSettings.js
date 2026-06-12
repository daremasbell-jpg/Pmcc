'use client';
import { useState, useEffect } from 'react';

function genUserId() {
  return 'u_' + Math.random().toString(36).slice(2, 18);
}

export default function AlertSettings({ positions }) {
  const [email,       setEmail]       = useState('');
  const [userId,      setUserId]      = useState('');
  const [cronSecret,  setCronSecret]  = useState('');
  const [saved,       setSaved]       = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [testing,     setTesting]     = useState(false);
  const [testResult,  setTestResult]  = useState(null);
  const [error,       setError]       = useState('');

  // Load saved settings from localStorage
  useEffect(() => {
    const storedEmail  = localStorage.getItem('pmcc_alert_email') || '';
    const storedSecret = localStorage.getItem('pmcc_cron_secret') || '';
    let   storedUserId = localStorage.getItem('pmcc_user_id');
    if (!storedUserId) { storedUserId = genUserId(); localStorage.setItem('pmcc_user_id', storedUserId); }
    setEmail(storedEmail);
    setCronSecret(storedSecret);
    setUserId(storedUserId);
  }, []);

  const saveSettings = async () => {
    if (!email.trim() || !email.includes('@')) { setError('Enter a valid email address'); return; }
    setSaving(true); setError(''); setSaved(false);
    try {
      localStorage.setItem('pmcc_alert_email', email.trim());
      if (cronSecret.trim()) localStorage.setItem('pmcc_cron_secret', cronSecret.trim());

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
      await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, positions, settings: { alertEmail: email.trim(), userId } }),
      });

      const secret = cronSecret.trim() || localStorage.getItem('pmcc_cron_secret') || '';
      const res  = await fetch(`/api/alert-check?secret=${encodeURIComponent(secret)}`, { method: 'GET' });
      const data = await res.json();
      if (res.status === 401) {
        setTestResult({ ok: false, msg: 'CRON_SECRET mismatch — make sure the value above matches your Vercel env var.' });
      } else if (!res.ok) {
        setTestResult({ ok: false, msg: data.error || 'Test failed' });
      } else {
        setTestResult({ ok: true, msg: `Test email sent to ${email}!` });
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

  useEffect(() => {
    if (userId && positions?.length > 0) syncPositions();
  }, [positions, userId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Email Alerts</div>
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

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4, display: 'block', letterSpacing: 0.5 }}>
            CRON_SECRET <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 400 }}>(must match your Vercel env var)</span>
          </label>
          <input
            type="password"
            value={cronSecret}
            onChange={e => setCronSecret(e.target.value)}
            placeholder="your CRON_SECRET value"
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>

        {error && <div style={{ color: '#ff8080', fontSize: 12, marginBottom: 10 }}>Warning: {error}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={saveSettings} disabled={saving} style={{
            flex: 1, background: saved ? 'rgba(0,229,160,0.15)' : 'linear-gradient(135deg,#00e5a0,#0070f3)',
            border: saved ? '1px solid #00e5a0' : 'none', borderRadius: 8, padding: '11px 0',
            color: saved ? '#00e5a0' : '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1, transition: 'all 0.2s',
          }}>
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Email'}
          </button>
          <button onClick={sendTestEmail} disabled={testing} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '11px 18px', color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: testing ? 'not-allowed' : 'pointer', opacity: testing ? 0.7 : 1,
          }}>
            {testing ? '...' : 'Send Test'}
          </button>
        </div>

        {testResult && (
          <div style={{ marginTop: 10, fontSize: 12, color: testResult.ok ? '#00e5a0' : '#ff8080',
            background: testResult.ok ? 'rgba(0,229,160,0.08)' : 'rgba(255,80,80,0.08)',
            border: `1px solid ${testResult.ok ? 'rgba(0,229,160,0.2)' : 'rgba(255,80,80,0.2)'}`,
            borderRadius: 8, padding: '8px 12px' }}>
            {testResult.msg}
          </div>
        )}
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Alert Schedule</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'FREQUENCY', value: 'Mon-Fri' },
            { label: 'TIME',      value: '8:00 AM ET' },
            { label: 'URGENT ALERTS', value: 'in subject' },
            { label: 'ALL CLEAR',     value: 'in subject' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 4, letterSpacing: 0.5 }}>{label}</div>
              <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 12 }}>One-Time Setup Required</div>
        {[
          { n: 1, title: 'Create Resend account', body: 'Go to resend.com, sign up free, then API Keys, Create Key.' },
          { n: 2, title: 'Add env variables to Vercel', body: 'In Vercel, Settings, Environment Variables, add: RESEND_API_KEY, ALERT_EMAIL, USER_ID, CRON_SECRET.' },
          { n: 3, title: 'Enter CRON_SECRET above', body: 'Paste the same CRON_SECRET value into the field above and click Save Email. This lets the Send Test button authenticate.' },
          { n: 4, title: 'Redeploy', body: 'Push to GitHub or click Redeploy in Vercel - cron activates automatically.' },
          { n: 5, title: 'Verify domain in Resend (optional)', body: 'For best deliverability, verify a sending domain. Or use Resend free address.' },
        ].map(({ n, title, body }) => (
          <div key={n} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,229,160,0.15)',
              border: '1px solid rgba(0,229,160,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: '#00e5a0', fontWeight: 700, flexShrink: 0 }}>{n}</div>
            <div>
              <div style={{ fontSize: 13, color: '#fff', fontWeight: 600, marginBottom: 2 }}>{title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{body}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '10px 14px',
        fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
        Your User ID (use this for USER_ID env var)
        <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', marginLeft: 8 }}>{userId}</span>
      </div>

    </div>
  );
    }
