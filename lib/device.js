// A random id that identifies this phone/browser. Stored on the device.
let memoryId = null;

export function getDeviceId() {
  try {
    let id = localStorage.getItem('wm_device');
    if (!id) {
      id = newId();
      localStorage.setItem('wm_device', id);
    }
    return id;
  } catch {
    // storage blocked: keep an id for this page session at least
    if (!memoryId) memoryId = newId();
    return memoryId;
  }
}

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'd-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
