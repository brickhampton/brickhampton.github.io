import { useSyncExternalStore } from 'react';
import { loadData, cachedData } from './data.js';

// One shared state object for the whole app, in the same shape the mockup used.
// Team data (games, players, seasons, opponents) comes from the data layer.
// View choices (picked season, sort, chart stat) are remembered in this browser only.
const UI_KEY = 'bh-ui-v1';
const UI_KEYS = ['gSeason', 'sSeason', 'gOpen', 'rsort', 'box', 'gtStat', 'tbStat', 'trend', 'tStat', 'h2h',
  'pStat', 'pTotals', 'pCmp', 'pSc', 'pLogAll'];

const freshUi = () => ({
  gSeason: null, sSeason: null, gOpen: {}, rsort: null, box: null, gtStat: 'pts', tbStat: 'pts',
  trend: null, tStat: 'per', h2h: null, pStat: 'per', pTotals: false, pCmp: null, pSc: null, pLogAll: false,
});

export const S = {
  ready: false, error: null,
  // team data
  roster: [], subs: [], games: [], seasons: [], current: null, opps: {},
  // navigation
  screen: 'games', gamesSub: 'games', gameId: null, playerId: null, pFrom: null, pScope: null, homeTop: true, navTop: true, slide: 0, nav: 0,
  ...freshUi(),
};

try { Object.assign(S, JSON.parse(localStorage.getItem(UI_KEY)) || {}); } catch (e) { /* private mode or blocked storage */ }

let version = 0;
const listeners = new Set();
export const notify = () => { version++; listeners.forEach(l => l()); };
export const save = () => {
  try { localStorage.setItem(UI_KEY, JSON.stringify(Object.fromEntries(UI_KEYS.map(k => [k, S[k]])))); } catch (e) { /* ignore */ }
};
// Change state, remember view choices and re-render.
export function set(patch) { Object.assign(S, typeof patch === 'function' ? patch(S) : patch); save(); notify(); }

const subscribe = l => { listeners.add(l); return () => listeners.delete(l); };
export function useStore() { useSyncExternalStore(subscribe, () => version); return S; }

// Fill in view choices that depend on the data.
function fit() {
  const codes = S.seasons;
  if (!S.gSeason || (S.gSeason !== 'ALL' && !codes.includes(S.gSeason))) S.gSeason = S.current;
  if (!S.sSeason || (S.sSeason !== 'ALL' && !codes.includes(S.sSeason))) S.sSeason = S.current;
  if (!Array.isArray(S.trend)) S.trend = S.roster.map(p => p.id);
  if (!Array.isArray(S.h2h)) S.h2h = S.roster.slice(0, 2).map(p => p.id);
}

// Opens straight away on the last data this browser saw, then swaps in the latest from the database.
// Resolves once there is something to show.
export function boot() {
  const cached = cachedData();
  if (cached) { Object.assign(S, cached, { ready: true }); fit(); notify(); }
  const fresh = loadData().then(d => { Object.assign(S, d, { ready: true, error: null, offline: false }); fit(); notify(); })
    .catch(e => { if (S.ready) S.offline = true; else S.error = e?.message || String(e); notify(); });
  return cached ? Promise.resolve() : fresh;
}

// Loads the latest games again, for example after a change is saved.
export const reload = () => loadData().then(d => { Object.assign(S, d, { offline: false }); fit(); notify(); });
