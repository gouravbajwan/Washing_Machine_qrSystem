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
