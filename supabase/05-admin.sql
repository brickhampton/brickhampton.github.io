-- Admin mode edits. Run after 01 to 04. Every function needs an Admin session.
-- Each change first saves a copy of the stats, so the last change can be undone.

-- ---------- Change history ----------
create table if not exists private.history (
  id bigserial primary key,
  at timestamptz not null default now(),
  text text not null,
  snap jsonb not null
);

-- All team data as one value. The whole history is small (a few hundred rows), so a full copy is cheap.
create or replace function private.snapshot() returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'seasons', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.seasons t),
    'players', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.players t),
    'season_opponents', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.season_opponents t),
    'games', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.games t),
    'lines', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.lines t));
$$;

-- Called at the start of every change, before anything is touched. Keeps the last 40.
create or replace function private.log(p_text text) returns void
language plpgsql set search_path = '' as $$
begin
  insert into private.history (text, snap) values (p_text, private.snapshot());
  delete from private.history where id not in (select id from private.history order by id desc limit 40);
end $$;

create or replace function private.restore(p_snap jsonb) returns void
language plpgsql set search_path = '' as $$
begin
  -- "where true" keeps Postgres safe-update guards happy.
  delete from public.lines where true; delete from public.games where true; delete from public.season_opponents where true;
  delete from public.players where true; delete from public.seasons where true;
  insert into public.seasons select * from jsonb_populate_recordset(null::public.seasons, p_snap->'seasons');
  insert into public.players select * from jsonb_populate_recordset(null::public.players, p_snap->'players');
  insert into public.season_opponents select * from jsonb_populate_recordset(null::public.season_opponents, p_snap->'season_opponents');
  insert into public.games select * from jsonb_populate_recordset(null::public.games, p_snap->'games');
  insert into public.lines select * from jsonb_populate_recordset(null::public.lines, p_snap->'lines');
end $$;

create or replace function public.admin_history(p_token uuid) returns json
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin(p_token);
  return (select coalesce(json_agg(json_build_object('text', text, 'at', at) order by id desc), '[]')
          from (select * from private.history order by id desc limit 8) h);
end $$;

