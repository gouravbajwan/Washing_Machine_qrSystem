-- Run ONCE in Supabase > SQL Editor.
-- Rule: one person can only run ONE machine at a time. "Same person" = same phone/browser
-- (random device id) OR the same name + room number.

alter table usage_log add column if not exists device_id text;
create index if not exists usage_log_device_idx on usage_log (device_id) where ended_at is null;

-- IMPORTANT: remove the old 4-argument version so the rule can't be bypassed by calling it.
drop function if exists start_machine(text, text, text, int);

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

grant execute on function start_machine(text,text,text,int,text) to anon, authenticated;
grant execute on function my_active_machine(text)                to anon, authenticated;
