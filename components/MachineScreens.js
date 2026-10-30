'use client';
import { useState } from 'react';
import Water from './Water';
import { KIND_LIST, BUDDY } from './Sprite';

function savedBuddy() {
  try { const b = localStorage.getItem('wm_last_buddy'); if (KIND_LIST.includes(b)) return b; } catch {}
  return 'sock';
}
import Digits from './Digits';
import SlideToConfirm from './SlideToConfirm';
import { CheckIcon, DrumIcon, WrenchIcon, ClockIcon, HourglassIcon, InfoIcon } from './Icons';
import { floorLabel, mmss, clockText, reportedText } from '../lib/format';

export const DURS = [15, 25, 35];

const chipBase = { height: 30, display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 999, fontSize: 13, fontWeight: 600 };
const floorChip = { ...chipBase, padding: '0 12px', background: 'var(--surface)', boxShadow: 'var(--shadow)' };
const statusChip = (bg, fg) => ({ ...chipBase, padding: '0 12px 0 9px', background: bg, color: fg });
const h1Big = { margin: '16px 0 0', fontSize: 46, fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1 };
const errBox = { marginBottom: 18, padding: '14px 16px', borderRadius: 22, background: 'var(--err-bg)', color: 'var(--err-ink)', display: 'flex', flexDirection: 'column', gap: 8 };
const errBtn = { alignSelf: 'flex-start', height: 44, padding: '0 16px', borderRadius: 999, border: 0, background: 'var(--surface)', color: 'var(--ink)', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const topPad = 'max(28px, calc(env(safe-area-inset-top) + 16px)) 20px 0';

// ---- form validation (shared with the page) ----
export function validateForm({ profileActive, name, room, custom }) {
  const e = {};
  if (!profileActive) {
    if (!String(name).trim()) e.name = "Add your name so people know who's washing";
    const r = String(room).trim();
    if (!/^(?=.*\d)[A-Za-z0-9\-/ ]{1,12}$/.test(r)) e.room = r ? 'Try something like 214 or B-12' : 'Add your room number';
  }
  if (custom) {
    const n = parseInt(custom, 10);
    if (!(n >= 5 && n <= 120)) e.custom = 'Pick between 5 and 120 minutes';
  }
  return e;
}

export function LoadingScreen() {
  const bar = (w, h, r = 999) => (
    <div style={{ position: 'relative', overflow: 'hidden', width: w, height: h, borderRadius: r, background: 'var(--line)' }}>
      <span data-motion="" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)', animation: 'hl-shim 1.4s linear infinite' }} />
    </div>
  );
  return (
    <div style={{ minHeight: '100dvh', padding: topPad, display: 'flex', flexDirection: 'column', gap: 14 }} aria-label="Loading">
      {bar(110, 30)}
      {bar(220, 52, 18)}
      {bar(160, 18)}
    </div>
  );
}

export function MessageScreen({ title, text, children }) {
  return (
    <div style={{ minHeight: '100dvh', padding: topPad }}>
      <h1 style={{ margin: '24px 0 0', fontSize: 36, lineHeight: 1.05, fontWeight: 700, letterSpacing: '-.03em' }}>{title}</h1>
      {text && <p style={{ margin: '12px 0 0', fontSize: 16, fontWeight: 500, color: 'var(--ink-2)' }}>{text}</p>}
      <div style={{ marginTop: 24 }}>{children}</div>
    </div>
  );
}

// ---- bottom sheet + report form (out-of-service reports) ----
const REASONS = ['Not spinning', 'Water leak', 'Won’t drain', 'Won’t turn on', 'Door stuck', 'Other'];

function Sheet({ title, text, onClose, children }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <button type="button" aria-label="Close" onClick={onClose} style={{ position: 'absolute', inset: 0, border: 0, background: 'rgba(35,34,74,.38)', cursor: 'pointer' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 430, background: 'var(--surface)', borderRadius: '28px 28px 0 0', padding: '22px 20px max(24px, env(safe-area-inset-bottom))', boxShadow: 'var(--shadow)', animation: 'toast 300ms ease-out' }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-.02em' }}>{title}</h2>
        {text && <p style={{ margin: '8px 0 0', fontSize: 14, fontWeight: 500, lineHeight: 1.45, color: 'var(--ink-2)' }}>{text}</p>}
        {children}
      </div>
    </div>
  );
}

