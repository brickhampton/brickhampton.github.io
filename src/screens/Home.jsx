import { useLayoutEffect, useRef, useState } from 'react';
import { P, statPlayers, esc } from '../lib/core.js';
import { reduced } from '../lib/charts.js';
import { figure, pxShadow, raisedTrophy } from '../lib/avatar.js';
import { ChevDown } from '../components/icons.jsx';
import { stage } from '../lib/homeStage.js';

const TROPHY = `<svg x="345" y="262" width="110" height="122" preserveAspectRatio="xMidYMax meet" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="ht-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset=".55" stop-color="#e9b949"/><stop offset="1" stop-color="#b9821f"/></linearGradient></defs>
  <path d="M17 4h3v2.5a3.5 3.5 0 0 1-3.6 3.5M7 4H4v2.5A3.5 3.5 0 0 0 7.6 10" fill="none" stroke="#d9a63a" stroke-width="2" stroke-linecap="round"/>
  <path d="M7 3h10v6a5 5 0 0 1-10 0z" fill="url(#ht-g)"/><rect x="10.8" y="13.6" width="2.4" height="3.6" fill="#c9922c"/><rect x="7.5" y="17.2" width="9" height="3.3" rx="1" fill="url(#ht-g)"/>
  <path d="M9.2 5.2v3.6" stroke="#fff6d6" stroke-width="1.2" stroke-linecap="round" opacity=".8"/></svg>`;

// The team photo is posed like the real championship photo: four standing at the back, three in front holding the ball
// and the trophy. Anyone else on the roster fills in on the shorter row.
// A. Shan's raised fist comes and goes now and then instead of being held all the time.
const POSE = { back: ['hoang', 'liu', 'yoon', 'shan'], front: ['lim', 'yao', 'lin'], hold: { yao: 'trophy', lim: 'ball' }, now: { shan: 'fist' } };
function rows(ids) {
  const back = POSE.back.filter(id => ids.includes(id)), front = POSE.front.filter(id => ids.includes(id));
  for (const id of ids) if (!back.includes(id) && !front.includes(id)) (back.length <= front.length ? back : front).push(id);
  return { back, front };
}

