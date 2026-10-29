import { S, set } from './store.js';
import { P, allGames, statPlayers } from './core.js';

// Screens keep their scroll position, so switching tabs or going back never jumps to the top.
export const POS_SCREENS = ['games', 'game', 'stats', 'player'];
export const POS = {};
export const posKey = scr => scr === 'game' ? 'game:' + S.gameId : scr === 'player' ? 'player:' + S.playerId : scr === 'games' ? 'games:' + S.gSeason : scr;

// Each screen has its own address, so a game or player can be shared as a link and the browser's Back works.
const hashFor = () => S.screen === 'game' ? `#/game/${S.gameId}` : S.screen === 'player' ? `#/player/${S.playerId}`
  : S.screen === 'games' ? (S.navTop ? '#/' : '#/games') : `#/${S.screen}`;

export function go(screen, opts = {}) {
  const was = S.screen, el = document.getElementById('s-' + was);
  if (POS_SCREENS.includes(was) && el && !el.hidden) POS[posKey(was)] = el.scrollTop;
  const { fromHistory, slide = 0, ...rest } = opts;
  set({ ...rest, screen, navTop: !!opts.top, slide, nav: S.nav + 1, ...(screen === 'games' || screen === 'game' ? { gamesSub: screen } : {}) });
  const h = hashFor();
  if (!fromHistory && location.hash !== h && !(h === '#/' && !location.hash)) history.pushState(null, '', h);
}

export function openPlayer(id) {
  if (!P(id)) return;
  const from = S.screen === 'player' ? S.pFrom : S.screen;
  go('player', { playerId: id, pFrom: from || 'stats', pScope: null });
}

// Read the address bar: #/, #/games, #/game/S26-5, #/stats, #/player/lim, #/settings.
export function fromHash(opts = {}) {
  const [, scr, id] = (location.hash.replace(/^#\/?/, '/').split('/'));
  if (scr === 'game' && id && allGames().some(g => g.id === id)) return go('game', { gameId: id, ...opts });
  if (scr === 'player' && id && P(id)) return go('player', { playerId: id, pFrom: S.pFrom || 'stats', ...opts });
  if (scr === 'stats' || scr === 'settings') return go(scr, opts);
  if (scr === 'games') return go('games', opts);
  return go('games', { top: true, ...opts });
}

export const openTab = tab => {
  if (tab === 'games') return go(S.gamesSub === 'game' && S.gameId && allGames().some(g => g.id === S.gameId) ? 'game' : 'games');
  if (tab === 'player') return S.playerId && P(S.playerId) ? go('player', { pFrom: S.screen }) : openPlayer(statPlayers()[0]);
  go(tab);
};
