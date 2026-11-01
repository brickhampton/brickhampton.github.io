import { S } from './store.js';

/* ================= seasons and games ================= */
export const seasonList = () => S.seasons.map(code => ({ code }));
export const seasonName = c => (c[0] === 'W' ? 'Winter ' : 'Summer ') + '20' + c.slice(1);
export const hasStats = g => Object.keys(g.rows).length > 0;

// Games in the order they were played: season by season, then by game number.
// (The sheet has a few mistyped dates, so the game number is the safer order.)
let agCache = null, agFor = null, agSeasons = null;
export function allGames() {
  if (agFor === S.games && agSeasons === S.seasons) return agCache;
  const order = S.seasons.slice().reverse();
  agCache = S.games.filter(hasStats).sort((a, b) => order.indexOf(a.season) - order.indexOf(b.season) || a.no - b.no);
  agFor = S.games; agSeasons = S.seasons;
  return agCache;
}
// Four games in the sheet have no stats at all. They show in the Games list but stay out of every total.
export const emptyGames = () => S.games.filter(g => !hasStats(g));
export const lastNo = season => Math.max(0, ...S.games.filter(g => g.season === season).map(g => g.no));
export const teamPts = g => Object.values(g.rows).reduce((t, c) => t + 2 * c.m2 + 3 * c.m3 + c.ftm, 0);

export const P = id => S.roster.find(p => p.id === id) || S.subs.find(p => p.id === id);
export const isStarter = id => S.roster.some(p => p.id === id);
// The Stats page covers the starting players only. Subs still count in team totals.
export const statPlayers = () => S.roster.map(p => p.id);

// A sub's number for one game: 0, then 00, then a random number no starter wears.
const subNumCache = new WeakMap();
function subNums(g) {
  let out = subNumCache.get(g);
  if (out) return out;
  const taken = new Set(S.roster.map(p => String(p.num))); out = {};
  let seed = [...g.id].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619), 2166136261), k = 0;
  for (const id of Object.keys(g.rows)) if (!isStarter(id)) {
    const own = S.subs.find(p => p.id === id)?.num;
    let n = own && own !== '0' && !taken.has(String(own)) ? String(own) : ['0', '00'][k++];
    while (!n || taken.has(n)) { seed = Math.imul(seed ^ seed >>> 13, 1274126177); n = String(1 + ((seed >>> 0) % 98)); }
    taken.add(n); out[id] = n;
  }
  subNumCache.set(g, out);
  return out;
}
export const numIn = (g, id) => g.nums?.[id] ?? subNums(g)[id];

