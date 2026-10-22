'use client';
import { useEffect, useRef } from 'react';

const NUMS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

// Rolling number. Size it with the parent's font-size (everything is in em).
export default function Digits({ value, digitW = '.58em', colonW = '.28em', ...rest }) {
  const prev = useRef(value);
  const p = prev.current;
  useEffect(() => { prev.current = value; });
  return (
    <span style={{ display: 'flex', height: '1em', overflow: 'hidden', lineHeight: 1 }} {...rest}>
      {[...String(value)].map((c, i) =>
        c === ':' ? (
          <span key={i} style={{ width: colonW, textAlign: 'center' }}>:</span>
        ) : (
          <span key={i} style={{ display: 'block', width: digitW, height: '1em', overflow: 'hidden' }}>
            <span
              data-roll=""
              style={{
                display: 'flex', flexDirection: 'column',
                transform: `translateY(${-Number(c)}em)`,
                // do not roll backwards when a digit wraps (e.g. 10:00 -> 09:59)
                transition: Number(c) > Number(p[i] ?? c) && String(value) < String(p) ? 'none' : 'transform 340ms cubic-bezier(.2,.8,.2,1)',
              }}
            >
              {NUMS.map((n) => (
                <span key={n} style={{ display: 'block', height: '1em', textAlign: 'center' }}>{n}</span>
              ))}
            </span>
          </span>
        )
      )}
    </span>
  );
}
