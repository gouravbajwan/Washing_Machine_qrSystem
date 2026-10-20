'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { useMachines, useNow, live } from '../../../lib/hooks';
import { fmt } from '../../../lib/format';

const PRESETS = [30, 45, 60, 90];

export default function MachinePage() {
  const { id } = useParams();
  const { machines, loading, error, refresh } = useMachines(null);
  const now = useNow();

  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [minutes, setMinutes] = useState(45);
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

  async function start(e) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    const { error } = await supabase.rpc('start_machine', {
      p_machine: id, p_name: name, p_room: room, p_minutes: Number(minutes),
    });
    setBusy(false);
    if (error) {
      setMsg({ type: 'err', text: error.message });
    } else {
      try { localStorage.setItem('wm_name', name); localStorage.setItem('wm_room', room); } catch {}
      setMsg({ type: 'ok', text: `Timer started for ${minutes} minutes.` });
    }
    refresh();
  }

  async function free() {
    setMsg(null);
    setBusy(true);
    const { error } = await supabase.rpc('free_machine', { p_machine: id });
    setBusy(false);
    setMsg(error ? { type: 'err', text: error.message } : { type: 'ok', text: 'Machine marked as free.' });
    refresh();
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
      <h1>{machine.name}</h1>
      <p className="sub">Floor {machine.floor}</p>

      <div className="card">
        {status === 'in_use' && (
          <>
            <div className="mrow"><span className="badge in_use">In use</span></div>
            <div className="big">{fmt(left)}</div>
            <p className="sub" style={{ textAlign: 'center' }}>until this machine is free</p>
            <button className="danger" onClick={free} disabled={busy}>
              I’ve taken my clothes — mark as free
            </button>
          </>
        )}

        {status === 'out_of_order' && (
          <>
            <span className="badge out_of_order">Out of order</span>
            <p>This machine is currently not working. Please use another one.</p>
          </>
        )}

        {status === 'free' && (
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
            <button className="primary" disabled={busy}>
              {busy ? 'Starting…' : 'Start timer'}
            </button>
          </form>
        )}
      </div>

      {msg && <div className={msg.type}>{msg.text}</div>}
      <p className="foot"><Link href={`/?floor=${machine.floor}`}>See all machines on floor {machine.floor} →</Link></p>
    </>
  );
}