const sheetBtn = (primary, disabled) => ({ flex: 1, height: 54, borderRadius: 999, border: 0, background: primary ? 'var(--nav)' : 'var(--field)', color: primary ? 'var(--nav-ink)' : 'var(--ink)', fontSize: 15, fontWeight: 600, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? .45 : 1 });

export function ReportSheet({ machine, onClose, onSubmit }) {
  const [pick, setPick] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const extra = text.trim();
  const reason = !pick ? '' : pick === 'Other' ? extra : extra ? `${pick} – ${extra}` : pick;
  const ok = reason.length >= 3 && reason.length <= 120;
  async function go() {
    if (!ok || busy) return;
    setBusy(true); setErr('');
    const msg = await onSubmit(reason);
    if (msg) { setErr(msg); setBusy(false); }
  }
  return (
    <Sheet title={`Report ${machine.name}`} text="Tell others what’s wrong. It will show as out of service until someone marks it working again." onClose={onClose}>
      <div role="radiogroup" aria-label="What’s wrong?" style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {REASONS.map((r) => {
          const sel = pick === r;
          return (
            <button key={r} type="button" role="radio" aria-checked={sel} onClick={() => setPick(r)} className="pressable"
              style={{ height: 44, padding: '0 16px', borderRadius: 999, border: 0, background: sel ? 'var(--nav)' : 'var(--field)', color: sel ? 'var(--nav-ink)' : 'var(--ink)', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'background-color 240ms ease-out, color 240ms ease-out' }}>{r}</button>
          );
        })}
      </div>
      {pick && (
        <input autoFocus={pick === 'Other'} value={text} onChange={(e) => setText(e.target.value.slice(0, 100))} maxLength={100}
          placeholder={pick === 'Other' ? 'What’s wrong?' : 'Add details (optional)'} aria-label="Details"
          style={{ marginTop: 12, width: '100%', height: 54, borderRadius: 18, border: 0, background: 'var(--field)', color: 'var(--ink)', padding: '0 16px', fontSize: 16, fontWeight: 600, outline: 'none' }} />
      )}
      {err && <p role="alert" style={{ margin: '12px 2px 0', fontSize: 13, fontWeight: 600, color: 'var(--err-ink)', lineHeight: 1.35 }}>{err}</p>}
      <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
        <button type="button" onClick={onClose} className="pressable" style={sheetBtn(false, false)}>Cancel</button>
        <button type="button" onClick={go} disabled={!ok || busy} className="pressable" style={sheetBtn(true, !ok || busy)}>{busy ? 'Reporting…' : 'Report problem'}</button>
      </div>
    </Sheet>
  );
}

function RestoreSheet({ machine, onClose, onRestore }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function go() {
    if (busy) return;
    setBusy(true); setErr('');
    const msg = await onRestore();
    if (msg) { setErr(msg); setBusy(false); }
  }
  return (
    <Sheet title={`Is ${machine.name} working again?`} text="Only mark it available if you’ve checked it works. Everyone will be able to use it." onClose={onClose}>
      {err && <p role="alert" style={{ margin: '12px 2px 0', fontSize: 13, fontWeight: 600, color: 'var(--err-ink)' }}>{err}</p>}
      <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
        <button type="button" onClick={onClose} className="pressable" style={sheetBtn(false, false)}>Not yet</button>
        <button type="button" onClick={go} disabled={busy} className="pressable" style={sheetBtn(true, busy)}>{busy ? 'Updating…' : 'Yes, mark available'}</button>
      </div>
    </Sheet>
  );
}

