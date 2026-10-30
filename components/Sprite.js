'use client';
import { useEffect, useId, useRef, useState } from 'react';

// The wash crew: six characters, one per wash. mood: 'float' | 'relax' | 'cheer' | 'sleepy'.
// Tap a character (when interactive) and it cycles through its three moves.
export const KIND_LIST = ['sock', 'tee', 'pants', 'cap', 'hoodie', 'dress'];
export const NAMES = { sock: 'Sudsy', tee: 'Tilly', pants: 'Denny', cap: 'Cappy', hoodie: 'Hugo', dress: 'Dotty' };
export const BUDDY = { sock: 'Sudsy the sock', tee: 'Tilly the tee', pants: 'Denny the jeans', cap: 'Cappy the cap', hoodie: 'Hugo the hoodie', dress: 'Dotty the dress' };

const SHARED = { l1: '#EFFFFA', l2: '#94E6D2', l3: '#38A592', p1: '#FFB9A1', p2: '#EE7C64', ink: '#2A2858', bandHi: '#5B57A6', suds: '#CFC8F5', band: '#FFDDBF', bandPad: '#F1BE95' };
const KINDS = {
  sock: { pal: { s1: '#FFFFFF', s2: '#F4F0FF', s3: '#D9D1F8', cuff: '#FFFFFF', rib: '#D8D0F6', patch: '#FF9F87', arm: '#F4F0FF' }, armL: [0, 0], armR: [0, 0], strap: [52, 148], up: [0, 50, 150], hi: 0.7 },
  tee: { pal: { s1: '#EEF7FF', s2: '#BFE0FF', s3: '#8DC3F4', cuff: '#FFFFFF', rib: '#6FA6DE', patch: '#FF9F87', arm: '#CFE7FF' }, armL: [-20, -26], armR: [20, -26], strap: [54, 146], up: [22, 57, 143], hi: 0.55 },
  pants: { pal: { s1: '#B9CBFA', s2: '#8FA6F0', s3: '#6680DE', cuff: '#A9BDF6', rib: '#EEF2FF', patch: '#FFD36E', arm: '#9FB3F3' }, armL: [-6, -16], armR: [6, -16], strap: [48, 152], up: [3, 44, 156], hi: 0.4 },
  cap: { pal: { s1: '#FFE6DC', s2: '#FFBCA8', s3: '#F49680', cuff: '#ABA3F6', rib: '#E07F69', patch: '#8379EE', arm: '#FFC9B8' }, armL: [-14, -4], armR: [14, -4], strap: [40, 160], up: [14, 52, 148], hi: 0.55 },
  hoodie: { pal: { s1: '#EEEBFF', s2: '#C9C1FB', s3: '#A096F0', cuff: '#FFFFFF', rib: '#8E84E6', patch: '#FF9F87', arm: '#D5CEFC' }, armL: [-8, -24], armR: [8, -24], strap: [54, 146], up: [22, 44, 156], hi: 0 },
  dress: { pal: { s1: '#FFF8DD', s2: '#FFE69A', s3: '#F5CB5C', cuff: '#FF9F87', rib: '#FFFFFF', patch: '#FF9F87', arm: '#FFEDB3' }, armL: [4, -52], armR: [-4, -52], strap: [58, 142], up: [22, 60, 140], hi: 0.5 },
};
const GREY = { s1: '#F7F7F9', s2: '#E7E7EC', s3: '#C8C8D0', cuff: '#F2F2F5', rib: '#B4B4BE', patch: '#BDBDC6', arm: '#E7E7EC', l1: '#F4F4F6', l2: '#C9C9D1', l3: '#9A9AA6', p1: '#D2D2D9', p2: '#ABABB5', ink: '#3A3950', bandHi: '#6B6A80', suds: '#D3D3DA', band: '#FFE3C9', bandPad: '#F1C9A6' };
const MOVES = { sock: ['squish', 'jam', 'wring'], tee: ['twirl', 'flap', 'shrug'], pants: ['kick', 'wiggle', 'moon'], cap: ['flip', 'tip', 'spin'], hoodie: ['hide', 'shiver', 'box'], dress: ['dtwirl', 'curtsy', 'hop'] };
const AN = {
  squish: { b: 'sp-squish 900ms cubic-bezier(.3,1.4,.5,1)', fx: 'drops', ms: 900 },
  jam: { b: 'sp-jam 1400ms ease-in-out', fx: 'notes', ms: 1400 },
  wring: { b: 'sp-wring 1200ms ease-in-out', fx: 'drops', ms: 1200 },
  twirl: { b: 'sp-twirl 1100ms cubic-bezier(.4,0,.2,1)', fx: 'stars', ms: 1100 },
  flap: { b: 'sp-bob 1100ms ease-in-out', l: 'sp-flapL 1100ms ease-in-out', r: 'sp-flapR 1100ms ease-in-out', fx: 'puffs', ms: 1100 },
  shrug: { b: 'sp-shrug 1200ms ease-in-out', l: 'sp-shrugL 1200ms ease-in-out', r: 'sp-shrugR 1200ms ease-in-out', fx: 'q', ms: 1200 },
  kick: { b: 'sp-kick 1100ms ease-in-out', fx: 'puffs', ms: 1100 },
  wiggle: { b: 'sp-wiggle 1000ms ease-in-out', fx: 'stars', ms: 1000, o: '50% 95%' },
  moon: { b: 'sp-moon 1600ms ease-in-out', fx: 'notes', ms: 1600 },
  flip: { b: 'sp-flip 1000ms cubic-bezier(.4,0,.3,1)', fx: 'stars', ms: 1000, o: '50% 55%' },
  tip: { b: 'sp-tip 1200ms cubic-bezier(.3,1.3,.5,1)', fx: 'hearts', ms: 1200, o: '30% 90%' },
  spin: { b: 'sp-spin 1300ms cubic-bezier(.3,0,.2,1)', fx: 'stars', ms: 1300, o: '50% 45%' },
  hide: { b: 'sp-hide 1300ms ease-in-out', fx: 'bang', ms: 1300 },
  shiver: { b: 'sp-shiver 1000ms linear', fx: 'brr', ms: 1000 },
  box: { b: 'sp-box 1000ms ease-in-out', l: 'sp-punchL 1000ms ease-out', r: 'sp-punchR 1000ms ease-out', fx: 'stars', ms: 1000 },
  dtwirl: { b: 'sp-dtwirl 900ms cubic-bezier(.4,0,.2,1)', l: 'sp-flapL 900ms ease-in-out', r: 'sp-flapR 900ms ease-in-out', fx: 'stars', ms: 900 },
  curtsy: { b: 'sp-curtsy 1300ms ease-in-out', fx: 'hearts', ms: 1300 },
  hop: { b: 'sp-hop 1200ms ease-in-out', fx: 'puffs', ms: 1200 },
};
const drop = (x, y) => `M${x} ${y - 8} q6 9 0 13 q-6 -4 0 -13z`;
const star = (x, y) => `M${x} ${y - 9} Q${x + 2} ${y - 2} ${x + 9} ${y} Q${x + 2} ${y + 2} ${x} ${y + 9} Q${x - 2} ${y + 2} ${x - 9} ${y} Q${x - 2} ${y - 2} ${x} ${y - 9}Z`;
const heart = (x, y) => `M${x} ${y + 7} C${x - 12} ${y - 1} ${x - 7} ${y - 10} ${x} ${y - 4} C${x + 7} ${y - 10} ${x + 12} ${y - 1} ${x} ${y + 7}Z`;
const puff = (x, y) => `M${x - 8} ${y} a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0z`;
const FX = {
  drops: { s: [[100, 36, -60, -50], [100, 36, 60, -50], [100, 36, -84, 8], [100, 36, 84, 8], [100, 36, -26, -84], [100, 36, 26, -84]].map(([x, y, dx, dy]) => ({ d: drop(x, y), fill: '#ABA3F6', dx, dy })) },
  stars: { s: [[30, 60, -24, -30], [170, 60, 24, -30], [20, 150, -30, 0], [180, 150, 30, 0], [100, 10, 0, -36], [60, 20, -20, -30]].map(([x, y, dx, dy]) => ({ d: star(x, y), fill: '#FFD36E', dx, dy })) },
  hearts: { s: [[150, 50, 16, -60], [50, 60, -16, -56], [170, 100, 26, -40], [110, 20, 4, -60]].map(([x, y, dx, dy]) => ({ d: heart(x, y), fill: '#FF9EB0', dx, dy })) },
  puffs: { s: [[60, 210, -34, -8], [140, 210, 34, -8], [40, 200, -44, -24], [160, 200, 44, -24]].map(([x, y, dx, dy]) => ({ d: puff(x, y), fill: '#FFFFFF', dx, dy })) },
  notes: { t: [[26, 80, '♪', -20, -70], [174, 80, '♫', 20, -70], [40, 50, '♪', -30, -90], [160, 50, '♫', 30, -90]] },
  q: { t: [[150, 22, '?', 14, -40], [56, 14, '?', -14, -44]] },
  bang: { t: [[100, 8, '!', 0, -40]] },
  brr: { t: [[6, 96, 'brr', -26, -12], [194, 96, 'brr', 26, -12]] },
};

