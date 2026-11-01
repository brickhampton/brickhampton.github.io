import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { reload } from '../lib/store.js';
import { P, calc, sumRows, perTxt, fmtDate, esc, lastNo } from '../lib/core.js';
import { sfx } from '../lib/sfx.js';
import { rec, change, countsFor, livePts, ACTIONS, A, saveGame, clearRecording } from '../lib/record.js';
import { reduced } from '../lib/charts.js';
import { go } from '../lib/nav.js';
import { Avatar, figure } from '../components/Avatar.jsx';
import { BALL, BALL_C, pxShadow } from '../lib/avatar.js';
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
const SPOT = { '2M': 330, '2X': 330, '3M': 120, '3X': 120, 'FM': 383, 'FX': 383, 'OR': 470, 'DR': 450, 'AS': 150, 'ST': 300, 'BK': 470, 'TO': 300 };
const HAND_Y = FLOOR - 104 * SC + 22; // just above the head
const D = 140; // let the player get to their spot before the ball moves
// A free throw starts with two quick dribbles behind the line; the ball goes up once they're done.
const BOUNCE = 190, FT_D = 60 + 2 * BOUNCE + 60;
// A 2 goes up from somewhere new each time: in the paint, or between the three-point line and the free-throw line,
// never from the free-throw spot itself. A 3 moves up to a player's width either way, but always stays behind the arc.
const THREE_SPOT = [88, 138];
const TWO = [[180, 352], [420, 520]];
const between = ([a, b]) => Math.round(a + Math.random() * (b - a));
const twoSpot = () => between(TWO[Math.random() < .5 ? 0 : 1]);
// The ball and hoop are drawn in the same flat pixel style as the players (3 screen units to a pixel).
const PX = 3, BALL_D = BALL.map(([o, w], j) => `M${o} ${j}h${w}v1h${-w}z`).join('');
const NET = Array.from({ length: 8 }, (_, j) => Array.from({ length: 12 - j }, (_, i) => (i + j) % 2 ? '' : `M${542 - (12 - j) * 2 + i * 4} ${73 + j * 4}h3v3h-3z`).join('')).join('');
const MATE = { v: 2, skin: '#d9b48e', hair: '#2e2e33', style: 3 }; // a short fringe
// The crowd behind the courtside boards: one sparse row of soft, dim figures in muted colours (never the team's blue),
// so they sit back in the dark and the player stays the focus. Most fans get up for a made 2; every third fan is one
// of the few who clap the smaller plays.
// The three-point line's rows on the floor, front (bottom) to back: [y, x, width]. Each row's run reaches back to where the
// row behind it ends, so the line is one stepped curve.
const THREE = (() => {
  const out = []; let prev = null;
  for (let y = 170; y < 180; y += 2) {
    const t = (180 - y) / 10, x = 156 + Math.round(6 * (1 - Math.sqrt(1 - t * t)) / 2) * 2;
    out.push([y, x, Math.max(x, prev ?? x) - x + 3]); prev = x;
  }
  return out;
})();

// Two rows of fans in muted greys and navies with a little white, dimmed toward the background so they stay part of it.
// Shirts are scattered by a hash so no pattern repeats along the row. Each fan has their own reaction to the smaller
// plays (a steal, block or assist): a hop, a shake, a clap or a cheer, and a few stay seated.
const CROWD = (() => {
  const dim = c => '#' + [1, 3, 5].map(i => Math.round(parseInt(c.slice(i, i + 2), 16) * .3 + parseInt('1d1a18'.slice(i - 1, i + 1), 16) * .7).toString(16).padStart(2, '0')).join('');
  const SK = ['#c9a27e', '#a87a55', '#e0b994', '#7a5238'].map(dim), HR = ['#1c1714', '#3a2a1e', '#0f0c0c'].map(dim);
  const TOP = ['#6e7076', '#8a8380', '#eeeeee', '#1f2d5c', '#b8b3b0', '#5a5c63', '#2a3a72', '#9a9da4', '#7b7f88', '#22388f', '#7b7570', '#1f2d5c'].map(dim);
  const RX = ['bob', 'bob', 'shake', 'shake', 'clap', 'clap', 'cheer', 'cheer', '', ''];
  const hash = k => (Math.imul(k + 7, 2654435761) >>> 0) % 9973;
  const out = [];
  const row = (y0, dx, k0) => { for (let i = 0; i < 34; i++) {
    const x = i * 36 - 402 + ((i * 11) % 3) * 3 + dx, k = i + k0;
    if (x > 548 && x < 650) continue; // leave room for the hoop
    out.push({ i: k, x, y: y0 + ((k * 5) % 2) * 3, skin: SK[k % SK.length], hair: HR[(k * 2) % HR.length], top: TOP[hash(k) % TOP.length], rx: RX[(hash(k) >> 4) % RX.length], few: k % 3 === 0, most: k % 4 !== 3, d: ((k * 37) % 100) / 100 * .25, h: 2.6 + ((k * 13) % 10) / 5 });
  } };
  row(95, 18, 100);
  row(111, 0, 0);
  return out;
})();