// Championship photo drawn from the same avatars as the rest of the app.
// The stage is drawn around the players at whatever shape the screen is, so the photo always fills it.
function homeScene(cw, ch) {
  const ids = statPlayers(), A = cw / Math.max(ch, 1);
  // Keep the team (x 170–630, y 60–440) in view; grow the other way to fill the screen.
  // On a tall phone screen, crop the sides a little so the players are bigger, and sit them just above the middle.
  // Zoomed out a little (Z) so more of the arena shows round the team.
  const Z = 1.12;
  let vw = (A < 1 ? 520 : 760) * Z, vh = 390 * Z; if (A > vw / vh) vw = vh * A; else vh = vw / A;
  let vy = Math.min(60, 265 - vh * (A < 1 ? .44 : .5));
  // Keep the "Games" scroll hint at the bottom clear of the trophy: drop the empty sky first, then zoom out a touch.
  const need = 428 + 64 * vw / cw;
  if (vy + vh < need) vy = Math.min(105, need - vh);
  if (vy + vh < need) { vh = need - vy; vw = vh * A; }
  const vx = 400 - vw / 2, vb = vy + vh;
  const S = stage({ vx, vy, vw, vh, vb, A });
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // Each player bobs, blinks and smiles on their own timing.
  const vars = () => `--hd:${(rnd() * 1.6).toFixed(2)}s;--bd:${(rnd() * -5).toFixed(2)}s;--sd:${(rnd() * -12).toFixed(2)}s;--sl:${(10 + rnd() * 6).toFixed(1)}s`;
  const refl = [];
  const fig = (id, cx, top, w) => { const st = vars(), body = POSE.now[id] ? `<g class="hp-rest">${figure(P(id), { stage: true, pose: 'down' })}</g><g class="hp-now">${figure(P(id), { stage: true, pose: POSE.now[id] })}</g>` : figure(P(id), { stage: true, pose: POSE.hold[id] || 'down' });
    const svg = inner => `<svg x="${cx - w / 2}" y="${top}" width="${w}" height="${w * 1.04}" viewBox="0 0 100 104" overflow="visible">${inner}</svg>`;
    // A faint reflection in the polished floor, flipped about the player's feet.
    if (S.refl) { const fy = top + w * 1.035; refl.push(`<g class="alive" style="${st}" mask="url(#hrmask)" opacity="${S.refl}"><g transform="translate(0 ${(2 * fy).toFixed(1)}) scale(1 -1)">${svg(figure(P(id), { stage: true, pose: POSE.hold[id] || 'down' }))}</g></g>`); }
    // Tapping a player makes them react (see onTap): everything that moves sits in .hpt, over a wide invisible
    // target so a tap anywhere on them counts. Players with free hands can also pump a fist: either one, or both.
    const fist = POSE.hold[id] ? '' : ['fist', 'fistL', 'fist2'].map(k => `<g class="hf hf-${k}">${figure(P(id), { stage: true, pose: k })}</g>`).join('');
    // The trophy and ball holders get their own: lifting the trophy overhead, or bouncing the ball and spinning it.
    const own = (HELD[POSE.hold[id]] || []).map(([k, pose]) => `<g class="hx hx-${k}">${figure(P(id), { stage: true, pose })}${k === 't-raise' ? raisedTrophy(P(id)) : ''}</g>`).join('');
    return `<g class="hp alive" style="${st}">${svg(`${pxShadow(50, 103.5, 22, 104 / 34)}<g class="hpt${fist ? ' can-fist' : ''}" data-id="${id}"${own ? ` data-own="${HELD[POSE.hold[id]].map(([k]) => k).join(' ')}"` : ''} role="button" aria-label="${esc(P(id).name)}"><rect x="27" y="10" width="46" height="94" fill="transparent"/><g class="hb">${body}</g>${fist}${own}</g>`)}</g>`; };
  const COLS = ['#4f7cff', '#eeeeee', '#e9b949', '#9db4ff', '#f4d37c', '#2f55d4'];
  const n = Math.min(110, Math.round(54 * vw * (Math.min(vb, 470) - vy) / (800 * 470)));
  const pieces = Array.from({ length: n }, (_, i) => {
    const x = vx + rnd() * vw, y = vy + rnd() * ((i % 4 ? 250 : 470) - vy), c = COLS[i % COLS.length], r = Math.round(rnd() * 180), w = 5 + rnd() * 5, ani = i % 3 === 0;
    return i % 5 === 4 ? `<circle class="${ani ? 'cf' : 'cf0'}" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="2.6" fill="${c}" style="--d:${(4 + rnd() * 4).toFixed(1)}s;--dl:${(-rnd() * 4).toFixed(1)}s"/>`
      : `<rect class="${ani ? 'cf' : 'cf0'}" x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(1)}" height="${(w * .45).toFixed(1)}" rx="1" fill="${c}" style="--r:${r}deg;--d:${(4 + rnd() * 4).toFixed(1)}s;--dl:${(-rnd() * 4).toFixed(1)}s"/>`;
  });
  const half = Math.round(n * .55), { back, front } = rows(ids);
  // Huddled: the back row stands shoulder to shoulder at slightly different depths, and the front row stands close in
  // front of them, in the gaps. Players nearer the middle are drawn last, so they overlap the ones beside them.
  const BW = 132, BT = 116, FW = 156, FT = 178, STAGGER = [4, -3, 2, -4, 3, -2];
  const bx = i => 400 + (i - (back.length - 1) / 2) * Math.min(70, 560 / Math.max(1, back.length - 1));
  const fx = i => 400 + (i - (front.length - 1) / 2) * Math.min(76, 520 / Math.max(1, front.length - 1));
  const inward = (list, x) => list.map((id, i) => [id, i]).sort((a, b) => Math.abs(x(b[1]) - 400) - Math.abs(x(a[1]) - 400));
  // Without the trophy holder or the ball holder, the trophy and ball go on the floor.
  const has = k => front.some(id => POSE.hold[id] === k);
  const ball = has('ball') ? '' : `<g transform="translate(108 386)">${pxShadow(0, 24, 18, 4)}<circle r="21" fill="#ee6018"/><path d="M-21 0h42M0-21v42M-14.5-14.5q8.5 14.5 0 29M14.5-14.5q-8.5 14.5 0 29" stroke="#2a1206" stroke-width="2.2" fill="none"/></g>`;
  const trophy = has('trophy') ? '' : `${pxShadow(400, 390, 56, 5, .4)}${TROPHY}`;
  const team = `${inward(back, bx).map(([id, i]) => fig(id, bx(i), BT + STAGGER[i % 6], BW)).join('')}
    ${inward(front, fx).map(([id, i]) => fig(id, fx(i), FT + (i === Math.floor(front.length / 2) ? 10 : 0) + STAGGER[(i + 3) % 6], FW)).join('')}`;
  const box = `x="${vx.toFixed(1)}" y="${vy.toFixed(1)}" width="${vw.toFixed(1)}" height="${vh.toFixed(1)}"`;
  return `<svg class="hscene" viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}" role="img" aria-label="Team photo: ${ids.map(id => esc(P(id).name)).join(', ')} with the trophy">
    <defs>${S.defs}<linearGradient id="hrgrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="hrmask" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#hrgrad)"/></mask></defs>
    ${S.under}
    <g${A < 1 ? ' transform="translate(400 300) scale(1.3) translate(-400 -300)"' : ''}>${refl.join('')}</g>
    <g>${pieces.slice(0, half).join('')}</g>
    <g${A < 1 ? ' transform="translate(400 300) scale(1.3) translate(-400 -300)"' : ''}>
    ${team}
    </g>
    ${trophy}${ball}
    <g>${pieces.slice(half).join('')}</g>
  </svg>`;
}

