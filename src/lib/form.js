import { allGames, calc, perTxt } from './core.js';

// Hot and cold form, for the player page.
// Each game gets a form score, in standard deviations from the player's own usual game:
//   60% PER against their own average PER,
//   25% TS% against their own average TS% (games with fewer than 2 shots count as average),
//   15% where their PER ranked in the team that night (top = +1.5, bottom = -1.5).
// Their own average is their last 15 games up to that point (all of them until they have 15), so it follows how
// they're playing now, and a bench player's big night counts as much as a star's. Form is the last 3 games they
// played, weighted 50 / 30 / 20 (latest first), and fades 25% toward neutral for every team game they've missed since. Fewer than 3 games is always neutral.
export const WINDOW = 15, MIN_GAMES = 3, HOT = .3, FIRE = .75, MISS_FADE = .75;
const WEIGHTS = [.5, .3, .2];
// The levels from hottest to coldest, with the score each one needs.
export const LEVELS = { fire: 'On fire', heat: 'Heating up', neutral: 'Steady', cool: 'Cooling off', ice: 'Ice cold' };
export const levelOf = f => f >= FIRE ? 'fire' : f >= HOT ? 'heat' : f <= -FIRE ? 'ice' : f <= -HOT ? 'cool' : 'neutral';

const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a, floor) => { if (a.length < 2) return floor; const m = mean(a); return Math.max(floor, Math.sqrt(mean(a.map(x => (x - m) ** 2)))); };
const clip = v => Math.max(-2.5, Math.min(2.5, v));

// Every game the player played, oldest first, with their line and where their PER ranked that night (+1.5 to -1.5).
function lines(id, games) {
  return games.filter(g => g.rows[id]).map(g => {
    const s = calc(g.rows[id]), pers = Object.values(g.rows).map(c => calc(c).per), n = pers.length;
    const above = pers.filter(p => p > s.per + 1e-9).length, below = pers.filter(p => p < s.per - 1e-9).length;
    return { g, s, rank: n > 1 ? 1.5 * (below - above) / (n - 1) : 0 };
  });
}

// Each game's score, measured against the player's games up to and including the game at index `upto`.
function scorer(L, upto) {
  const base = L.slice(Math.max(0, upto + 1 - WINDOW), upto + 1), pers = base.map(l => l.s.per), shots = base.filter(l => l.s.tsa >= 2);
  const mPer = mean(pers), sPer = sd(pers, 5);
  const pts = shots.reduce((t, l) => t + l.s.pts, 0), tsa = shots.reduce((t, l) => t + l.s.tsa, 0);
  const mTs = tsa ? pts / (2 * tsa) : 0, sTs = sd(shots.map(l => l.s.ts), .12);
  return l => .6 * clip((l.s.per - mPer) / sPer) + .25 * (l.s.tsa >= 2 && tsa ? clip((l.s.ts - mTs) / sTs) : 0) + .15 * l.rank;
}
// Form as of the game at index `upto` (before any fading for missed games).
function formAt(L, upto) {
  if (upto + 1 < MIN_GAMES) return { f: 0, scores: [] };
  const sc = scorer(L, upto), scores = L.slice(upto - 2, upto + 1).reverse().map(sc);
  return { f: scores.reduce((t, v, i) => t + v * WEIGHTS[i], 0), scores, sc };
}
// How many games in a row (latest first) were hot (or cold), by the latest game's measure.
const run = (L, upto, sc, hot) => { let n = 0; for (let i = upto; i >= 0 && (hot ? sc(L[i]) >= HOT : sc(L[i]) <= -HOT); i--) n++; return n; };

