import { calc, perfTags, f1 } from './core.js';

// Player of the game: 50% how far their PER stands out from the team that night, 50% how far it stands out from
// their own usual games. Both are measured in standard deviations, so the two halves count equally.
// With fewer than 5 earlier games, their usual is the team's usual (every player's PER in earlier games).
const MIN_PREV = 5;
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const sd = a => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };

export function playerOfGame(g, games) {
  const i = games.findIndex(x => x.id === g.id), before = games.slice(0, i);
  const team = before.flatMap(x => Object.values(x.rows).map(c => calc(c).per));
  const cands = Object.entries(g.rows).map(([id, c]) => ({ id, s: calc(c) }));
  const tonight = cands.map(c => c.s.per), gm = mean(tonight), gs = sd(tonight) || 1;
  const teamM = team.length ? mean(team) : gm, teamS = sd(team) || gs;
  for (const c of cands) {
    const prev = before.filter(x => x.rows[c.id]).map(x => calc(x.rows[c.id]).per), own = prev.length >= MIN_PREV;
    c.usual = own ? mean(prev) : teamM; c.prevN = prev.length; c.above = c.s.per - c.usual;
    c.score = 0.5 * (c.s.per - gm) / gs + 0.5 * c.above / ((own ? sd(prev) : teamS) || 1);
  }
  const best = cands.reduce((a, b) => b.score > a.score || (b.score === a.score && b.s.per > a.s.per) ? b : a);
  // Why they got it: any career or season highs, then how far above their usual they played.
  const LAB = { per: 'PER', pts: 'points', reb: 'rebounds', ast: 'assists', stl: 'steals', blk: 'blocks' };
  const tags = [];
  for (const k of ['per', 'pts', 'reb', 'ast', 'stl', 'blk']) for (const t of perfTags(g, best.id, k, games))
    if (t.t !== 'streak') tags.push({ t: t.t, label: `${t.label} ${LAB[k]}` });
  const why = best.prevN >= MIN_PREV && best.above >= 1 ? `${f1(best.above)} above their average PER` : null;
  return { ...best, tags: tags.slice(0, 2), why };
}