// ------------------------------------------------------------------ FREE
export function FreeScreen({
  machine, profile, editing, name, room, onName, onRoom, dur, onDur, custom, onCustom, errors, tried, donePreview,
  busyInfo, grabbed, genericError, onSeeFloor, onOpenBusy, onEditProfile, remindNode, onGesture, canConfirm, onBlocked, onConfirm, onReport,
}) {
  const [reporting, setReporting] = useState(false);
  const hasProfile = !!profile && !editing;
  const field = (invalid) => ({ width: '100%', height: 58, borderRadius: 20, border: `2px solid ${invalid ? 'var(--err-ink)' : 'transparent'}`, background: 'var(--field)', color: 'var(--ink)', padding: '0 18px', fontSize: 17, fontWeight: 600, outline: 'none', transition: 'border-color 200ms ease-out' });
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: topPad }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={floorChip}>{floorLabel(machine.floor)}</span>
          <span style={statusChip('var(--mint)', 'var(--mint-ink)')}><CheckIcon />Free</span>
        </div>
        <h1 style={h1Big}>{machine.name}</h1>
        <p style={{ margin: '8px 0 0', fontSize: 16, fontWeight: 500, color: 'var(--ink-2)' }}>{machine.name} is free. Go get clean.</p>
      </div>
      <div style={{ marginTop: 78, flex: 'none' }}>
        <Water height={150} level={0} mode="calm" mood="relax" spriteX="72%" spriteSize={104} minFill={0.3} bubbles={3} />
      </div>
      <div style={{ position: 'relative', flex: 1, marginTop: -34, borderRadius: '32px 32px 0 0', background: 'var(--surface)', padding: '24px 20px 30px', boxShadow: '0 -18px 40px -28px rgba(60,48,160,.4)', display: 'flex', flexDirection: 'column' }}>
        {busyInfo && (
          <div role="alert" style={errBox}>
            <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35 }}>You’re already using {busyInfo.name} ({busyInfo.floor}). Finish it before starting another.</span>
            <button type="button" onClick={onOpenBusy} style={errBtn}>Open {busyInfo.name}</button>
          </div>
        )}
        {grabbed && (
          <div role="alert" style={errBox}>
            <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35 }}>Oops, someone just grabbed this one</span>
            <button type="button" onClick={onSeeFloor} style={errBtn}>See free machines on {floorLabel(machine.floor).toLowerCase()}</button>
          </div>
        )}
        {genericError && (
          <div role="alert" style={errBox}>
            <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35 }}>{genericError}</span>
          </div>
        )}

        {hasProfile ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 8px 8px 18px', borderRadius: 24, background: 'var(--field)' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>Washing as</div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{profile.name} · Room {profile.room}</div>
            </div>
            <button type="button" onClick={onEditProfile} style={{ height: 48, padding: '0 18px', borderRadius: 999, border: 0, background: 'var(--surface)', color: 'var(--ink)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Change</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', paddingLeft: 4 }}>Name</span>
              <input name="name" autoComplete="given-name" placeholder="Priya" maxLength={60} value={name} onChange={(e) => onName(e.target.value)} aria-invalid={tried && !!errors.name} style={field(tried && errors.name)} />
              {tried && errors.name && <span role="alert" style={{ fontSize: 12, fontWeight: 600, color: 'var(--err-ink)', paddingLeft: 4, lineHeight: 1.3 }}>{errors.name}</span>}
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', paddingLeft: 4 }}>Room</span>
              <input name="room" autoComplete="off" placeholder="305" maxLength={12} value={room} onChange={(e) => onRoom(e.target.value)} aria-invalid={tried && !!errors.room} style={field(tried && errors.room)} />
              {tried && errors.room && <span role="alert" style={{ fontSize: 12, fontWeight: 600, color: 'var(--err-ink)', paddingLeft: 4, lineHeight: 1.3 }}>{errors.room}</span>}
            </label>
          </div>
        )}

        <div style={{ marginTop: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>How long?</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>{donePreview}</span>
        </div>
        <div role="radiogroup" aria-label="Wash length" style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.3fr', gap: 8 }}>
          {DURS.map((v) => {
            const sel = !custom && dur === v;
            return (
              <button key={v} type="button" role="radio" aria-checked={sel} onClick={() => onDur(v)} className="pressable"
                style={{ height: 56, borderRadius: 999, border: 0, cursor: 'pointer', background: sel ? 'var(--nav)' : 'var(--field)', color: sel ? 'var(--nav-ink)' : 'var(--ink)', fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, transition: 'background-color 240ms ease-out, color 240ms ease-out, transform 160ms ease-out' }}>
                {v}<span style={{ fontSize: 12, fontWeight: 500 }}>min</span>
              </button>
            );
          })}
          <div style={{ position: 'relative' }}>
            <input aria-label="Custom minutes" inputMode="numeric" placeholder="Other" value={custom} onChange={(e) => onCustom(e.target.value)}
              style={{ width: '100%', height: 56, borderRadius: 999, border: `2px solid ${errors.custom ? 'var(--err-ink)' : custom ? 'var(--nav)' : 'transparent'}`, background: 'var(--field)', color: 'var(--ink)', padding: '0 34px 0 16px', fontSize: 16, fontWeight: 700, outline: 'none' }} />
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>min</span>
          </div>
        </div>
        {errors.custom && <div role="alert" style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: 'var(--err-ink)', textAlign: 'right', paddingRight: 6 }}>{errors.custom}</div>}

        {remindNode}

        <div style={{ flex: 1, minHeight: 24 }} />
        <SlideToConfirm label="Slide to start" ariaLabel="Slide to start the timer" ripColor="#8379EE" shadow={false}
          onGesture={onGesture} canConfirm={canConfirm} onBlocked={onBlocked} onConfirm={onConfirm} fallbackLabel="Tap to start instead" />
        {onReport && (
          <button type="button" onClick={() => setReporting(true)} style={{ marginTop: 8, alignSelf: 'center', height: 48, padding: '0 12px', border: 0, background: 'transparent', color: 'var(--ink-2)', fontSize: 14, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>Machine not working? Report a problem</button>
        )}
      </div>
      {reporting && <ReportSheet machine={machine} onClose={() => setReporting(false)} onSubmit={onReport} />}
    </div>
  );
}

