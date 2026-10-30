import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { reload } from '../lib/store.js';
import { P, calc, sumRows, perTxt, fmtDate, esc, lastNo } from '../lib/core.js';
import { rec, change, countsFor, livePts, ACTIONS, A, saveGame, clearRecording } from '../lib/record.js';
import { reduced } from '../lib/charts.js';
import { go } from '../lib/nav.js';
import { Avatar, figure } from '../components/Avatar.jsx';
import { BALL, BALL_C } from '../lib/avatar.js';
import { BoxScore } from '../components/BoxScore.jsx';
import { openSheet, closeSheet } from '../components/Sheet.jsx';
import { PinSheet } from '../components/PinSheet.jsx';

const $ = s => document.querySelector(s);
const UndoIcon = ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>;
const Trash = ({ lid = true }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><g className="lid"><path d="M3 6h18" /><path d="M8 6V4h8v2" /></g><path d="M19 6l-1 14H6L5 6" />{lid && <path d="M10 11v6M14 11v6" />}</svg>;

/* ================= Court stage: the selected player acts out each action ================= */
// Ported as-is from the mockup: plain SVG and Web Animations, so a tap never waits for an animation.
const NS = 'http://www.w3.org/2000/svg';
const RX = 542, RY = 64, FLOOR = 168, SC = .78;
const SPOT = { '2M': 330, '2X': 330, '3M': 120, '3X': 120, 'FM': 400, 'FX': 400, 'OR': 470, 'DR': 450, 'AS': 150, 'ST': 300, 'BK': 470, 'TO': 300 };
const HAND_Y = FLOOR - 104 * SC + 22; // just above the head
const D = 140; // let the player get to their spot before the ball moves
// The ball and hoop are drawn in the same flat pixel style as the players (3 screen units to a pixel).
const PX = 3, BALL_D = BALL.map(([o, w], j) => `M${o} ${j}h${w}v1h${-w}z`).join('');
const NET = Array.from({ length: 8 }, (_, j) => Array.from({ length: 12 - j }, (_, i) => (i + j) % 2 ? '' : `M${542 - (12 - j) * 2 + i * 4} ${73 + j * 4}h3v3h-3z`).join('')).join('');
const MATE = { v: 2, skin: '#d9b48e', hair: '#2e2e33', style: 14 };
// The crowd behind the courtside boards: two rows of little pixel fans, in muted colours so the player stays the focus.
const CROWD = (() => {
  const SK = ['#b48a68', '#c99c76', '#8f6a4f', '#d4ab86'], HR = ['#1a1412', '#2b211b', '#3a3330'], TOP = ['#3a4466', '#5a3434', '#44523f', '#4b4458', '#2f55d4', '#6b5a3a'];
  const out = [];
  // The stage is often wider than the court drawing, so the stands run on past both edges of it.
  for (let row = 0; row < 2; row++) for (let i = 0; i < 44; i++) {
    const n = row * 44 + i, x = i * 22 - 400 + (row ? 11 : 0) + ((n * 7) % 5), y = row ? 118 : 106;
    if (x > 556 && x < 640) continue; // leave room for the hoop
    out.push({ i: n, x, y: y + ((n * 3) % 4), skin: SK[n % 4], hair: HR[(n * 5) % 3], top: TOP[(n * 7) % 6], d: ((n * 37) % 100) / 100 * .3, h: 2 + ((n * 13) % 10) / 5 });
  }
  return out;
})();

function makeStage() {
  const fx = $('#fx'), net = $('#net'), rim = $('#rim'), actorWrap = $('#actor-wrap');
  let actorX = 300, actor = null;
  function placeActor(sel, instant, x = actorX) {
    if (!sel) { actorWrap.innerHTML = ''; actor = null; return; }
    if (!actor || actor.dataset.id !== sel) {
      actorWrap.innerHTML = `<g class="actor alive" data-id="${esc(sel)}"><ellipse cx="0" cy="${FLOOR}" rx="26" ry="5" fill="#000" opacity=".35"/><g class="body">${figure(P(sel), { stage: true, pose: 'down' })}</g></g>`;
      actor = actorWrap.firstElementChild; instant = true;
    }
    const body = actor.querySelector('.body'), shadow = actor.querySelector('ellipse');
    const tf = xx => `translate(${xx - 50 * SC}px, ${FLOOR - 104 * SC}px) scale(${SC})`;
    if (instant || reduced) { body.style.transform = tf(x); shadow.style.transform = `translateX(${x}px)`; }
    else {
      body.animate([{ transform: tf(actorX) }, { transform: tf(x) }], { duration: 170, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
      shadow.animate([{ transform: `translateX(${actorX}px)` }, { transform: `translateX(${x}px)` }], { duration: 170, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
    }
    actorX = x;
  }
  function actorMood(mood, delay = 0) {
    setTimeout(() => { if (!actor) return; const b = actor.querySelector('.body'); b.classList.remove('celebrate', 'slump'); void b.getBBox(); b.classList.add(mood); }, delay);
  }
  // The player strikes a pose for the action (arm up on a shot, both hands up for a rebound), then relaxes.
  function actorPose(pose, delay, ms) {
    const id = actor?.dataset.id; if (!id) return;
    setTimeout(() => {
      if (!actor || actor.dataset.id !== id) return;
      const body = actor.querySelector('.body'); body.innerHTML = figure(P(id), { stage: true, pose });
      clearTimeout(actor._pose);
      actor._pose = setTimeout(() => { if (actor?.dataset.id === id) actor.querySelector('.body').innerHTML = figure(P(id), { stage: true, pose: 'down' }); }, ms);
    }, delay);
  }
  // The crowd jumps up with their arms in the air on a good play.
  function cheer(delay, big) {
    setTimeout(() => {
      const c = $('#crowd'); if (!c) return;
      c.classList.remove('cheer', 'big'); void c.getBBox(); c.classList.add('cheer'); if (big) c.classList.add('big');
      clearTimeout(c._t); c._t = setTimeout(() => c.classList.remove('cheer', 'big'), big ? 1700 : 1200);
    }, delay);
  }
  function mk(tag, attrs, parent = fx) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; }
  function ball(fill = BALL_C) {
    const g = mk('g', {});
    mk('path', { d: BALL_D, fill: fill === '#ee6018' ? BALL_C : fill, transform: `translate(${-3.5 * PX} ${-3 * PX}) scale(${PX})`, 'shape-rendering': 'crispEdges' }, g);
    setTimeout(() => g.remove(), 2400);
    return g;
  }
  function arc(x0, y0, x1, y1, h, n = 14, spin = 300, r0 = 0) {
    const pts = [];
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - 4 * h * t * (1 - t), r0 + spin * t]); }
    return pts;
  }
  const tf = p => ({ transform: `translate(${p[0]}px,${p[1]}px)`, opacity: p[3] ?? 1 });
  const fly = (el, pts, duration, easing = 'linear', delay = 0) => el.animate(pts.map(tf), { duration, easing, delay, fill: 'both' });
  const then = (anim, fn) => { anim.finished.then(fn).catch(() => {}); };
  const ripple = () => net.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(.82,1.32)' }, { transform: 'scale(1.04,.94)' }, { transform: 'scale(1,1)' }], { duration: 340, easing: 'ease-out' });
  const shake = () => rim.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-3px)' }, { transform: 'translateY(2px)' }, { transform: 'translateY(0)' }], { duration: 240 });
  function pop(text, x, y, color = '#ee6018', size = 26) {
    const t = mk('text', { x: 0, y: 0, 'text-anchor': 'middle', 'font-family': 'Geist, system-ui, sans-serif', 'font-weight': 600, 'font-size': size, fill: color });
    t.textContent = text;
    t.animate([{ transform: `translate(${x}px,${y + 8}px)`, opacity: 0 }, { transform: `translate(${x}px,${y}px)`, opacity: 1, offset: .25 }, { transform: `translate(${x}px,${y - 18}px)`, opacity: 0 }], { duration: 700, easing: 'ease-out', fill: 'forwards' });
    setTimeout(() => t.remove(), 800);
  }
  function burst(x, y, color = '#ee6018') {
    const g = mk('g', { transform: `translate(${x} ${y})` });
    for (let i = 0; i < 2; i++) {
      const c = mk('circle', { r: 8, fill: 'none', stroke: color, 'stroke-width': 2 }, g);
      c.animate([{ transform: 'scale(1)', opacity: .9 }, { transform: `scale(${5 + i * 2})`, opacity: 0 }], { duration: 520, delay: i * 90, easing: 'ease-out', fill: 'forwards' });
    }
    setTimeout(() => g.remove(), 800);
  }
  function streaks(x, y, dir = 1) {
    const g = mk('g', { transform: `translate(${x} ${y})` });
    [-8, 0, 8].forEach((dy, i) => {
      const l = mk('line', { x1: 0, y1: dy, x2: -30 * dir, y2: dy, stroke: '#b8b3b0', 'stroke-width': 2, 'stroke-linecap': 'round' }, g);
      l.animate([{ opacity: 0, transform: 'translateX(0)' }, { opacity: .8, offset: .3 }, { opacity: 0, transform: `translateX(${-24 * dir}px)` }], { duration: 360, delay: i * 30, fill: 'forwards' });
    });
    setTimeout(() => g.remove(), 600);
  }
  function shot(x0, h, d, made) {
    const b = ball();
    const tx = made ? RX : RX - 20, ty = made ? RY - 2 : RY - 4;
    then(fly(b, arc(x0, HAND_Y, tx, ty, h), d, 'linear', D), () => {
      if (made) { ripple(); then(fly(b, [[RX, RY - 2, 300], [RX, 96, 330], [RX - 4, FLOOR - 14, 360, 0]], 300, 'ease-in'), () => b.remove()); }
      else { shake(); then(fly(b, arc(RX - 20, RY - 4, RX - 130, FLOOR, 60, 10, -200, 300).map((p, i, arr) => [...p, i === arr.length - 1 ? 0 : 1]), 440, 'ease-in'), () => b.remove()); }
    });
  }
  function play(sel, k) {
    placeActor(sel, false, SPOT[k]);
    if (reduced) return;
    const pose = { '2M': ['shoot', 0, D + 380], '2X': ['shoot', 0, D + 380], '3M': ['shoot', 0, D + 480], '3X': ['shoot', 0, D + 480], 'FM': ['shoot', 0, D + 340], 'FX': ['shoot', 0, D + 340],
      'OR': ['catch', 200, 700], 'DR': ['catch', 200, 700], 'AS': ['pass', D - 40, 520], 'ST': ['pass', 300, 520], 'BK': ['block', 0, 760] }[k];
    if (pose) actorPose(...pose);
    const cheers = { '2M': D + 360, '3M': D + 460, 'FM': D + 320, 'AS': D + 580, 'ST': 330, 'BK': 280, 'OR': 300, 'DR': 300 };
    if (k in cheers) cheer(cheers[k], k === '3M');
    switch (k) {
      case '2M': actorMood('celebrate', D); shot(SPOT[k], 80, 360, true); setTimeout(() => pop('+2', RX, 40), D + 360); break;
      case '2X': actorMood('celebrate', D); shot(SPOT[k], 80, 360, false); actorMood('slump', D + 420); break;
      case '3M': actorMood('celebrate', D); shot(SPOT[k], 125, 460, true); setTimeout(() => { burst(RX, RY + 6); pop('+3', RX, 36, '#ee6018', 32); }, D + 460); break;
      case '3X': actorMood('celebrate', D); shot(SPOT[k], 125, 460, false); actorMood('slump', D + 520); break;
      case 'FM': shot(SPOT[k], 50, 320, true); actorMood('celebrate', D + 320); setTimeout(() => pop('+1', RX, 40), D + 320); break;
      case 'FX': shot(SPOT[k], 50, 320, false); actorMood('slump', D + 360); break;
      case 'OR': case 'DR': { // the ball comes off the rim into the player's hands
        const x = SPOT[k], b = ball(); shake(); actorMood('celebrate', 150);
        then(fly(b, arc(RX - 14, RY, x, HAND_Y - 8, 36, 10, -160), 300, 'ease-in'), () => {
          if (k === 'OR') then(fly(b, [[x, HAND_Y - 8, -160], [x, HAND_Y + 14, -160], [x + 10, HAND_Y - 30, -60], [x + 16, HAND_Y - 40, 0, 0]], 420, 'ease-out', 80), () => b.remove());
          else { streaks(x - 30, HAND_Y, -1); then(fly(b, [[x, HAND_Y - 8, -160], [x - 200, HAND_Y - 20, -420], [40, HAND_Y, -700, 0]], 420, 'cubic-bezier(.5,0,.7,1)', 100), () => b.remove()); }
        });
        setTimeout(() => pop(k === 'OR' ? 'OREB' : 'DREB', x, 34, '#eeeeee', 18), 250); break;
      }
      case 'AS': { // the player threads a pass to a teammate who finishes
        const x = SPOT[k];
        const mate = mk('g', {}); mate.innerHTML = `<g transform="translate(${440 - 50 * SC} ${FLOOR - 104 * SC}) scale(${SC})">${figure({ ...MATE, num: '' }, { stage: true, pose: 'catch' })}</g>`;
        mate.animate([{ opacity: 0 }, { opacity: .9, offset: .2 }, { opacity: .9, offset: .8 }, { opacity: 0 }], { duration: 900, fill: 'forwards' }); setTimeout(() => mate.remove(), 950);
        const trail = mk('path', { d: `M${x + 20} ${HAND_Y + 10} Q300 ${HAND_Y - 20} 430 ${HAND_Y + 30}`, stroke: '#ee6018', 'stroke-width': 2, fill: 'none', 'stroke-dasharray': '3 7', 'stroke-linecap': 'round' });
        trail.animate([{ opacity: 0 }, { opacity: .9, offset: .3 }, { opacity: 0 }], { duration: 700, fill: 'forwards' }); setTimeout(() => trail.remove(), 750);
        const b = ball(); actorMood('celebrate', D);
        then(fly(b, arc(x + 20, HAND_Y + 10, 430, HAND_Y + 30, 28, 10, 420), 320, 'ease-out', D), () => then(fly(b, arc(430, HAND_Y + 30, RX, RY - 2, 45, 8, 200, 420), 260), () => { ripple(); then(fly(b, [[RX, RY - 2], [RX, 110, 0, 0]], 220, 'ease-in'), () => b.remove()); }));
        setTimeout(() => pop('Dime', 300, 40, '#eeeeee', 18), 160); break;
      }
      case 'ST': { // an opponent's dribble gets picked off and the player races the other way
        const x = SPOT[k], b = ball('#ee6018');
        const a = fly(b, [[600, FLOOR - 30, 0], [540, FLOOR - 14, -90], [480, FLOOR - 30, -180], [420, FLOOR - 14, -270], [x + 20, FLOOR - 40, -330], [x - 60, FLOOR - 30, -400], [20, FLOOR - 24, -700, 0]], 620, 'linear');
        actorMood('celebrate', 330); setTimeout(() => streaks(x - 20, FLOOR - 40, -1), 380);
        then(a, () => b.remove()); setTimeout(() => pop('Steal', x, 40, '#eeeeee', 18), 320); break;
      }
      case 'BK': { // an opponent's shot goes up and the player swats it
        const b = ball(); actorMood('celebrate', 140);
        then(fly(b, arc(300, FLOOR - 30, SPOT.BK, HAND_Y - 26, 40, 8, 180), 280, 'ease-out'), () => {
          burst(SPOT.BK, HAND_Y - 26, '#eeeeee');
          then(fly(b, [[SPOT.BK, HAND_Y - 26, 180], [340, FLOOR - 4, -200], [220, FLOOR - 30, -420], [150, FLOOR - 6, -560, 0]], 480, 'cubic-bezier(.2,.7,.4,1)'), () => b.remove());
        });
        setTimeout(() => pop('Rejected', SPOT.BK, 34, '#eeeeee', 18), 280); break;
      }
      case 'TO': { // the ball squirts away out of bounds
        const x = SPOT[k], b = ball('#8a8380'); actorMood('slump', 220);
        then(fly(b, [[x + 20, FLOOR - 30, 0], [x + 60, FLOOR - 14, 40], [x + 110, FLOOR - 34, 90], [x + 170, FLOOR - 14, 140], [x + 240, FLOOR - 60, 260], [560, FLOOR - 110, 420], [680, FLOOR - 130, 560, 0]], 640, 'linear', D), () => b.remove());
        setTimeout(() => pop('Turnover', x + 120, 40, '#e3826f', 18), 300); break;
      }
    }
  }
  return { placeActor, play };
}

