-- Washing Machine QR System: run this whole file in Supabase > SQL Editor.

create table if not exists machines (
  id         text primary key,                 -- used in the QR URL, e.g. f3-w1
  name       text not null,
  floor      int  not null,
  status     text not null default 'free' check (status in ('free','in_use','out_of_order')),
  free_at    timestamptz                       -- when the current cycle ends
);

create table if not exists usage_log (
  id            bigserial primary key,
  machine_id    text not null references machines(id) on delete cascade,
  user_name     text not null,
  room_no       text not null,
  started_at    timestamptz not null default now(),
  expected_end  timestamptz not null,
  ended_at      timestamptz,
  device_id     text                       -- random id of the phone/browser that started it
);
create index if not exists usage_log_machine_idx on usage_log (machine_id, started_at desc);

-- Row Level Security: the public (anon) key can READ machines, but all writes
-- go through the functions below. usage_log (names + rooms) is NOT readable
-- by the public key (only the CURRENT user's name + room is exposed via
-- get_machines, for the master board); view full history in the Table Editor.
alter table machines  enable row level security;
alter table usage_log enable row level security;

drop policy if exists "machines readable" on machines;
create policy "machines readable" on machines for select using (true);

-- Machine list with server-computed seconds_left (avoids phone clock problems).
-- Also returns the current user's name + room and the wash length (for the master board).
create or replace function get_machines(p_floor int default null)
returns table (id text, name text, floor int, status text, seconds_left int, user_name text, room_no text, total_seconds int)
language sql stable security definer set search_path = public as $$
  select m.id, m.name, m.floor,
    case
      when m.status = 'out_of_order' then 'out_of_order'
      when m.status = 'in_use' and m.free_at > now() then 'in_use'
      else 'free'
    end,
    case
      when m.status = 'in_use' and m.free_at > now()
        then ceil(extract(epoch from (m.free_at - now())))::int
      else 0
    end,
    u.user_name,
    u.room_no,
    case when u.expected_end is null then 0
         else round(extract(epoch from (u.expected_end - u.started_at)))::int end
  from machines m
  left join lateral (
    select l.user_name, l.room_no, l.started_at, l.expected_end
    from usage_log l
    where l.machine_id = m.id and l.ended_at is null
    order by l.started_at desc
    limit 1
  ) u on (m.status = 'in_use' and m.free_at > now())
  where p_floor is null or m.floor = p_floor
  order by m.floor, m.name;
$$;

-- Start a cycle (atomic; one active machine per device / per name+room)
create or replace function start_machine(p_machine text, p_name text, p_room text, p_minutes int, p_device text)
returns int
language plpgsql security definer set search_path = public as $$
declare m machines; v_end timestamptz; v_other record;
begin
  if coalesce(trim(p_name),'') = '' or coalesce(trim(p_room),'') = '' then
    raise exception 'Name and room number are required';
  end if;
  if p_minutes is null or p_minutes < 1 or p_minutes > 240 then
    raise exception 'Minutes must be between 1 and 240';
  end if;
  if coalesce(trim(p_device),'') = '' then
    raise exception 'Could not recognise your device. Please reload the page.';
  end if;

  -- serialise requests from the same device so two scans can't race past the check
  perform pg_advisory_xact_lock(hashtext(p_device));

  select * into m from machines where id = p_machine for update;
  if not found then raise exception 'Machine not found'; end if;
  if m.status = 'out_of_order' then raise exception 'This machine is out of order'; end if;
  if m.status = 'in_use' and m.free_at > now() then raise exception 'Machine is already in use'; end if;

  select mm.name as machine_name, mm.floor as machine_floor into v_other
  from usage_log l join machines mm on mm.id = l.machine_id
  where l.ended_at is null and l.expected_end > now() and l.machine_id <> p_machine
    and ( l.device_id = p_device
          or (lower(trim(l.user_name)) = lower(trim(p_name)) and lower(trim(l.room_no)) = lower(trim(p_room))) )
  limit 1;
  if found then
    raise exception 'You are already using % (%). Free it before starting another machine.',
      v_other.machine_name,
      case when v_other.machine_floor = 0 then 'ground floor' else 'floor ' || v_other.machine_floor end;
  end if;

  v_end := now() + make_interval(mins => p_minutes);

  update usage_log set ended_at = least(expected_end, now())
    where machine_id = p_machine and ended_at is null;
  update machines set status = 'in_use', free_at = v_end where id = p_machine;
  insert into usage_log (machine_id, user_name, room_no, expected_end, device_id)
    values (p_machine, trim(p_name), trim(p_room), v_end, p_device);

  return p_minutes * 60;
