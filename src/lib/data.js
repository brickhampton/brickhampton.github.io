import { PLAYERS, GUESTS, HIST, BASE_SEASONS } from '../data/seed.js';

// The data layer. For now everything comes from the imported master sheet.
// Phase 2 swaps this for the Supabase database, keeping the same shapes:
//   roster: starters in jersey order, subs: everyone else,
//   games: [{id, season, no, date, opp, result, oppPts, rows: {playerId: counts}}],
//   seasons: season codes newest first, current: the current season, opps: {season: [opponents in list order]}.
const HK = ['m2', 'a2', 'm3', 'a3', 'ftm', 'fta', 'reb', 'ast', 'stl', 'blk', 'to'];

export async function loadData() {
  const games = HIST.map(([season, no, date, opp, r]) => ({
    id: `${season}-${no}`, season, no, date, opp, result: 'U', oppPts: null,
    rows: Object.fromEntries(Object.entries(r).map(([id, v]) => [id, Object.fromEntries(HK.map((k, i) => [k, v[i]]))])),
  }));
  const opps = {};
  games.forEach(g => { const l = opps[g.season] ||= []; if (!l.includes(g.opp)) l.push(g.opp); });
  return {
    roster: PLAYERS.slice().sort((a, b) => a.num - b.num).map(p => ({ ...p })),
    subs: GUESTS.map(p => ({ ...p })),
    games,
    seasons: BASE_SEASONS.slice(),
    current: 'S26',
    opps,
  };
}
