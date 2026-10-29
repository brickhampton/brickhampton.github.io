import { useEffect, useLayoutEffect, useRef } from 'react';
import { S, useStore, boot, set } from './lib/store.js';
import { allGames, statPlayers } from './lib/core.js';
import { go, fromHash, peekHash, openTab, openPlayer, POS, posKey } from './lib/nav.js';
import { reduced } from './lib/charts.js';
import { Gear, Shield, Plus } from './components/icons.jsx';
import { Skeleton, EmptyState } from './components/ui.jsx';
import { Home, heroH } from './screens/Home.jsx';
import { Games } from './screens/Games.jsx';
import { Game } from './screens/Game.jsx';
import { Stats } from './screens/Stats.jsx';
import { Player } from './screens/Player.jsx';
import { Settings } from './screens/Settings.jsx';
import { Setup } from './screens/Setup.jsx';
import { Entry } from './screens/Entry.jsx';
import { SheetRoot } from './components/Sheet.jsx';
import { recordGame } from './components/PinSheet.jsx';
import { isAdmin, lock, touch } from './lib/admin.js';

const $ = s => document.querySelector(s);
peekHash();

// The thin underline that slides under the current tab, sized to the words themselves.
function moveTabInd() {
  const bar = $('#appbar'), ind = bar?.querySelector('.tab-ind'); if (!ind) return;
  const b = document.body.dataset.scr === 'home' ? null : bar.querySelector('.tabs button[aria-current="true"]');
  if (!b || !b.offsetWidth) { ind.style.opacity = 0; return; }
  const first = !ind.dataset.placed;
  if (first) ind.style.transition = 'none';
  const rg = document.createRange(); rg.selectNodeContents(b); const t = rg.getBoundingClientRect(), br = bar.getBoundingClientRect();
  ind.style.opacity = 1; ind.style.width = t.width + 'px'; ind.style.transform = `translateX(${(t.left - br.left).toFixed(1)}px)`;
  if (first) { void ind.offsetWidth; ind.style.transition = ''; ind.dataset.placed = '1'; }
}

// Sections below the fold fade up as they scroll into view (only on arriving at a screen, never on re-renders).
// Anything that has scrolled past, even in one jump, is shown too.
let revealOff = null;
function reveal(root) {
  revealOff?.();
  const top = root.getBoundingClientRect().top, vh = root.clientHeight;
  let pending = [...root.querySelectorAll('.wrap > .sec, .wrap > .two, .wrap > .season-block')].filter(el => el.getBoundingClientRect().top - top > vh * .9);
  pending.forEach(el => el.classList.add('rv'));
  let raf = 0;
  const check = () => {
    raf = 0; const bottom = root.getBoundingClientRect().bottom - 30;
    pending = pending.filter(el => { if (!el.isConnected) return false; if (el.getBoundingClientRect().top < bottom) { el.classList.add('in'); return false; } return true; });
    if (!pending.length) revealOff();
  };
  const on = () => { if (!raf) raf = requestAnimationFrame(check); };
  root.addEventListener('scroll', on, { passive: true });
  revealOff = () => { root.removeEventListener('scroll', on); pending.forEach(el => el.classList.add('in')); pending = []; revealOff = null; };
}

// As you scroll down Home, the photo fades and drifts back; past halfway, the Games tab lights up.
function homeFade() {
  if (S.screen !== 'games') return;
  const y = $('#s-games').scrollTop, h = heroH() || 1, p = Math.min(1, y / (h * .75)), st = $('#home .hstage');
  if (st) { st.style.opacity = (1 - p).toFixed(3); st.style.transform = reduced ? '' : `translateY(${(Math.min(y, h) * .4).toFixed(1)}px) scale(${(1 - p * .06).toFixed(3)})`; }
  const top = y < h * .5;
  if (S.homeTop !== top) set({ homeTop: top });
}