end $$;

-- Which machine (if any) is this device currently running?
create or replace function my_active_machine(p_device text)
returns table (machine_id text, machine_name text, machine_floor int, seconds_left int)
language sql stable security definer set search_path = public as $$
  select l.machine_id, m.name, m.floor, ceil(extract(epoch from (l.expected_end - now())))::int
  from usage_log l join machines m on m.id = l.machine_id
  where l.device_id = p_device and l.ended_at is null and l.expected_end > now() and m.status = 'in_use'
  order by l.started_at desc
  limit 1;
$$;

-- Stop a wash early (only the device that started it)
create or replace function free_machine(p_machine text, p_device text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_device),'') = '' or not exists (
    select 1 from usage_log
    where machine_id = p_machine and ended_at is null
      and expected_end > now() and device_id = p_device
  ) then
    raise exception 'Only the person who started this wash can stop it.';
  end if;

  update machines set status = 'free', free_at = null
    where id = p_machine and status = 'in_use';
  update usage_log set ended_at = now()
    where machine_id = p_machine and ended_at is null;
end $$;

grant execute on function get_machines(int)                   to anon, authenticated;
grant execute on function start_machine(text,text,text,int,text) to anon, authenticated;
grant execute on function my_active_machine(text)                to anon, authenticated;
grant execute on function free_machine(text, text)            to anon, authenticated;

-- Realtime updates for the availability page
do $$ begin
  alter publication supabase_realtime add table machines;
exception when duplicate_object then null; end $$;

-- Example machines: EDIT these to match your hostel.
insert into machines (id, name, floor) values
  ('f1-w1','Washer 1',1), ('f1-w2','Washer 2',1),
  ('f2-w1','Washer 1',2), ('f2-w2','Washer 2',2),
  ('f3-w1','Washer 1',3), ('f3-w2','Washer 2',3)
on conflict (id) do nothing;

-- To mark a machine broken:  update machines set status='out_of_order' where id='f3-w2';
-- To fix it:                 update machines set status='free', free_at=null where id='f3-w2';

-- ---- out-of-service reports (same as migration_report.sql) ----
alter table machines add column if not exists ooo_reason text;
alter table machines add column if not exists ooo_at     timestamptz;

-- get_machines now also returns the reason + when it was reported
drop function if exists get_machines(int);

