-- Avatar builder. Run after 05. Safe to run again.

-- Saves a player's avatar. p_look is the look from the builder: colours and part numbers only.
create or replace function public.save_look(p_token uuid, p_id text, p_look jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare nm text;
begin
  perform private.require_admin(p_token);
  select name into nm from public.players where id = p_id;
  if nm is null then raise exception 'That player no longer exists'; end if;
  if jsonb_typeof(p_look) <> 'object' or octet_length(p_look::text) > 600 then raise exception 'That avatar can''t be saved'; end if;
  perform private.log(format('Changed %s''s avatar', nm));
  update public.players set look = p_look where id = p_id;
end $$;

revoke all on function public.save_look(uuid, text, jsonb) from public;
grant execute on function public.save_look(uuid, text, jsonb) to anon, authenticated;

-- Starting looks for the starters, based on the team's championship photo. A look someone has already changed is left alone.
update public.players p set look = v.new::jsonb
from (values
  ('hoang', '{"skin":"#d6a077","hair":"#1a1410","style":4}', '{"skin":"#d6a077","hair":"#1a1410","style":13,"mouth":1,"height":2,"weight":1}'),
  ('liu', '{"skin":"#f2c9a3","hair":"#1b1512","style":0}', '{"skin":"#f2c9a3","hair":"#1b1512","style":14,"eyes":1,"mouth":1,"height":2,"weight":1}'),
  ('yoon', '{"skin":"#efc49c","hair":"#16110e","style":1}', '{"skin":"#efc49c","hair":"#16110e","style":13,"eyes":1,"mouth":1,"weight":1}'),
  ('shan', '{"skin":"#dcaa80","hair":"#120e0c","style":2}', '{"skin":"#dcaa80","hair":"#120e0c","style":1,"mouth":1,"height":3}'),
  ('lim', '{"skin":"#f4d1ad","hair":"#2b1d15","style":2}', '{"skin":"#f4d1ad","hair":"#2b1d15","style":3,"eyes":1,"mouth":1}'),
  ('yao', '{"skin":"#e6b48a","hair":"#121010","style":1,"band":true}', '{"skin":"#e6b48a","hair":"#121010","style":2,"mouth":1,"glasses":2}'),
  ('lin', '{"skin":"#e9bd95","hair":"#0f0c0c","style":3}', '{"skin":"#e9bd95","hair":"#0f0c0c","style":15,"mouth":1}')
) as v(id, old, new)
where p.id = v.id and p.look = v.old::jsonb;
