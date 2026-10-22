-- Run ONCE in Supabase > SQL Editor (paste the whole file, then Run).
-- Adds wash reminders: push subscriptions + tracking so each alert is sent only once.

-- 1) Which reminders have already been sent for each wash
alter table usage_log add column if not exists notified_5 timestamptz;
alter table usage_log add column if not exists notified_2 timestamptz;
alter table usage_log add column if not exists notified_0 timestamptz;

-- 2) Browser push subscriptions. Not readable with the public key (no policies).
create table if not exists push_subscriptions (
  id          bigserial primary key,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  device_id   text,           -- the phone/browser that subscribed
  person_key  text,           -- "name|room" (lowercase) so reminders also reach an installed iPhone app
  created_at  timestamptz not null default now()
);
create index if not exists push_subs_device_idx on push_subscriptions (device_id);
create index if not exists push_subs_person_idx on push_subscriptions (person_key);
alter table push_subscriptions enable row level security;

-- 3) Save a subscription (called from the website with the public key)
create or replace function save_push_subscription(
  p_device text, p_endpoint text, p_p256dh text, p_auth text,
  p_name text default null, p_room text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare v_key text;
begin
  if coalesce(p_device,'') = '' or coalesce(p_endpoint,'') = '' or coalesce(p_p256dh,'') = ''
     or coalesce(p_auth,'') = '' then
    raise exception 'Invalid subscription';
  end if;
  if p_endpoint !~ '^https://' then raise exception 'Invalid endpoint'; end if;

  if coalesce(trim(p_name),'') <> '' and coalesce(trim(p_room),'') <> '' then
    v_key := lower(regexp_replace(trim(p_name), '\s+', ' ', 'g')) || '|' ||
             lower(regexp_replace(trim(p_room), '\s+', ' ', 'g'));
  end if;

  if not exists (select 1 from push_subscriptions where endpoint = p_endpoint)
     and (select count(*) from push_subscriptions where device_id = p_device) >= 5 then
    raise exception 'Too many subscriptions for this device';
  end if;

  insert into push_subscriptions (endpoint, p256dh, auth, device_id, person_key)
  values (p_endpoint, p_p256dh, p_auth, p_device, v_key)
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh,
        auth = excluded.auth,
        device_id = excluded.device_id,
        person_key = coalesce(excluded.person_key, push_subscriptions.person_key);
end $$;

grant execute on function save_push_subscription(text,text,text,text,text,text) to anon, authenticated;

-- 4) Run the reminder function every minute.
create extension if not exists pg_net;
create extension if not exists pg_cron;

do $$ begin
  perform cron.unschedule('send-reminders');
exception when others then null; end $$;

select cron.schedule(
  'send-reminders',
  '* * * * *',
  $cron$
  select net.http_post(
    url     := 'https://vckisbpahxbmfvuonajz.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZja2lzYnBhaHhibWZ2dW9uYWp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0OTU0NTUsImV4cCI6MjEwODA3MTQ1NX0.tP0ACghKha8JaceB83khV_sUaCOlCQpReWsspE2BGsI'),
    body    := '{}'::jsonb
  );
  $cron$
);
