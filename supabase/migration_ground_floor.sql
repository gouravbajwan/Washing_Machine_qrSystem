-- Run ONCE in Supabase > SQL Editor.
-- Adds machines on the GROUND FLOOR (floor = 0). The app shows floor 0 as "Ground floor".
-- Edit the ids/names to match the real machines there (keep ids unique and short).

insert into machines (id, name, floor) values
  ('f0-w1', 'Washer 1', 0),
  ('f0-w2', 'Washer 2', 0)
on conflict (id) do nothing;

-- Nicer message for ground floor in the "already using a machine" error.
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

grant execute on function start_machine(text,text,text,int,text) to anon, authenticated;
