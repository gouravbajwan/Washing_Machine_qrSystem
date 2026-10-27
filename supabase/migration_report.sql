-- Run ONCE in Supabase > SQL Editor (after migration_duration.sql).
-- Lets people report a broken machine from its QR page (with a reason) and
-- mark it available again once it works. The board and QR page show the reason.

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