// Swipe sideways between games, or between players (touch screens).
function swipeTo(scr, dir) {
  const inner = $('#s-' + scr).firstElementChild;
  let target = null;
  if (scr === 'game') { const games = allGames(), i = games.findIndex(g => g.id === S.gameId); target = games[i + dir] ? () => go('game', { gameId: games[i + dir].id, slide: dir }) : null; }
  else {
    const strip = statPlayers().filter(x => allGames().some(g => g.rows[x])), i = strip.indexOf(S.playerId);
    if (strip.length > 1) { const nx = strip[(i + dir + strip.length) % strip.length]; target = () => go('player', { playerId: nx, pScope: S.pScope, slide: dir }); }
  }
  if (!target) { if (!reduced) inner.animate([{ transform: 'none' }, { transform: `translateX(${-dir * 18}px)` }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' }); return; }
  if (reduced) return target();
  const out = inner.animate([{ transform: 'none', opacity: 1 }, { transform: `translateX(${-dir * 48}px)`, opacity: 0 }], { duration: 150, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
  // Cancel the held frame once the next page is in, or the new page stays invisible (the old iPhone blank-screen bug).
  out.finished.then(target).catch(() => {}).finally(() => out.cancel());
}

const Section = ({ id, cls, show, children }) => (
  <section className="screen pad-x" id={'s-' + id} hidden={!show}>{children ?? <div className={`wrap ${cls}`} id={cls} />}</section>
);

export default function App() {
  const s = useStore();
  const scr = s.screen;

  useEffect(() => {
    boot().then(() => { if (S.ready) fromHash({ fromHistory: true }); });
    const pop = () => S.ready && fromHash({ fromHistory: true });
    addEventListener('popstate', pop);
    // Avatars open the player's page on Games, a game page and Stats.
    const avClick = e => {
      const av = e.target.closest?.('[data-av]');
      if (!av || !['games', 'game', 'stats', 'player'].includes(S.screen) || av.closest('.panel, .p-strip')) return;
      e.preventDefault(); e.stopPropagation(); openPlayer(av.dataset.av);
    };
    addEventListener('click', avClick, true);
    // Any tap keeps Admin mode unlocked; 15 minutes without one locks it.
    const tap = () => touch();
    addEventListener('pointerdown', tap, true);
    const idle = setInterval(() => { if (S.adminToken && !isAdmin()) lock(); }, 30e3);
    const rz = () => moveTabInd();
    addEventListener('resize', rz);
    document.fonts?.ready.then(moveTabInd);
    // Decided while the finger is still moving: iOS cancels the touch (no touchend) once it starts scrolling.
    let sx = 0, sy = 0, ok = false;
    const skip = el => el.closest('.tbl-wrap, .chart, select, input, .chips, .p-strip, .tog, .sheet');
    const offs = ['game', 'player'].map(name => {
      const el = $('#s-' + name);
      const ts = e => { const t = e.touches[0]; ok = e.touches.length === 1 && !skip(e.target); sx = t.clientX; sy = t.clientY; };
      const tm = e => {
        if (!ok) return; const t = e.touches[0], dx = t.clientX - sx, dy = t.clientY - sy;
        if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)) { ok = false; return; }
        if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.5) { ok = false; swipeTo(name, dx < 0 ? 1 : -1); }
      };
      const te = () => { ok = false; };
      el.addEventListener('touchstart', ts, { passive: true }); el.addEventListener('touchmove', tm, { passive: true }); el.addEventListener('touchend', te, { passive: true });
      return () => { el.removeEventListener('touchstart', ts); el.removeEventListener('touchmove', tm); el.removeEventListener('touchend', te); };
    });
    let raf = 0;
    const gs = $('#s-games'), onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; homeFade(); }); };
    gs.addEventListener('scroll', onScroll, { passive: true });
    return () => { removeEventListener('popstate', pop); removeEventListener('click', avClick, true); removeEventListener('pointerdown', tap, true); clearInterval(idle); removeEventListener('resize', rz); offs.forEach(f => f()); gs.removeEventListener('scroll', onScroll); };
  }, []);

  // Which tab is lit: Home (top of Games) lights none.
  const bodyScr = scr === 'games' && s.homeTop ? 'home' : scr;
  useLayoutEffect(() => { document.body.dataset.scr = bodyScr; moveTabInd(); }, [bodyScr, s.ready]);

  // Arriving at a screen: restore its scroll position, then fade it in.
  const first = useRef(true);
  useLayoutEffect(() => {
    if (!s.ready) return;
    const el = $('#s-' + scr); if (!el) return;
    const d = S.slide;
    el.scrollTop = d || S.navTop ? 0 : scr === 'games' ? Math.max(POS[posKey(scr)] || 0, heroH()) : POS[posKey(scr)] || 0;
    homeFade(); moveTabInd();
    if (!reduced) {
      const wrap = el.querySelector(':scope > .wrap') || el.firstElementChild;
      if (!(first.current && scr === 'games')) wrap?.animate(d ? [{ opacity: 0, transform: `translateX(${d * 48}px)` }, { opacity: 1, transform: 'none' }] : [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: d ? 260 : 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
      reveal(el);
    }
    first.current = false;
  }, [s.nav, s.ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const tab = scr === 'game' ? 'games' : scr;
  const goHome = () => S.screen === 'games' ? $('#s-games').scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }) : go('games', { top: true });
  const onTab = t => {
    if (t === tab && !(t === 'games' && s.homeTop)) {
      if (S.screen === 'game') return go('games');
      return $('#s-' + S.screen).scrollTo({ top: S.screen === 'games' ? heroH() : 0, behavior: reduced ? 'auto' : 'smooth' });
    }
    if (t === 'games' && S.screen === 'games') return $('#s-games').scrollTo({ top: heroH(), behavior: reduced ? 'auto' : 'smooth' });
    openTab(t);
  };
  const body = (name, El, kind) => scr !== name ? null : s.error ? <EmptyState title="Couldn't load the stats" text="Check your connection, then pull down or reload to try again."><p className="foot">{s.error}</p></EmptyState> : s.ready ? <El /> : <Skeleton kind={kind} />;

  return (
    <div id="app">
      <header className="appbar pad-x" id="appbar" hidden={scr === 'setup' || scr === 'entry'}>
        <div className="wordmark home-link" id="go-home" role="link" tabIndex={0} aria-label="Brickhampton home" onClick={goHome}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goHome(); } }}>Brickhampton</div>
        <nav className="tabs" aria-label="Main">
          {[['games', 'Games'], ['stats', 'Stats'], ['player', 'Player']].map(([k, l]) => (
            <button key={k} data-tab={k} aria-current={bodyScr !== 'home' && tab === k} onClick={() => onTab(k)}>{l}</button>))}
        </nav>
        <span className="grow" />
        <button className="admintag" id="admintag" hidden={!isAdmin()} onClick={() => go('settings')}><Shield /><span className="nl">Admin</span></button>
        <button className="gear" id="open-settings" aria-label="Settings" aria-current={scr === 'settings'} onClick={() => go('settings')}><Gear /></button>
        <button className="btn primary" id="new-game" aria-label="Record a game" disabled={!s.ready} onClick={recordGame}><Plus /><span className="nl">Record a game</span></button>
        <span className="tab-ind" aria-hidden="true" />
      </header>

      <main style={{ minHeight: 0, display: 'grid', gridRow: 2 }}>
        <section className="screen pad-x" id="s-games" hidden={scr !== 'games'}>
          {s.ready && <Home />}
          <div className="wrap games" id="games">{body('games', Games, 'games')}</div>
        </section>
        <Section id="game" show={scr === 'game'}><div className="wrap summary" id="summary">{body('game', Game, 'games')}</div></Section>
        <Section id="stats" show={scr === 'stats'}><div className="wrap stats" id="stats">{body('stats', Stats, 'stats')}</div></Section>
        <Section id="player" show={scr === 'player'}><div className="wrap player" id="player">{body('player', Player, 'player')}</div></Section>
        <Section id="settings" show={scr === 'settings'}><div className="wrap settings" id="settings">{body('settings', Settings, 'games')}</div></Section>
        <Section id="setup" show={scr === 'setup'}>{s.ready && scr === 'setup' ? <Setup /> : <div />}</Section>
        <section className="screen" id="s-entry" hidden={scr !== 'entry'} style={{ overflow: 'hidden' }}>{s.ready && scr === 'entry' && <Entry />}</section>
      </main>
      <SheetRoot />
    </div>
  );
}
