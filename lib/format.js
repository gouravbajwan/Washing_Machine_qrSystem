export function fmt(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// mm:ss (minutes can exceed 59, e.g. 90:00)
export function mmss(sec) {
  sec = Math.max(0, Math.floor(sec));
  return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
}

// "6:42 pm"
export function clockText(t) {
  try {
    return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  } catch {
    return '';
  }
}

// Floor 0 is shown as "Ground floor"
export function floorLabel(f) {
  return Number(f) === 0 ? 'Ground floor' : `Floor ${f}`;
}

// "Reported today at 6:42 pm" / "Reported 27 Oct at 6:42 pm"
export function reportedText(t) {
  try {
    const d = new Date(t);
    if (isNaN(d)) return '';
    const time = clockText(t);
    if (d.toDateString() === new Date().toDateString()) return 'Reported today at ' + time;
    return 'Reported ' + d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) + ' at ' + time;
  } catch {
    return '';
  }
}
