'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMachines, useNow, live } from '../lib/hooks';
import { mmss, floorLabel } from '../lib/format';
import { getWash } from '../lib/wash';
import Water from '../components/Water';
import Digits from '../components/Digits';
import { CheckIcon, DrumIcon, WrenchIcon, LogoIcon, BellIcon, InfoIcon } from '../components/Icons';

const pill = { position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 5, height: 26, padding: '0 10px 0 8px', borderRadius: 999, background: 'var(--pill-bg)', fontSize: 12, fontWeight: 600 };

function Skeleton({ w, h, r = 999 }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', width: w, height: h, borderRadius: r, background: 'var(--line)' }}>
      <span data-motion="" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)', animation: 'hl-shim 1.4s linear infinite' }} />
    </div>
  );
}

function MachineCard({ m, status, left, flashCount, mineKind }) {
  const [why, setWhy] = useState(false);
  const fc = flashCount || 0;
  const totalS = m.total || Math.max(left, 25 * 60);
  const bar = status === 'in_use' ? Math.max(0, Math.min(1, 1 - left / totalS)) : 0;
  const bg = status === 'free' ? 'var(--mint)' : status === 'in_use' ? 'var(--peri)' : 'var(--ooo)';
  const who = m.user_name ? `${m.user_name} · Room ${m.room_no}` : '';
  const aria = `${m.name}, ${status === 'in_use' ? `in use${who ? ' by ' + who : ''}, ${mmss(left)} left` : status === 'out_of_order' ? `out of service${m.ooo_reason ? ': ' + m.ooo_reason : ''}` : 'free'}`;
  const card = (
    <div aria-label={aria} style={{ position: 'relative', overflow: 'hidden', minHeight: 150, height: '100%', boxShadow: mineKind ? '0 0 0 2.5px var(--nav)' : 'none', borderRadius: 26, padding: 16, background: bg, transition: 'background-color 600ms ease-out', animation: fc ? `hl-wash${fc % 2} 800ms ease-out` : 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
      <span data-motion="" key={'s' + fc} style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg,transparent 25%,rgba(255,255,255,.75) 50%,transparent 75%)', transform: 'translateX(-120%)', animation: fc ? `hl-sweep${fc % 2} 900ms ease-out` : 'none', pointerEvents: 'none' }} />
      <span style={{ position: 'relative', fontSize: 17, fontWeight: 700, letterSpacing: '-.01em' }}>{m.name}</span>
      {status === 'free' && (
        <>
          <span style={{ ...pill, color: 'var(--mint-ink)' }}><CheckIcon />Free</span>
          <span style={{ position: 'relative', marginTop: 'auto', fontSize: 15, fontWeight: 600 }}>{mineKind ? 'Your wash is done · tap to open' : 'Available now'}</span>
        </>
      )}
      {status === 'in_use' && (
        <>
          <span style={{ ...pill, color: 'var(--peri-ink)' }}><DrumIcon />In use</span>
          <div aria-hidden="true" style={{ position: 'relative', fontSize: 28, fontWeight: 700, letterSpacing: '-.03em', display: 'flex', lineHeight: 1 }}>
            <Digits value={mmss(left)} />
          </div>
          {(mineKind || who) && <span style={{ position: 'relative', fontSize: 12, fontWeight: mineKind ? 700 : 500, color: mineKind ? 'var(--peri-ink)' : 'var(--ink-2)', lineHeight: 1.3 }}>{mineKind ? 'Yours · tap to open' : who}</span>}
          <span style={{ position: 'relative', display: 'block', width: '100%', height: 6, borderRadius: 999, background: 'var(--pill-bg)', overflow: 'hidden', marginTop: 'auto' }}>
            <span style={{ display: 'block', width: '100%', height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,#ABA3F6,#6A5FE2)', transformOrigin: 'left', transform: `scaleX(${bar.toFixed(3)})`, transition: 'transform 1s linear' }} />
          </span>
        </>
      )}
      {status === 'out_of_order' && (
        <>
          <span style={{ ...pill, color: 'var(--ooo-ink)' }}><WrenchIcon />Out of service</span>
          <span style={{ position: 'relative', marginTop: 'auto', width: '100%', display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: why ? 13 : 15, fontWeight: 600, lineHeight: 1.3, color: 'var(--ooo-ink)', overflowWrap: 'anywhere' }}>{why ? (m.ooo_reason || 'No reason was given') : 'Not working'}</span>
            <button type="button" onClick={() => setWhy((v) => !v)} aria-expanded={why} aria-label={`Why is ${m.name} out of service?`} className="pressable"
              style={{ flex: 'none', width: 32, height: 32, borderRadius: 999, border: 0, background: why ? 'var(--nav)' : 'var(--pill-bg)', color: why ? 'var(--nav-ink)' : 'var(--ooo-ink)', display: 'grid', placeItems: 'center', cursor: 'pointer', transition: 'background-color 240ms ease-out, color 240ms ease-out' }}><InfoIcon size={16} /></button>
          </span>
        </>
      )}
    </div>
  );
  // the person's own machine opens their timer page when tapped
  if (!mineKind) return card;
  return (
    <Link href={'/machine/' + m.id} className="pressable focusable" style={{ display: 'block', borderRadius: 26, textDecoration: 'none', color: 'inherit' }}>{card}</Link>
  );
}

// Is this machine the wash this phone started? 'timer' = still running, 'done' = finished but not freed yet.
function mineKind(m, wash, now) {
  if (!wash || !m || wash.id !== m.id) return null;
  const lv = live(m, now);
  if (lv.status === 'in_use' && Math.abs(m.endsAt - wash.endsAt) < 25000) return 'timer';
  if (lv.status === 'free' && now >= wash.endsAt - 1000 && now - wash.endsAt < 12 * 3600 * 1000) return 'done';
  return null;
}

// "Your wash" shortcut: lets the person who started a wash get back to their own timer
// (or the "I've taken my clothes" screen) after browsing the board.
function MyWashBar({ wash, machines, now }) {
  if (!wash) return null;
  const m = machines.find((x) => x.id === wash.id);
  if (!m) return null;
  const lv = live(m, now);
  const kind = mineKind(m, wash, now);
  const mine = kind === 'timer';
  const done = kind === 'done';
  if (!mine && !done) return null;
  const where = `${m.name} · ${floorLabel(m.floor)}`;
  const base = { margin: '16px 20px 0', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px 12px 18px', borderRadius: 26, textDecoration: 'none', boxShadow: 'var(--shadow)' };
  return (
    <Link href={'/machine/' + m.id} aria-label={mine ? `Your wash on ${where}, ${mmss(lv.left)} left. Open your timer` : `Your wash on ${where} is done. Open it`}
      className="pressable focusable" style={{ ...base, background: mine ? 'var(--nav)' : 'var(--mint)', color: mine ? 'var(--nav-ink)' : 'var(--mint-ink)' }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 600, opacity: .75 }}>{mine ? 'Your wash' : 'Your wash is done'}</span>
        <span style={{ display: 'block', marginTop: 2, fontSize: 16, fontWeight: 700, letterSpacing: '-.01em' }}>{where}{mine ? ` · ${mmss(lv.left)} left` : ''}</span>
      </span>
      <span style={{ flex: 'none', height: 44, padding: '0 16px', borderRadius: 999, display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 700, background: mine ? 'rgba(255,255,255,.18)' : 'var(--surface)', color: mine ? 'var(--nav-ink)' : 'var(--mint-ink)' }}>{mine ? 'Open timer' : 'I’ve taken my clothes'}</span>
    </Link>
  );
}

function Board() {
  const params = useSearchParams();
  const { machines, loading, error, refresh } = useMachines(null);
  const now = useNow();

  const [picked, setPicked] = useState(null);
  const [xf, setXf] = useState(0);
  const [toast, setToast] = useState('');
  const [flash, setFlash] = useState({});
  const prevSt = useRef({});
  const [wash, setWash] = useState(null);
  useEffect(() => {
    const sync = () => setWash(getWash());
    sync();
    window.addEventListener('pageshow', sync);
    document.addEventListener('visibilitychange', sync);
    return () => { window.removeEventListener('pageshow', sync); document.removeEventListener('visibilitychange', sync); };
  }, []);

  const floors = [...new Set(machines.map((m) => m.floor))].sort((a, b) => a - b);
  const fp = params.get('floor');
  const req = fp === 'all' ? 'all' : fp !== null && fp !== '' && !Number.isNaN(Number(fp)) ? Number(fp) : null;
  const tabs = ['all', ...floors];
  const ok = (t) => t === 'all' || floors.includes(t);
  const active = picked !== null && ok(picked) ? picked : req !== null && ok(req) ? req : floors[0];
  const showAll = active === 'all';

  const rows = machines.filter((m) => showAll || m.floor === active).map((m) => ({ m, ...live(m, now) }));
  const free = rows.filter((r) => r.status === 'free').length;
  const total = rows.length;

  function pickFloor(f) {
    if (f === active) return;
    setPicked(f);
    setXf((x) => x + 1);
    try { window.history.replaceState(null, '', `/?floor=${f}`); } catch {}
  }

  // "Thanks, machine is free again" message after freeing a machine
  useEffect(() => {
    let t;
    try {
      const msg = sessionStorage.getItem('wm_toast');
      if (msg) {
        sessionStorage.removeItem('wm_toast');
        setToast(msg);
        t = setTimeout(() => setToast(''), 3400);
      }
    } catch {}
    return () => clearTimeout(t);
  }, []);

  // flash a card when its status changes
  useEffect(() => {
    const st = {};
    let changed = null;
    for (const m of machines) {
      const s = live(m, now).status;
      st[m.id] = s;
      if (prevSt.current[m.id] && prevSt.current[m.id] !== s) (changed = changed || {})[m.id] = true;
    }
    prevSt.current = st;
    if (changed) setFlash((f) => { const n = { ...f }; for (const k in changed) n[k] = (n[k] || 0) + 1; return n; });
  }, [machines, now]);

  const isLoading = loading && !machines.length;
  const isError = !!error && !machines.length;
  const isEmpty = !isLoading && !isError && !total;
  const isLive = !isLoading && !isError && !isEmpty;
  const n = Math.max(1, tabs.length);
  const idx = Math.max(0, tabs.indexOf(active));

  const water = isError
    ? { h: 200, level: 0.3, mode: 'flat', mood: 'sleepy', size: 96, label: '' }
    : { h: 180, level: isLive ? free / Math.max(1, total) : 0.2, mode: 'calm', mood: 'relax', size: 92, label: isLive ? `${free} free` : '' };

  return (
    <div className="app">
      <div style={{ paddingBottom: 130 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 'max(24px, calc(env(safe-area-inset-top) + 12px)) 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--nav)', color: 'var(--nav-ink)', display: 'grid', placeItems: 'center' }}><LogoIcon /></div>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.01em' }}>Hostel Laundry</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/reminders" aria-label="Wash reminders" className="pressable focusable" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface)', boxShadow: 'var(--shadow)', display: 'grid', placeItems: 'center', color: 'var(--ink)' }}><BellIcon size={17} /></Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 14px', borderRadius: 999, background: 'var(--surface)', boxShadow: 'var(--shadow)', fontSize: 13, fontWeight: 600 }}>
              <span style={{ position: 'relative', width: 8, height: 8 }}>
                <span data-motion="" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#3FBF8A', animation: 'hl-pulse 2.4s ease-out infinite' }} />
                <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#3FBF8A' }} />
              </span>
              Live
            </div>
          </div>
        </div>

        {isLive && <MyWashBar wash={wash} machines={machines} now={now} />}

        {isLive && (
          <div style={{ padding: '28px 20px 0' }}>
            <div aria-label={`${free} of ${total} machines free`} style={{ display: 'flex', alignItems: 'baseline', gap: 14, fontSize: 72, fontWeight: 700, letterSpacing: '-.045em', lineHeight: 1 }}>
              <Digits value={String(free)} digitW=".56em" />
              <span style={{ fontSize: '.5em', fontWeight: 600, color: 'var(--ink-2)', letterSpacing: '-.02em' }}>of {total}</span>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 16, fontWeight: 500, color: 'var(--ink-2)' }}>{showAll ? 'machines free across all floors' : `machines free on ${floorLabel(active).toLowerCase()}`}</p>
          </div>
        )}
        {isLoading && (
          <div style={{ padding: '30px 20px 0', display: 'flex', flexDirection: 'column', gap: 14 }} aria-label="Loading machines">
            <Skeleton w={190} h={64} r={22} />
            <Skeleton w={240} h={18} />
          </div>
        )}
        {isError && (
          <div role="alert" style={{ padding: '30px 20px 0' }}>
            <h1 style={{ margin: 0, fontSize: 36, lineHeight: 1.05, fontWeight: 700, letterSpacing: '-.03em' }}>Can't reach the laundry room</h1>
            <p style={{ margin: '12px 0 0', fontSize: 16, fontWeight: 500, color: 'var(--ink-2)' }}>Check your Wi‑Fi and give it another go.</p>
          </div>
        )}
        {isEmpty && (
          <div style={{ padding: '30px 20px 0' }}>
            <h1 style={{ margin: 0, fontSize: 36, lineHeight: 1.05, fontWeight: 700, letterSpacing: '-.03em' }}>No machines yet</h1>
            <p style={{ margin: '12px 0 0', fontSize: 16, fontWeight: 500, color: 'var(--ink-2)' }}>Nothing on the board. Check back soon.</p>
          </div>
        )}

        <div style={{ marginTop: 84 }}>
          <Water height={water.h} level={water.level} mode={water.mode} mood={water.mood} spriteX="72%" spriteSize={water.size} label={water.label} minFill={0.12} maxFill={0.6} />
        </div>

        <div style={{ position: 'relative', marginTop: -34, borderRadius: '32px 32px 0 0', background: 'var(--bg)', padding: '22px 16px 0', minHeight: 420 }}>
          {isLive && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px 14px' }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>Machines</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>Updates on its own</span>
              </div>
              <div data-motion="" key={active} style={{ display: 'flex', flexDirection: 'column', gap: 22, animation: xf ? `hl-xf${xf % 2} 320ms ease-out both` : 'none' }}>
                {(showAll ? floors : [active]).map((f) => {
                  const fr = rows.filter((r) => r.m.floor === f);
                  if (!fr.length) return null;
                  const ff = fr.filter((r) => r.status === 'free').length;
                  return (
                    <section key={f} aria-label={floorLabel(f)}>
                      {showAll && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px 10px' }}>
                          <span style={{ fontSize: 15, fontWeight: 700 }}>{floorLabel(f)}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: ff ? 'var(--mint-ink)' : 'var(--ink-2)' }}>{ff} of {fr.length} free</span>
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {fr.map(({ m, status, left }) => (
                          <MachineCard key={m.id} m={m} status={status} left={left} flashCount={flash[m.id]} mineKind={mineKind(m, wash, now)} />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
              <p style={{ margin: '22px 4px 0', textAlign: 'center', fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>View only. Scan the QR on a machine to start your wash.</p>
            </>
          )}
          {isLoading && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 34 }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} style={{ position: 'relative', overflow: 'hidden', height: 150, borderRadius: 26, background: 'var(--field)' }}>
                  <div style={{ position: 'absolute', left: 16, top: 16, width: 84, height: 16, borderRadius: 999, background: 'var(--line)' }} />
                  <div style={{ position: 'absolute', left: 16, top: 44, width: 58, height: 24, borderRadius: 999, background: 'var(--line)' }} />
                  <div style={{ position: 'absolute', left: 16, bottom: 18, width: 100, height: 14, borderRadius: 999, background: 'var(--line)' }} />
                  <span data-motion="" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent)', animation: 'hl-shim 1.4s linear infinite' }} />
                </div>
              ))}
            </div>
          )}
          {isError && (
            <div style={{ padding: '60px 4px 0' }}>
              <button type="button" onClick={refresh} className="pressable" style={{ width: '100%', height: 58, borderRadius: 999, border: 0, background: 'var(--nav)', color: 'var(--nav-ink)', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Try again</button>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div role="status" data-motion="" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 40px)', maxWidth: 390, bottom: 106, zIndex: 6, padding: '15px 20px', borderRadius: 22, background: 'var(--nav)', color: 'var(--nav-ink)', fontSize: 14, fontWeight: 600, textAlign: 'center', animation: 'hl-toast 300ms cubic-bezier(.2,.8,.2,1) both' }}>{toast}</div>
      )}

      {floors.length > 0 && (
        <nav aria-label="Floors" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 398, bottom: 'max(24px, env(safe-area-inset-bottom))', zIndex: 5, height: 68, padding: 6, borderRadius: 999, background: 'var(--surface)', boxShadow: 'var(--shadow)' }}>
          <div style={{ position: 'absolute', top: 6, bottom: 6, left: 6, width: `calc((100% - 12px) / ${n})`, borderRadius: 999, background: 'var(--nav)', transform: `translateX(${idx * 100}%)`, transition: 'transform 520ms cubic-bezier(.34,1.56,.64,1)' }} />
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${n}, 1fr)`, height: '100%' }}>
            {tabs.map((f) => (
              <button key={f} type="button" onClick={() => pickFloor(f)} aria-current={f === active ? 'page' : undefined} aria-label={f === 'all' ? 'All floors' : floorLabel(f)} className="focusable"
                style={{ border: 0, background: 'transparent', borderRadius: 999, cursor: 'pointer', fontSize: n > 4 ? 13 : 14, fontWeight: 600, padding: 0, color: f === active ? 'var(--nav-ink)' : 'var(--ink-2)', transition: 'color 260ms ease-out' }}>
                {f === 'all' ? 'All' : f === 0 ? 'Ground' : `Floor ${f}`}
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="app" />}>
      <Board />
    </Suspense>
  );
}
