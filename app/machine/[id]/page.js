'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { useMachines, useNow, live } from '../../../lib/hooks';
import { floorLabel, clockText } from '../../../lib/format';
import { getDeviceId } from '../../../lib/device';
import { enablePush, syncPush, pushStatus } from '../../../lib/push';
import { beep, buzz } from '../../../lib/alerts';
import { getWash, setWash, clearWash } from '../../../lib/wash';
import { LoadingScreen, MessageScreen, FreeScreen, TimerScreen, FinishedScreen, OooScreen, validateForm } from '../../../components/MachineScreens';

const note = { fontSize: 14, fontWeight: 500, lineHeight: 1.4, color: 'var(--ink-2)' };

export default function MachinePage() {
  const { id } = useParams();
  const router = useRouter();
  const { machines, loading, error, refresh } = useMachines(null);
  const now = useNow();

  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [dur, setDur] = useState(25);
  const [custom, setCustom] = useState('');
  const [tried, setTried] = useState(false);
  const [err, setErr] = useState(null); // {kind:'grabbed'|'text', text}
  const [mine, setMine] = useState(undefined); // undefined = loading, null = none
  const [push, setPush] = useState('unsupported');
  const [remind, setRemind] = useState(true);
  const [banner, setBanner] = useState(null);
  const [wash, setWashState] = useState(null);
  const alertRef = useRef({ owner: false, endsAt: 0, fired: {}, done: false });

  useEffect(() => {
    let n = '', r = '';
    try { n = localStorage.getItem('wm_name') || ''; r = localStorage.getItem('wm_room') || ''; } catch {}
    setName(n); setRoom(r);
    if (n && r) setProfile({ name: n, room: r });
    setWashState(getWash());
    const s = pushStatus();
    setPush(s);
    if (s === 'granted') syncPush(n, r);
  }, []);

  async function loadMine() {
    const { data } = await supabase.rpc('my_active_machine', { p_device: getDeviceId() });
    setMine(data && data[0] ? data[0] : null);
  }
  useEffect(() => { loadMine(); }, [machines]);

  const machine = machines.find((m) => m.id === id);

  function fire(text) { setBanner(text); beep(); buzz(); }

  // In-page alerts (backup): 5 min, 2 min, and time's up while this page is open.
  useEffect(() => {
    const a = alertRef.current;
    const m = machines.find((x) => x.id === id);
    if (!m) return;
    const lv = live(m, now);
    const isOwner = lv.status === 'in_use' && mine && mine.machine_id === id;
    if (isOwner) {
      if (!a.owner || Math.abs(a.endsAt - m.endsAt) > 20000) {
        a.fired = {}; a.done = false;
        if (lv.left <= 300) a.fired[300] = true;
        if (lv.left <= 120) a.fired[120] = true;
      }
      a.owner = true; a.endsAt = m.endsAt;
      if (lv.left <= 300 && !a.fired[300]) { a.fired[300] = true; fire('5 minutes left. Get ready to collect your clothes.'); }
      if (lv.left <= 120 && !a.fired[120]) { a.fired[120] = true; fire('2 minutes left. Head over now.'); }
    } else if (a.owner) {
      if (Date.now() >= a.endsAt - 1000) {
        if (!a.done) { a.done = true; fire('Time’s up! Please remove your clothes so others can use the machine.'); }
      }
      a.owner = false;
    }
  }, [now]);

  const profileActive = !!profile && !editing;
  const customN = custom ? parseInt(custom, 10) : 0;
  const minutes = custom ? customN : dur;
  const errors = validateForm({ profileActive, name, room, custom });
  const valid = Object.keys(errors).length === 0 && minutes > 0;
  const useName = profileActive ? profile.name : name.trim();
  const useRoom = profileActive ? profile.room : room.trim().toUpperCase();

  function onGesture() {
    if (push === 'default' && remind && valid) {
      enablePush(useName, useRoom).then(() => setPush(pushStatus()));
    } else if (push === 'granted') {
      syncPush(useName, useRoom);
    }
  }

  async function doStart() {
    setErr(null);
    const { error } = await supabase.rpc('start_machine', {
      p_machine: id, p_name: useName, p_room: useRoom, p_minutes: Number(minutes), p_device: getDeviceId(),
    });
    if (error) {
      if (/already in use/i.test(error.message)) setErr({ kind: 'grabbed' });
      else setErr({ kind: 'text', text: error.message });
      refresh(); loadMine();
      return false;
    }
    try { localStorage.setItem('wm_name', useName); localStorage.setItem('wm_room', useRoom); } catch {}
    setProfile({ name: useName, room: useRoom });
    setEditing(false);
    const endsAt = Date.now() + minutes * 60000;
    setWash({ id, endsAt });
    setWashState({ id, endsAt });
    refresh(); loadMine();
    return true;
  }

  function afterFree(floor) {
    clearWash();
    setWashState(null);
    alertRef.current.owner = false;
    try { sessionStorage.setItem('wm_toast', 'Machine marked as free.'); } catch {}
    router.push('/?floor=' + floor);
  }

  async function doFree() {
    const { error } = await supabase.rpc('free_machine', { p_machine: id, p_device: getDeviceId() });
    if (error) { setBanner(error.message); return false; }
    afterFree(machine.floor);
    return true;
  }

  async function doFinish() {
    // the wash is over; free it (ignore "not yours / already free" errors) and go back to the board
    await supabase.rpc('free_machine', { p_machine: id, p_device: getDeviceId() });
    afterFree(machine.floor);
    return true;
  }

  const toastBar = banner && (
    <div role="alert" style={{ position: 'fixed', top: 'max(12px, env(safe-area-inset-top))', left: 12, right: 12, zIndex: 50, maxWidth: 406, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px 12px 16px', borderRadius: 22, background: 'var(--nav)', color: 'var(--nav-ink)', boxShadow: 'var(--shadow)', fontSize: 14, fontWeight: 600, animation: 'toast 300ms ease-out' }}>
      <span style={{ flex: 1 }}>{banner}</span>
      <button type="button" onClick={() => setBanner(null)} style={{ height: 36, padding: '0 14px', borderRadius: 999, border: 0, background: 'rgba(255,255,255,.18)', color: 'inherit', fontWeight: 600, cursor: 'pointer' }}>OK</button>
    </div>
  );
  const wrap = (child) => <div className="app">{toastBar}{child}</div>;

  if (loading) return wrap(<LoadingScreen />);
  if (error) {
    return wrap(<MessageScreen title="Can’t reach the machines" text={error}>
      <button type="button" onClick={refresh} className="pressable" style={{ height: 56, padding: '0 28px', borderRadius: 999, border: 0, background: 'var(--nav)', color: 'var(--nav-ink)', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Try again</button>
    </MessageScreen>);
  }
  if (!machine) {
    return wrap(<MessageScreen title="Machine not found" text={`There is no machine called “${id}”.`}>
      <Link href="/" style={{ fontWeight: 600, color: 'var(--ink)' }}>← See all machines</Link>
    </MessageScreen>);
  }

  const { status, left } = live(machine, now);
  const seeFloor = () => router.push('/?floor=' + machine.floor);

  if (status === 'out_of_order') return wrap(<OooScreen machine={machine} onSeeFloor={seeFloor} />);

  if (status === 'in_use') {
    if (mine === undefined) return wrap(<LoadingScreen />);
    const isOwn = !!mine && mine.machine_id === id;
    const total = machine.total > 0 ? machine.total : Math.max(left, 25 * 60);
    const extra = isOwn ? (
      <>
        {push === 'granted' && <p style={{ ...note, margin: 0, textAlign: 'center' }}>Reminders are on. You’ll get a nudge 5 min and 2 min before, and when it’s done.</p>}
        {push === 'default' && (
          <button type="button" onClick={async () => { await enablePush(useName || name, useRoom || room); setPush(pushStatus()); }} className="pressable" style={{ width: '100%', height: 52, borderRadius: 999, border: 0, background: 'var(--peri)', color: 'var(--peri-ink)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Turn on reminders</button>
        )}
        {push === 'needs-install' && <p style={{ ...note, margin: 0, textAlign: 'center' }}>iPhone reminders: <Link href="/reminders" style={{ color: 'var(--ink)', fontWeight: 600 }}>see how</Link>. Until then, keep this page open for an alert.</p>}
        {push === 'denied' && <p style={{ ...note, margin: 0, textAlign: 'center' }}>Notifications are blocked, so you’ll only get an alert while this page is open.</p>}
      </>
    ) : null;
    return wrap(
      <TimerScreen machine={machine} isOwn={isOwn} left={left} total={total} endsAtMs={machine.endsAt}
        who={machine.user_name ? `${machine.user_name} · Room ${machine.room_no}` : ''}
        onSeeFloor={seeFloor} onFree={doFree} extra={extra} />
    );
  }

  // free machine: show "wash done" if this phone's wash on it just ended
  if (wash && wash.id === id && now >= wash.endsAt - 1000 && now - wash.endsAt < 12 * 3600 * 1000) {
    return wrap(<FinishedScreen machine={machine} onFree={doFinish} />);
  }

  const busyInfo = mine && mine.machine_id !== id ? { name: mine.machine_name, floor: floorLabel(mine.machine_floor) } : null;
  const remindNode = push === 'default' ? (
    <label style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
      <input type="checkbox" checked={remind} onChange={(e) => setRemind(e.target.checked)} style={{ width: 20, height: 20, accentColor: '#8379EE' }} />
      <span>Remind me 5 min and 2 min before it ends</span>
    </label>
  ) : push === 'needs-install' ? (
    <p style={{ ...note, margin: '16px 4px 0' }}>iPhone: want reminders? <Link href="/reminders" style={{ color: 'var(--ink)', fontWeight: 600 }}>See how</Link></p>
  ) : null;

  return wrap(
    <FreeScreen
      machine={machine} profile={profile} editing={editing}
      name={name} room={room} onName={setName} onRoom={setRoom}
      dur={dur} onDur={(v) => { setDur(v); setCustom(''); }} custom={custom} onCustom={(v) => setCustom(v.replace(/\D/g, '').slice(0, 3))}
      errors={errors} tried={tried}
      donePreview={minutes > 0 ? 'Done around ' + clockText(now + minutes * 60000) : ''}
      busyInfo={busyInfo} grabbed={err && err.kind === 'grabbed'} genericError={err && err.kind === 'text' ? err.text : null}
      onSeeFloor={seeFloor} onOpenBusy={() => busyInfo && router.push('/machine/' + mine.machine_id)}
      onEditProfile={() => setEditing(true)}
      remindNode={remindNode}
      onGesture={onGesture}
      canConfirm={() => valid && !busyInfo}
      onBlocked={() => setTried(true)}
      onConfirm={doStart}
    />
  );
}
