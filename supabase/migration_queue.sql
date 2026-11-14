-- Run ONCE in Supabase > SQL Editor (after migration_buddy.sql).
-- Waiting list ("queue sheet") per machine: while a machine is busy, anyone can
-- add their name + room. Each entry shows the join time and a "clothes taken"
-- tick. Entries disappear after 1 day, and a person can only change or remove
-- their OWN entry (checked by device, like the rest of the app). The table has
-- row level security with no policies, so it is only reachable through these
-- functions.

create table if not exists wash_queue (
  id         bigint generated always as identity primary key,
  machine_id text not null references machines(id) on delete cascade,
  user_name  text not null,
  room_no    text not null,
  device_id  text not null,
  joined_at  timestamptz not null default now(),
  taken      boolean not null default false,
  taken_at   timestamptz
);
create index if not exists wash_queue_machine_idx on wash_queue (machine_id, joined_at);
alter table wash_queue enable row level security;

-- The sheet for one machine (last 24 h only). `mine` is true only for the
-- caller's own entry; device ids are never exposed.
create or replace function get_queue(p_machine text, p_device text)
returns table (id bigint, user_name text, room_no text, joined_at timestamptz, taken boolean, mine boolean)
language sql stable security definer set search_path = public as $$
  select q.id, q.user_name, q.room_no, q.joined_at, q.taken,
         (q.device_id = coalesce(p_device, ''))
  from wash_queue q
  where q.machine_id = p_machine and q.joined_at > now() - interval '1 day'
  order by q.joined_at;
$$;

create or replace function join_queue(p_machine text, p_name text, p_room text, p_device text)
returns void
language plpgsql security definer set search_path = public as $$
declare m machines; v_name text := trim(coalesce(p_name,'')); v_room text := trim(coalesce(p_room,''));
begin
  delete from wash_queue where joined_at < now() - interval '1 day';

  if v_name = '' or v_room = '' then
    raise exception 'Name and room number are required';
  end if;
  if char_length(v_name) > 40 or char_length(v_room) > 16 then
    raise exception 'That name or room number is too long.';
  end if;
  if coalesce(trim(p_device),'') = '' then
    raise exception 'Could not recognise your device. Please reload the page.';
  end if;

  select * into m from machines where id = p_machine for update;
  if not found then raise exception 'Machine not found'; end if;
  if m.status = 'out_of_order' then
    raise exception 'This machine is out of service.';
  end if;
  if not (m.status = 'in_use' and m.free_at > now()) then
    raise exception 'This machine is free right now — you can start it instead of queueing.';
  end if;

  if exists (
    select 1 from usage_log l
    where l.machine_id = p_machine and l.ended_at is null and l.expected_end > now() and l.device_id = p_device
  ) then
    raise exception 'This is your own wash — no need to queue for it.';
  end if;

  if exists (
    select 1 from wash_queue q
    where q.machine_id = p_machine and q.joined_at > now() - interval '1 day' and not q.taken
      and (q.device_id = p_device
           or (lower(q.user_name) = lower(v_name) and lower(q.room_no) = lower(v_room)))
  ) then
    raise exception 'You are already in this queue.';
  end if;

  if (select count(*) from wash_queue q
      where q.machine_id = p_machine and q.joined_at > now() - interval '1 day' and not q.taken) >= 12 then
    raise exception 'The queue is full. Please try another machine.';
  end if;

  insert into wash_queue (machine_id, user_name, room_no, device_id)
  values (p_machine, v_name, v_room, p_device);
end $$;

-- Tick / untick your own "clothes taken" box. Only the device that created the
-- entry can change it, so nobody can touch anyone else's row.
create or replace function set_queue_taken(p_entry bigint, p_device text, p_taken boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_device),'') = '' then
    raise exception 'Could not recognise your device. Please reload the page.';
  end if;
  update wash_queue
    set taken = coalesce(p_taken, true),
        taken_at = case when coalesce(p_taken, true) then now() else null end
  where id = p_entry and device_id = p_device and joined_at > now() - interval '1 day';
  if not found then raise exception 'You can only change your own entry.'; end if;
end $$;

-- Remove your own entry (joined by mistake, found another machine, ...).
create or replace function leave_queue(p_entry bigint, p_device text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_device),'') = '' then
    raise exception 'Could not recognise your device. Please reload the page.';
  end if;
  delete from wash_queue
  where id = p_entry and device_id = p_device and joined_at > now() - interval '1 day';
  if not found then raise exception 'You can only remove your own entry.'; end if;
end $$;

grant execute on function get_queue(text, text)                      to anon, authenticated;
grant execute on function join_queue(text, text, text, text)         to anon, authenticated;
grant execute on function set_queue_taken(bigint, text, boolean)     to anon, authenticated;
grant execute on function leave_queue(bigint, text)                  to anon, authenticated;