/* ================= stats ================= */
// PER uses Geoff's current formula for every game, old or new (2026-10-29).
// Games with OREB/DREB count 1 per offensive and 0.5 per defensive rebound; older games count 0.75 per rebound.
export function calc(c) {
  const pts = 2 * c.m2 + 3 * c.m3 + c.ftm;
  const split = c.reb === undefined || (c.split === true && c.oreb != null);
  const reb = split ? c.oreb + c.dreb : c.reb;
  const fgm = c.m2 + c.m3, fga = c.a2 + c.a3;
  const tsa = fga + 0.44 * c.fta;
  const per = c._per ?? pts + (split ? c.oreb + 0.5 * c.dreb : 0.75 * reb) + 1.5 * c.ast + 1.5 * c.stl + 1.5 * c.blk - (c.a2 - c.m2) - (c.a3 - c.m3) - (c.fta - c.ftm) - c.to;
  return { ...c, pts, reb, split, oreb: split ? c.oreb : null, dreb: split ? c.dreb : null, fgm, fga, tsa, ts: tsa ? pts / (2 * tsa) : null, per };
}
const SUMK = ['m2', 'a2', 'm3', 'a3', 'ftm', 'fta', 'ast', 'stl', 'blk', 'to'];
export function sumRows(list) {
  const c = Object.fromEntries(SUMK.map(k => [k, 0])); c.reb = 0;
  c._per = 0;
  for (const r of list) { SUMK.forEach(k => c[k] += r[k]); c.reb += r.reb === undefined ? r.oreb + r.dreb : r.reb; c._per += calc(r).per; }
  // Each game's own PER is added up, so totals mixing old (REB) and new (OREB/DREB) games stay right.
  return calc(c);
}
export const ratio = (m, a) => a ? m / a : null;
export const pctTxt = v => v === null || v === undefined ? '–' : Math.round(v * 100) + '%';
export const perTxt = (v, dec) => { const r = dec ? Math.round(v * 10) / 10 : Math.round(v), t = dec ? Math.abs(r).toFixed(1) : Math.abs(r); return r > 0 ? '+' + t : r < 0 ? '−' + t : (dec ? '0.0' : '0'); };
export const perCls = v => v >= 15 ? 'p-great' : v >= 8 ? 'p-good' : v < 0 ? 'p-poor' : 'p-mid';
export const f1 = v => (Math.round(v * 10) / 10).toFixed(1);
// Good and poor bands for shooting, tuned to a social league.
const BANDS = { fg: [.30, .45], m2: [.35, .50], m3: [.25, .35], ft: [.50, .70], ts: [.40, .50] };
export const tier = (k, v, a) => v === null || (a !== undefined && a < 2) ? '' : v >= BANDS[k][1] ? 't-good' : v < BANDS[k][0] ? 't-poor' : '';
export const fmtDate = (d, opts = { day: 'numeric', month: 'long', year: 'numeric' }) => new Date(d + 'T12:00:00').toLocaleDateString('en-AU', opts);
export const RES = { W: 'Win', L: 'Loss', D: 'Draw', U: 'Result unknown' };
export const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
export const ORD = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');

export function playerAgg(games, id) {
  const list = games.filter(g => g.rows[id]).map(g => g.rows[id]);
  if (!list.length) return null;
  const s = sumRows(list); const gp = list.length;
  return { id, gp, s, pg: k => s[k] / gp };
}
export const topPer = g => Object.entries(g.rows).map(([id, c]) => ({ id, s: calc(c) })).reduce((a, b) => b.s.per > a.s.per ? b : a);
// One stat from a box score line (or summed lines), including shooting percentages.
export const lineVal = (s, k) => k === 'ts' ? s.ts : k === 'fg' ? ratio(s.fgm, s.fga) : k === 'p2' ? ratio(s.m2, s.a2) : k === 'p3' ? ratio(s.m3, s.a3) : k === 'ft' ? ratio(s.ftm, s.fta) : s[k];

/* ================= highs, streaks and team achievements ================= */
// Career highs per player and game, worked out by walking every game in order.
let TAGS = null, TAGS_FOR = null;
export function buildTags() {
  const games = allGames();
  if (TAGS && TAGS_FOR === games) return TAGS;
  const byGame = {}, best = {}, gp = {};
  for (const g of games) for (const [id, c] of Object.entries(g.rows)) {
    const s = calc(c), b = (best[id] ||= {}), tags = [];
    // Career highs count once a player has 5 games behind them.
    for (const [k, l] of [['pts', 'PTS'], ['reb', 'REB'], ['ast', 'AST'], ['per', 'PER']]) {
      if ((gp[id] || 0) >= 5 && s[k] > 0 && s[k] > b[k]) tags.push({ type: 'high', text: `Career-high ${k === 'per' ? f1(s.per) : s[k]} ${l}` });
      b[k] = Math.max(b[k] ?? -Infinity, s[k]);
    }
    gp[id] = (gp[id] || 0) + 1;
    if (tags.length) (byGame[g.id] ||= {})[id] = tags;
  }
  TAGS_FOR = games; return TAGS = { byGame };
}