const DAY = 864e5;
// A player's form now. Returns the level, the score, how long the hot or cold run is, and what changed last game:
// melt (a cold player's big game), sad (a hot player's bad game), best ('career' or 'season': their latest game was
// their best PER ever, or this season, and it was in the last week).
export function playerForm(id, games = allGames(), now = Date.now()) {
  const L = lines(id, games), i = L.length - 1;
  if (L.length < MIN_GAMES) return { level: 'neutral', f: 0, n: L.length, hot: 0, cold: 0, missed: 0, last: L.map(l => l.s.per).reverse(), few: true };
  const { f: raw, scores, sc } = formAt(L, i);
  const lastG = L[i].g, missed = games.length - 1 - games.indexOf(lastG);
  const f = raw * MISS_FADE ** missed, level = levelOf(f);
  const hot = run(L, i, sc, true), cold = run(L, i, sc, false);
  // What the last game changed, measured against how they stood the game before.
  const prev = formAt(L, i - 1), prevLevel = levelOf(prev.f), latest = scores[0];
  const prevHot = prev.sc ? run(L, i - 1, prev.sc, true) : 0;
  const melt = !missed && prev.f <= -HOT && latest >= FIRE;
  const sad = !missed && !melt && (prevLevel === 'fire' || (prevLevel === 'heat' && prevHot >= 2)) && latest <= -HOT;
  const recent = now - new Date(lastG.date + 'T12:00:00').getTime() <= 7 * DAY, beats = l => L[i].s.per > l.s.per;
  const season = L.filter(l => l.g.season === lastG.season);
  const best = !recent ? null : L.length > MIN_GAMES && L.slice(0, i).every(beats) ? 'career' : season.length >= MIN_GAMES && season.slice(0, -1).every(beats) ? 'season' : null;
  return { level, f, n: L.length, hot, cold, missed, melt, sad, best, latest, last: L.slice(-3).map(l => l.s.per).reverse(), lastPer: L[i].s.per };
}

// Which pet stands beside the player: a thundercloud for a week after a career or season best; a dragon when on fire (full after 4 hot games in a row, a baby before that), a
// living flame when heating up (bigger with each hot game in a row), a turtle when steady, a penguin when cooling off, a
// snowman when ice cold (growing with the cold run), a melting snowman after a comeback, or a sad dragon.
export function petOf(fm) {
  if (fm.best) return { kind: 'storm', size: fm.best === 'career' ? 2 : 1 };
  if (fm.melt) return { kind: 'melt' };
  if (fm.sad) return { kind: 'sad' };
  if (fm.level === 'fire') return { kind: 'dragon', size: fm.hot >= 4 ? 2 : 1 };
  if (fm.level === 'heat') return { kind: 'flame', size: Math.min(3, Math.max(1, fm.hot)) };
  if (fm.level === 'ice') return { kind: 'snowman', size: Math.min(3, Math.max(1, fm.cold)) };
  if (fm.level === 'cool') return { kind: 'penguin' };
  return { kind: 'turtle' };
}

// What a tap on the pet shows: a headline and a line of detail.
export function formReason(fm) {
  if (fm.few) return ['No form yet', `Shows after ${MIN_GAMES} games (${fm.n} so far)`];
  const last3 = `Last 3: ${fm.last.map(v => perTxt(v)).join(', ')} PER`;
  if (fm.melt) return ['Thawing out!', `${perTxt(fm.lastPer)} PER after a cold run`];
  if (fm.sad) return ["The flame's gone out", `${perTxt(fm.lastPer)} PER after a hot run`];
  if (fm.missed) return [`${LEVELS[fm.level]}, settling back`, `Missed ${fm.missed === 1 ? 'the last game' : `the last ${fm.missed} games`}. ${last3}`];
  const run = fm.level === 'fire' || fm.level === 'heat' ? fm.hot : fm.level === 'ice' || fm.level === 'cool' ? fm.cold : 0;
  const head = fm.best ? `${fm.best === 'career' ? 'Career' : 'Season'}-best ${perTxt(fm.lastPer)} PER!` : `${LEVELS[fm.level]}${run >= 2 ? `: ${run} ${fm.f > 0 ? 'hot' : 'cold'} games in a row` : ''}`;
  return [head, last3];
}
