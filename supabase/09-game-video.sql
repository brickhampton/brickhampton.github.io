-- A YouTube link for each game, set in Admin mode from the video button on the game page.
-- Games with no link show a muted "No video recording available" button. Safe to run again.

alter table public.games add column if not exists video text;

-- p_url: a YouTube link, or empty to remove it.
create or replace function public.set_video(p_token uuid, p_game text, p_url text) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.games; u text := nullif(trim(coalesce(p_url, '')), '');
begin
  perform private.require_admin(p_token);
  select * into g from public.games where id = p_game;
  if g.id is null then raise exception 'That game no longer exists'; end if;
  if u is not null and u !~* '^https://([a-z0-9-]+\.)*(youtube\.com|youtu\.be)/' then
    raise exception 'That doesn''t look like a YouTube link';
  end if;
  if u is not distinct from g.video then return; end if;
  perform private.log(format('%s video for %s Game %s vs %s',
    case when u is null then 'Removed the' when g.video is null then 'Added a' else 'Changed the' end, g.season, g.no, g.opp));
  update public.games set video = u where id = p_game;
end $$;

revoke all on function public.set_video(uuid, text, text) from public;
grant execute on function public.set_video(uuid, text, text) to anon, authenticated;
