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
-- Also returns the current user's name + room, shown on the master board.
create or replace function get_machines(p_floor int default null)
returns table (id text, name text, floor int, status text, seconds_left int, user_name text, room_no text)
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
    u.room_no
  from machines m
  left join lateral (
    select l.user_name, l.room_no
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
