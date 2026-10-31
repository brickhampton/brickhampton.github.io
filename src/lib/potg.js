import { calc, perfTags, f1 } from './core.js';

// Player of the game: the best PER in the game, nudged by how far it beats the player's own usual PER.
// score = PER + half of (PER − their average PER in earlier games). With fewer than 3 earlier games, their
// usual is taken as the team's average PER per player, so a sub's big day still counts but isn't over-rewarded.
const LIFT = 0.5, MIN_PREV = 3;

export function playerOfGame(g, games) {
  const i = games.findIndex(x => x.id === g.id), before = games.slice(0, i);
  const all = before.flatMap(x => Object.values(x.rows).map(c => calc(c).per));
  const teamAvg = all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0;
  const cands = Object.entries(g.rows).map(([id, c]) => {
    const s = calc(c), prev = before.filter(x => x.rows[id]).map(x => calc(x.rows[id]).per);
    const usual = prev.length >= MIN_PREV ? prev.reduce((a, b) => a + b, 0) / prev.length : teamAvg;
    return { id, s, usual, prevN: prev.length, above: s.per - usual, score: s.per + LIFT * (s.per - usual) };
  });
  const best = cands.reduce((a, b) => b.score > a.score || (b.score === a.score && b.s.per > a.s.per) ? b : a);
  // Why they got it: any career or season highs, then how far above their usual they played.
  const LAB = { per: 'PER', pts: 'points', reb: 'rebounds', ast: 'assists', stl: 'steals', blk: 'blocks' };
  const tags = [];
  for (const k of ['per', 'pts', 'reb', 'ast', 'stl', 'blk']) for (const t of perfTags(g, best.id, k, games))
    if (t.t !== 'streak') tags.push({ t: t.t, label: `${t.label} ${LAB[k]}` });
  const why = best.prevN >= MIN_PREV && best.above >= 1 ? `${f1(best.above)} above their average PER` : null;
  return { ...best, tags: tags.slice(0, 2), why };
}