/* ================= End game ================= */
function EndGame() {
  const R = rec();
  const [result, setResult] = useState(R.result);
  const [step, setStep] = useState('end');
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const pick = r => { setResult(r); change(x => { x.result = r; }); };
  const save = async () => {
    setBusy(true); setErr('');
    try { const id = await saveGame(); closeSheet(); go('game', { gameId: id, top: true }); }
    catch (e) {
      setBusy(false);
      if (e.locked) { openSheet(<PinSheet why="Admin mode locked itself. Enter the PIN to save this game." onDone={() => openSheet(<EndGame />)} />); return; }
      if (/already has stats/.test(e.message)) {
        // Someone saved this game number first: move this one to the next free number.
        await reload().catch(() => {});
        const { season, no } = rec().game, next = lastNo(season) + 1;
        change(r => { r.game.no = Math.max(next, no + 1); });
        setErr(`${season} Game ${no} is already saved, so this one is now Game ${rec().game.no}. Tap Save game again.`);
        return;
      }
      setErr(`Couldn't save: ${e.message}. Everything you recorded is kept on this device, so try again.`);
    }
  };
  if (step === 'discard') {
    const n = R.events.length;
    return <>
      <h2>Discard this game?</h2><p className="sheet-sub">{n ? `${n === 1 ? 'The 1 stat' : `All ${n} stats`} recorded against ${R.game.opp} will be deleted.` : `Nothing has been recorded against ${R.game.opp} yet.`} This can't be undone.</p>
      <div className="actions"><button className="btn ghost" id="back" onClick={() => setStep('end')}>Go back</button>
        <button className="btn danger" id="confirm-discard" onClick={() => { clearRecording(); closeSheet(); go('games'); }}><Trash lid={false} />Discard game</button></div>
    </>;
  }
  return <>
    <h2>End game</h2><p className="sheet-sub">Brickhampton scored {livePts()} against {R.game.opp}. How did it go?</p>
    <div className="seg" id="res">{[['W', 'Win'], ['L', 'Loss'], ['D', 'Draw']].map(([k, l]) => <button key={k} data-r={k} aria-pressed={result === k} onClick={() => pick(k)}>{l}</button>)}</div>
    {err && <p className="ferr">{err}</p>}
    <div className="actions end-actions"><button className="iconbtn danger" id="discard" type="button" aria-label="Discard this game" title="Discard this game" onClick={() => setStep('discard')}><Trash /></button>
      <span className="grow" /><button className="btn ghost" id="keep" onClick={closeSheet}>Keep recording</button>
      <button className="btn primary" id="save" disabled={!result || busy} onClick={save}>{busy ? 'Saving…' : 'Save game'}</button></div>
  </>;
}

