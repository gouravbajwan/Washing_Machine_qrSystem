'use client';
import { supabase } from './supabase';
import { getDeviceId } from './device';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function isIOS() {
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return (
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true
  );
}

// 'unsupported' | 'needs-install' | 'not-configured' | 'denied' | 'granted' | 'default'
export function pushStatus() {
  try {
    if (isIOS() && !isStandalone()) return 'needs-install';
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return 'unsupported';
    }
    if (!PUBLIC_KEY) return 'not-configured';
    return Notification.permission; // 'default' | 'granted' | 'denied'
  } catch {
    return 'unsupported';
  }
}

async function subscribeAndSave(name, room) {
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
    });
  }
  const j = sub.toJSON();
  const { error } = await supabase.rpc('save_push_subscription', {
    p_device: getDeviceId(),
    p_endpoint: j.endpoint,
    p_p256dh: j.keys.p256dh,
    p_auth: j.keys.auth,
    p_name: name || null,
    p_room: room || null,
  });
  if (error) throw new Error(error.message);
}

// Ask permission (must be called straight from a tap) and register this device.
export async function enablePush(name, room) {
  try {
    const s = pushStatus();
    if (s !== 'default' && s !== 'granted') return s;
    if (Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return perm;
    }
    await subscribeAndSave(name, room);
    return 'granted';
  } catch (e) {
    console.warn('enablePush failed', e);
    return 'error';
  }
}

// If permission was already given, quietly make sure this device is registered.
export async function syncPush(name, room) {
  try {
    if (pushStatus() === 'granted') await subscribeAndSave(name, room);
  } catch (e) {
    console.warn('syncPush failed', e);
  }
}
