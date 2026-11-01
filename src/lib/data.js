import { createClient } from '@supabase/supabase-js';

// The stats database. The publishable key only allows reading; every change goes through
// database functions that need an Admin session, and only the PIN opens one.
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://iwwmtturlbxebaiagscc.supabase.co';
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_RVq88Qby-XtccIL-JUwWUw_w5OiMjzC';
export const db = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// The last data this browser loaded, so the site opens instantly and still works on a bad connection.
const CACHE_KEY = 'bh-data-v1';
export function cachedData() {
  try { const d = JSON.parse(localStorage.getItem(CACHE_KEY)); return d?.games?.length ? d : null; } catch (e) { return null; }
}

const COUNTS = ['m2', 'a2', 'm3', 'a3', 'ftm', 'fta', 'ast', 'stl', 'blk', 'to'];
const player = p => ({ id: p.id, name: p.name, num: p.role === 'starter' ? +p.num : p.num, guest: p.role === 'sub', ...p.look });

// Shapes the rest of the app uses:
//   roster: starters in jersey order, subs: everyone else,
//   games: [{id, season, no, date, opp, result, oppPts, recorded, video, rows: {playerId: counts}, nums: {playerId: sub number}}],
//   seasons: season codes newest first, current: the current season, opps: {season: [opponents in list order]}.
export async function loadData() {
  const [seasons, players, opps, games] = await Promise.all([
    db.from('seasons').select('code, sort, is_current').order('sort', { ascending: false }),
    db.from('players').select('id, name, num, role, look, created_at').order('created_at').order('id'),
    db.from('season_opponents').select('season, name, pos').order('season').order('pos'),
    // '*' so the site keeps working before 09-game-video.sql adds the video column.
    db.from('games').select('*, lines(*)').order('season').order('no'),
  ]);
  // The supporter's outfit and camera (10-supporter.sql). Before that runs she keeps her defaults.
  const site = await db.from('site').select('key, value').then(r => r, () => ({ data: null }));
  const err = [seasons, players, opps, games].find(r => r.error)?.error;
  if (err) throw new Error(err.message);
  const data = {
    seasons: seasons.data.map(s => s.code),
    supporter: site.data?.find(r => r.key === 'supporter')?.value || null,
    current: seasons.data.find(s => s.is_current)?.code || seasons.data[0]?.code,
    roster: players.data.filter(p => p.role === 'starter').map(player).sort((a, b) => a.num - b.num),
    subs: players.data.filter(p => p.role === 'sub').map(player),
    opps: opps.data.reduce((o, r) => ((o[r.season] ||= []).push(r.name), o), {}),
    games: games.data.map(g => {
      const lines = g.lines.slice().sort((a, b) => a.pos - b.pos);
      return {
        id: g.id, season: g.season, no: g.no, date: g.date, opp: g.opp, result: g.result, oppPts: g.opp_pts, recorded: g.recorded, video: g.video || null,
        rows: Object.fromEntries(lines.map(l => [l.player_id, {
          ...Object.fromEntries(COUNTS.map(k => [k, l[k]])),
          ...(l.reb === null ? { oreb: l.oreb, dreb: l.dreb } : { reb: l.reb }),
        }])),
        nums: Object.fromEntries(lines.filter(l => l.num !== null).map(l => [l.player_id, l.num])),
      };
    }),
  };
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) { /* storage full or blocked */ }
  return data;
}
