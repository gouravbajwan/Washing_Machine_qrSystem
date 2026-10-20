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
  ended_at      timestamptz
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

-- Start a cycle (atomic: two people can't grab the same machine)
create or replace function start_machine(p_machine text, p_name text, p_room text, p_minutes int)
returns int
language plpgsql security definer set search_path = public as $$
declare m machines; v_end timestamptz;
begin
  if coalesce(trim(p_name),'') = '' or coalesce(trim(p_room),'') = '' then
    raise exception 'Name and room number are required';
  end if;
  if p_minutes is null or p_minutes < 1 or p_minutes > 240 then
    raise exception 'Minutes must be between 1 and 240';
  end if;

  select * into m from machines where id = p_machine for update;
  if not found then raise exception 'Machine not found'; end if;
  if m.status = 'out_of_order' then raise exception 'This machine is out of order'; end if;
  if m.status = 'in_use' and m.free_at > now() then raise exception 'Machine is already in use'; end if;

  v_end := now() + make_interval(mins => p_minutes);

  update usage_log set ended_at = least(expected_end, now())
    where machine_id = p_machine and ended_at is null;
  update machines set status = 'in_use', free_at = v_end where id = p_machine;
  insert into usage_log (machine_id, user_name, room_no, expected_end)
    values (p_machine, trim(p_name), trim(p_room), v_end);

  return p_minutes * 60;
end $$;

-- Mark a machine free (cycle done / emptied early)
create or replace function free_machine(p_machine text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update machines set status = 'free', free_at = null
    where id = p_machine and status = 'in_use';
  update usage_log set ended_at = now()
    where machine_id = p_machine and ended_at is null;
end $$;

grant execute on function get_machines(int)                   to anon, authenticated;
grant execute on function start_machine(text,text,text,int)   to anon, authenticated;
grant execute on function free_machine(text)                  to anon, authenticated;

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
