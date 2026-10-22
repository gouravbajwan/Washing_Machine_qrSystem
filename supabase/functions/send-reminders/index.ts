// Supabase Edge Function: send-reminders
// Runs every minute (pg_cron). Sends Web Push notifications to the person running a wash:
//   ~5 min left, ~2 min left, and "time's up". Each alert is sent only once per wash.
//
// Secrets to set in Supabase (Edge Functions > Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (e.g. mailto:you@example.com)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

const floorLabel = (f: number) => (f === 0 ? 'Ground floor' : `Floor ${f}`);
const clean = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

type Stage = 5 | 2 | 0;

function message(stage: Stage, machine: string, floor: string) {
  if (stage === 5) {
    return {
      title: '⏰ 5 minutes left',
      body: `${machine} (${floor}) finishes in about 5 minutes. Get ready to collect your clothes.`,
    };
  }
  if (stage === 2) {
    return {
      title: '⏳ 2 minutes left',
      body: `${machine} (${floor}) is almost done. Head over now so you're there when it stops.`,
    };
  }
  return {
    title: '✅ Your wash is done',
    body: `Time's up on ${machine} (${floor}). Please remove your clothes so others can use it.`,
  };
}

Deno.serve(async () => {
  const now = Date.now();

  const { data: logs, error } = await supabase
    .from('usage_log')
    .select('id, machine_id, device_id, user_name, room_no, started_at, expected_end, notified_5, notified_2, notified_0, machines(name, floor)')
    .is('ended_at', null)
    .gte('expected_end', new Date(now - 6 * 60 * 1000).toISOString())
    .lte('expected_end', new Date(now + 6 * 60 * 1000).toISOString());

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;
  let removed = 0;

  for (const l of logs ?? []) {
    const end = new Date(l.expected_end).getTime();
    const total = end - new Date(l.started_at).getTime();
    const left = (end - now) / 1000;

    // Which alert is due? (short washes skip the early alerts)
    let stage: Stage | null = null;
    if (left <= 0 && left > -300 && !l.notified_0) stage = 0;
    else if (left > 0 && left <= 120 && !l.notified_2 && total >= 3 * 60 * 1000) stage = 2;
    else if (left > 120 && left <= 300 && !l.notified_5 && total >= 6 * 60 * 1000) stage = 5;
    if (stage === null) continue;

    // Claim it first so overlapping runs never send twice
    const stamp = new Date().toISOString();
    const cols: Record<string, string> =
      stage === 0 ? { notified_0: stamp, notified_2: stamp, notified_5: stamp }
      : stage === 2 ? { notified_2: stamp, notified_5: stamp }
      : { notified_5: stamp };
    const { data: claimed } = await supabase
      .from('usage_log')
      .update(cols)
      .eq('id', l.id)
      .is(`notified_${stage}`, null)
      .select('id');
    if (!claimed || claimed.length === 0) continue;

    // Find this person's subscriptions: same device, or same name+room (installed iPhone app)
    const subs = new Map<string, { endpoint: string; p256dh: string; auth: string }>();
    if (l.device_id) {
      const { data } = await supabase.from('push_subscriptions')
        .select('endpoint, p256dh, auth').eq('device_id', l.device_id);
      for (const s of data ?? []) subs.set(s.endpoint, s);
    }
    const key = `${clean(l.user_name)}|${clean(l.room_no)}`;
    {
      const { data } = await supabase.from('push_subscriptions')
        .select('endpoint, p256dh, auth').eq('person_key', key);
      for (const s of data ?? []) subs.set(s.endpoint, s);
    }
    if (subs.size === 0) continue;

    // deno-lint-ignore no-explicit-any
    const m = (l as any).machines;
    const msg = message(stage, m?.name ?? 'Your machine', floorLabel(m?.floor ?? 0));
    const payload = JSON.stringify({
      ...msg,
      url: `/machine/${l.machine_id}`,
      tag: `wash-${l.id}`,
    });

    for (const s of subs.values()) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 120, urgency: 'high' },
        );
        sent++;
      } catch (e) {
        // deno-lint-ignore no-explicit-any
        const code = (e as any)?.statusCode;
        if (code === 404 || code === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
          removed++;
        }
      }
    }
  }

  return new Response(JSON.stringify({ checked: logs?.length ?? 0, sent, removed }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
