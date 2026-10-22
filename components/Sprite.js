'use client';
import { useId } from 'react';

const PAL = {
  color: { s1: '#FFFFFF', s2: '#F4F0FF', s3: '#D9D1F8', cuff: '#FFFFFF', rib: '#D8D0F6', patch: '#FF9F87', l1: '#EFFFFA', l2: '#94E6D2', l3: '#38A592', p1: '#FFB9A1', p2: '#EE7C64', ink: '#2A2858', bandHi: '#5B57A6', suds: '#CFC8F5', band: '#FFDDBF', bandPad: '#F1BE95' },
  sleepy: { s1: '#F7F7F9', s2: '#E7E7EC', s3: '#C8C8D0', cuff: '#F2F2F5', rib: '#D3D3DA', patch: '#BDBDC6', l1: '#F4F4F6', l2: '#C9C9D1', l3: '#9A9AA6', p1: '#D2D2D9', p2: '#ABABB5', ink: '#3A3950', bandHi: '#6B6A80', suds: '#D3D3DA', band: '#FFE3C9', bandPad: '#F1C9A6' },
};

// The sock mascot. mood: 'float' | 'relax' | 'cheer' | 'sleepy'
export default function Sprite({ mood = 'float', size = 160 }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const c = mood === 'sleepy' ? PAL.sleepy : PAL.color;
  const w = size;
  const h = Math.round(size * 1.2);
  const gSock = uid + 's', gLens = uid + 'l', gCup = uid + 'c';
  const sockFill = `url(#${gSock})`, lensFill = `url(#${gLens})`, cupFill = `url(#${gCup})`;
  const tilt = mood === 'relax' ? 'rotate(-9 100 140)' : mood === 'sleepy' ? 'rotate(5 100 140)' : 'rotate(0)';
  const armsOut = mood === 'float', armsUp = mood === 'cheer', armsRest = mood === 'relax', armsDown = mood === 'sleepy';
  const suds = mood !== 'sleepy', gogFace = mood !== 'relax', gogUp = mood === 'relax';
  const eyesHappy = mood === 'float' || mood === 'cheer', eyesCalm = mood === 'relax', eyesSleep = mood === 'sleepy';
  const cheeks = mood !== 'sleepy';
  const mSmile = mood === 'float', mCheer = mood === 'cheer', mCalm = mood === 'relax', mSleep = mood === 'sleepy';
  const bandage = mood === 'sleepy';
  const arm = (d, sw1, sw2) => (
    <>
      <path d={d} fill="none" stroke={c.ink} strokeWidth={sw1} strokeLinecap="round" />
      <path d={d} fill="none" stroke={c.s2} strokeWidth={sw2} strokeLinecap="round" />
    </>
  );
  const hand = (cx, cy, r) => <circle cx={cx} cy={cy} r={r} fill={cupFill} stroke={c.ink} strokeWidth="4" />;
  const sockPath = 'M52 58 Q52 40 70 40 H130 Q148 40 148 58 V156 Q148 170 160 173 Q190 180 190 204 Q190 228 162 228 H96 Q52 228 52 186 Z';

  return (
    <svg viewBox="0 0 200 240" width={w} height={h} style={{ display: 'block', overflow: 'visible' }} aria-hidden="true">
      <defs>
        <linearGradient id={gSock} x1="0" y1="0" x2="1" y2="0.3"><stop offset="0" stopColor={c.s1} /><stop offset="0.55" stopColor={c.s2} /><stop offset="1" stopColor={c.s3} /></linearGradient>
        <radialGradient id={gLens} cx="0.35" cy="0.3" r="0.85"><stop offset="0" stopColor={c.l1} /><stop offset="0.5" stopColor={c.l2} /><stop offset="1" stopColor={c.l3} /></radialGradient>
        <linearGradient id={gCup} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c.p1} /><stop offset="1" stopColor={c.p2} /></linearGradient>
      </defs>
      <g transform={tilt}>
        {armsOut && (<>{arm('M56 130 Q32 134 22 120 M144 130 Q168 134 178 120', 17, 9)}{hand(20, 116, 10)}{hand(180, 116, 10)}</>)}
        {armsUp && (<>{arm('M56 122 Q36 98 28 62 M144 122 Q164 98 172 62', 17, 9)}{hand(27, 56, 11)}{hand(173, 56, 11)}</>)}
        {armsRest && (<>{arm('M56 138 Q30 144 14 140 M144 138 Q170 144 186 140', 17, 9)}{hand(11, 140, 9)}{hand(189, 140, 9)}</>)}
        {armsDown && (<>{arm('M56 142 Q44 158 44 178 M144 142 Q156 158 156 178', 17, 9)}{hand(44, 182, 9)}{hand(156, 182, 9)}</>)}
        <path d={sockPath} fill={sockFill} />
        <path d="M52 170 Q82 176 84 194 Q86 216 104 228 H96 Q52 228 52 186 Z" fill={c.patch} />
        <path d="M172 176 Q190 184 190 204 Q190 228 162 228 H156 Q174 210 166 178 Z" fill={c.patch} />
        <rect x="52" y="146" width="96" height="9" fill={c.patch} />
        <path d={sockPath} fill="none" stroke={c.ink} strokeWidth="4.5" strokeLinejoin="round" />
        <ellipse cx="66" cy="112" rx="6" ry="24" fill="#fff" opacity="0.7" />
        <rect x="47" y="34" width="106" height="30" rx="15" fill={c.cuff} stroke={c.ink} strokeWidth="4.5" />
        <path d="M68 41 V57 M84 41 V57 M100 41 V57 M116 41 V57 M132 41 V57" stroke={c.rib} strokeWidth="3" strokeLinecap="round" />
        {suds && (
          <>
            <circle cx="70" cy="30" r="11" fill="#fff" stroke={c.suds} strokeWidth="2.5" />
            <circle cx="88" cy="22" r="13" fill="#fff" stroke={c.suds} strokeWidth="2.5" />
            <circle cx="106" cy="29" r="9" fill="#fff" stroke={c.suds} strokeWidth="2.5" />
            <circle cx="84" cy="18" r="3" fill="#fff" />
          </>
        )}
        <path d="M38 94 Q38 6 100 6 Q162 6 162 94" fill="none" stroke={c.ink} strokeWidth="9" strokeLinecap="round" />
        <path d="M44 80 Q48 16 100 13" fill="none" stroke={c.bandHi} strokeWidth="2.5" strokeLinecap="round" />
        <rect x="28" y="80" width="22" height="38" rx="11" fill={cupFill} stroke={c.ink} strokeWidth="4.5" />
        <rect x="150" y="80" width="22" height="38" rx="11" fill={cupFill} stroke={c.ink} strokeWidth="4.5" />
        {gogFace && (
          <>
            <path d="M52 104 H148" stroke={c.ink} strokeWidth="6" />
            <circle cx="80" cy="104" r="19" fill={lensFill} stroke={c.ink} strokeWidth="5" />
            <circle cx="120" cy="104" r="19" fill={lensFill} stroke={c.ink} strokeWidth="5" />
            <ellipse cx="73" cy="96" rx="6" ry="3.5" fill="#fff" opacity="0.85" transform="rotate(-30 73 96)" />
            <ellipse cx="113" cy="96" rx="6" ry="3.5" fill="#fff" opacity="0.85" transform="rotate(-30 113 96)" />
          </>
        )}
        {gogUp && (
          <>
            <path d="M50 50 H150" stroke={c.ink} strokeWidth="5" />
            <circle cx="82" cy="50" r="14" fill={lensFill} stroke={c.ink} strokeWidth="4.5" />
            <circle cx="118" cy="50" r="14" fill={lensFill} stroke={c.ink} strokeWidth="4.5" />
            <ellipse cx="77" cy="45" rx="4.5" ry="2.5" fill="#fff" opacity="0.85" transform="rotate(-30 77 45)" />
            <ellipse cx="113" cy="45" rx="4.5" ry="2.5" fill="#fff" opacity="0.85" transform="rotate(-30 113 45)" />
          </>
        )}
        {eyesHappy && <path d="M73 108 q7 -8 14 0 M113 108 q7 -8 14 0" fill="none" stroke={c.ink} strokeWidth="4" strokeLinecap="round" />}
        {eyesCalm && <path d="M72 103 q8 7 16 0 M112 103 q8 7 16 0" fill="none" stroke={c.ink} strokeWidth="4" strokeLinecap="round" />}
        {eyesSleep && <path d="M72 106 q8 5 16 0 M112 106 q8 5 16 0" fill="none" stroke={c.ink} strokeWidth="3.5" strokeLinecap="round" />}
        {cheeks && (<><circle cx="66" cy="128" r="6" fill="#FFB3C7" opacity="0.8" /><circle cx="134" cy="128" r="6" fill="#FFB3C7" opacity="0.8" /></>)}
        {mSmile && (<><path d="M87 128 Q100 144 113 128 Z" fill={c.ink} stroke={c.ink} strokeWidth="3" strokeLinejoin="round" /><path d="M94 135 Q100 140 106 135 Z" fill="#FF9EB0" /></>)}
        {mCheer && (<><path d="M82 126 Q100 154 118 126 Z" fill={c.ink} stroke={c.ink} strokeWidth="3" strokeLinejoin="round" /><path d="M91 139 Q100 147 109 139 Z" fill="#FF9EB0" /></>)}
        {mCalm && <path d="M90 129 Q100 137 110 129" fill="none" stroke={c.ink} strokeWidth="4" strokeLinecap="round" />}
        {mSleep && <ellipse cx="100" cy="132" rx="5" ry="6" fill={c.ink} />}
        {bandage && (
          <g transform="rotate(32 134 56)">
            <rect x="112" y="48" width="46" height="16" rx="8" fill={c.band} stroke={c.ink} strokeWidth="3.5" />
            <rect x="128" y="48" width="14" height="16" fill={c.bandPad} stroke={c.ink} strokeWidth="3" />
          </g>
        )}
      </g>
      {bandage && (
        <>
          <text x="164" y="30" fontFamily="Outfit, sans-serif" fontWeight="700" fontSize="26" fill={c.ink}>z</text>
          <text x="184" y="10" fontFamily="Outfit, sans-serif" fontWeight="700" fontSize="18" fill={c.ink}>z</text>
        </>
      )}
    </svg>
  );
}
