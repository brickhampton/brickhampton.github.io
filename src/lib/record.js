import { S, notify, reload, afterLoad } from './store.js';
import { lastNo, isStarter, P } from './core.js';
import { adminCall, isAdmin } from './admin.js';
import { go } from './nav.js';
import { randomLook, lookOf } from './avatar.js';

// The game being recorded. Every tap is kept in this browser straight away,
// so it survives the connection dropping or the tab closing. It goes to the database on Save.
const KEY = 'bh-rec-v1';
export const ACTIONS = [
  { k: '2M', key: '2PT', sub: 'Made', cls: 'make', label: '2PT made', pts: 2 },
  { k: '2X', key: '2PT', sub: 'Missed', cls: 'miss', label: '2PT missed' },
  { k: '3M', key: '3PT', sub: 'Made', cls: 'make', label: '3PT made', pts: 3 },
  { k: '3X', key: '3PT', sub: 'Missed', cls: 'miss', label: '3PT missed' },
  { k: 'FM', key: 'FT', sub: 'Made', cls: 'make', label: 'Free throw made', pts: 1 },
  { k: 'FX', key: 'FT', sub: 'Missed', cls: 'miss', label: 'Free throw missed' },
  { k: 'OR', key: 'OREB', sub: 'Offensive rebound', cls: 'other', label: 'Offensive rebound' },
  { k: 'DR', key: 'DREB', sub: 'Defensive rebound', cls: 'other', label: 'Defensive rebound' },
  { k: 'AS', key: 'AST', sub: 'Assist', cls: 'other', label: 'Assist' },
  { k: 'ST', key: 'STL', sub: 'Steal', cls: 'other', label: 'Steal' },
  { k: 'BK', key: 'BLK', sub: 'Block', cls: 'other', label: 'Block' },
  { k: 'TO', key: 'TO', sub: 'Turnover', cls: 'other to', label: 'Turnover' },
];
export const A = Object.fromEntries(ACTIONS.map(a => [a.k, a]));

export const todayIso = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };

let R = null;
try { R = JSON.parse(localStorage.getItem(KEY)); } catch (e) { R = null; }
export const rec = () => R;
const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(R)); } catch (e) { /* ignore */ } notify(); };
export const change = fn => { fn(R); keep(); };

// A fresh game: the next number in the current season, today's date and the first opponent.
export function startSetup() {
  if (R) { restoreSubs(); return; }
  const season = S.current;
  R = {
    game: { season, no: lastNo(season) + 1, date: todayIso(), opp: (S.opps[season] || [])[0] || '' },
    order: S.roster.map(p => p.id), playing: null, nums: null, newSubs: [], todaySubs: [],
    events: [], seq: 0, sel: null, result: null,
  };
  // Starters play by default, in jersey order unless the order was changed.
  S.roster.forEach(p => { if (!R.order.includes(p.id)) R.order.push(p.id); });
  R.playing = R.order.slice();
  keep();
}
export const hasRecording = () => !!(R && R.events.length);
export const clearRecording = () => { R = null; try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } notify(); };

// Players for the game being set up: starters in playing order, then today's subs.
export const setupPlayers = () => [...R.order.map(P).filter(Boolean), ...R.todaySubs.map(P).filter(Boolean)];
export const syncPlaying = () => { R.playing = setupPlayers().map(p => p.id).filter(id => R.playing.includes(id)); };

// A brand-new sub. They join the subs list (saved with the game) but not today's game until picked.
export function newSub(name, rawNum) {
  const p = { id: 'p' + Date.now().toString(36), name, num: /^\d{1,2}$/.test(rawNum) ? String(parseInt(rawNum, 10)) : '0', guest: true, ...randomLook() };
  S.subs = [...S.subs, p];
  change(r => { r.newSubs.push(p); });
  return p;
}
export function addSubs(ids) {
  change(r => { for (const id of ids) if (!r.todaySubs.includes(id)) { r.todaySubs.push(id); r.playing.push(id); } syncPlaying(); });
}
// Subs added for this game also live in the browser until it's saved, so they survive a reload.
export function restoreSubs() {
  if (!R) return;
  for (const p of R.newSubs || []) if (!S.subs.some(x => x.id === p.id)) S.subs = [...S.subs, p];
}
afterLoad.push(restoreSubs);

// A sub's number in this game: their own if it's free, else 0, then 00, then a random free number.
export function subNumbers() {
  const taken = new Set(S.roster.map(p => String(p.num))), out = {}; let k = 0;
  for (const id of R.playing) if (!isStarter(id)) {
    const own = P(id)?.num;
    let n = own && own !== '0' && !taken.has(String(own)) ? String(own) : ['0', '00'][k++];
    while (!n || taken.has(n)) n = String(1 + Math.floor(Math.random() * 98));
    taken.add(n); out[id] = n;
  }
  return out;
}

export function countsFor(pid, events) {
  const c = { m2: 0, a2: 0, m3: 0, a3: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, to: 0 };
  for (const e of events) if (e.pid === pid) {
    switch (e.a) {
      case '2M': c.m2++; c.a2++; break; case '2X': c.a2++; break;
      case '3M': c.m3++; c.a3++; break; case '3X': c.a3++; break;
      case 'FM': c.ftm++; c.fta++; break; case 'FX': c.fta++; break;
      case 'OR': c.oreb++; break; case 'DR': c.dreb++; break;
      case 'AS': c.ast++; break; case 'ST': c.stl++; break; case 'BK': c.blk++; break; case 'TO': c.to++; break;
    }
  }
  return c;
}
export const livePts = () => R.events.reduce((t, e) => t + (A[e.a].pts || 0), 0);

// Saves the game to the database. On success the recording is cleared and the new game's id returned.
export async function saveGame() {
  const nums = R.nums || subNumbers();
  const used = new Set(R.playing);
  const id = await adminCall('save_game', {
    p_game: {
      ...R.game, result: R.result,
      new_players: R.newSubs.filter(p => used.has(p.id)).map(p => ({ id: p.id, name: p.name, num: p.num, look: lookOf(p) })),
      lines: R.playing.map(pid => ({ player_id: pid, num: nums[pid] ?? null, ...countsFor(pid, R.events) })),
    },
  });
  clearRecording();
  await reload().catch(() => {});
  return id;
}

// Record a game: needs Admin. Picks up an unfinished game if there is one.
export function openRecord(askPin) {
  if (!isAdmin()) return askPin(() => openRecord(askPin));
  startSetup();
  go(hasRecording() ? 'entry' : 'setup');
}
