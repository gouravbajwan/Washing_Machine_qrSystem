'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { enablePush, pushStatus } from '../../lib/push';

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
    try { localStorage.setItem('wm_name', name); localStorage.setItem('wm_room', room); } catch {}
    const r = await enablePush(name, room);
    setBusy(false);
    setStatus(pushStatus());
    if (r === 'granted') setMsg({ type: 'ok', text: 'Reminders are on for this device.' });
    else if (r === 'denied') setMsg({ type: 'err', text: 'You blocked notifications. Allow them in your browser or phone settings, then try again.' });
    else setMsg({ type: 'err', text: 'Could not turn on reminders on this device.' });
  }

  return (
    <>
      <h1>🔔 Wash reminders</h1>
      <p className="sub">Get a notification 5 min and 2 min before your wash ends, and when it’s done.</p>

      {status === 'needs-install' && (
        <div className="card">
          <b>iPhone / iPad: add this app to your Home Screen first</b>
          <ol className="steps">
            <li>Open this website in <b>Safari</b>.</li>
            <li>Tap the <b>Share</b> button, then <b>Add to Home Screen</b>.</li>
            <li>Open the <b>Laundry</b> icon from your Home Screen.</li>
            <li>Open this <b>Wash reminders</b> page there and tap <b>Turn on reminders</b>.</li>
          </ol>
          <p className="tip">After that, start your wash as usual by scanning the machine QR, using the <b>same name and room number</b>. Your reminders will arrive in the app. (Needs iOS 16.4 or newer.)</p>
        </div>
      )}

      {status === 'unsupported' && (
        <div className="card">
          This browser can’t receive notifications. You’ll still get an alert (sound and vibration) while the machine page is open.
          On Android, try Chrome.
        </div>
      )}

      {status === 'not-configured' && (
        <div className="err">Reminders are not set up on this site yet.</div>
      )}

      {status === 'denied' && (
        <div className="card">
          Notifications are blocked for this site. Allow them in your browser’s site settings (or phone settings), then reload this page.
        </div>
      )}

      {(status === 'default' || status === 'granted') && (
        <form className="card" onSubmit={turnOn}>
          {status === 'granted' && <div className="ok">✓ Reminders are on for this device.</div>}
          <label htmlFor="n">Your name</label>
          <input id="n" type="text" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} autoComplete="name" />
          <label htmlFor="r">Room number</label>
          <input id="r" type="text" value={room} onChange={(e) => setRoom(e.target.value)} required maxLength={12} />
          <p className="tip">Use the same name and room number when you start a wash.</p>
          <button className="primary" disabled={busy}>
            {busy ? 'Turning on…' : status === 'granted' ? 'Save details' : 'Turn on reminders'}
          </button>
        </form>
      )}

      {msg && <div className={msg.type}>{msg.text}</div>}
      <p className="foot"><Link href="/">← Back to machines</Link></p>
    </>
  );
}
