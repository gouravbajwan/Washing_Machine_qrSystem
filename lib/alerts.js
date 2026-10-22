'use client';
// In-page alerts (backup for when push is not available): sound + vibration.
export function buzz() {
  try { if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 300]); } catch {}
}

export function beep() {
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    const ctx = new C();
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 880;
    g.gain.value = 0.15;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.3);
    setTimeout(() => { try { ctx.close(); } catch {} }, 600);
  } catch {}
}