// Tags for a top-performance box: a new career or season high in that stat, or leading the team in it game after game.
export function perfTags(g, id, k, games) {
  const i = games.findIndex(x => x.id === g.id), v = calc(g.rows[id])[k];
  const prev = games.slice(0, i).filter(x => x.rows[id]), prevSeason = prev.filter(x => x.season === g.season);
  const tags = [];
  if (v > 0 && prev.length >= 5 && v > Math.max(...prev.map(x => calc(x.rows[id])[k]))) tags.push(['high', 'trophy', 'Career high']);
  else if (v > 0 && prevSeason.length >= 3 && v > Math.max(...prevSeason.map(x => calc(x.rows[id])[k]))) tags.push(['season', 'trophy', 'Season high']);
  let n = 1;
  for (let j = i - 1; j >= 0; j--) {
    const r = games[j].rows; if (!r[id]) break; const top = Math.max(...Object.values(r).map(c => calc(c)[k]));
    if (top > 0 && calc(r[id])[k] === top) n++; else break;
  }
  if (n >= 2) tags.push(['streak', 'flame', `${n} in a row`, `Led the team in this ${n} games in a row`]);
  return tags.map(([t, icon, label, title]) => ({ t, icon, label, title: title || label }));
}

// The team's standout for one game, or nothing. 50 points beats everything else.
export function teamFeat(g, games) {
  const i = games.findIndex(x => x.id === g.id), before = games.slice(0, i), seasonBefore = before.filter(x => x.season === g.season);
  const t = sumRows(Object.values(g.rows)), pts = t.pts;
  if (pts >= 50) return ['burger', 'burger', '50 burger!'];
  if (before.length >= 10 && pts > Math.max(...before.map(teamPts))) return ['gold', 'trophy', 'Most points ever'];
  if (seasonBefore.length >= 3 && pts > Math.max(...seasonBefore.map(teamPts))) return ['gold', 'trophy', 'Season high points'];
  if (g.result === 'W') { let n = 1; for (let j = i - 1; j >= 0 && games[j].result === 'W'; j--) n++; if (n >= 3) return ['streak', 'flame', `${n}-game win streak`]; }
  if (seasonBefore.length >= 3) {
    const st = seasonBefore.map(x => sumRows(Object.values(x.rows)));
    for (const [k, l, low] of [['reb', 'Season high rebounds'], ['ast', 'Season high assists'], ['stl', 'Season high steals'], ['blk', 'Season high blocks'], ['ts', 'Best shooting of the season'], ['to', 'Fewest turnovers of the season', true]]) {
      const v = t[k] ?? 0, others = st.map(x => x[k] ?? 0);
      if (low ? v < Math.min(...others) : v > Math.max(...others)) return ['gold', 'trophy', l];
    }
  }
  return null;
}

