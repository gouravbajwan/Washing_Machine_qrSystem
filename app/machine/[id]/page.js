'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { useMachines, useNow, live } from '../../../lib/hooks';
import { fmt, floorLabel } from '../../../lib/format';
import { getDeviceId } from '../../../lib/device';
import { enablePush, syncPush, pushStatus } from '../../../lib/push';
import { beep, buzz } from '../../../lib/alerts';

const PRESETS = [15, 25, 35];

export default function MachinePage() {
  const { id } = useParams();
  const { machines, loading, error, refresh } = useMachines(null);
  const now = useNow();

  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [minutes, setMinutes] = useState(25);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // {type:'ok'|'err', text}

  // Remember name/room on this phone
  useEffect(() => {
    try {
      setName(localStorage.getItem('wm_name') || '');
      setRoom(localStorage.getItem('wm_room') || '');
    } catch {}
  }, []);

  const machine = machines.find((m) => m.id === id);

  // Is this phone already running a (different) machine?
  const [mine, setMine] = useState(null);
  async function loadMine() {
    const { data } = await supabase.rpc('my_active_machine', { p_device: getDeviceId() });
    setMine(data && data[0] ? data[0] : null);
  }
  useEffect(() => { loadMine(); }, [machines]);

  // ----- Reminders -----
  const [push, setPush] = useState('unsupported');
  const [remind, setRemind] = useState(true);
  const [banner, setBanner] = useState(null);
  const alertRef = useRef({ owner: false, endsAt: 0, fired: {}, done: false });

  useEffect(() => {
    const s = pushStatus();
    setPush(s);
    if (s === 'granted') {
      let n = '', r = '';
      try { n = localStorage.getItem('wm_name') || ''; r = localStorage.getItem('wm_room') || ''; } catch {}
      syncPush(n, r);
    }
  }, []);

  function fire(text) {
    setBanner(text);
    beep();
    buzz();
  }

  async function turnOn() {
    await enablePush(name, room);
    setPush(pushStatus());
  }

  // In-page alerts (backup): 5 min, 2 min, and time's up, while this page is open.
  useEffect(() => {
    const a = alertRef.current;
    const m = machines.find((x) => x.id === id);
    if (!m) return;
    const lv = live(m, now);
    const isOwner = lv.status === 'in_use' && mine && mine.machine_id === id;

    if (isOwner) {
      if (!a.owner || Math.abs(a.endsAt - m.endsAt) > 20000) {
        a.fired = {};
        a.done = false;
        // thresholds already passed when we first see this wash are not announced
        if (lv.left <= 300) a.fired[300] = true;
        if (lv.left <= 120) a.fired[120] = true;
      }
      a.owner = true;
      a.endsAt = m.endsAt;
      if (lv.left <= 300 && !a.fired[300]) { a.fired[300] = true; fire('⏰ 5 minutes left. Get ready to collect your clothes.'); }
      if (lv.left <= 120 && !a.fired[120]) { a.fired[120] = true; fire('⏳ 2 minutes left. Head over now.'); }
    } else if (a.owner) {
      if (Date.now() >= a.endsAt - 1000) {
        if (!a.done) { a.done = true; fire('✅ Time’s up! Please remove your clothes so others can use the machine.'); }
        a.owner = false;
      } else {
        a.owner = false; // freed early
      }
    }
  }, [now]);

  async function start(e) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    if (push === 'default' && remind) {
      await enablePush(name, room);   // must run right after the tap
      setPush(pushStatus());
    } else if (push === 'granted') {
      await syncPush(name, room);
    }
    const { error } = await supabase.rpc('start_machine', {
      p_machine: id, p_name: name, p_room: room, p_minutes: Number(minutes), p_device: getDeviceId(),
    });
    setBusy(false);
    if (error) {
      setMsg({ type: 'err', text: error.message });
    } else {
      try { localStorage.setItem('wm_name', name); localStorage.setItem('wm_room', room); } catch {}
      setMsg({ type: 'ok', text: `Timer started for ${minutes} minutes.` });
    }
    refresh();
    loadMine();
  }

  async function free() {
    setMsg(null);
    setBusy(true);
    const { error } = await supabase.rpc('free_machine', { p_machine: id, p_device: getDeviceId() });
    setBusy(false);
    if (!error) alertRef.current.owner = false;
    setMsg(error ? { type: 'err', text: error.message } : { type: 'ok', text: 'Machine marked as free.' });
    refresh();
    loadMine();
  }

  if (loading) return <p className="sub">Loading…</p>;
  if (error) return <div className="err">{error}</div>;
  if (!machine) {
    return (
      <>
        <div className="err">Machine “{id}” was not found.</div>
        <Link href="/">← See all machines</Link>
      </>
    );
  }

  const { status, left } = live(machine, now);

  return (
    <>
      {banner && (
        <div className="alertbar" role="alert">
          <span>{banner}</span>
          <button type="button" onClick={() => setBanner(null)}>OK</button>
        </div>
      )}
      <h1>{machine.name}</h1>
      <p className="sub">{floorLabel(machine.floor)}</p>

      <div className="card">
        {status === 'in_use' && (
          <>
            <div className="mrow"><span className="badge in_use">In use</span></div>
            <div className="big">{fmt(left)}</div>
            <p className="sub" style={{ textAlign: 'center' }}>until this machine is free</p>
            {mine && mine.machine_id === id ? (
              <>
                {push === 'granted' && (
                  <p className="tip">🔔 Reminders are on. You’ll get a notification 5 min and 2 min before, and when it’s done.</p>
                )}
                {push === 'default' && (
                  <button type="button" className="linkbtn" onClick={turnOn}>🔔 Turn on reminders</button>
                )}
                {push === 'needs-install' && (
                  <p className="tip">📱 Want reminders on iPhone? <Link href="/reminders">See how →</Link> Until then, keep this page open for an alert.</p>
                )}
                {push === 'denied' && (
                  <p className="tip">Notifications are blocked for this site, so you’ll only get an alert while this page is open.</p>
                )}
                <button className="danger" onClick={free} disabled={busy}>
                  I’ve taken my clothes — mark as free
                </button>
              </>
            ) : (
              <p className="sub" style={{ textAlign: 'center' }}>
                {machine.user_name ? <>In use by <b>{machine.user_name}</b> · Room {machine.room_no}. </> : null}
                It will become available when the timer ends.
              </p>
            )}
          </>
        )}

        {status === 'out_of_order' && (
          <>
            <span className="badge out_of_order">Out of order</span>
            <p>This machine is currently not working. Please use another one.</p>
          </>
        )}

        {status === 'free' && mine && mine.machine_id !== id && (
          <>
            <span className="badge free">Free</span>
            <div className="err">
              You’re already using <b>{mine.machine_name}</b> ({floorLabel(mine.machine_floor).toLowerCase()}), about{' '}
              {Math.max(1, Math.ceil(mine.seconds_left / 60))} min left. Finish or free it before starting another machine.
            </div>
            <Link href={`/machine/${mine.machine_id}`}>Go to {mine.machine_name} →</Link>
          </>
        )}

        {status === 'free' && !(mine && mine.machine_id !== id) && (
          <form onSubmit={start}>
            <span className="badge free">Free</span>
            <label htmlFor="n">Your name</label>
            <input id="n" type="text" value={name} onChange={(e) => setName(e.target.value)}
              required maxLength={60} autoComplete="name" />
            <label htmlFor="r">Room number</label>
            <input id="r" type="text" value={room} onChange={(e) => setRoom(e.target.value)}
              required maxLength={12} />
            <label>Cycle time (minutes)</label>
            <div className="presets">
              {PRESETS.map((p) => (
                <button type="button" key={p} className={minutes === p ? 'on' : ''} onClick={() => setMinutes(p)}>
                  {p}
                </button>
              ))}
            </div>
            <input type="number" min={1} max={240} value={minutes}
              onChange={(e) => setMinutes(e.target.value)} style={{ marginTop: 8 }} required />
            {push === 'default' && (
              <label className="check">
                <input type="checkbox" checked={remind} onChange={(e) => setRemind(e.target.checked)} />
                <span>🔔 Remind me 5 min and 2 min before it ends</span>
              </label>
            )}
            {push === 'needs-install' && (
              <p className="tip">📱 iPhone: want reminders? <Link href="/reminders">See how →</Link></p>
            )}
            <button className="primary" disabled={busy}>
              {busy ? 'Starting…' : 'Start timer'}
            </button>
          </form>
        )}
      </div>

      {msg && <div className={msg.type}>{msg.text}</div>}
      <p className="foot"><Link href={`/?floor=${machine.floor}`}>See all machines on {floorLabel(machine.floor).toLowerCase()} →</Link></p>
    </>
  );
}
