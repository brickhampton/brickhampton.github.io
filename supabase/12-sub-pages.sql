-- Additional player pages: a page for each sub, reached from the subs circle on the Player page.
-- Turned on or off in Admin mode (Settings), for everyone who opens the site. Off until it's turned on.
-- Safe to run again, and safe to run before or after 10-supporter.sql.

create table if not exists public.site (
  key text primary key,
  value jsonb not null
);
alter table public.site enable row level security;
drop policy if exists "Anyone can read" on public.site;
create policy "Anyone can read" on public.site for select using (true);

create or replace function public.set_sub_pages(p_token uuid, p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin(p_token);
  insert into public.site (key, value) values ('sub_pages', to_jsonb(coalesce(p_on, false)))
  on conflict (key) do update set value = excluded.value;
end $$;

revoke all on function public.set_sub_pages(uuid, boolean) from public;
grant execute on function public.set_sub_pages(uuid, boolean) to anon, authenticated;
