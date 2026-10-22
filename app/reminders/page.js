'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { enablePush, pushStatus } from '../../lib/push';
import Water from '../../components/Water';
import { BellIcon } from '../../components/Icons';

const card = { background: 'var(--surface)', borderRadius: 26, padding: 20, boxShadow: 'var(--shadow)' };
const field = { width: '100%', height: 58, borderRadius: 20, border: '2px solid transparent', background: 'var(--field)', color: 'var(--ink)', padding: '0 18px', fontSize: 17, fontWeight: 600, outline: 'none' };
const label = { fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', paddingLeft: 4 };

export default function Reminders() {
  const [status, setStatus] = useState('unsupported');
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    setStatus(pushStatus());
    try {
      setName(localStorage.getItem('wm_name') || '');
      setRoom(localStorage.getItem('wm_room') || '');
    } catch {}
  }, []);

  async function turnOn(e) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try { localStorage.setItem('wm_name', name.trim()); localStorage.setItem('wm_room', room.trim().toUpperCase()); } catch {}
    const r = await enablePush(name.trim(), room.trim().toUpperCase());
    setBusy(false);
    setStatus(pushStatus());
    if (r === 'granted') setMsg({ ok: true, text: 'Reminders are on for this device.' });
    else if (r === 'denied') setMsg({ ok: false, text: 'You blocked notifications. Allow them in your browser or phone settings, then try again.' });
    else setMsg({ ok: false, text: 'Could not turn on reminders on this device.' });
  }

  return (
    <div className="app">
      <div style={{ padding: 'max(24px, calc(env(safe-area-inset-top) + 12px)) 20px 0' }}>
        <Link href="/" className="pressable focusable" aria-label="Back to machines" style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface)', boxShadow: 'var(--shadow)', display: 'grid', placeItems: 'center', textDecoration: 'none', fontSize: 20 }}>←</Link>
        <h1 style={{ margin: '22px 0 0', fontSize: 40, fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1 }}>Wash reminders</h1>
        <p style={{ margin: '10px 0 0', fontSize: 16, fontWeight: 500, color: 'var(--ink-2)', lineHeight: 1.4 }}>A nudge 5 min and 2 min before your wash ends, and when it’s done.</p>
      </div>
      <div style={{ marginTop: 70 }}>
        <Water height={120} level={0} mode="calm" mood="relax" spriteX="72%" spriteSize={92} minFill={0.3} bubbles={3} />
      </div>
      <div style={{ position: 'relative', marginTop: -30, borderRadius: '32px 32px 0 0', background: 'var(--bg)', padding: '24px 16px 60px', minHeight: 420, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {status === 'needs-install' && (
          <div style={card}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>iPhone / iPad: add this app to your Home Screen first</div>
            <ol style={{ margin: '12px 0 0', paddingLeft: 20, fontSize: 15, lineHeight: 1.5, fontWeight: 500 }}>
              <li>Open this website in <b>Safari</b>.</li>
              <li>Tap <b>Share</b>, then <b>Add to Home Screen</b>.</li>
              <li>Open the <b>Laundry</b> icon from your Home Screen.</li>
              <li>Come back to this page there and tap <b>Turn on reminders</b>.</li>
            </ol>
            <p style={{ margin: '12px 0 0', fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', lineHeight: 1.4 }}>After that, scan the machine QR as usual and use the <b>same name and room number</b>. Needs iOS 16.4 or newer.</p>
          </div>
        )}
        {status === 'unsupported' && (
          <div style={card}>This browser can’t receive notifications. You’ll still get a sound and vibration alert while the machine page is open. On Android, try Chrome.</div>
        )}
        {status === 'not-configured' && (
          <div role="alert" style={{ ...card, background: 'var(--err-bg)', color: 'var(--err-ink)' }}>Reminders are not set up on this site yet.</div>
        )}
        {status === 'denied' && (
          <div style={card}>Notifications are blocked for this site. Allow them in your browser’s site settings (or phone settings), then reload this page.</div>
        )}
        {(status === 'default' || status === 'granted') && (
          <form onSubmit={turnOn} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {status === 'granted' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 18, background: 'var(--mint)', color: 'var(--mint-ink)', fontSize: 14, fontWeight: 600 }}><BellIcon size={16} />Reminders are on for this device</div>
            )}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={label}>Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} autoComplete="given-name" placeholder="Priya" style={field} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={label}>Room</span>
              <input value={room} onChange={(e) => setRoom(e.target.value)} required maxLength={12} placeholder="305" style={field} />
            </label>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>Use the same name and room number when you start a wash.</p>
            <button disabled={busy} className="pressable" style={{ height: 60, borderRadius: 999, border: 0, background: 'var(--nav)', color: 'var(--nav-ink)', fontSize: 16, fontWeight: 600, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Turning on…' : status === 'granted' ? 'Save details' : 'Turn on reminders'}
            </button>
          </form>
        )}
        {msg && (
          <div role="status" style={{ padding: '14px 16px', borderRadius: 22, fontSize: 15, fontWeight: 600, background: msg.ok ? 'var(--mint)' : 'var(--err-bg)', color: msg.ok ? 'var(--mint-ink)' : 'var(--err-ink)' }}>{msg.text}</div>
        )}
      </div>
    </div>
  );
}