function makeStage() {
  const fx = $('#fx'), net = $('#net'), rim = $('#rim'), actorWrap = $('#actor-wrap');
  let actorX = 300, actor = null;
  function placeActor(sel, instant, x = actorX) {
    if (!sel) { actorWrap.innerHTML = ''; actor = null; return; }
    if (!actor || actor.dataset.id !== sel) {
      actorWrap.innerHTML = `<g class="actor alive" data-id="${esc(sel)}">${pxShadow(0, FLOOR, 22)}<g class="body">${figure(P(sel), { stage: true, pose: 'down' })}</g></g>`;
      actor = actorWrap.firstElementChild; instant = true;
    }
    const body = actor.querySelector('.body'), shadow = actor.querySelector('.pxsh');
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
  // The crowd reacts to a good play: 'big' (a 3, everyone up), 'most' (a 2, most of them up) or 'clap' (a few clap).
  function cheer(delay, level) {
    setTimeout(() => {
      const c = $('#crowd'); if (!c) return;
      c.classList.remove('big', 'most', 'clap', 'hype'); void c.getBBox(); c.classList.add(level);
      clearTimeout(c._t); c._t = setTimeout(() => c.classList.remove(level), level === 'big' ? 1700 : level === 'hype' ? 1500 : 1300);
    }, delay);
  }
  // A leap for a block: the player springs up and drops back down.
  function leap(delay) {
    setTimeout(() => { if (!actor) return; const b = actor.querySelector('.body'); b.classList.remove('leap'); void b.getBBox(); b.classList.add('leap'); setTimeout(() => b.classList.remove('leap'), 800); }, delay);
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
  function shot(x0, h, d, made, delay = D) {
    // A late shot (after the free-throw dribbles) only puts its ball up once the player rises to shoot.
    if (delay > D) { setTimeout(() => shot(x0, h, d, made, 0), delay); return; }
    const b = ball();
    const tx = made ? RX : RX - 20, ty = made ? RY - 2 : RY - 4;
    then(fly(b, arc(x0, HAND_Y, tx, ty, h), d, 'linear', delay), () => {
      if (made) { ripple(); then(fly(b, [[RX, RY - 2, 300], [RX, 96, 330], [RX - 4, FLOOR - 14, 360, 0]], 300, 'ease-in'), () => b.remove()); }
      else { shake(); then(fly(b, arc(RX - 20, RY - 4, RX - 130, FLOOR, 60, 10, -200, 300).map((p, i, arr) => [...p, i === arr.length - 1 ? 0 : 1]), 440, 'ease-in'), () => b.remove()); }
    });
  }
  // Two quick bounces of the ball the player is palming, down to the floor and back up into the hand.
  function dribbles(delay, n = 2) {
    const id = actor?.dataset.id;
    setTimeout(() => {
      const bl = actor?.dataset.id === id && actor.querySelector('.av-ball'); if (!bl) return;
      const drop = parseFloat(bl.style.getPropertyValue('--drop')) || 20;
      bl.animate([{ transform: 'none' }, { transform: `translateY(${drop}px)` }, { transform: 'none' }], { duration: BOUNCE, iterations: n, easing: 'cubic-bezier(.5,0,.5,1)' });
    }, delay);
  }
  // Each play's sounds, timed to land with the animation: the swish as the ball drops through, the clank as it hits the rim.
  // With reduced motion there's no animation, so just the main sound plays straight away.
  function sounds(k, d2) {
    const ft = [['dribble', 60 + BOUNCE / 2], ['dribble', 60 + BOUNCE * 1.5]];
    const list = {
      '2M': [['swish', D + d2], ['made2', D + d2 + 120]], '2X': [['clank', D + d2]],
      '3M': [['swish', D + 460], ['made3', D + 580]], '3X': [['clank', D + 460], ['floor', D + 900]],
      'FM': [...ft, ['swishSoft', FT_D + 320], ['madeFt', FT_D + 440]], 'FX': [...ft, ['clank', FT_D + 320], ['floor', FT_D + 760]],
      'OR': [['clank', 0], ['grab', 300], ['hop', 380]], 'DR': [['clank', 0], ['grab', 300], ['pass', 400]],
      'AS': [['pass', D], ['swish', D + 580], ['assist', D + 600]],
      'ST': [['roll', 60], ['roll', 190], ['roll', 315], ['steal', 380]], 'BK': [['block', 280]],
      'TO': [['dribble', D + 190], ['roll', D + 570], ['roll', D + 840], ['turnover', 300]],
    }[k] || [];
    if (reduced) { const main = list.find(([n]) => !['dribble', 'roll', 'floor'].includes(n)); if (main) sfx(main[0]); return; }
    list.forEach(([n, ms]) => sfx(n, ms));
  }
  function play(sel, k) {
    const x = k === '2M' || k === '2X' ? twoSpot() : k === '3M' || k === '3X' ? between(THREE_SPOT) : SPOT[k];
    placeActor(sel, false, x);
    // The closer the 2, the flatter and quicker the shot.
    const h2 = Math.round(50 + (RX - x) * .14), d2 = Math.round(260 + (RX - x) * .45);
    sounds(k, d2);
    if (reduced) return;
    const pose = { '2M': ['shoot', 0, D + d2 + 20], '2X': ['shoot', 0, D + d2 + 20], '3M': ['shoot', 0, D + 480], '3X': ['shoot', 0, D + 480], 'FM': ['shoot', FT_D, 340], 'FX': ['shoot', FT_D, 340],
      'OR': ['catch', 200, 700], 'DR': ['catch', 200, 700], 'AS': ['pass2', D - 40, 520], 'ST': ['pass', 120, 260], 'BK': ['block1', 0, 760] }[k];
    if (k === 'FM' || k === 'FX') { actorPose('dribble', 0, FT_D + 40); dribbles(60); }
    if (pose) actorPose(...pose);
    const cheers = { '2M': [D + d2, 'most'], '3M': [D + 460, 'big'], 'FM': [FT_D + 320, 'clap'], 'AS': [D + 580, 'hype'], 'ST': [420, 'hype'], 'BK': [280, 'hype'], 'OR': [300, 'clap'], 'DR': [300, 'clap'] }[k];
    if (cheers) cheer(...cheers);
    switch (k) {
      case '2M': actorMood('celebrate', D); shot(x, h2, d2, true); setTimeout(() => pop('+2', RX, 40), D + d2); break;
      case '2X': actorMood('celebrate', D); shot(x, h2, d2, false); actorMood('slump', D + d2 + 60); break;
      case '3M': actorMood('celebrate', D); shot(x, 125, 460, true); setTimeout(() => { burst(RX, RY + 6); pop('+3', RX, 36, '#ee6018', 32); }, D + 460); break;
      case '3X': actorMood('celebrate', D); shot(x, 125, 460, false); actorMood('slump', D + 520); break;
      case 'FM': shot(x, 50, 320, true, FT_D); actorMood('celebrate', FT_D + 320); setTimeout(() => pop('+1', RX, 40), FT_D + 320); break;
      case 'FX': shot(x, 50, 320, false, FT_D); actorMood('slump', FT_D + 360); break;
      case 'OR': case 'DR': { // the ball comes off the rim into the player's hands
        const x = SPOT[k], b = ball(); shake(); actorMood('celebrate', 150);
        then(fly(b, arc(RX - 14, RY, x, HAND_Y - 8, 36, 10, -160), 300, 'ease-in'), () => {
          if (k === 'OR') then(fly(b, [[x, HAND_Y - 8, -160], [x, HAND_Y + 14, -160], [x + 10, HAND_Y - 30, -60], [x + 16, HAND_Y - 40, 0, 0]], 420, 'ease-out', 80), () => b.remove());
          else { streaks(x - 30, HAND_Y, -1); then(fly(b, [[x, HAND_Y - 8, -160], [x - 200, HAND_Y - 20, -420], [40, HAND_Y, -700, 0]], 420, 'cubic-bezier(.5,0,.7,1)', 100), () => b.remove()); }
        });
        setTimeout(() => pop(k === 'OR' ? 'Gimme dat' : 'Yoink', x, 34, '#eeeeee', 18), 250); break;
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
      case 'ST': { // an opponent dribbles in, the player pokes the ball loose, scoops it up and takes off the other way
        const x = SPOT[k], b = ball(), sel0 = sel;
        then(fly(b, [[620, FLOOR - 24, 0], [580, FLOOR - 10, -60], [540, FLOOR - 26, -120], [500, FLOOR - 10, -180], [460, FLOOR - 26, -240], [x + 46, FLOOR - 12, -300], [x + 30, FLOOR - 34, -330]], 380, 'linear'), () => {
          burst(x + 30, FLOOR - 34, '#eeeeee');
          then(fly(b, [[x + 30, FLOOR - 34, -330], [x + 18, FLOOR - 52, -380], [x + 12, FLOOR - 40, -420, 0]], 160, 'ease-out'), () => b.remove());
        });
        actorPose('dribble', 520, 760); actorMood('celebrate', 520);
        setTimeout(() => { if (actor?.dataset.id === sel0) { placeActor(sel0, false, x - 150); streaks(x - 90, FLOOR - 50, -1); } }, 620);
        setTimeout(() => { if (actor?.dataset.id === sel0) placeActor(sel0, false, x); }, 1200);
        setTimeout(() => pop('Cookiesss', x, 40, '#eeeeee', 18), 400); break;
      }
      case 'BK': { // an opponent's shot goes up and the player swats it
        const b = ball(), top = HAND_Y - 46; leap(0);
        then(fly(b, arc(300, FLOOR - 30, SPOT.BK + 6, top, 50, 8, 180), 280, 'ease-out'), () => {
          burst(SPOT.BK + 6, top, '#eeeeee');
          then(fly(b, [[SPOT.BK + 6, top, 180], [340, FLOOR - 4, -200], [220, FLOOR - 30, -420], [150, FLOOR - 6, -560, 0]], 480, 'cubic-bezier(.2,.7,.4,1)'), () => b.remove());
        });
        setTimeout(() => pop('Rejected!', SPOT.BK, 34, '#eeeeee', 18), 280); break;
      }
      case 'TO': { // the ball slips loose, bounces a few times lower and lower, then slowly rolls away and fades by the hoop's post
        const x = SPOT[k], b = ball('#8a8380'), G = FLOOR - 9; actorMood('slump', 220);
        const up = 'cubic-bezier(.3,.6,.5,1)', down = 'cubic-bezier(.5,0,.7,.4)';
        const keys = [[x + 20, FLOOR - 30, 0, down], [x + 44, G, .1, up], [x + 72, G - 30, .2, down], [x + 100, G, .3, up], [x + 120, G - 15, .37, down],
          [x + 140, G, .44, up], [x + 152, G - 6, .48, down], [x + 164, G, .52, 'cubic-bezier(.2,.5,.4,1)'], [575, G, .92], [600, G, 1]];
        const a = b.animate(keys.map(([kx, ky, offset, easing], i) => ({ transform: `translate(${kx}px,${ky}px)`, opacity: i === keys.length - 1 ? 0 : 1, offset, ...(easing && { easing }) })),
          { duration: 1900, delay: D, fill: 'both' });
        then(a, () => b.remove());
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
    try { const id = await saveGame(); sfx('save'); closeSheet(true); go('game', { gameId: id, top: true }); }
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
    sfx(rec().sel === id ? 'close' : 'select');
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
    if (!sel) { sfx('pinBad'); const pl = $('#plist'); pl.classList.remove('nudge'); void pl.offsetWidth; pl.classList.add('nudge'); caption('', 'Pick a player first', '', true); return; }
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
    sfx('undo');
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
                <g key={f.i} className={`fan${f.few ? ' few' : ''}${f.most ? ' most' : ''}${f.rx ? ' rx-' + f.rx : ''}`} style={{ '--d': `${f.d}s`, '--h': `${f.h}s` }}>
                  {/* Drawn in the players' 3-unit pixels: a square head with a hair line, blocky shoulders, arms for a 3. */}
                  <rect x={f.x - 3} y={f.y + 3} width="3" height="9" fill={f.skin} className="arms" /><rect x={f.x + 12} y={f.y + 3} width="3" height="9" fill={f.skin} className="arms" />
                  <rect x={f.x + 3} y={f.y} width="6" height="3" fill={f.hair} /><rect x={f.x} y={f.y + 3} width="12" height="9" fill={f.skin} /><rect x={f.x} y={f.y + 3} width="12" height="3" fill={f.hair} />
                  <rect x={f.x - 3} y={f.y + 15} width="18" height="12" fill={f.top} /><rect x={f.x} y={f.y + 12} width="12" height="3" fill={f.top} />
                  <rect x={f.x + 3} y={f.y + 15} width="6" height="3" fill={f.skin} className="clap" />
                </g>))}</g>
              <g shapeRendering="crispEdges">
                <rect x="-400" y="136" width="1440" height="32" fill="#191513" /><rect x="-400" y="136" width="1440" height="2" fill="#2c2520" />
                <rect x="-400" y="168" width="1440" height="12" fill="#e2c9a0" /><rect x="-400" y="168" width="1440" height="2" fill="#efdcbb" />
                {Array.from({ length: 44 }, (_, i) => <rect key={i} x={i * 33 - 400 + (i % 2) * 9} y="174" width="3" height="6" fill="#cfb185" />)}
                <rect x="400" y="170" width="180" height="10" fill="#2f55d4" opacity=".55" /><rect x="400" y="170" width="2" height="10" fill="#f4ead8" />
                {/* The three-point line, curving slightly back toward the basket at the far side, with the floor beyond it tinted. */}
                {THREE.map(([y, x, w]) => <g key={y}><rect x="-400" y={y} width={x + 397} height="2" fill="#ee6018" opacity=".22" /><rect x={x - 3} y={y} width={w} height="2" fill="#f4ead8" /></g>)}
                {/* A portable stadium hoop, all white with an orange rim: a padded base on the floor, a post, and an arm that
                    angles up to the padded bottom of the backboard. */}
                <rect x="592" y="132" width="48" height="36" fill="#e8e6e3" /><rect x="592" y="162" width="48" height="6" fill="#c4c1bd" /><rect x="592" y="132" width="48" height="3" fill="#f7f6f4" />
                <rect x="616" y="98" width="14" height="34" fill="#e8e6e3" /><rect x="626" y="98" width="4" height="34" fill="#c4c1bd" />
              </g>
              <g fill="none" strokeLinecap="square" strokeLinejoin="round">
                <path d="M623 100 L623 92 L580 72" stroke="#e8e6e3" strokeWidth="7" /><path d="M626 96 L582 76" stroke="#c4c1bd" strokeWidth="2" />
                <path d="M600 132 L612 84" stroke="#d9d6d2" strokeWidth="2.5" />
              </g>
              <g shapeRendering="crispEdges">
                <rect x="566" y="22" width="8" height="52" fill="#d8dde3" opacity=".9" /><rect x="574" y="22" width="2" height="52" fill="#f2f2f2" />
                <rect x="562" y="70" width="16" height="8" fill="#f2f2f2" /><rect x="562" y="76" width="16" height="2" fill="#c4c1bd" />
                <rect x="560" y="66" width="7" height="6" fill="#ee6018" />
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
            {confirm === e.id ? <>Delete <b>{P(e.pid).name} {A[e.a].label}</b>?</> : <><b>{P(e.pid).name}</b>{A[e.a].label}</>}</button>))
          : <span className="empty">Actions you record show up here. Tap one to delete it.</span>}</div>
      </div>
    </div>
  );
}
