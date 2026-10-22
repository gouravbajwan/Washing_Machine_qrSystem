'use client';
import { useEffect, useRef, useState } from 'react';
import { Chevrons } from './Icons';

// Slide-to-confirm pill. Also works with the keyboard (Enter / Space / Right arrow).
//  onGesture()    runs synchronously at the moment of confirming (use it for permission prompts)
//  canConfirm()   return false to refuse (the thumb springs back and onBlocked() runs)
//  onConfirm()    async; return false to spring back
export default function SlideToConfirm({ label, ariaLabel, onConfirm, canConfirm, onBlocked, onGesture, ripColor = '#fff', shadow = true, fallbackLabel }) {
  const trk = useRef(null);
  const off = useRef(null);
  const timer = useRef(null);
  const sxRef = useRef(0);
  const [sx, setSx] = useState(0);
  const [drag, setDrag] = useState(false);
  const [bump, setBump] = useState(0);
  const [rip, setRip] = useState(0);
  const [W, setW] = useState(286);

  const move = (v) => { sxRef.current = v; setSx(v); };

  useEffect(() => {
    const measure = () => { if (trk.current) setW(Math.max(1, trk.current.getBoundingClientRect().width - 64)); };
    measure();
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      clearTimeout(timer.current);
      if (off.current) off.current();
    };
  }, []);

  function reset() { move(0); setDrag(false); }

  function confirm(instant) {
    if (canConfirm && !canConfirm()) { reset(); if (onBlocked) onBlocked(); return; }
    if (onGesture) { try { onGesture(); } catch {} }
    try { if (navigator.vibrate) navigator.vibrate(12); } catch {}
    move(1);
    setDrag(false);
    setBump((b) => b + 1);
    setRip((r) => r + 1);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      let ok;
      try { ok = await onConfirm(); } catch { ok = false; }
      if (ok === false) reset();
    }, instant ? 260 : 520);
  }

  function startDrag(e) {
    const el = trk.current;
    if (!el) return;
    const max = Math.max(1, el.getBoundingClientRect().width - 64);
    const x0 = e.clientX;
    setDrag(true);
    const mv = (ev) => move(Math.max(0, Math.min(1, (ev.clientX - x0) / max)));
    const up = () => {
      if (off.current) off.current();
      if (sxRef.current > 0.85) confirm(false);
      else reset();
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    off.current = () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      off.current = null;
    };
  }

  function onKey(e) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
      e.preventDefault();
      confirm(true);
    }
  }

  const slideT = drag ? 'none' : 'transform 520ms cubic-bezier(.34,1.56,.64,1)';
  return (
    <>
    <div style={{ position: 'relative' }}>
      <div ref={trk} style={{ position: 'relative', height: 64, borderRadius: 999, background: 'var(--nav)', overflow: 'hidden', touchAction: 'none', boxShadow: shadow ? '0 14px 30px -14px rgba(20,18,70,.6)' : undefined }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,.16)', transform: `translateX(calc(-100% + ${Math.round(64 + sx * W)}px))`, transition: slideT }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: 56, paddingRight: 12, color: 'var(--nav-ink)', fontSize: 15, fontWeight: 600, opacity: Math.max(0, 1 - sx * 1.6), pointerEvents: 'none' }}>{label}</div>
        <div role="button" tabIndex={0} aria-label={ariaLabel} className="focusable" onPointerDown={startDrag} onKeyDown={onKey}
          style={{ position: 'absolute', left: 4, top: 4, width: 56, height: 56, transform: `translateX(${Math.round(sx * W)}px)`, transition: slideT, cursor: 'grab', touchAction: 'none', borderRadius: '50%' }}>
          <div data-motion="" style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', boxShadow: '0 6px 16px -6px rgba(0,0,0,.35)', animation: bump ? `hl-bump${bump % 2} 420ms ease-out` : 'none' }}>
            <Chevrons />
          </div>
        </div>
      </div>
      {rip > 0 && [0, 1].map((i) => (
        <span key={rip + '-' + i} data-motion="" style={{ position: 'absolute', right: 0, top: '50%', width: 64, height: 64, borderRadius: '50%', border: `2px solid ${ripColor}`, pointerEvents: 'none', opacity: 0, animation: `hl-rip${rip % 2} 900ms ease-out ${i * 0.18}s both` }} />
      ))}
    </div>
    {fallbackLabel && <TapInstead onClick={() => confirm(true)}>{fallbackLabel}</TapInstead>}
    </>
  );
}

// Plain tap fallback that confirms the same action
export function TapInstead({ onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      style={{ marginTop: 6, height: 48, width: '100%', border: 0, background: 'transparent', color: 'var(--ink-2)', fontSize: 14, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>
      {children}
    </button>
  );
}
