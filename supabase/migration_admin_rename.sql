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
