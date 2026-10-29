-- Recording a game. Run after 01 to 03. Both functions need an Admin session.

-- Saves a recorded game in one go: any subs added for it, the game and its box score.
-- A game that already exists is never overwritten (editing history is Admin's job).
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

-- Replaces a season's opponent list (the order it shows when recording a game).
create or replace function public.set_season_opponents(p_token uuid, p_season text, p_names text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin(p_token);
  delete from public.season_opponents where season = p_season;
  insert into public.season_opponents (season, name, pos)
  select p_season, trim(n), min(o) from unnest(p_names) with ordinality as t(n, o)
  where trim(n) <> '' group by trim(n);
end $$;

revoke all on function public.save_game(uuid, jsonb), public.set_season_opponents(uuid, text, text[]) from public;
grant execute on function public.save_game(uuid, jsonb), public.set_season_opponents(uuid, text, text[]) to anon, authenticated;
