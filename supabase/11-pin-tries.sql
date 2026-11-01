-- The Admin PIN locks for 15 minutes after three wrong tries (it was five).
-- Only replaces the unlock check; the PIN and everything else stay as they are. Safe to run again.

-- Unlock with the PIN. Three wrong tries lock it for 15 minutes; after that, each wrong try locks it again.
create or replace function public.admin_unlock(p_pin text) returns json
language plpgsql security definer set search_path = '' as $$
declare a private.admin; t uuid;
begin
  select * into a from private.admin where id = 1 for update;
  if a.pin_hash is null then return json_build_object('ok', false, 'reason', 'no_pin'); end if;
  if a.locked_until > now() then
    return json_build_object('ok', false, 'reason', 'locked', 'until', a.locked_until);
  end if;
  if a.pin_hash = extensions.crypt(coalesce(p_pin, ''), a.pin_hash) then
    update private.admin set failed = 0, locked_until = null where id = 1;
    insert into private.sessions default values returning token into t;
    return json_build_object('ok', true, 'token', t);
  end if;
  update private.admin set failed = failed + 1,
    locked_until = case when failed + 1 >= 3 then now() + interval '15 minutes' end
  where id = 1 returning * into a;
  return json_build_object('ok', false, 'reason', case when a.locked_until is not null then 'locked' else 'wrong' end,
    'left', greatest(0, 3 - a.failed), 'until', a.locked_until);
end $$;
