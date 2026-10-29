-- Brickhampton Stats database. Paste into the Supabase SQL editor and run once.
-- Anyone can read the stats. Nothing can be written except through the functions below,
-- and those need an Admin session, which only the PIN can open.

create extension if not exists pgcrypto with schema extensions;

-- ---------- Team data (public, read only) ----------
create table public.seasons (
  code text primary key check (code ~ '^[WS][0-9]{2}$'),
  sort int not null,                       -- higher is newer
  is_current boolean not null default false
);
create unique index seasons_one_current on public.seasons (is_current) where is_current;

create table public.players (
  id text primary key,
  name text not null,
  num text not null default '0',           -- jersey number; subs wear 0 or 00 and get a number per game
  role text not null check (role in ('starter', 'sub')),
  look jsonb not null default '{}',        -- placeholder avatar: skin, hair, style, band
  created_at timestamptz not null default now()
);

-- Each season's opponent list, in the order it shows when recording a game.
create table public.season_opponents (
  season text not null references public.seasons (code) on update cascade on delete cascade,
  name text not null,
  pos int not null,
  primary key (season, name)
);

create table public.games (
  id text primary key,
  season text not null references public.seasons (code) on update cascade,
  no int not null check (no between 1 and 40),
  date date not null,
  opp text not null,
  result text not null default 'U' check (result in ('W', 'L', 'D', 'U')),
  opp_pts int check (opp_pts between 0 and 999),
  recorded boolean not null default false, -- true for games recorded in the app (not imported)
  created_at timestamptz not null default now(),
  unique (season, no)
);

-- One box score line per player per game. Imported history has total REB only;
-- games recorded in the app have OREB and DREB instead.
create table public.lines (
  game_id text not null references public.games (id) on update cascade on delete cascade,
  player_id text not null references public.players (id) on update cascade,
  pos int not null,                        -- playing order
  num text,                                -- the number a sub wore in this game
  m2 int not null default 0, a2 int not null default 0,
  m3 int not null default 0, a3 int not null default 0,
  ftm int not null default 0, fta int not null default 0,
  reb int, oreb int, dreb int,
  ast int not null default 0, stl int not null default 0, blk int not null default 0, "to" int not null default 0,
  primary key (game_id, player_id),
  check (m2 <= a2 and m3 <= a3 and ftm <= fta),
  check (least(m2, a2, m3, a3, ftm, fta, ast, stl, blk, "to") >= 0),
  check ((reb is not null and oreb is null and dreb is null) or (reb is null and oreb is not null and dreb is not null))
);

alter table public.seasons enable row level security;
alter table public.players enable row level security;
alter table public.season_opponents enable row level security;
alter table public.games enable row level security;
alter table public.lines enable row level security;
create policy "Anyone can read" on public.seasons for select using (true);
create policy "Anyone can read" on public.players for select using (true);
create policy "Anyone can read" on public.season_opponents for select using (true);
create policy "Anyone can read" on public.games for select using (true);
create policy "Anyone can read" on public.lines for select using (true);
grant select on public.seasons, public.players, public.season_opponents, public.games, public.lines to anon, authenticated;

-- ---------- Admin PIN and sessions (private) ----------
-- Lives in its own schema with no grants, so the website can never read it.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.admin (
  id int primary key default 1 check (id = 1),
  pin_hash text,
  failed int not null default 0,
  locked_until timestamptz
);
insert into private.admin (id) values (1);

create table private.sessions (
  token uuid primary key default gen_random_uuid(),
  last_seen timestamptz not null default now()
);

-- Admin mode locks itself after 15 minutes without a tap.
create or replace function private.require_admin(p_token uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from private.sessions where last_seen < now() - interval '15 minutes';
  update private.sessions set last_seen = now() where token = p_token;
  if not found then raise exception 'Admin mode is locked' using errcode = '28000'; end if;
end $$;

-- Unlock with the PIN. Five wrong tries lock it for 15 minutes; after that, each wrong try locks it again.
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
    locked_until = case when failed + 1 >= 5 then now() + interval '15 minutes' end
  where id = 1 returning * into a;
  return json_build_object('ok', false, 'reason', case when a.locked_until is not null then 'locked' else 'wrong' end,
    'left', greatest(0, 5 - a.failed), 'until', a.locked_until);
end $$;

-- Keeps the session alive while Admin is being used, and says whether it still is.
create or replace function public.admin_touch(p_token uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin(p_token);
  return true;
exception when sqlstate '28000' then
  return false;
end $$;

create or replace function public.admin_lock(p_token uuid) returns void
language sql security definer set search_path = '' as $$
  delete from private.sessions where token = p_token;
$$;

create or replace function public.admin_change_pin(p_token uuid, p_new text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin(p_token);
  if p_new !~ '^[0-9]{4}$' then raise exception 'The PIN must be four digits'; end if;
  update private.admin set pin_hash = extensions.crypt(p_new, extensions.gen_salt('bf')) where id = 1;
end $$;

revoke all on function private.require_admin(uuid) from public, anon, authenticated;
revoke all on function public.admin_unlock(text), public.admin_touch(uuid), public.admin_lock(uuid), public.admin_change_pin(uuid, text) from public;
grant execute on function public.admin_unlock(text), public.admin_touch(uuid), public.admin_lock(uuid), public.admin_change_pin(uuid, text) to anon, authenticated;
