'use client';
import { useState, useEffect } from 'react';

function genUserId() {
    return 'u_' + Math.random().toString(36).slice(2, 18);
}

export default function AlertSettings({ positions }) {
    const [email, setEmail] = useState('');
    const [userId, setUserId] = useState('');
    const [cronSecret, setCronSecret] = useState('');
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [error, setError] = useState('');

  // Load saved settings from localStorage
  useEffect(() => {
        const storedEmail = localStorage.getItem('pmcc_alert_email') || '';
        const storedSecret = localStorage.getItem('pmcc_cron_secret') || '';
        let storedUserId = localStorage.getItem('pmcc_user_id');
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
        const secret = cronSecret.trim() || localStorage.getItem('pmcc_cron_secret') || '';
        if (!secret) { setError('Enter your CRON_SECRET first'); return; }
        setTesting(true); setTestResult(null); setError('');
        try {
                // Save positions first so the server has the latest data
          await fetch('/api/positions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, positions, settings: { alertEmail: email.trim(), userId } }),
          });

          // Use the dedicated test endpoint — always sends regardless of positions
          const res = await fetch('/api/send-test-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ secret, email: email.trim() }),
          });
                const data = await res.json();

          if (res.status === 401) {
                    setTestResult({ ok: false, msg: 'CRON_SECRET mismatch — make sure the value above matches your Vercel env var.' });
          } else if (!res.ok || !data.sent) {
                    setTestResult({ ok: false, msg: data.error || 'Test email failed to send. Check your RESEND_API_KEY env var.' });
          } else {
                    setTestResult({ ok: true, msg: `Test email sent to ${data.to}!` });
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

{error && (
            <div style={{ background: 'rgba(255,85,85,0.1)', border: '1px solid rgba(255,85,85,0.3)', borderRadius: 8,
                                    padding: '8px 12px', color: '#ff8080', fontSize: 12, marginBottom: 12 }}>
{error}
</div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={saveSettings}
            disabled={saving}
            style={{ flex: 1, background: 'linear-gradient(135deg,#00e5a0,#0070f3)', border: 'none', borderRadius: 8,
                                 padding: '10px 16px', color: '#000', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer',
                                 opacity: saving ? 0.7 : 1 }}>
{saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Email'}
</button>
          <button
            onClick={sendTestEmail}
            disabled={testing}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
                                 padding: '10px 16px', color: '#fff', fontWeight: 600, fontSize: 13, cursor: testing ? 'not-allowed' : 'pointer',
                                 opacity: testing ? 0.7 : 1, whiteSpace: 'nowrap' }}>
{testing ? 'Sending…' : 'Send Test'}
</button>
  </div>

{testResult && (
            <div style={{ marginTop: 10, background: testResult.ok ? 'rgba(0,229,160,0.08)' : 'rgba(255,85,85,0.1)',
                                    border: `1px solid ${testResult.ok ? 'rgba(0,229,160,0.25)' : 'rgba(255,85,85,0.3)'}`,
                                    borderRadius: 8, padding: '8px 12px', fontSize: 12,
                                    color: testResult.ok ? '#00e5a0' : '#ff8080' }}>
{testResult.msg}
</div>
        )}
</div>

      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Alert Schedule</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
{[['FREQUENCY','Mon-Fri'],['TIME','8:00 AM ET'],['URGENT ALERTS','in subject'],['ALL CLEAR','in subject']].map(([label, val]) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
                                                                                                                             <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{val}</div>
                                                                                                               </div>
                                                                                                                         ))}
</div>
  </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 12 }}>One-Time Setup Required</div>
{[
            ['1','Create Resend account','Go to resend.com, sign up free, then API Keys, Create Key.'],
            ['2','Add env variables to Vercel','In Vercel, Settings, Environment Variables, add: RESEND_API_KEY, ALERT_EMAIL, USER_ID, CRON_SECRET.'],
            ['3','Enter CRON_SECRET above','Paste the same CRON_SECRET value into the field above and click Save Email. This lets the Send Test button authenticate.'],
            ['4','Redeploy','Push to GitHub or click Redeploy in Vercel - cron activates automatically.'],
            ['5','Verify domain in Resend (optional)','For best deliverability, verify a sending domain. Or use Resend free address.'],
          ].map(([num, title, desc]) => (
                      <div key={num} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#00e5a0,#0070f3)',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
                                      color: '#000', flexShrink: 0 }}>{num}</div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{title}</div>
                              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{desc}</div>
                </div>
                </div>
                        ))}
</div>

      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
        Your User ID (use this for USER_ID env var)&nbsp;
        <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>{userId}</span>
          </div>
          </div>
  );
}
