import { calc, perfTags, f1, perTxt, P } from './core.js';

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

// The reason, in plain words, for the Game page: where they stood tonight, what they led, and how it compares with their usual.
export function potgReason(potg, g, games) {
  const name = id => P(id)?.name || 'a sub';
  const rows = Object.entries(g.rows).map(([id, c]) => ({ id, s: calc(c) })), me = potg.s;
  const others = rows.filter(r => r.id !== potg.id).sort((a, b) => b.s.per - a.s.per), next = others[0];
  const out = [];
  if (!next) out.push(`The only player recorded tonight, with a ${perTxt(me.per, true)} PER.`);
  else if (me.per >= next.s.per) {
    const gap = me.per - next.s.per;
    out.push(gap < .5 ? `Best PER on the team tonight (${perTxt(me.per, true)}), just ahead of ${name(next.id)}.` : `Best PER on the team tonight (${perTxt(me.per, true)}), ${f1(gap)} clear of ${name(next.id)}.`);
  } else out.push(`${name(next.id)} had the top PER (${perTxt(next.s.per, true)}), but this was the bigger step up on a usual game.`);
  // What they led the team in (ties count, as long as it's more than nothing).
  const LED = [['pts', 'points'], ['reb', 'rebounds'], ['ast', 'assists'], ['stl', 'steals'], ['blk', 'blocks']]
    .filter(([k]) => me[k] > 0 && others.every(r => r.s[k] <= me[k])).map(([, l]) => l);
  if (LED.length) out.push(`Led the team in ${LED.length > 1 ? LED.slice(0, -1).join(', ') + ' and ' + LED.at(-1) : LED[0]}.`);
  if (potg.prevN >= MIN_PREV) {
    out.push(potg.above >= .5 ? `That's ${f1(potg.above)} above their average PER of ${perTxt(potg.usual, true)}.` : potg.above > -.5 ? `Right around their usual game, which was still the best of the night.` : `Not their best night by their own standards, but the team's standout.`);
  } else out.push(`Only ${potg.prevN ? `${potg.prevN} earlier game${potg.prevN === 1 ? '' : 's'}` : 'their first game'}, so it's measured against the team's usual game.`);
  // Highs, grouped: "a season high in PER", "season highs in PER and rebounds", or one of each.
  const by = {};
  for (const t of potg.tags) { const m = t.label.match(/^(Career|Season) high (.*)$/); if (m) (by[m[1].toLowerCase()] ||= []).push(m[2]); }
  const hi = Object.entries(by).map(([k, l]) => l.length > 1 ? `${k} highs in ${l.join(' and ')}` : `a ${k} high in ${l[0]}`);
  if (hi.length) out.push(`Also ${hi.join(' and ')}.`);
  return out.join(' ');
}

// The same reason in a few words, for the Game page: "Top PER by 6.5, and 6.4 above their average."
export function potgShort(potg, g) {
  const others = Object.entries(g.rows).filter(([id]) => id !== potg.id).map(([, c]) => calc(c).per), next = others.length ? Math.max(...others) : null;
  const first = next === null ? 'Only player recorded' : potg.s.per >= next ? (potg.s.per - next < .5 ? 'Top PER, just' : `Top PER by ${f1(potg.s.per - next)}`) : 'Biggest step up on their usual game';
  const hi = potg.tags[0]?.label.replace(/^(Career|Season) high/, (_, a) => `${a.toLowerCase()} high`);
  const second = potg.prevN >= MIN_PREV && potg.above >= .5 ? `${f1(potg.above)} above their average` : hi ? `a ${hi}` : null;
  return `${first}${second ? ', and ' + second : ''}.`;
}
