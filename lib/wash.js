// Remembers (on this phone) the wash this person started, so the "Your wash is done" screen
// can still show after a reload or after tapping a notification.
const KEY = 'wm_wash';

export function getWash() {
  try {
    const w = JSON.parse(localStorage.getItem(KEY) || 'null');
    return w && w.id && w.endsAt ? w : null;
  } catch {
    return null;
  }
}
export function setWash(w) {
  try { localStorage.setItem(KEY, JSON.stringify(w)); } catch {}
}
export function clearWash() {
  try { localStorage.removeItem(KEY); } catch {}
}