create or replace function get_machines(p_floor int default null)
returns table (id text, name text, floor int, status text, seconds_left int, user_name text, room_no text, total_seconds int, ooo_reason text, ooo_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.id, m.name, m.floor,
    case
      when m.status = 'out_of_order' then 'out_of_order'
      when m.status = 'in_use' and m.free_at > now() then 'in_use'
      else 'free'
    end,
    case
      when m.status = 'in_use' and m.free_at > now()
        then ceil(extract(epoch from (m.free_at - now())))::int
      else 0
    end,
    u.user_name,
    u.room_no,
    case when u.expected_end is null then 0
         else round(extract(epoch from (u.expected_end - u.started_at)))::int end,
    case when m.status = 'out_of_order' then m.ooo_reason end,
    case when m.status = 'out_of_order' then m.ooo_at end
  from machines m
  left join lateral (
    select l.user_name, l.room_no, l.started_at, l.expected_end
    from usage_log l
    where l.machine_id = m.id and l.ended_at is null
    order by l.started_at desc
    limit 1
  ) u on (m.status = 'in_use' and m.free_at > now())
  where p_floor is null or m.floor = p_floor
  order by m.floor, m.name;
$$;

-- Report a machine as out of service.
-- A machine that is mid-wash can only be reported by the person running that wash
-- (everyone else must wait for it to finish), so nobody can cut off someone's wash.
create or replace function report_machine(p_machine text, p_reason text, p_device text)
returns void
language plpgsql security definer set search_path = public as $$
declare m machines; v_reason text := trim(coalesce(p_reason, ''));
begin
  if char_length(v_reason) < 3 or char_length(v_reason) > 120 then
    raise exception 'Please add a short reason (3 to 120 characters).';
  end if;
  if coalesce(trim(p_device),'') = '' then
    raise exception 'Could not recognise your device. Please reload the page.';
  end if;

  select * into m from machines where id = p_machine for update;
  if not found then raise exception 'Machine not found'; end if;
  if m.status = 'out_of_order' then raise exception 'This machine is already marked out of service.'; end if;

  if m.status = 'in_use' and m.free_at > now() and not exists (
    select 1 from usage_log
    where machine_id = p_machine and ended_at is null and expected_end > now() and device_id = p_device
  ) then
    raise exception 'A wash is running on this machine. You can report it once it finishes.';
  end if;

  update usage_log set ended_at = least(expected_end, now())
    where machine_id = p_machine and ended_at is null;
  update machines
    set status = 'out_of_order', free_at = null, ooo_reason = v_reason, ooo_at = now()
    where id = p_machine;
end $$;

-- Mark a machine as working again.
create or replace function restore_machine(p_machine text, p_device text)
returns void
language plpgsql security definer set search_path = public as $$
declare m machines;
begin
  if coalesce(trim(p_device),'') = '' then
    raise exception 'Could not recognise your device. Please reload the page.';
  end if;
  select * into m from machines where id = p_machine for update;
  if not found then raise exception 'Machine not found'; end if;
  if m.status <> 'out_of_order' then return; end if;
  update machines
    set status = 'free', free_at = null, ooo_reason = null, ooo_at = null
    where id = p_machine;
end $$;

grant execute on function get_machines(int)                  to anon, authenticated;
grant execute on function report_machine(text, text, text)   to anon, authenticated;
grant execute on function restore_machine(text, text)        to anon, authenticated;

-- ---- owner tools (same as migration_admin.sql) ----
-- Run ONCE in Supabase > SQL Editor.
-- Owner tools: add/remove floors and machines from the owner QR page (/admin).
-- Access is protected by a long secret that lives only in the owner QR code.
-- After running this, run:  npm run owner-qr -- https://your-app.vercel.app
-- and paste the one SQL line it prints to store the secret's hash.

create table if not exists app_settings (
  key   text primary key,
  value text not null
);
-- RLS on with no policies: the public key cannot read or write this table.
alter table app_settings enable row level security;

-- internal check: does this secret match the stored hash?
create or replace function admin_ok(p_secret text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from app_settings
    where key = 'owner_secret_hash'
      and value = encode(sha256(convert_to(coalesce(p_secret, ''), 'utf8')), 'hex')
  );
$$;
revoke execute on function admin_ok(text) from public, anon, authenticated;

create or replace function admin_check(p_secret text)
returns boolean
language sql stable security definer set search_path = public as $$
  select admin_ok(p_secret);
$$;

-- Add one machine to a floor (named Washer N, id f<floor>-w<N>)
create or replace function admin_add_machine(p_secret text, p_floor int)
returns text
language plpgsql security definer set search_path = public as $$
declare n int; v_id text;
begin
  if not admin_ok(p_secret) then raise exception 'Owner access required.'; end if;
  if p_floor is null or p_floor < 0 or p_floor > 30 then raise exception 'Floor must be between 0 and 30.'; end if;
  perform pg_advisory_xact_lock(hashtext('admin_machines'));
  select coalesce(max((regexp_replace(id, '^f\d+-w', ''))::int), 0) + 1 into n
    from machines where floor = p_floor and id ~ '^f\d+-w\d+$';
  if (select count(*) from machines where floor = p_floor) >= 12 then
    raise exception 'A floor can have at most 12 machines.';
  end if;
  v_id := 'f' || p_floor || '-w' || n;
  insert into machines (id, name, floor) values (v_id, 'Washer ' || n, p_floor);
  return v_id;
end $$;

-- Remove one machine (not while a wash is running on it)
create or replace function admin_remove_machine(p_secret text, p_machine text)
returns void
language plpgsql security definer set search_path = public as $$
declare m machines;
begin
  if not admin_ok(p_secret) then raise exception 'Owner access required.'; end if;
  select * into m from machines where id = p_machine for update;
  if not found then raise exception 'Machine not found.'; end if;
  if m.status = 'in_use' and m.free_at > now() then
    raise exception 'A wash is running on this machine. Remove it after it finishes.';
  end if;
  delete from machines where id = p_machine;
end $$;

-- Add a whole floor with some machines
create or replace function admin_add_floor(p_secret text, p_floor int, p_machines int)
returns int
language plpgsql security definer set search_path = public as $$
declare i int;
begin
  if not admin_ok(p_secret) then raise exception 'Owner access required.'; end if;
  if p_floor is null or p_floor < 0 or p_floor > 30 then raise exception 'Floor must be between 0 and 30.'; end if;
  if p_machines is null or p_machines < 1 or p_machines > 12 then raise exception 'Choose 1 to 12 machines.'; end if;
  if exists (select 1 from machines where floor = p_floor) then raise exception 'That floor already exists.'; end if;
  for i in 1..p_machines loop
    insert into machines (id, name, floor) values ('f' || p_floor || '-w' || i, 'Washer ' || i, p_floor);
  end loop;
  return p_machines;
end $$;

-- Remove a floor and all its machines (not while any wash is running there)
create or replace function admin_remove_floor(p_secret text, p_floor int)
returns int
language plpgsql security definer set search_path = public as $$
declare c int;
begin
  if not admin_ok(p_secret) then raise exception 'Owner access required.'; end if;
  if exists (select 1 from machines where floor = p_floor and status = 'in_use' and free_at > now()) then
    raise exception 'A wash is running on this floor. Remove it after it finishes.';
  end if;
  delete from machines where floor = p_floor;
  get diagnostics c = row_count;
  return c;
end $$;

grant execute on function admin_check(text)                   to anon, authenticated;
grant execute on function admin_add_machine(text, int)        to anon, authenticated;
grant execute on function admin_remove_machine(text, text)    to anon, authenticated;
grant execute on function admin_add_floor(text, int, int)     to anon, authenticated;
grant execute on function admin_remove_floor(text, int)       to anon, authenticated;

-- ---- rename machines (same as migration_admin_rename.sql) ----
-- Run ONCE in Supabase > SQL Editor (after migration_admin.sql).
-- Lets the owner rename a machine from the owner page. The QR code does not change.

create or replace function admin_rename_machine(p_secret text, p_machine text, p_name text)
returns void
language plpgsql security definer set search_path = public as $$
declare m machines; v_name text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g');
begin
  if not admin_ok(p_secret) then raise exception 'Owner access required.'; end if;
  if char_length(v_name) < 1 or char_length(v_name) > 30 then
    raise exception 'The name must be 1 to 30 characters.';
  end if;
  select * into m from machines where id = p_machine for update;
  if not found then raise exception 'Machine not found.'; end if;
  if exists (select 1 from machines where floor = m.floor and id <> m.id and lower(name) = lower(v_name)) then
    raise exception 'Another machine on this floor already has that name.';
  end if;
  update machines set name = v_name where id = p_machine;
end $$;

grant execute on function admin_rename_machine(text, text, text) to anon, authenticated;
