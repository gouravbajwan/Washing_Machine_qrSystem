-- Run ONCE in Supabase > SQL Editor.
-- Only the phone/browser that started a wash can stop it early.
-- Everyone else can only watch the timer until it ends by itself.

-- IMPORTANT: remove the old version (anyone could call it) so the rule can't be bypassed.
drop function if exists free_machine(text);

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

grant execute on function free_machine(text, text) to anon, authenticated;