/* ================= The recording screen ================= */
const lineOf = s => <><span>{s.pts} <i>PTS</i></span><span>{s.reb} <i>REB</i></span><span>{s.ast} <i>AST</i></span><span>{perTxt(s.per)} <i>PER</i></span></>;

export function Entry() {
  const R = rec();
  const stage = useRef(null), score = useRef(null), shown = useRef(null), stripPrev = useRef({}), toastT = useRef(0);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  const caption = (name, act, delta, idle) => {
    const c = $('#cap'); if (!c) return;
    $('#cap-n').textContent = name || ' '; $('#cap-a').textContent = act; $('#cap-d').textContent = delta;
    c.classList.toggle('idle', !!idle); c.classList.remove('go'); void c.offsetWidth; c.classList.add('go');
  };
  useLayoutEffect(() => {
    if (!R) return;
    stage.current = makeStage(); stage.current.placeActor(R.sel, true);
    if (R.sel) caption(P(R.sel)?.name, 'On court', '', true);
    shown.current = livePts(); if (score.current) score.current.textContent = shown.current;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // The score ticks up to its new value.
  useEffect(() => {
    if (!R || !score.current) return;
    const target = livePts(), el = score.current, from = shown.current ?? target; shown.current = target;
    if (reduced || from === target) { el.textContent = target; return; }
    const t0 = performance.now();
    const step = t => { const k = Math.min(1, (t - t0) / 320); el.textContent = Math.round(from + (target - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
  useEffect(() => () => clearTimeout(toastT.current), []);
  if (!R) return null;

  const select = id => {
    change(r => { r.sel = r.sel === id ? null : id; });
    stage.current?.placeActor(rec().sel, true);
    if (rec().sel) caption(P(id).name, 'On court', '', true); else caption('Ready', 'Select a player, then an action', '', true);
  };
  const deselect = () => { if (!rec().sel) return; select(rec().sel); };
  const hideToast = () => { clearTimeout(toastT.current); setToast(t => t && { ...t, show: false }); };
  const record = (k, ev) => {
    const btn = ev.currentTarget, r = btn.getBoundingClientRect(), rip = document.createElement('span');
    rip.className = 'rip'; rip.style.left = (ev.clientX ? ev.clientX - r.left : r.width / 2) + 'px'; rip.style.top = (ev.clientY ? ev.clientY - r.top : r.height / 2) + 'px';
    btn.appendChild(rip); setTimeout(() => rip.remove(), 500);
    const sel = rec().sel;
    if (!sel) { const pl = $('#plist'); pl.classList.remove('nudge'); void pl.offsetWidth; pl.classList.add('nudge'); caption('', 'Pick a player first', '', true); return; }
    const a = A[k], e = { id: rec().seq + 1, pid: sel, a: k };
    change(x => { x.seq = e.id; x.events.push(e); });
    const row = $(`.prow[data-id="${sel}"]`);
    if (row) {
      row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash');
      const mood = (a.pts || ['BK', 'ST', 'AS', 'OR', 'DR'].includes(k)) ? 'celebrate' : 'slump';
      const av = row.querySelector('.av-wrap'); av.classList.remove('celebrate', 'slump'); void av.offsetWidth; av.classList.add(mood);
      if (a.pts) { const s = document.createElement('span'); s.className = 'ppop num'; s.textContent = '+' + a.pts; row.appendChild(s); setTimeout(() => s.remove(), reduced ? 600 : 1000); }
    }
    clearTimeout(toastT.current); setToast({ ev: e, show: true, n: (toast?.n || 0) + 1 }); toastT.current = setTimeout(hideToast, 4000);
    caption(P(sel).name, a.label, a.pts ? '+' + a.pts : '');
    stage.current?.play(sel, k);
  };
  const remove = (id, verb) => {
    const e = rec().events.find(x => x.id === id); if (!e) return;
    change(x => { x.events = x.events.filter(y => y.id !== id); });
    caption(P(e.pid).name, `${verb} ${A[e.a].label.toLowerCase()}`, '', true);
  };
  const undo = () => { hideToast(); const e = rec().events[rec().events.length - 1]; if (e) remove(e.id, 'Undid'); };

  const n = R.playing.length;
  const rows = R.playing.map(id => { const c = countsFor(id, R.events); return { id, c, s: calc(c) }; });
  const t = sumRows(rows.map(r => r.c));
  const top = rows.map(r => ({ id: r.id, pts: r.s.pts })).sort((a, b) => b.pts - a.pts)[0];
  const items = [['fg', 'FG', `${t.fgm}/${t.fga}`], ['m3', '3FG', `${t.m3}/${t.a3}`], ['ft', 'FT', `${t.ftm}/${t.fta}`], ['reb', 'REB', t.reb], ['ast', 'AST', t.ast], ['stl', 'STL', t.stl], ['to', 'TO', t.to],
    ['top', 'Top scorer', top && top.pts ? `${P(top.id).name} ${top.pts}` : '–']];
  const prev = stripPrev.current; stripPrev.current = Object.fromEntries(items.map(([k, , v]) => [k, String(v)]));
  const sc = R.sel ? countsFor(R.sel, R.events) : null;
  const cnt = k => !sc ? '' : k[0] === '2' ? `${sc.m2}/${sc.a2}` : k[0] === '3' ? `${sc.m3}/${sc.a3}` : k[0] === 'F' ? `${sc.ftm}/${sc.fta}` : sc[{ OR: 'oreb', DR: 'dreb', AS: 'ast', ST: 'stl', BK: 'blk', TO: 'to' }[k]];
  const numOf = id => R.nums?.[id] ?? P(id).num;
  const log = R.events.slice().reverse().slice(0, 30);

  return (
    <div className="entry" onClick={e => { if (!e.target.closest('button, a, input, select, label')) deselect(); if (!e.target.closest('#log .chip')) setConfirm(null); }}>
      <div className="bar pad-x">
        <div className="wordmark">Brickhampton</div>
        <div className="meta"><span className="t" id="e-title">vs {R.game.opp}</span><span className="s" id="e-sub">{R.game.season}, Game {R.game.no}, {fmtDate(R.game.date)}</span></div>
        <span className="grow" />
        <div className="score"><span className="lbl">Our points</span><span className="v num" id="e-score" ref={score}>0</span></div>
        <button className="btn ghost" id="open-box" onClick={() => openSheet(<><h2>Box score</h2><p className="sheet-sub">vs {R.game.opp}</p><BoxScore rows={rows.map(r => ({ ...r, num: R.nums?.[r.id] }))} /><div className="actions"><button className="btn primary" id="close" onClick={closeSheet}>Back to recording</button></div></>)}>Box<span className="nl">&nbsp;score</span></button>
        <button className="btn primary" id="end" onClick={() => openSheet(<EndGame />)}>End<span className="nl">&nbsp;game</span></button>
      </div>
      <div className="lstrip pad-x" id="lstrip" aria-label="Team so far">{items.map(([k, l, v]) => <span key={k + String(v)} className={`ls-${k}${prev[k] !== undefined && prev[k] !== String(v) ? ' bump' : ''}`}><i>{l}</i><b className="num">{v}</b></span>)}</div>
      <div className="emain pad-x">
        <div className={`plist${n > 6 ? ' dense' : ''}`} id="plist" role="group" aria-label="Players" style={{ '--pcols': n <= 5 ? n : n === 6 ? 3 : n <= 8 ? 4 : 5 }}>
          {rows.map(({ id, s }) => (
            <button key={id} className="prow" data-id={id} aria-pressed={R.sel === id} onClick={() => select(id)}>
              <Avatar id={id} num={numOf(id)} />
              <span><span className="nm">{P(id).name}<span>#{numOf(id)}</span></span><span className="ln num">{lineOf(s)}</span></span>
            </button>
          ))}
        </div>
        <div className="right">
          <div className="stage" aria-hidden="true">
            <svg viewBox="0 0 640 180" preserveAspectRatio="xMidYMax meet">
              <g id="crowd" shapeRendering="crispEdges">{CROWD.map(f => (
                <g key={f.i} className="fan" style={{ '--d': `${f.d}s`, '--h': `${f.h}s` }}>
                  <rect x={f.x - 4} y={f.y + 2} width="3" height="8" fill={f.skin} className="arms" /><rect x={f.x + 9} y={f.y + 2} width="3" height="8" fill={f.skin} className="arms" />
                  <rect x={f.x} y={f.y} width="8" height="8" fill={f.skin} /><rect x={f.x} y={f.y} width="8" height="2" fill={f.hair} />
                  <rect x={f.x - 2} y={f.y + 8} width="12" height="16" fill={f.top} />
                </g>))}</g>
              <g shapeRendering="crispEdges">
                <rect x="-400" y="136" width="1440" height="32" fill="#191513" /><rect x="-400" y="136" width="1440" height="2" fill="#2c2520" />
                <rect x="-400" y="168" width="1440" height="12" fill="#e2c9a0" /><rect x="-400" y="168" width="1440" height="2" fill="#efdcbb" />
                {Array.from({ length: 44 }, (_, i) => <rect key={i} x={i * 33 - 400 + (i % 2) * 9} y="174" width="3" height="6" fill="#cfb185" />)}
                <rect x="400" y="170" width="180" height="10" fill="#2f55d4" opacity=".55" /><rect x="400" y="170" width="2" height="10" fill="#f4ead8" />
                {/* A stadium hoop: a padded base on the floor, a post, and an arm reaching out to the backboard. */}
                <rect x="596" y="128" width="40" height="40" fill="#2f55d4" /><rect x="596" y="128" width="40" height="4" fill="#4a6fe6" /><rect x="596" y="160" width="40" height="8" fill="#1d3a9e" />
                <rect x="610" y="42" width="10" height="86" fill="#5d5a58" /><rect x="618" y="42" width="2" height="86" fill="#43403e" />
                <rect x="576" y="42" width="44" height="8" fill="#5d5a58" /><rect x="576" y="48" width="44" height="2" fill="#43403e" />
                {[0, 1, 2, 3, 4, 5].map(i => <rect key={i} x={604 - i * 5} y={84 - i * 6} width="6" height="6" fill="#5d5a58" />)}
                <rect x="566" y="24" width="10" height="56" fill="#e8e6e3" /><rect x="566" y="48" width="10" height="15" fill="#2f55d4" /><rect x="574" y="24" width="2" height="56" fill="#b9b6b2" />
                <rect x="560" y="68" width="6" height="6" fill="#43403e" />
              </g>
              <g id="rim" shapeRendering="crispEdges"><rect x="517" y="69" width="50" height="4" fill="#ee6018" /></g>
              <g id="net" shapeRendering="crispEdges" style={{ transformBox: 'view-box', transformOrigin: '542px 72px' }}>
                <path d={NET} fill="#e8e6e3" />
              </g>
              <g id="actor-wrap" />
              <g id="fx" />
            </svg>
            <div className="caption idle" id="cap"><span className="cn" id="cap-n">Ready</span><span className="ca"><span id="cap-a">Select a player, then an action</span><span className="cd" id="cap-d" /></span></div>
            {toast && (
              <button className={`toast${toast.show ? ' show' : ''}`} id="toast" type="button" key={toast.n} aria-label={`Undo ${P(toast.ev.pid)?.name} ${A[toast.ev.a].label}`}
                onClick={e => { e.stopPropagation(); hideToast(); remove(toast.ev.id, 'Undid'); }}>
                <UndoIcon size={15} /><span>Undo</span><em>{A[toast.ev.a].label}</em><i className="tbar" /></button>
            )}
          </div>
          <div className="keys" id="keys">{ACTIONS.map(a => (
            <button key={a.k} className={`key ${a.cls}`} data-k={a.k} aria-label={a.label} onClick={e => record(a.k, e)}>
              <span className="cnt num" data-cnt={a.k}>{cnt(a.k)}</span><span className="k">{a.key}</span><span className="sub"><span className="dot" />{a.sub}</span>
            </button>))}</div>
        </div>
      </div>
      <div className="logbar pad-x">
        <button className="undo" id="undo" disabled={!R.events.length} onClick={undo}><UndoIcon />Undo</button>
        <div className="log" id="log">{log.length ? log.map((e, i) => (
          <button key={e.id} className={`chip${i === 0 ? ' new' : ''}${confirm === e.id ? ' confirm' : ''}`} data-id={e.id}
            onClick={() => { if (confirm === e.id) { setConfirm(null); remove(e.id, 'Deleted'); } else setConfirm(e.id); }}>
            {confirm === e.id ? <>Delete <b>{P(e.pid).name}{A[e.a].label}</b>?</> : <><b>{P(e.pid).name}</b>{A[e.a].label}</>}</button>))
          : <span className="empty">Actions you record show up here. Tap one to delete it.</span>}</div>
      </div>
    </div>
  );
}
