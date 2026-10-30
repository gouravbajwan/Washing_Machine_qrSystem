-- Run ONCE in Supabase > SQL Editor (after migration_report.sql).
-- Every wash gets a laundry "buddy" (sock, tee, pants, cap, hoodie or dress).
-- It prefers a buddy nobody else on the same floor is using, and avoids repeating
-- the buddy that person had last time. Nothing else about starting a wash changes.

alter table usage_log add column if not exists buddy text;

drop function if exists get_machines(int);

create or replace function get_machines(p_floor int default null)
returns table (id text, name text, floor int, status text, seconds_left int, user_name text, room_no text, total_seconds int, ooo_reason text, ooo_at timestamptz, buddy text)
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
    case when m.status = 'out_of_order' then m.ooo_at end,
    u.buddy
  from machines m
  left join lateral (
    select l.user_name, l.room_no, l.started_at, l.expected_end, l.buddy
    from usage_log l
    where l.machine_id = m.id and l.ended_at is null
    order by l.started_at desc
    limit 1
  ) u on (m.status = 'in_use' and m.free_at > now())
  where p_floor is null or m.floor = p_floor
  order by m.floor, m.name;
$$;

drop function if exists start_machine(text, text, text, int, text);

create or replace function start_machine(p_machine text, p_name text, p_room text, p_minutes int, p_device text, p_last_buddy text default null)
returns int
language plpgsql security definer set search_path = public as $$
declare m machines; v_end timestamptz; v_other record; v_buddy text;
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

  -- pick a buddy: unused on this floor and different from last time, else relax the rules
  select k into v_buddy from (
    select k, (k = coalesce(p_last_buddy,'')) as same,
           exists (
             select 1 from usage_log l join machines mm on mm.id = l.machine_id
             where l.ended_at is null and l.expected_end > now() and mm.floor = m.floor and l.buddy = k
           ) as taken
    from unnest(array['sock','tee','pants','cap','hoodie','dress']) as k
  ) c
  order by taken, same, random()
  limit 1;

  v_end := now() + make_interval(mins => p_minutes);

  update usage_log set ended_at = least(expected_end, now())
    where machine_id = p_machine and ended_at is null;
  update machines set status = 'in_use', free_at = v_end where id = p_machine;
  insert into usage_log (machine_id, user_name, room_no, expected_end, device_id, buddy)
    values (p_machine, trim(p_name), trim(p_room), v_end, p_device, v_buddy);

  return p_minutes * 60;
end $$;

grant execute on function start_machine(text,text,text,int,text,text) to anon, authenticated;
grant execute on function get_machines(int) to anon, authenticated;