// Tapping a player: they smile and give a little bob straight away. Tap again quickly and they bob with every tap;
// tap once and wait, and they follow it with a random reaction.
const HELD = { trophy: [['t-raise', 'catch']], ball: [['t-dribble'], ['t-twirl', 'spin']] };
const REACTS = ['t-hop', 't-wiggle', 't-squash', 't-fist', 't-fistL', 't-fist2', 't-raise', 't-dribble', 't-twirl'], RAPID = 320;
const restart = (el, cls) => { el.classList.remove(cls); void el.getBoundingClientRect(); el.classList.add(cls); };
function onTap(e, taps) {
  const g = e.target.closest?.('.hpt'); if (!g) return;
  const id = g.dataset.id, t = taps[id] ||= { n: 0, at: 0, wait: 0, end: 0, last: '' }, now = performance.now();
  t.n = now - t.at < RAPID * 1.4 ? t.n + 1 : 1; t.at = now;
  clearTimeout(t.wait); clearTimeout(t.end);
  g.classList.remove(...REACTS); g.classList.add('t-smile'); restart(g, 't-bob');
  const done = ms => { t.end = setTimeout(() => g.classList.remove('t-smile', 't-bob', ...REACTS), ms); };
  t.wait = setTimeout(() => {
    if (t.n > 1 || reduced) return done(700);
    // Holders get their own reactions twice in the draw, so they come up often.
    const own = (g.dataset.own || '').split(' ').filter(Boolean);
    const ks = [...REACTS.slice(0, 3), ...(g.classList.contains('can-fist') ? REACTS.slice(3, 6) : []), ...own, ...own].filter(k => k !== t.last);
    const k = t.last = ks[Math.floor(Math.random() * ks.length)];
    g.classList.remove('t-bob'); restart(g, k); done(k === 't-dribble' ? 1600 : 1300);
  }, RAPID);
}

export const heroH = () => document.getElementById('home')?.offsetHeight || 0;

// Home is the top of the Games screen: a full-screen team photo with the game list underneath.
// It takes the height of the screen, and redraws the stage when the screen changes shape.
export function Home() {
  const ref = useRef(null);
  const [size, setSize] = useState(null);
  useLayoutEffect(() => {
    const scr = document.getElementById('s-games'), el = ref.current;
    const fit = () => {
      const w = scr.clientWidth, h = scr.clientHeight; if (!h) return;
      el.style.height = h + 'px';
      setSize(s => s && s.w === w && s.h === h ? s : { w, h });
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(scr);
    return () => ro.disconnect();
  }, []);
  const taps = useRef({});
  const scrollDown = () => document.getElementById('s-games').scrollTo({ top: heroH(), behavior: reduced ? 'auto' : 'smooth' });
  return (
    <div className="ghero" id="home" ref={ref}>
      {size && <div className="hstage" onPointerDown={e => onTap(e, taps.current)} dangerouslySetInnerHTML={{ __html: homeScene(size.w, size.h) }}/>}
      <button className="hcue" id="h-cue" aria-label="Scroll down to games" onClick={scrollDown}>Games<ChevDown width="18" height="18" /></button>
    </div>
  );
}