/* ================= badges ================= */
// Player badges for their latest season and recent games. Nothing about stat totals.
// asOf looks at things as they stood at the end of that season.
// Badge thresholds: round numbers this team can reach (see player-badges.md).
const BT = { lock: 15, auto: .6, autoA: 10, stl: 2, blk: 1, snipe: 3, eff: .5, effA: 20, p3: .35, p3A: 15, ft: .6, ftA: 5, steady: 10, rise: 3.5, sak: 3 };
export function playerBadges(id, asOf, noTie) {
  const order = seasonList().map(x => x.code), games = asOf ? allGames().filter(g => order.indexOf(g.season) >= order.indexOf(asOf)) : allGames(), mine = games.filter(g => g.rows[id]);
  if (!mine.length || (asOf && !mine.some(g => g.season === asOf))) return [];
  const season = asOf || (mine.some(g => g.season === S.current) ? S.current : mine[mine.length - 1].season), nm = season;
  const sg = games.filter(g => g.season === season), a = playerAgg(sg, id), starter = isStarter(id);
  const peers = statPlayers().map(x => playerAgg(sg, x)).filter(x => x && x.gp >= Math.min(3, a.gp));
  // Team-best badges: nobody can beat them. On a tie it goes to the tied player with the fewest other badges,
  // or to all of them if they have the same number (Geoff, 2026-11-01). noTie counts badges without breaking ties.
  const lead = (list, me, f, low) => {
    if (list.some(x => x.id !== id && (low ? f(x) < f(me) : f(x) > f(me)))) return false;
    const tied = [...new Set([id, ...list.filter(x => f(x) === f(me)).map(x => x.id)])];
    if (tied.length === 1) return true;
    if (noTie) return false;
    const n = tied.map(x => playerBadges(x, season, true).length);
    return n[0] === Math.min(...n);
  };
  const best = (f, low) => starter && peers.length > 2 && a.gp >= 3 && lead(peers, a, f, low);
  const lines = mine.map(g => calc(g.rows[id])), last = n => lines.slice(-n), out = [];
  const add = (key, name, icon, tone, desc) => out.push({ key, name, icon, tone, desc });
  const l3 = last(3), t3 = sumRows(l3), l5 = last(5);
  if (l3.length === 3 && l3.every(s => s.per >= BT.lock)) add('heater', 'LOCKED IN', 'zap', 'hot', `${BT.lock}+ PER in each of their last 3 games.`);
  if (l3.length === 3 && t3.tsa >= BT.autoA && t3.ts >= BT.auto) add('hot', 'Automatic', 'flame', 'hot', `${pctTxt(t3.ts)} true shooting over their last 3 games.`);
  if (best(x => x.pg('pts'))) add('pts', 'Bucket getter', 'ball', 'blue', `Most points a game in ${nm} (${f1(a.pg('pts'))}).`);
  // BAM!: the most points in one game this season, among the starters who played in it.
  const bamOf = x => Math.max(...sg.filter(g => g.rows[x]).map(g => calc(g.rows[x]).pts)), bamPeers = statPlayers().filter(x => sg.some(g => g.rows[x])).map(x => ({ id: x, v: bamOf(x) }));
  const bam = bamOf(id);
  if (starter && bam > 0 && bamPeers.length > 2 && lead(bamPeers, { id, v: bam }, x => x.v)) add('bam', 'BAM!', 'boom', 'hot', `Most points in a game in ${nm} (${bam}).`);
  if (best(x => x.pg('reb'))) add('reb', 'Glass cleaner', 'up', 'blue', `Most rebounds a game in ${nm} (${f1(a.pg('reb'))}).`);
  // Offensive rebounds are only recorded in newer games, so only those games count, and a season without any gives no badge.
  const orAgg = x => { const l = sg.filter(g => g.rows[x] && g.rows[x].oreb !== undefined).map(g => g.rows[x].oreb); return { id: x, gp: l.length, pg: l.reduce((t, v) => t + v, 0) / (l.length || 1) }; };
  // Until the season has 3 games with OREB, a player needs every one of them.
  const orGames = sg.filter(g => Object.values(g.rows).some(r => r.oreb !== undefined)).length, orMin = Math.min(3, orGames);
  const oa = orAgg(id), oPeers = statPlayers().map(orAgg).filter(x => x.gp >= Math.min(orMin, oa.gp));
  if (starter && orMin > 0 && oa.gp >= orMin && oa.pg > 0 && oPeers.length > 2 && lead(oPeers, oa, x => x.pg)) add('oreb', 'Crash out', 'bull', 'blue', `Most offensive rebounds a game in ${nm} (${f1(oa.pg)}).`);
  if (best(x => x.pg('ast'))) add('ast', 'Assistaholic', 'pass', 'blue', `Most assists a game in ${nm} (${f1(a.pg('ast'))}).`);
  const def = x => (x.s.stl + x.s.blk) / x.gp;
  if (starter && a.gp >= 3 && (def(a) >= 3 || best(def))) add('def', 'Clamps', 'shield', 'green', `${f1(def(a))} steals and blocks a game in ${nm}${best(def) ? ', the most on the team' : ''}.`);
  const hasDef = out.some(b => b.key === 'def');
  if (!hasDef && a.gp >= 3 && a.pg('stl') >= BT.stl) add('stl', 'Cookiesss', 'cookie', 'green', `${f1(a.pg('stl'))} steals a game in ${nm}.`);
  if (!hasDef && a.gp >= 3 && a.pg('blk') >= BT.blk) add('blk', 'Not in my house!', 'shield', 'green', `${f1(a.pg('blk'))} blocks a game in ${nm}.`);
  const snipe = l5.filter(s => s.m3 >= BT.snipe).length; if (snipe) add('snipe', 'Sniper', 'target', 'gold', `${snipe === 1 ? 'A game' : snipe + ' games'} with ${BT.snipe}+ threes in their last ${l5.length}.`);
  if (a.s.tsa >= BT.effA && a.s.ts >= BT.eff) add('eff', 'Clinical', 'check', 'gold', `${pctTxt(a.s.ts)} true shooting in ${nm}.`);
  const seasons = seasonList().map(x => x.code), prevS = seasons.slice(seasons.indexOf(season) + 1).find(c => mine.some(g => g.season === c));
  const pa = prevS && playerAgg(games.filter(g => g.season === prevS), id);
  if (pa && pa.gp >= 3 && a.gp >= 3 && a.pg('per') - pa.pg('per') >= BT.rise) add('rise', 'Let him cook', 'flame', 'hot', `${f1(a.pg('per'))} PER a game in ${nm}, up from ${f1(pa.pg('per'))} in ${prevS}.`);
  const p3 = ratio(a.s.m3, a.s.a3); if (a.s.a3 >= BT.p3A && p3 >= BT.p3) add('3', 'Green bean', 'target', 'gold', `${pctTxt(p3)} from three in ${nm} (${a.s.m3} of ${a.s.a3}).`);
  const ft = ratio(a.s.ftm, a.s.fta); if (a.s.fta >= BT.ftA && ft >= BT.ft) add('ft', 'Philanthropist', 'money', 'gold', `${pctTxt(ft)} at the free throw line in ${nm} (${a.s.ftm} of ${a.s.fta}).`);
  if (best(x => x.pg('fta')) && a.s.fta > 0) add('fta', 'Ref\'s best friend', 'whistle', 'blue', `Most free throw attempts a game in ${nm} (${f1(a.pg('fta'))}).`);
  const dd = sg.filter(g => g.rows[id]).map(g => calc(g.rows[id])).filter(s => [s.pts, s.reb, s.ast, s.stl, s.blk].filter(v => v >= 10).length >= 2).length;
  if (dd >= 2) add('dd', 'Double-double machine', 'layers', 'blue', `${dd} double-doubles in ${nm}.`);
  const sak = sg.filter(g => g.rows[id]).map(g => calc(g.rows[id])).filter(s => s.pts >= 1 && s.reb >= 1 && s.ast >= 1 && s.stl >= 1).length;
  if (sak >= BT.sak) add('sak', 'Swiss army knife', 'knife', 'blue', `${sak} games in ${nm} with at least a point, a rebound, an assist and a steal.`);
  if (best(x => x.pg('to'), true) && a.gp >= 5) add('safe', 'Safe hands', 'lock', 'green', `Fewest turnovers a game in ${nm} (${f1(a.pg('to'))}).`);
  if (best(x => x.pg('to')) && a.gp >= 5) add('butter', 'Butter fingers', 'butter', 'red', `Most turnovers a game in ${nm} (${f1(a.pg('to'))}).`);
  if (best(x => x.pg('tsa'), true)) add('unselfish', 'Unselfish', 'pass', 'blue', `Fewest shot attempts a game in ${nm} (${f1(a.pg('tsa'))} true shooting attempts).`);
  if (best(x => x.pg('tsa'))) add('chuck', 'Possession ends here', 'ball', 'red', `Most shot attempts a game in ${nm} (${f1(a.pg('tsa'))} true shooting attempts).`);
  if (l5.length === 5 && l5.every(s => s.per >= BT.steady)) add('steady', 'Mr Consistent', 'check', 'green', `${BT.steady}+ PER in each of their last 5 games.`);
  if (sg.length >= 5 && a.gp === sg.length) add('ever', 'Ol\' reliable', 'iron', 'grey', `Played all ${sg.length} games in ${nm}.`);
  return asOf ? out : out.slice(0, 6);
}