// ------------------------------------------------------------------ IN USE (own / other)
export function TimerScreen({ machine, isOwn, left, total, endsAtMs, who, onSeeFloor, onFree, extra }) {
  const prog = total > 0 ? Math.max(0, Math.min(1, 1 - left / total)) : 0;
  const durMin = Math.max(1, Math.round((total || left) / 60));
  return (
    <div style={{ position: 'relative', minHeight: '100dvh', paddingBottom: 180 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, padding: topPad }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.1 }}>{machine.name}</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)', marginTop: 2 }}>{floorLabel(machine.floor)}</div>
        </div>
        <span style={{ ...statusChip('var(--peri)', 'var(--peri-ink)'), height: 32, gap: 6, padding: '0 13px 0 10px', whiteSpace: 'nowrap' }}><DrumIcon size={14} spin />Spin cycle in progress</span>
      </div>
      <div style={{ position: 'relative', width: 236, height: 236, margin: '14px auto 0' }}>
        <svg width="236" height="236" viewBox="0 0 236 236" style={{ display: 'block' }} aria-hidden="true">
          <defs>
            <linearGradient id="hl-ring" gradientUnits="userSpaceOnUse" x1="118" y1="0" x2="118" y2="236">
              <stop offset="0" stopColor="#C9C3FA" stopOpacity=".25" /><stop offset=".45" stopColor="#9A91F3" /><stop offset="1" stopColor="#5A4FD4" />
            </linearGradient>
          </defs>
          <circle cx="118" cy="118" r="106" fill="none" stroke="var(--line)" strokeWidth="8" />
          <circle cx="118" cy="118" r="106" fill="none" stroke="url(#hl-ring)" strokeWidth="10" strokeLinecap="round" strokeDasharray="666" strokeDashoffset={(666 * (1 - prog)).toFixed(1)} transform="rotate(-90 118 118)" style={{ transition: 'stroke-dashoffset 1s linear' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div role="timer" aria-label={mmss(left) + ' left'} style={{ fontSize: 60, fontWeight: 700, letterSpacing: '-.04em', display: 'flex' }}>
            <Digits value={mmss(left)} digitW=".56em" colonW=".26em" />
          </div>
          <div style={{ marginTop: 6, fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>of {durMin} min</div>
          {isOwn && KIND_LIST.includes(machine.buddy) && <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: 'var(--peri-ink)' }}>with {BUDDY[machine.buddy]}</div>}
        </div>
      </div>
      <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: 15, fontWeight: 500, color: 'var(--ink-2)' }}>until this machine is free</p>
      <p style={{ margin: '2px 0 0', textAlign: 'center', fontSize: 14, fontWeight: 600 }}>Ends at {clockText(endsAtMs)}</p>

      {isOwn ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '16px 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 22, background: 'var(--lav)' }}>
              <ClockIcon />
              <div><div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>Elapsed</div><div style={{ fontSize: 19, fontWeight: 700 }}>{mmss(Math.max(0, (total || left) - left))}</div></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 22, background: 'var(--cream)' }}>
              <HourglassIcon />
              <div><div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>Remaining</div><div style={{ fontSize: 19, fontWeight: 700 }}>{mmss(left)}</div></div>
            </div>
          </div>
          {extra && <div style={{ padding: '12px 20px 0', position: 'relative', zIndex: 3 }}>{extra}</div>}
        </>
      ) : (
        <div style={{ padding: '16px 32px 0', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, fontWeight: 500 }}>
            {who ? <>In use by {who}. </> : null}It will become available when the timer ends.
          </p>
          <button type="button" onClick={onSeeFloor} style={{ marginTop: 4, height: 48, padding: '0 12px', border: 0, background: 'transparent', color: 'var(--ink)', fontSize: 14, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>See everything on this floor</button>
        </div>
      )}

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <Water height={330} level={prog} mode="active" mood="float" spriteSize={92} spriteX={isOwn ? '68%' : '50%'} label={Math.round(prog * 100) + '%'} minFill={0.3} maxFill={0.9} kind={KIND_LIST.includes(machine.buddy) ? machine.buddy : savedBuddy()} />
      </div>
      {isOwn && (
        <div style={{ position: 'absolute', left: 20, right: 20, bottom: 30, zIndex: 3 }}>
          <SlideToConfirm label="Slide if you've taken your clothes" ariaLabel="Slide to free this machine" onConfirm={onFree} />
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ STARTED
export function StartedScreen({ machine, mins, endsAtMs, onSeeTimer }) {
  return (
    <div role="status" style={{ position: 'relative', minHeight: '100dvh' }}>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 'max(28px, calc(env(safe-area-inset-top) + 16px))' }}>
        <span style={{ height: 32, display: 'inline-flex', alignItems: 'center', padding: '0 14px', borderRadius: 999, background: 'var(--surface)', boxShadow: 'var(--shadow)', fontSize: 13, fontWeight: 600 }}>{machine.name} · {floorLabel(machine.floor)}</span>
      </div>
      <div style={{ marginTop: 44, textAlign: 'center', fontSize: 84, fontWeight: 700, letterSpacing: '-.05em', lineHeight: 1 }}>{mmss(mins * 60)}</div>
      <h1 style={{ margin: '16px 0 0', textAlign: 'center', fontSize: 24, fontWeight: 700, letterSpacing: '-.02em' }}>Timer started for {mins} min</h1>
      <p style={{ margin: '6px 0 0', textAlign: 'center', fontSize: 15, fontWeight: 500, color: 'var(--ink-2)' }}>Ends at {clockText(endsAtMs)}. We’ll keep the spot warm.</p>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <Water height={470} level={0.04} riseFrom={-0.6} mode="active" mood="float" spriteX="38%" spriteSize={120} ripple rippleX="80%" minFill={0.38} maxFill={0.88} />
      </div>
      <button type="button" onClick={onSeeTimer} style={{ position: 'absolute', left: '50%', bottom: 34, zIndex: 3, transform: 'translateX(-50%)', height: 58, padding: '0 30px', borderRadius: 999, border: 0, background: '#fff', color: '#23224A', fontSize: 16, fontWeight: 600, cursor: 'pointer', boxShadow: '0 14px 30px -12px rgba(20,18,70,.55)' }}>See my timer</button>
    </div>
  );
}

// ------------------------------------------------------------------ FINISHED
export function FinishedScreen({ machine, onFree }) {
  return (
    <div role="status" style={{ position: 'relative', minHeight: '100dvh' }}>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 'max(28px, calc(env(safe-area-inset-top) + 16px))' }}>
        <span style={{ ...statusChip('var(--mint)', 'var(--mint-ink)'), height: 32, gap: 6, padding: '0 14px 0 10px' }}><CheckIcon />{machine.name} · {floorLabel(machine.floor)}</span>
      </div>
      <h1 style={{ margin: '24px 0 0', textAlign: 'center', fontSize: 36, fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.05 }}>Your wash is done.</h1>
      <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: 17, fontWeight: 500, color: 'var(--ink-2)' }}>Go get your clothes.</p>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <Water height={600} level={1} mode="settle" mood="cheer" kind={KIND_LIST.includes(machine.buddy) ? machine.buddy : savedBuddy()} spriteSize={150} burst label="100%" labelSize={32} minFill={0.1} maxFill={0.72} bubbles={3} />
      </div>
      <div style={{ position: 'absolute', left: 20, right: 20, bottom: 30, zIndex: 3 }}>
        <SlideToConfirm label="Slide if you've taken your clothes" ariaLabel="Slide to free this machine" onConfirm={onFree} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ OUT OF ORDER
