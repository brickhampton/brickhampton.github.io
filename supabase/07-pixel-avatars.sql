-- Pixel avatars. Run after 06 (or on its own: it works whether or not 06 has been run). Safe to run again.
-- Gives the starters the pixel looks Geoff approved, based on the team's championship photo.
-- A look someone has already changed in the builder is left alone: only the original placeholder look,
-- or the starting look from 06, is replaced. Any other saved look still draws, converted to the nearest pixel parts.

update public.players p set look = v.new::jsonb
from (values
  ('hoang', '{"skin":"#d6a077","hair":"#1a1410","style":4}', '{"skin":"#d6a077","hair":"#1a1410","style":13,"mouth":1,"height":2,"weight":1}', '{"v":2,"skin":"#e2ad84","hair":"#1a1410","style":5,"height":2}'),
  ('liu', '{"skin":"#f2c9a3","hair":"#1b1512","style":0}', '{"skin":"#f2c9a3","hair":"#1b1512","style":14,"eyes":1,"mouth":1,"height":2,"weight":1}', '{"v":2,"skin":"#f2c9a3","hair":"#1b1512","style":3,"height":2}'),
  ('yoon', '{"skin":"#efc49c","hair":"#16110e","style":1}', '{"skin":"#efc49c","hair":"#16110e","style":13,"eyes":1,"mouth":1,"weight":1}', '{"v":2,"skin":"#efc49c","hair":"#16110e","style":5,"shoe":"#ee6018"}'),
  ('shan', '{"skin":"#dcaa80","hair":"#120e0c","style":2}', '{"skin":"#dcaa80","hair":"#120e0c","style":1,"mouth":1,"height":3}', '{"v":2,"skin":"#dcaa80","hair":"#120e0c","height":3,"weight":1,"muscle":1,"wrist":"#eeeeee","shoe":"#c0392b"}'),
  ('lim', '{"skin":"#f4d1ad","hair":"#2b1d15","style":2}', '{"skin":"#f4d1ad","hair":"#2b1d15","style":3,"eyes":1,"mouth":1}', '{"v":2,"skin":"#f4d1ad","hair":"#2b1d15","style":4,"height":1,"stripe":"#2f55d4"}'),
  ('yao', '{"skin":"#e6b48a","hair":"#121010","style":1,"band":true}', '{"skin":"#e6b48a","hair":"#121010","style":2,"mouth":1,"glasses":2}', '{"v":2,"skin":"#e6b48a","hair":"#121010","style":6,"glasses":1,"shoe":"#1b1b1b"}'),
  ('lin', '{"skin":"#e9bd95","hair":"#0f0c0c","style":3}', '{"skin":"#e9bd95","hair":"#0f0c0c","style":15,"mouth":1}', '{"v":2,"skin":"#e9bd95","hair":"#0f0c0c","style":7,"socks":1,"shoe":"#e9b949"}')
) as v(id, placeholder, cartoon, new)
where p.id = v.id and (p.look = v.placeholder::jsonb or p.look = v.cartoon::jsonb);
