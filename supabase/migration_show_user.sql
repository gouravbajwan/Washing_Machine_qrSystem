-- Run this ONCE in Supabase > SQL Editor (for projects that already ran schema.sql).
-- Makes get_machines() also return the name + room of whoever is currently using a machine.

drop function if exists get_machines(int);

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

grant execute on function get_machines(int) to anon, authenticated;
