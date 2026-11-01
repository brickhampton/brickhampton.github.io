-- Our supporter on the Home photo: her outfit and camera, chosen in Admin mode (Settings > Supporter).
-- Until this runs she wears the dress and carries the digital camera. Safe to run again.

create table if not exists public.site (
  key text primary key,
  value jsonb not null
);
alter table public.site enable row level security;
drop policy if exists "Anyone can read" on public.site;
create policy "Anyone can read" on public.site for select using (true);

-- p_look: { outfit: 'dress' | 'tee', cam: 'digital' | 'film' }.
create or replace function public.set_supporter(p_token uuid, p_look jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare o text := p_look->>'outfit'; c text := coalesce(p_look->>'cam', 'digital');
begin
  perform private.require_admin(p_token);
  if o is null or o not in ('dress', 'tee') or c not in ('digital', 'film') then
    raise exception 'That outfit or camera isn''t one of the choices';
  end if;
  insert into public.site (key, value) values ('supporter', jsonb_build_object('outfit', o, 'cam', c))
  on conflict (key) do update set value = excluded.value;
end $$;

revoke all on function public.set_supporter(uuid, jsonb) from public;
grant execute on function public.set_supporter(uuid, jsonb) to anon, authenticated;
