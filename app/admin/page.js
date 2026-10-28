'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useMachines, useNow, live } from '../../lib/hooks';
import { floorLabel } from '../../lib/format';

const KEY = 'wm_owner';
const card = { background: 'var(--surface)', borderRadius: 26, padding: 16, boxShadow: 'var(--shadow)' };
const pillBtn = (primary, danger) => ({ height: 46, padding: '0 18px', borderRadius: 999, border: 0, cursor: 'pointer', fontSize: 14, fontWeight: 600, background: primary ? 'var(--nav)' : danger ? 'var(--err-bg)' : 'var(--field)', color: primary ? 'var(--nav-ink)' : danger ? 'var(--err-ink)' : 'var(--ink)' });

// Two taps: the first one asks "Sure?", the second does it (resets after 4 s).
function ConfirmButton({ label, confirmLabel, onConfirm, disabled, style }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button type="button" disabled={disabled} className="pressable"
      onClick={() => { if (armed) { setArmed(false); onConfirm(); } else setArmed(true); }}
      style={{ ...style, opacity: disabled ? .5 : 1 }}>{armed ? confirmLabel : label}</button>
  );
}

export default function Admin() {
  const [secret, setSecret] = useState(null);
  const [access, setAccess] = useState('checking'); // checking | denied | ok
  const { machines, loading, error, refresh } = useMachines(null);
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // {ok, text}
  const [newFloor, setNewFloor] = useState('');
  const [newCount, setNewCount] = useState(2);

  // pick up the secret from the QR link (after "#k="), remember it on this phone, then hide it from the address bar
  useEffect(() => {
    let k = '';
    try {
      const m = window.location.hash.match(/[#&]k=([^&]+)/);
      if (m) {
        k = decodeURIComponent(m[1]);
        localStorage.setItem(KEY, k);
        window.history.replaceState(null, '', window.location.pathname);
      } else {
        k = localStorage.getItem(KEY) || '';
      }
    } catch {}
    if (!k) { setAccess('denied'); return; }
    supabase.rpc('admin_check', { p_secret: k }).then(({ data, error }) => {
      if (!error && data === true) { setSecret(k); setAccess('ok'); }
      else { try { localStorage.removeItem(KEY); } catch {} setAccess('denied'); }
    });
  }, []);

  async function run(fn, params, okText) {
    setBusy(true); setMsg(null);
    const { data, error } = await supabase.rpc(fn, { p_secret: secret, ...params });
    setBusy(false);
    if (error) { setMsg({ ok: false, text: error.message }); return false; }
    await refresh();
    setMsg({ ok: true, text: typeof okText === 'function' ? okText(data) : okText });
    return true;
  }

  const floors = [...new Set(machines.map((m) => m.floor))].sort((a, b) => a - b);
  const nf = newFloor === '' ? null : parseInt(newFloor, 10);
  const nfOk = nf !== null && nf >= 0 && nf <= 30 && !floors.includes(nf);

  if (access === 'checking') return <div className="app" style={{ padding: 24 }}><p style={{ color: 'var(--ink-2)', fontWeight: 600 }}>Checking…</p></div>;
  if (access === 'denied') {
    return (
      <div className="app" style={{ minHeight: '100dvh', padding: 'max(28px, env(safe-area-inset-top)) 20px' }}>
        <h1 style={{ margin: '24px 0 0', fontSize: 36, lineHeight: 1.05, fontWeight: 700, letterSpacing: '-.03em' }}>Owner only</h1>
        <p style={{ margin: '12px 0 0', fontSize: 16, fontWeight: 500, lineHeight: 1.45, color: 'var(--ink-2)' }}>This page opens by scanning the owner QR code. Scan it again with your phone camera.</p>
        <Link href="/" style={{ display: 'inline-block', marginTop: 24, fontWeight: 600, color: 'var(--ink)' }}>← Back to the board</Link>
      </div>
    );
  }

  return (
    <div className="app" style={{ minHeight: '100dvh', padding: 'max(24px, calc(env(safe-area-inset-top) + 12px)) 16px 40px' }}>
      <div style={{ padding: '0 4px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', height: 30, padding: '0 12px', borderRadius: 999, background: 'var(--nav)', color: 'var(--nav-ink)', fontSize: 13, fontWeight: 600 }}>Owner mode</span>
        <h1 style={{ margin: '14px 0 0', fontSize: 34, lineHeight: 1.05, fontWeight: 700, letterSpacing: '-.03em' }}>Floors and machines</h1>
        <p style={{ margin: '10px 0 0', fontSize: 15, fontWeight: 500, lineHeight: 1.45, color: 'var(--ink-2)' }}>Changes show on the board right away. A machine or floor can’t be removed while a wash is running on it.</p>
      </div>

      {msg && (
        <div role="status" style={{ margin: '16px 0 0', padding: '12px 16px', borderRadius: 20, fontSize: 14, fontWeight: 600, lineHeight: 1.4, background: msg.ok ? 'var(--mint)' : 'var(--err-bg)', color: msg.ok ? 'var(--mint-ink)' : 'var(--err-ink)' }}>{msg.text}</div>
      )}
      {error && <p role="alert" style={{ margin: '16px 4px 0', color: 'var(--err-ink)', fontWeight: 600 }}>{error}</p>}
      {loading && <p style={{ margin: '20px 4px 0', color: 'var(--ink-2)' }}>Loading…</p>}

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {floors.map((f) => {
          const list = machines.filter((m) => m.floor === f);
          return (
            <section key={f} aria-label={floorLabel(f)} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-.02em' }}>{floorLabel(f)}</h2>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>{list.length} {list.length === 1 ? 'machine' : 'machines'}</span>
              </div>
              <ul style={{ listStyle: 'none', margin: '12px 0 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {list.map((m) => {
                  const st = live(m, now).status;
                  const label = st === 'in_use' ? 'In use' : st === 'out_of_order' ? 'Out of service' : 'Free';
                  return (
                    <li key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 6px 6px 14px', borderRadius: 20, background: 'var(--field)' }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 16, fontWeight: 700 }}>{m.name}</span>
                        <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>{label}</span>
                      </span>
                      <ConfirmButton label="Remove" confirmLabel="Tap to confirm" disabled={busy}
                        onConfirm={() => run('admin_remove_machine', { p_machine: m.id }, `${m.name} removed from ${floorLabel(f)}.`)}
                        style={{ ...pillBtn(false, true), height: 40, padding: '0 14px', fontSize: 13 }} />
                    </li>
                  );
                })}
              </ul>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" disabled={busy || list.length >= 12} className="pressable" style={{ ...pillBtn(true), opacity: busy || list.length >= 12 ? .5 : 1 }}
                  onClick={() => run('admin_add_machine', { p_floor: f }, (id) => `Added a machine on ${floorLabel(f)} (${id}). Print its QR from the QR page and stick it on the machine.`)}>+ Add machine</button>
                <ConfirmButton label="Remove floor" confirmLabel="Remove all machines?" disabled={busy}
                  onConfirm={() => run('admin_remove_floor', { p_floor: f }, `${floorLabel(f)} removed.`)} style={pillBtn(false, true)} />
              </div>
            </section>
          );
        })}

        <section aria-label="Add a floor" style={card}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-.02em' }}>Add a floor</h2>
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', paddingLeft: 4 }}>Floor number (0 = Ground)</span>
              <input inputMode="numeric" placeholder="4" value={newFloor} onChange={(e) => setNewFloor(e.target.value.replace(/\D/g, '').slice(0, 2))}
                style={{ height: 54, borderRadius: 18, border: 0, background: 'var(--field)', color: 'var(--ink)', padding: '0 16px', fontSize: 17, fontWeight: 700, outline: 'none', width: '100%' }} />
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', paddingLeft: 4 }}>Machines</span>
              <div style={{ height: 54, borderRadius: 18, background: 'var(--field)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px' }}>
                <button type="button" aria-label="Fewer machines" onClick={() => setNewCount((c) => Math.max(1, c - 1))} className="pressable" style={{ width: 42, height: 42, borderRadius: '50%', border: 0, background: 'var(--surface)', color: 'var(--ink)', fontSize: 20, fontWeight: 700, cursor: 'pointer' }}>−</button>
                <span style={{ fontSize: 18, fontWeight: 700 }}>{newCount}</span>
                <button type="button" aria-label="More machines" onClick={() => setNewCount((c) => Math.min(12, c + 1))} className="pressable" style={{ width: 42, height: 42, borderRadius: '50%', border: 0, background: 'var(--surface)', color: 'var(--ink)', fontSize: 20, fontWeight: 700, cursor: 'pointer' }}>+</button>
              </div>
            </div>
          </div>
          {nf !== null && floors.includes(nf) && <p style={{ margin: '8px 4px 0', fontSize: 13, fontWeight: 600, color: 'var(--err-ink)' }}>That floor already exists.</p>}
          <button type="button" disabled={busy || !nfOk} className="pressable" style={{ ...pillBtn(true), width: '100%', marginTop: 12, height: 52, opacity: busy || !nfOk ? .5 : 1 }}
            onClick={async () => { if (await run('admin_add_floor', { p_floor: nf, p_machines: newCount }, `${floorLabel(nf)} added with ${newCount} ${newCount === 1 ? 'machine' : 'machines'}. Print their QR codes from the QR page.`)) setNewFloor(''); }}>Add floor</button>
        </section>
      </div>

      <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <Link href="/qr" style={{ fontWeight: 600, color: 'var(--ink)' }}>Print QR codes for machines and floors →</Link>
        <Link href="/" style={{ fontWeight: 600, color: 'var(--ink-2)' }}>View the board</Link>
        <button type="button" onClick={() => { try { localStorage.removeItem(KEY); } catch {} setSecret(null); setAccess('denied'); }}
          style={{ height: 44, border: 0, background: 'transparent', color: 'var(--ink-2)', fontSize: 14, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>Leave owner mode on this phone</button>
      </div>
    </div>
  );
}