export function OooScreen({ machine, onSeeFloor, onRestore }) {
  const [info, setInfo] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const reason = machine.ooo_reason || 'No reason was given.';
  const when = machine.ooo_at ? reportedText(machine.ooo_at) : '';
  return (
    <div style={{ position: 'relative', minHeight: '100dvh' }}>
      <div style={{ padding: topPad }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={floorChip}>{floorLabel(machine.floor)}</span>
          <span style={statusChip('var(--ooo)', 'var(--ooo-ink)')}><WrenchIcon />Out of service</span>
          <button type="button" onClick={() => setInfo((v) => !v)} aria-expanded={info} aria-label="Why is this out of service?" className="pressable"
            style={{ width: 34, height: 34, borderRadius: 999, border: 0, background: info ? 'var(--nav)' : 'var(--surface)', color: info ? 'var(--nav-ink)' : 'var(--ink)', boxShadow: 'var(--shadow)', display: 'grid', placeItems: 'center', cursor: 'pointer', transition: 'background-color 240ms ease-out, color 240ms ease-out' }}><InfoIcon size={17} /></button>
        </div>
        <h1 style={h1Big}>{machine.name}</h1>
        <p style={{ margin: '10px 0 0', fontSize: 17, lineHeight: 1.4, fontWeight: 500, color: 'var(--ink-2)' }}>This machine is on a break. Try another one</p>
        {info && (
          <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 22, background: 'var(--surface)', boxShadow: 'var(--shadow)', animation: 'toast 240ms ease-out' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', letterSpacing: '.02em' }}>Reason</div>
            <div style={{ marginTop: 3, fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>{reason}</div>
            {when && <div style={{ marginTop: 6, fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>{when}</div>}
          </div>
        )}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <Water height={440} level={0.3} mode="flat" mood="sleepy" spriteSize={136} />
      </div>
      {onRestore && (
        <button type="button" onClick={() => setRestoring(true)} style={{ position: 'absolute', left: 20, right: 20, bottom: 100, zIndex: 3, height: 48, border: 0, background: 'transparent', color: 'var(--ink)', fontSize: 14, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>Working again? Mark as available</button>
      )}
      <button type="button" onClick={onSeeFloor} className="pressable" style={{ position: 'absolute', left: 20, right: 20, bottom: 34, zIndex: 3, height: 60, borderRadius: 999, border: 0, background: 'var(--nav)', color: 'var(--nav-ink)', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
        See free machines on {floorLabel(machine.floor).toLowerCase()}
      </button>
      {restoring && <RestoreSheet machine={machine} onClose={() => setRestoring(false)} onRestore={onRestore} />}
    </div>
  );
}
