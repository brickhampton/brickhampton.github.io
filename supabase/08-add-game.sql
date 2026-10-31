-- Adding a game with no stats from Admin -> Results: a date, opponent and result, but no box score.
-- It shows in Games as "No stats recorded" and stays out of every player total.
-- Stats can be added later with Edit game. Safe to run again.

-- p_game: season, no, date, opp, result (W, L, D or U), opp_pts (optional).
create or replace function public.add_game(p_token uuid, p_game jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare g jsonb := p_game; gid text; cur boolean;
begin
  perform private.require_admin(p_token);
  select is_current into cur from public.seasons where code = g->>'season';
  if cur is null then raise exception 'There is no season %', g->>'season'; end if;
  if coalesce((g->>'no')::int, 0) not between 1 and 40 then raise exception 'Pick a game number from 1 to 40'; end if;
  if (g->>'date')::date > current_date + 1 then raise exception 'Games can''t be in the future'; end if;
  if extract(isodow from (g->>'date')::date) <> 7 then raise exception 'Games are always on a Sunday'; end if;
  if coalesce(trim(g->>'opp'), '') = '' then raise exception 'Add the opponent'; end if;
  if coalesce(g->>'result', '') not in ('W', 'L', 'D', 'U') then raise exception 'Pick Win, Loss, Draw or Unknown'; end if;
  gid := (g->>'season') || '-' || (g->>'no');
  if exists (select 1 from public.games where id = gid or (season = g->>'season' and no = (g->>'no')::int)) then
    raise exception '% Game % already exists. Pick another game number.', g->>'season', g->>'no' using errcode = '23505';
  end if;
  perform private.log(format('Added %s Game %s vs %s (no stats)', g->>'season', g->>'no', trim(g->>'opp')));
  -- A game in the current season takes OREB and DREB if stats are added later; older seasons take total REB, like the history.
  insert into public.games (id, season, no, date, opp, result, opp_pts, recorded)
  values (gid, g->>'season', (g->>'no')::int, (g->>'date')::date, trim(g->>'opp'), g->>'result', nullif(g->>'opp_pts', '')::int, cur);
  return gid;
end $$;

revoke all on function public.add_game(uuid, jsonb) from public;
grant execute on function public.add_game(uuid, jsonb) to anon, authenticated;