export default function Sprite({ mood = 'float', size = 160, kind = 'sock', interactive = true }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const kk = KINDS[kind] ? kind : 'sock';
  const K = KINDS[kk];
  const [cur, setCur] = useState(null);
  const idx = useRef(0);
  const timer = useRef(null);
  const raf = useRef(0);
  useEffect(() => () => { clearTimeout(timer.current); cancelAnimationFrame(raf.current); }, []);

  function play(name) {
    if (!AN[name]) return;
    try { if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch {}
    clearTimeout(timer.current); cancelAnimationFrame(raf.current);
    setCur(null);
    raf.current = requestAnimationFrame(() => { raf.current = requestAnimationFrame(() => {
      setCur(name);
      timer.current = setTimeout(() => setCur(null), AN[name].ms + 120);
    }); });
  }
  function next(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const list = MOVES[kk];
    const name = list[idx.current % list.length];
    idx.current += 1;
    play(name);
  }

  const c = mood === 'sleepy' ? GREY : { ...SHARED, ...K.pal };
  const w = size, h = Math.round(size * 1.2);
  const gSock = uid + 's', gLens = uid + 'l', gCup = uid + 'c';
  const bodyFill = `url(#${gSock})`, lensFill = `url(#${gLens})`, cupFill = `url(#${gCup})`;
  const hiOp = K.hi;
  const isSock = kk === 'sock', isTee = kk === 'tee', isPants = kk === 'pants', isCap = kk === 'cap', isHoodie = kk === 'hoodie', isDress = kk === 'dress';
  const armL = `translate(${K.armL[0]} ${K.armL[1]})`, armR = `translate(${K.armR[0]} ${K.armR[1]})`;
  const strap = `M${K.strap[0]} 104 H${K.strap[1]}`, gUpT = `translate(0 ${K.up[0]})`, strapUp = `M${K.up[1]} 50 H${K.up[2]}`;
  const tilt = mood === 'relax' ? 'rotate(-9 100 140)' : mood === 'sleepy' ? 'rotate(5 100 140)' : 'rotate(0)';
  const armsOut = mood === 'float', armsUp = mood === 'cheer', armsRest = mood === 'relax', armsDown = mood === 'sleepy';
  const suds = mood !== 'sleepy', gogFace = mood !== 'relax', gogUp = mood === 'relax';
  const eyesHappy = mood === 'float' || mood === 'cheer', eyesCalm = mood === 'relax', eyesSleep = mood === 'sleepy';
  const cheeks = mood !== 'sleepy';
  const mSmile = mood === 'float', mCheer = mood === 'cheer', mCalm = mood === 'relax', mSleep = mood === 'sleepy';
  const bandage = mood === 'sleepy';

  const a = cur ? AN[cur] : null;
  const f = a ? FX[a.fx] || {} : {};
  const dur = a ? Math.min(a.ms, 1100) : 0;
  const bodyA = a ? a.b + ' both' : 'none';
  const origin = (a && a.o) || '50% 85%';
  const armLA = a && a.l ? a.l : 'none', armRA = a && a.r ? a.r : 'none';
  const fxShapes = (f.s || []).map((p, i) => ({ ...p, r: (i % 2 ? 40 : -40) + 'deg', anim: `sp-fx ${dur}ms ease-out ${i * 50}ms both` }));
  const fxTexts = (f.t || []).map(([x, y, ch, dx, dy], i) => ({ x, y, ch, dx, dy, size: ch.length > 1 ? 20 : 30, r: (i % 2 ? 15 : -15) + 'deg', anim: `sp-fx ${a.ms}ms ease-out ${i * 160}ms both` }));
  const on = interactive !== false;

  return (
    <div role={on ? 'button' : undefined} tabIndex={on ? 0 : undefined} aria-label={on ? 'Tap ' + NAMES[kk] : undefined}
      onClick={on ? next : undefined} onKeyDown={on ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(e); } } : undefined}
      style={{ position: 'relative', display: 'inline-block', verticalAlign: 'top', lineHeight: 0, cursor: on ? 'pointer' : 'default', outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}>
      <div data-motion="" style={{ transformOrigin: origin, animation: bodyA }}>
        <svg viewBox="0 0 200 240" width={w} height={h} style={{ display: 'block', overflow: 'visible' }} aria-hidden="true">
          <defs>
            <linearGradient id={gSock} x1="0" y1="0" x2="1" y2="0.3"><stop offset="0" stopColor={c.s1} /><stop offset="0.55" stopColor={c.s2} /><stop offset="1" stopColor={c.s3} /></linearGradient>
            <radialGradient id={gLens} cx="0.35" cy="0.3" r="0.85"><stop offset="0" stopColor={c.l1} /><stop offset="0.5" stopColor={c.l2} /><stop offset="1" stopColor={c.l3} /></radialGradient>
            <linearGradient id={gCup} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c.p1} /><stop offset="1" stopColor={c.p2} /></linearGradient>
          </defs>
          <g transform={tilt}>
          <g data-motion="" style={{ animation: armLA, transformBox: 'fill-box', transformOrigin: '100% 40%' }}><g transform={armL}>
          {armsOut && (<><path d="M56 130 Q32 134 22 120" fill="none" stroke={c.ink} strokeWidth="17" strokeLinecap="round"></path><path d="M56 130 Q32 134 22 120" fill="none" stroke={c.arm} strokeWidth="9" strokeLinecap="round"></path><circle cx="20" cy="116" r="10" fill={cupFill} stroke={c.ink} strokeWidth="4"></circle></>)}
          {armsUp && (<><path d="M56 122 Q36 98 28 62" fill="none" stroke={c.ink} strokeWidth="17" strokeLinecap="round"></path><path d="M56 122 Q36 98 28 62" fill="none" stroke={c.arm} strokeWidth="9" strokeLinecap="round"></path><circle cx="27" cy="56" r="11" fill={cupFill} stroke={c.ink} strokeWidth="4"></circle></>)}
          {armsRest && (<><path d="M56 138 Q30 144 14 140" fill="none" stroke={c.ink} strokeWidth="17" strokeLinecap="round"></path><path d="M56 138 Q30 144 14 140" fill="none" stroke={c.arm} strokeWidth="9" strokeLinecap="round"></path><circle cx="11" cy="140" r="9" fill={cupFill} stroke={c.ink} strokeWidth="4"></circle></>)}
          {armsDown && (<><path d="M56 142 Q44 158 44 178" fill="none" stroke={c.ink} strokeWidth="17" strokeLinecap="round"></path><path d="M56 142 Q44 158 44 178" fill="none" stroke={c.arm} strokeWidth="9" strokeLinecap="round"></path><circle cx="44" cy="182" r="9" fill={cupFill} stroke={c.ink} strokeWidth="4"></circle></>)}
          </g></g>
          <g data-motion="" style={{ animation: armRA, transformBox: 'fill-box', transformOrigin: '0% 40%' }}><g transform={armR}>
          {armsOut && (<><path d="M144 130 Q168 134 178 120" fill="none" stroke={c.ink} strokeWidth="17" strokeLinecap="round"></path><path d="M144 130 Q168 134 178 120" fill="none" stroke={c.arm} strokeWidth="9" strokeLinecap="round"></path><circle cx="180" cy="116" r="10" fill={cupFill} stroke={c.ink} strokeWidth="4"></circle></>)}
          {armsUp && (<><path d="M144 122 Q164 98 172 62" fill="none" stroke={c.ink} strokeWidth="17" strokeLinecap="round"></path><path d="M144 122 Q164 98 172 62" fill="none" stroke={c.arm} strokeWidth="9" strokeLinecap="round"></path><circle cx="173" cy="56" r="11" fill={cupFill} stroke={c.ink} strokeWidth="4"></circle></>)}
          {armsRest && (<><path d="M144 138 Q170 144 186 140" fill="none" stroke={c.ink} strokeWidth="17" strokeLinecap="round"></path><path d="M144 138 Q170 144 186 140" fill="none" stroke={c.arm} strokeWidth="9" strokeLinecap="round"></path><circle cx="189" cy="140" r="9" fill={cupFill} stroke={c.ink} strokeWidth="4"></circle></>)}
          {armsDown && (<><path d="M144 142 Q156 158 156 178" fill="none" stroke={c.ink} strokeWidth="17" strokeLinecap="round"></path><path d="M144 142 Q156 158 156 178" fill="none" stroke={c.arm} strokeWidth="9" strokeLinecap="round"></path><circle cx="156" cy="182" r="9" fill={cupFill} stroke={c.ink} strokeWidth="4"></circle></>)}
          </g></g>
          
          {isSock && (<>
          <path d="M52 58 Q52 40 70 40 H130 Q148 40 148 58 V156 Q148 170 160 173 Q190 180 190 204 Q190 228 162 228 H96 Q52 228 52 186 Z" fill={bodyFill}></path>
          <path d="M52 170 Q82 176 84 194 Q86 216 104 228 H96 Q52 228 52 186 Z" fill={c.patch}></path>
          <path d="M172 176 Q190 184 190 204 Q190 228 162 228 H156 Q174 210 166 178 Z" fill={c.patch}></path>
          <rect x="52" y="146" width="96" height="9" fill={c.patch}></rect>
          <path d="M52 58 Q52 40 70 40 H130 Q148 40 148 58 V156 Q148 170 160 173 Q190 180 190 204 Q190 228 162 228 H96 Q52 228 52 186 Z" fill="none" stroke={c.ink} strokeWidth="4.5" strokeLinejoin="round"></path>
          <rect x="47" y="34" width="106" height="30" rx="15" fill={c.cuff} stroke={c.ink} strokeWidth="4.5"></rect>
          <path d="M68 41 V57 M84 41 V57 M100 41 V57 M116 41 V57 M132 41 V57" stroke={c.rib} strokeWidth="3" strokeLinecap="round"></path>
          </>)}
          
          {isTee && (<>
          <path d="M58 64 L86 52 Q100 68 114 52 L142 64 L176 92 L156 116 L146 108 V198 Q146 210 134 210 H66 Q54 210 54 198 V108 L44 116 L24 92 Z" fill={bodyFill}></path>
          <path d="M31 85 L52 110 M169 85 L148 110" stroke={c.patch} strokeWidth="7"></path>
          <rect x="54" y="186" width="92" height="9" fill={c.patch}></rect>
          <path d="M84 53 Q100 74 116 53" fill="none" stroke={c.cuff} strokeWidth="7"></path>
          <path d="M58 64 L86 52 Q100 68 114 52 L142 64 L176 92 L156 116 L146 108 V198 Q146 210 134 210 H66 Q54 210 54 198 V108 L44 116 L24 92 Z" fill="none" stroke={c.ink} strokeWidth="4.5" strokeLinejoin="round"></path>
          <path d="M84 55 Q100 77 116 55" fill="none" stroke={c.ink} strokeWidth="3"></path>
          <rect x="114" y="152" width="22" height="20" rx="5" fill="none" stroke={c.rib} strokeWidth="3"></rect>
          <path d="M114 158 H136" stroke={c.rib} strokeWidth="3"></path>
          </>)}
          
          {isPants && (<>
          <path d="M50 60 H150 L157 204 Q157 214 147 214 H113 Q105 214 105 206 L100 160 L95 206 Q95 214 87 214 H53 Q43 214 43 204 Z" fill={bodyFill}></path>
          <path d="M45 198 H95 M105 198 H157" stroke={c.cuff} strokeWidth="9"></path>
          <path d="M50 60 H150 L157 204 Q157 214 147 214 H113 Q105 214 105 206 L100 160 L95 206 Q95 214 87 214 H53 Q43 214 43 204 Z" fill="none" stroke={c.ink} strokeWidth="4.5" strokeLinejoin="round"></path>
          <path d="M53 68 Q64 88 78 66 M147 68 Q136 88 122 66 M100 66 V112 Q100 122 90 124" fill="none" stroke={c.rib} strokeWidth="2.5" strokeDasharray="4 4" strokeLinecap="round"></path>
          <rect x="46" y="40" width="108" height="26" rx="9" fill={c.cuff} stroke={c.ink} strokeWidth="4.5"></rect>
          <rect x="62" y="37" width="8" height="32" rx="3" fill={c.s2} stroke={c.ink} strokeWidth="3"></rect>
          <rect x="130" y="37" width="8" height="32" rx="3" fill={c.s2} stroke={c.ink} strokeWidth="3"></rect>
          <circle cx="100" cy="53" r="6.5" fill={c.patch} stroke={c.ink} strokeWidth="3"></circle>
          </>)}
          
          {isCap && (<>
          <path d="M38 166 Q36 40 100 40 Q164 40 162 166 Z" fill={bodyFill} stroke={c.ink} strokeWidth="4.5" strokeLinejoin="round"></path>
          <path d="M100 44 Q74 58 66 88 M100 44 Q126 58 134 88" fill="none" stroke={c.rib} strokeWidth="3" strokeLinecap="round"></path>
          <circle cx="100" cy="38" r="8" fill={c.patch} stroke={c.ink} strokeWidth="4"></circle>
          <path d="M24 164 Q100 146 176 164 Q184 186 156 194 Q100 208 44 194 Q16 186 24 164 Z" fill={c.cuff} stroke={c.ink} strokeWidth="4.5" strokeLinejoin="round"></path>
          <path d="M42 182 Q100 196 158 182" fill="none" stroke={c.bandHi} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="5 5"></path>
          </>)}
          
          {isHoodie && (<>
          <path d="M44 100 Q42 78 64 72 H136 Q158 78 156 100 V204 Q156 214 146 214 H54 Q44 214 44 204 Z" fill={bodyFill} stroke={c.ink} strokeWidth="4.5" strokeLinejoin="round"></path>
          <path d="M64 180 H136 Q142 180 144 186 L148 206 H52 L56 186 Q58 180 64 180 Z" fill={c.rib} fillOpacity="0.28" stroke={c.ink} strokeWidth="3.5" strokeLinejoin="round"></path>
          <rect x="44" y="198" width="112" height="9" fill={c.patch}></rect>
          <path d="M44 198 H156" stroke={c.ink} strokeWidth="3"></path>
          <path d="M42 112 Q38 22 100 20 Q162 22 158 112 Q156 160 100 162 Q44 160 42 112 Z" fill={bodyFill} stroke={c.ink} strokeWidth="4.5"></path>
          <ellipse cx="100" cy="108" rx="46" ry="42" fill={c.cuff} stroke={c.ink} strokeWidth="4"></ellipse>
          <path d="M86 152 Q84 170 84 186 M114 152 Q116 170 116 186" fill="none" stroke={c.ink} strokeWidth="7" strokeLinecap="round"></path>
          <path d="M86 152 Q84 170 84 186 M114 152 Q116 170 116 186" fill="none" stroke={c.cuff} strokeWidth="3" strokeLinecap="round"></path>
          <circle cx="84" cy="189" r="4.5" fill={c.patch} stroke={c.ink} strokeWidth="2.5"></circle>
          <circle cx="116" cy="189" r="4.5" fill={c.patch} stroke={c.ink} strokeWidth="2.5"></circle>
          </>)}
          
          {isDress && (<>
          <path d="M70 52 Q100 66 130 52 L142 60 Q148 82 140 98 L172 204 Q175 214 164 214 H36 Q25 214 28 204 L60 98 Q52 82 58 60 Z" fill={bodyFill}></path>
          <path d="M44 152 H156 L160 165 H40 Z" fill={c.patch}></path>
          <circle cx="56" cy="186" r="5" fill={c.rib}></circle><circle cx="80" cy="198" r="5" fill={c.rib}></circle><circle cx="104" cy="182" r="5" fill={c.rib}></circle><circle cx="128" cy="198" r="5" fill={c.rib}></circle><circle cx="150" cy="184" r="5" fill={c.rib}></circle><circle cx="92" cy="206" r="4" fill={c.rib}></circle><circle cx="140" cy="207" r="4" fill={c.rib}></circle><circle cx="50" cy="206" r="4" fill={c.rib}></circle>
          <path d="M70 52 Q100 66 130 52 L142 60 Q148 82 140 98 L172 204 Q175 214 164 214 H36 Q25 214 28 204 L60 98 Q52 82 58 60 Z" fill="none" stroke={c.ink} strokeWidth="4.5" strokeLinejoin="round"></path>
          <path d="M44 152 H156 M40 165 H160" stroke={c.ink} strokeWidth="3"></path>
          <path d="M100 158 L84 149 L84 167 Z M100 158 L116 149 L116 167 Z" fill={c.patch} stroke={c.ink} strokeWidth="3" strokeLinejoin="round"></path>
          <circle cx="100" cy="158" r="4.5" fill={c.patch} stroke={c.ink} strokeWidth="3"></circle>
          <path d="M70 53 Q64 78 96 67 Q100 65 100 60 Q86 62 70 53 Z" fill={c.cuff} stroke={c.ink} strokeWidth="3.5" strokeLinejoin="round"></path>
          <path d="M130 53 Q136 78 104 67 Q100 65 100 60 Q114 62 130 53 Z" fill={c.cuff} stroke={c.ink} strokeWidth="3.5" strokeLinejoin="round"></path>
          </>)}
          
          <ellipse cx="66" cy="114" rx="6" ry="22" fill="#fff" opacity={hiOp}></ellipse>
          
          {isSock && (<>
          {suds && (<><circle cx="70" cy="30" r="11" fill="#fff" stroke={c.suds} strokeWidth="2.5"></circle><circle cx="88" cy="22" r="13" fill="#fff" stroke={c.suds} strokeWidth="2.5"></circle><circle cx="106" cy="29" r="9" fill="#fff" stroke={c.suds} strokeWidth="2.5"></circle><circle cx="84" cy="18" r="3" fill="#fff"></circle></>)}
          <path d="M38 94 Q38 6 100 6 Q162 6 162 94" fill="none" stroke={c.ink} strokeWidth="9" strokeLinecap="round"></path>
          <path d="M44 80 Q48 16 100 13" fill="none" stroke={c.bandHi} strokeWidth="2.5" strokeLinecap="round"></path>
          <rect x="28" y="80" width="22" height="38" rx="11" fill={cupFill} stroke={c.ink} strokeWidth="4.5"></rect>
          <rect x="150" y="80" width="22" height="38" rx="11" fill={cupFill} stroke={c.ink} strokeWidth="4.5"></rect>
          </>)}
          
          {gogFace && (<>
          <path d={strap} stroke={c.ink} strokeWidth="6"></path>
          <circle cx="80" cy="104" r="19" fill={lensFill} stroke={c.ink} strokeWidth="5"></circle>
          <circle cx="120" cy="104" r="19" fill={lensFill} stroke={c.ink} strokeWidth="5"></circle>
          <ellipse cx="73" cy="96" rx="6" ry="3.5" fill="#fff" opacity="0.85" transform="rotate(-30 73 96)"></ellipse>
          <ellipse cx="113" cy="96" rx="6" ry="3.5" fill="#fff" opacity="0.85" transform="rotate(-30 113 96)"></ellipse>
          </>)}
          {gogUp && (<>
          <g transform={gUpT}>
          <path d={strapUp} stroke={c.ink} strokeWidth="5"></path>
          <circle cx="82" cy="50" r="14" fill={lensFill} stroke={c.ink} strokeWidth="4.5"></circle>
          <circle cx="118" cy="50" r="14" fill={lensFill} stroke={c.ink} strokeWidth="4.5"></circle>
          <ellipse cx="77" cy="45" rx="4.5" ry="2.5" fill="#fff" opacity="0.85" transform="rotate(-30 77 45)"></ellipse>
          <ellipse cx="113" cy="45" rx="4.5" ry="2.5" fill="#fff" opacity="0.85" transform="rotate(-30 113 45)"></ellipse>
          </g>
          </>)}
          {eyesHappy && (<><path d="M73 108 q7 -8 14 0 M113 108 q7 -8 14 0" fill="none" stroke={c.ink} strokeWidth="4" strokeLinecap="round"></path></>)}
          {eyesCalm && (<><path d="M72 103 q8 7 16 0 M112 103 q8 7 16 0" fill="none" stroke={c.ink} strokeWidth="4" strokeLinecap="round"></path></>)}
          {eyesSleep && (<><path d="M72 106 q8 5 16 0 M112 106 q8 5 16 0" fill="none" stroke={c.ink} strokeWidth="3.5" strokeLinecap="round"></path></>)}
          {cheeks && (<><circle cx="66" cy="128" r="6" fill="#FFB3C7" opacity="0.8"></circle><circle cx="134" cy="128" r="6" fill="#FFB3C7" opacity="0.8"></circle></>)}
          {mSmile && (<><path d="M87 128 Q100 144 113 128 Z" fill={c.ink} stroke={c.ink} strokeWidth="3" strokeLinejoin="round"></path><path d="M94 135 Q100 140 106 135 Z" fill="#FF9EB0"></path></>)}
          {mCheer && (<><path d="M82 126 Q100 154 118 126 Z" fill={c.ink} stroke={c.ink} strokeWidth="3" strokeLinejoin="round"></path><path d="M91 139 Q100 147 109 139 Z" fill="#FF9EB0"></path></>)}
          {mCalm && (<><path d="M90 129 Q100 137 110 129" fill="none" stroke={c.ink} strokeWidth="4" strokeLinecap="round"></path></>)}
          {mSleep && (<><ellipse cx="100" cy="132" rx="5" ry="6" fill={c.ink}></ellipse></>)}
          {bandage && (<><g transform="rotate(32 134 56)"><rect x="112" y="48" width="46" height="16" rx="8" fill={c.band} stroke={c.ink} strokeWidth="3.5"></rect><rect x="128" y="48" width="14" height="16" fill={c.bandPad} stroke={c.ink} strokeWidth="3"></rect></g></>)}
          </g>
          {bandage && (<><text x="164" y="30" fontFamily="Outfit, sans-serif" fontWeight="700" fontSize="26" fill={c.ink}>z</text><text x="184" y="10" fontFamily="Outfit, sans-serif" fontWeight="700" fontSize="18" fill={c.ink}>z</text></>)}
        </svg>
      </div>
      <svg viewBox="0 0 200 240" width={w} height={h} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }} aria-hidden="true">
        {fxShapes.map((p, i) => (
          <path key={'s' + i} data-motion="" d={p.d} fill={p.fill} stroke="#2A2858" strokeWidth="2" style={{ '--dx': p.dx + 'px', '--dy': p.dy + 'px', '--r': p.r, animation: p.anim, transformBox: 'fill-box', transformOrigin: 'center', opacity: 0 }} />
        ))}
        {fxTexts.map((p, i) => (
          <text key={'t' + i} data-motion="" x={p.x} y={p.y} fontFamily="Outfit, sans-serif" fontWeight="700" fontSize={p.size} fill="#2A2858" textAnchor="middle" style={{ '--dx': p.dx + 'px', '--dy': p.dy + 'px', '--r': p.r, animation: p.anim, transformBox: 'fill-box', transformOrigin: 'center', opacity: 0 }}>{p.ch}</text>
        ))}
      </svg>
    </div>
  );
}
