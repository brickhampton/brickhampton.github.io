-- Our supporter on the Home photo: her outfit, chosen in Admin mode (Settings > Supporter).
-- Until this runs she wears the dress. Safe to run again.

create table if not exists public.site (
  key text primary key,
  value jsonb not null
);
alter table public.site enable row level security;
drop policy if exists "Anyone can read" on public.site;
create policy "Anyone can read" on public.site for select using (true);

-- p_look: { outfit: 'dress' | 'tee' }.
create or replace function public.set_supporter(p_token uuid, p_look jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare o text := p_look->>'outfit';
begin
  perform private.require_admin(p_token);
  if o is null or o not in ('dress', 'tee') then
    raise exception 'That outfit isn''t one of the choices';
  end if;
  insert into public.site (key, value) values ('supporter', jsonb_build_object('outfit', o))
  on conflict (key) do update set value = excluded.value;
end $$;

revoke all on function public.set_supporter(uuid, jsonb) from public;
grant execute on function public.set_supporter(uuid, jsonb) to anon, authenticated;