-- Puts the stats back the way they were before the last change. Returns what was undone.
create or replace function public.undo_last(p_token uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare h private.history;
begin
  perform private.require_admin(p_token);
  select * into h from private.history order by id desc limit 1;
  if h.id is null then raise exception 'There is nothing to undo'; end if;
  perform private.restore(h.snap);
  delete from private.history where id = h.id;
  return h.text;
end $$;

-- ---------- Recording (from 04), now with history ----------
create or replace function public.save_game(p_token uuid, p_game jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare
  g jsonb := p_game; gid text; l jsonb; i int := 0;
begin
  perform private.require_admin(p_token);
  if not exists (select 1 from public.seasons where code = g->>'season') then raise exception 'There is no season %', g->>'season'; end if;
  if (g->>'date')::date > current_date + 1 then raise exception 'Games can''t be in the future'; end if;
  if coalesce(g->>'result', '') not in ('W', 'L', 'D') then raise exception 'Pick Win, Loss or Draw'; end if;
  if jsonb_array_length(coalesce(g->'lines', '[]')) = 0 then raise exception 'Nobody played in this game'; end if;
  if exists (select 1 from public.games where season = g->>'season' and no = (g->>'no')::int) then
    raise exception '% Game % already has stats', g->>'season', g->>'no' using errcode = '23505';
  end if;
  perform private.log(format('Recorded %s Game %s vs %s', g->>'season', g->>'no', g->>'opp'));

  insert into public.players (id, name, num, role, look)
  select p->>'id', p->>'name', coalesce(p->>'num', '0'), 'sub', coalesce(p->'look', '{}')
  from jsonb_array_elements(coalesce(g->'new_players', '[]')) p
  on conflict (id) do nothing;

  gid := (g->>'season') || '-' || (g->>'no');
  insert into public.games (id, season, no, date, opp, result, recorded)
  values (gid, g->>'season', (g->>'no')::int, (g->>'date')::date, g->>'opp', g->>'result', true);

  for l in select * from jsonb_array_elements(g->'lines') loop
    i := i + 1;
    insert into public.lines (game_id, player_id, pos, num, m2, a2, m3, a3, ftm, fta, oreb, dreb, ast, stl, blk, "to")
    values (gid, l->>'player_id', i, l->>'num',
      (l->>'m2')::int, (l->>'a2')::int, (l->>'m3')::int, (l->>'a3')::int, (l->>'ftm')::int, (l->>'fta')::int,
      (l->>'oreb')::int, (l->>'dreb')::int, (l->>'ast')::int, (l->>'stl')::int, (l->>'blk')::int, (l->>'to')::int);
  end loop;
  return gid;
end $$;

create or replace function public.set_season_opponents(p_token uuid, p_season text, p_names text[], p_text text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin(p_token);
  perform private.log(coalesce(p_text, format('Updated the %s opponents', p_season)));
  delete from public.season_opponents where season = p_season;
  insert into public.season_opponents (season, name, pos)
  select p_season, trim(n), min(o) from unnest(p_names) with ordinality as t(n, o)
  where trim(n) <> '' group by trim(n);
end $$;
drop function if exists public.set_season_opponents(uuid, text, text[]);

-- ---------- Seasons ----------
create or replace function public.set_current_season(p_token uuid, p_code text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin(p_token);
  if not exists (select 1 from public.seasons where code = p_code) then raise exception 'There is no season %', p_code; end if;
  perform private.log(format('Made %s the current season', p_code));
  update public.seasons set is_current = false where is_current;
  update public.seasons set is_current = true where code = p_code;
end $$;

-- Adds the season after the newest one: S26 is followed by W27, W27 by S27.
create or replace function public.add_season(p_token uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare top text; nxt text;
begin
  perform private.require_admin(p_token);
  select code into top from public.seasons order by sort desc limit 1;
  nxt := case when left(top, 1) = 'S' then 'W' || lpad((substr(top, 2)::int + 1)::text, 2, '0') else 'S' || substr(top, 2) end;
  perform private.log(format('Added season %s', nxt));
  insert into public.seasons (code, sort) select nxt, max(sort) + 1 from public.seasons;
  return nxt;
end $$;

create or replace function public.remove_season(p_token uuid, p_code text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin(p_token);
  if exists (select 1 from public.games where season = p_code) then raise exception '% has games, so it can''t be removed', p_code; end if;
  if exists (select 1 from public.seasons where code = p_code and is_current) then raise exception '% is the current season', p_code; end if;
  perform private.log(format('Removed season %s', p_code));
  delete from public.seasons where code = p_code;
end $$;

-- ---------- Games ----------
create or replace function public.set_result(p_token uuid, p_game text, p_result text) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.games;
begin
  perform private.require_admin(p_token);
  select * into g from public.games where id = p_game;
  if g.id is null then raise exception 'That game no longer exists'; end if;
  perform private.log(format('%s Game %s result set to %s', g.season, g.no,
    case p_result when 'W' then 'Win' when 'L' then 'Loss' when 'D' then 'Draw' else 'unknown' end));
  update public.games set result = p_result where id = p_game;
end $$;

-- Replaces a game's details and its whole box score. p_game: season, no, date, opp, result, opp_pts,
-- lines: [{player_id, num, m2, a2, m3, a3, ftm, fta, reb or oreb+dreb, ast, stl, blk, to}].
create or replace function public.edit_game(p_token uuid, p_id text, p_game jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare g jsonb := p_game; old public.games; gid text; l jsonb; i int := 0;
begin
  perform private.require_admin(p_token);
  select * into old from public.games where id = p_id;
  if old.id is null then raise exception 'That game no longer exists'; end if;
  if (g->>'date')::date > current_date + 1 then raise exception 'Games can''t be in the future'; end if;
  gid := (g->>'season') || '-' || (g->>'no');
  if gid <> p_id and exists (select 1 from public.games where id = gid) then
    raise exception '% Game % already exists. Pick another game number.', g->>'season', g->>'no' using errcode = '23505';
  end if;
  perform private.log(format('Edited %s Game %s', g->>'season', g->>'no'));
  update public.games set id = gid, season = g->>'season', no = (g->>'no')::int, date = (g->>'date')::date, opp = trim(g->>'opp'),
    result = g->>'result', opp_pts = nullif(g->>'opp_pts', '')::int where id = p_id;
  delete from public.lines where game_id = gid;
  for l in select * from jsonb_array_elements(coalesce(g->'lines', '[]')) loop
    i := i + 1;
    insert into public.lines (game_id, player_id, pos, num, m2, a2, m3, a3, ftm, fta, reb, oreb, dreb, ast, stl, blk, "to")
    values (gid, l->>'player_id', i, l->>'num',
      (l->>'m2')::int, (l->>'a2')::int, (l->>'m3')::int, (l->>'a3')::int, (l->>'ftm')::int, (l->>'fta')::int,
      (l->>'reb')::int, (l->>'oreb')::int, (l->>'dreb')::int, (l->>'ast')::int, (l->>'stl')::int, (l->>'blk')::int, (l->>'to')::int);
  end loop;
  return gid;
end $$;

create or replace function public.delete_game(p_token uuid, p_id text) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.games;
begin
  perform private.require_admin(p_token);
  select * into g from public.games where id = p_id;
  if g.id is null then return; end if;
  perform private.log(format('Deleted %s Game %s vs %s', g.season, g.no, g.opp));
  delete from public.games where id = p_id;
end $$;

-- ---------- Roster ----------
-- Adds or updates a player. p_player: id, name, num, role, look (look only for a new player).
create or replace function public.save_player(p_token uuid, p_player jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare p jsonb := p_player; was public.players; nm text := trim(p->>'name'); dup text;
begin
  perform private.require_admin(p_token);
  if nm = '' then raise exception 'Add a name'; end if;
  select * into was from public.players where id = p->>'id';
  select name into dup from public.players where lower(name) = lower(nm) and id <> p->>'id';
  if dup is not null then raise exception '% is already on the roster', dup; end if;
  if p->>'role' = 'starter' and exists (select 1 from public.players where role = 'starter' and num = p->>'num' and id <> p->>'id') then
    raise exception '#% is already taken', p->>'num';
  end if;
  perform private.log(case when was.id is null then format('Added %s as a %s', nm, p->>'role') else format('Updated %s', nm) end);
  insert into public.players (id, name, num, role, look)
  values (p->>'id', nm, case when p->>'role' = 'starter' then p->>'num' else '0' end, p->>'role', coalesce(p->'look', '{}'))
  on conflict (id) do update set name = excluded.name, num = excluded.num, role = excluded.role;
end $$;

-- Moves every game of one player onto another, then removes the first. Not allowed if both played the same game.
create or replace function public.merge_player(p_token uuid, p_from text, p_into text) returns void
language plpgsql security definer set search_path = '' as $$
declare a text; b text;
begin
  perform private.require_admin(p_token);
  select name into a from public.players where id = p_from;
  select name into b from public.players where id = p_into;
  if a is null or b is null or p_from = p_into then raise exception 'Pick two different players'; end if;
  if exists (select 1 from public.lines x join public.lines y on x.game_id = y.game_id where x.player_id = p_from and y.player_id = p_into) then
    raise exception '% and % played in the same game, so they can''t be merged', a, b;
  end if;
  perform private.log(format('Merged %s into %s', a, b));
  update public.lines set player_id = p_into where player_id = p_from;
  delete from public.players where id = p_from;
end $$;

-- ---------- Opponents ----------
-- Renames a team in every game and season list. An existing name merges the two.
create or replace function public.rename_opponent(p_token uuid, p_old text, p_new text) returns void
language plpgsql security definer set search_path = '' as $$
declare nw text := trim(p_new); merge boolean;
begin
  perform private.require_admin(p_token);
  if nw = '' or nw = p_old then return; end if;
  merge := exists (select 1 from public.games where opp = nw) or exists (select 1 from public.season_opponents where name = nw);
  perform private.log(case when merge then format('Merged %s into %s', p_old, nw) else format('Renamed %s to %s', p_old, nw) end);
  update public.games set opp = nw where opp = p_old;
  delete from public.season_opponents o where o.name = p_old and exists (select 1 from public.season_opponents x where x.season = o.season and x.name = nw);
  update public.season_opponents set name = nw where name = p_old;
end $$;

-- ---------- Access ----------
revoke all on function private.snapshot(), private.log(text), private.restore(jsonb) from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array[
    'public.admin_history(uuid)', 'public.undo_last(uuid)', 'public.save_game(uuid, jsonb)',
    'public.set_season_opponents(uuid, text, text[], text)', 'public.set_current_season(uuid, text)', 'public.add_season(uuid)',
    'public.remove_season(uuid, text)', 'public.set_result(uuid, text, text)', 'public.edit_game(uuid, text, jsonb)',
    'public.delete_game(uuid, text)', 'public.save_player(uuid, jsonb)', 'public.merge_player(uuid, text, text)',
    'public.rename_opponent(uuid, text, text)']
  loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
