'use client';
import { useEffect, useState } from 'react';
import Sprite from './Sprite';

const COL = {
  violet: { back: '#D4CFFB', mid: '#ABA3F6', front: '#8379EE', body: 'linear-gradient(180deg,#8379EE 0%,#6A5FE2 55%,#5A4FD4 100%)', line: 0.75 },
  grey: { back: '#E4E4E9', mid: '#D2D2D9', front: '#BCBCC6', body: 'linear-gradient(180deg,#BCBCC6 0%,#A9A9B4 100%)', line: 0.35 },
};
// [x%, y, size, duration, delay]
const BUB = [[12, 70, 8, 7.2, 0], [26, 120, 6, 8.6, -2.4], [41, 90, 10, 6.4, -4.1], [57, 140, 7, 9.0, -1.2], [69, 80, 9, 7.8, -5.5], [82, 130, 6, 6.8, -3.0], [92, 100, 8, 8.2, -6.2]];
const BURST = [[18, 48, 26, 0], [34, 70, 18, 0.15], [62, 52, 30, 0.3], [78, 74, 20, 0.1], [48, 90, 16, 0.45], [88, 44, 22, 0.25]];

function Layer({ top, deep, ampScale, drift, fill, path, opacity, stroke, children }) {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top, height: deep, overflow: 'hidden', pointerEvents: 'none', opacity }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: '200%', transformOrigin: '50% 100%', transform: `scaleY(${ampScale})`, transition: 'transform 2.4s cubic-bezier(.4,0,.2,1)' }}>
        <div data-motion="" style={{ width: '100%', animation: drift }}>
          <svg viewBox="0 0 800 40" preserveAspectRatio="none" width="100%" height="40" style={{ display: 'block' }}>
            <path d={path} fill={fill.top} />
            {stroke && <path d={path.replace(' V40 H0 Z', '')} fill="none" stroke="#fff" strokeOpacity={stroke} strokeWidth="2" />}
          </svg>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 39, bottom: 0, background: fill.body }} />
      {children}
    </div>
  );
}

// Calm animated water. Surface height follows `level` (0..1). Everything is CSS/SVG (no libraries).
export default function Water({
  height = 220, level = 0.3, mode = 'active', mood = 'float', label = '', spriteSize = 110, spriteX = '50%',
  riseFrom = null, minFill = 0.14, maxFill = 0.8, bubbles, burst = false, ripple = false, rippleX = '80%',
  sprite = true, labelSize = 26,
}) {
  const [risen, setRisen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setRisen(true), 120);
    return () => clearTimeout(t);
  }, []);

  const H = height;
  const flat = mode === 'flat';
  let lvl = Math.max(0, Math.min(1, level));
  if (riseFrom != null && !risen) lvl = riseFrom;
  const surface = Math.round(H * (1 - (minFill + lvl * (maxFill - minFill))));
  const amp = { active: 1, calm: 0.5, settle: 0.16, flat: 0.03 }[mode] ?? 1;
  const c = flat ? COL.grey : COL.violet;
  const bubN = flat ? 0 : (bubbles ?? (mode === 'calm' ? 4 : 7));
  const deep = H + 80;
  const PB = 'M0 20 Q100 2 200 20 T400 20 T600 20 T800 20 V40 H0 Z';
  const PM = 'M0 20 Q100 36 200 20 T400 20 T600 20 T800 20 V40 H0 Z';
  const PF = 'M0 20 Q100 6 200 20 T400 20 T600 20 T800 20 V40 H0 Z';

  return (
    <div style={{ position: 'relative', width: '100%', height: H, clipPath: 'inset(-600px 0 0 0)' }}>
      <div data-level="" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '100%', transform: `translateY(${surface}px)`, transition: 'transform 1.6s cubic-bezier(.4,0,.2,1)' }}>
        <div data-motion="" style={{ position: 'absolute', inset: 0, animation: flat ? 'none' : 'hw-bob 6s ease-in-out infinite' }}>
          <Layer top={-34} deep={deep} ampScale={amp} path={PB} fill={{ top: c.back, body: c.back }}
            drift={flat ? 'none' : 'hw-drift 14s linear infinite reverse'} />
          <Layer top={-24} deep={deep} ampScale={amp * 0.9} path={PM} fill={{ top: c.mid, body: c.mid }}
            drift={flat ? 'none' : 'hw-drift 11s linear infinite'} />
          {sprite && (
            <div data-motion="" style={{ position: 'absolute', left: spriteX, top: Math.round(-spriteSize * 1.2 * 0.62), transform: 'translate(-50%,0)', animation: flat ? 'none' : (mode === 'settle' ? 'hw-float 7s ease-in-out infinite' : 'hw-float 5.5s ease-in-out infinite') }}>
              <Sprite mood={mood} size={spriteSize} />
            </div>
          )}
          <Layer top={-14} deep={deep} ampScale={amp} path={PF} fill={{ top: c.front, body: c.body }} opacity={0.94} stroke={c.line}
            drift={flat ? 'none' : 'hw-drift 8.5s linear infinite'}>
            {BUB.slice(0, bubN).map(([x, y, s, d, del], i) => (
              <span key={'b' + i} data-motion="" style={{ position: 'absolute', left: x + '%', top: y + 30, width: s, height: s, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,.85)', background: 'rgba(255,255,255,.18)', opacity: 0, animation: `hw-rise ${d}s ease-in ${del}s infinite` }} />
            ))}
            {burst && BURST.map(([x, y, s, del], i) => (
              <span key={'x' + i} data-motion="" style={{ position: 'absolute', left: x + '%', top: y, width: s, height: s, borderRadius: '50%', border: '2px solid #fff', opacity: 0, animation: `hw-burst 1.1s ease-out ${del + 0.2}s 2 both` }} />
            ))}
          </Layer>
          {ripple && [0, 0.35, 0.7].map((d, i) => (
            <span key={'r' + i} data-motion="" style={{ position: 'absolute', left: rippleX, top: 6, width: 220, height: 56, borderRadius: '50%', border: '2px solid rgba(255,255,255,.9)', opacity: 0, animation: `hw-ripple 1.6s ease-out ${d}s 2 both`, pointerEvents: 'none' }} />
          ))}
          {!!label && (
            <div style={{ position: 'absolute', left: 22, top: -labelSize - 22, fontSize: labelSize, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink, #23224A)', lineHeight: 1 }}>{label}</div>
          )}
        </div>
      </div>
    </div>
  );
}
