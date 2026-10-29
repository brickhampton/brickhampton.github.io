import { useLayoutEffect, useRef, useState } from 'react';
import { P, statPlayers, esc } from '../lib/core.js';
import { reduced } from '../lib/charts.js';
import { figure } from '../components/Avatar.jsx';
import { ChevDown } from '../components/icons.jsx';

const TROPHY = `<svg x="345" y="262" width="110" height="122" preserveAspectRatio="xMidYMax meet" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="ht-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset=".55" stop-color="#e9b949"/><stop offset="1" stop-color="#b9821f"/></linearGradient></defs>
  <path d="M17 4h3v2.5a3.5 3.5 0 0 1-3.6 3.5M7 4H4v2.5A3.5 3.5 0 0 0 7.6 10" fill="none" stroke="#d9a63a" stroke-width="2" stroke-linecap="round"/>
  <path d="M7 3h10v6a5 5 0 0 1-10 0z" fill="url(#ht-g)"/><rect x="10.8" y="13.6" width="2.4" height="3.6" fill="#c9922c"/><rect x="7.5" y="17.2" width="9" height="3.3" rx="1" fill="url(#ht-g)"/>
  <path d="M9.2 5.2v3.6" stroke="#fff6d6" stroke-width="1.2" stroke-linecap="round" opacity=".8"/></svg>`;

// Placeholder championship photo drawn from the same avatars as the rest of the app.
// The stage is drawn around the players at whatever shape the screen is, so the photo always fills it.
function homeScene(cw, ch) {
  const ids = statPlayers(), A = cw / Math.max(ch, 1);
  // Keep x 20–780 and y 60–450 (players, trophy and ball) in view; grow the other way to fill the screen.
  // On a tall phone screen, crop the sides a little so the players are bigger, and sit them just above the middle.
  let vw = A < 1 ? 700 : 760, vh = 390; if (A > vw / vh) vw = vh * A; else vh = vw / A;
  let vy = Math.min(60, 265 - vh * (A < 1 ? .44 : .5));
  // Keep the "Games" scroll hint at the bottom clear of the trophy: drop the empty sky first, then zoom out a touch.
  const need = 410 + 64 * vw / cw;
  if (vy + vh < need) vy = Math.min(105, need - vh);
  if (vy + vh < need) { vh = need - vy; vw = vh * A; }
  const vx = 400 - vw / 2, vb = vy + vh;
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const fig = (id, cx, top, w) => `<g class="hp" style="--hd:${(rnd() * 1.6).toFixed(2)}s"><svg x="${cx - w / 2}" y="${top}" width="${w}" height="${w * 1.04}" viewBox="0 0 100 104" overflow="visible">
    <ellipse cx="50" cy="104" rx="30" ry="5" fill="#000" opacity=".35"/>${figure(P(id))}</svg></g>`;
  // Court lines on the floor, drawn in perspective and very faint, running off the bottom of the screen.
  const yb = vb + 40, sl = y => (y - 250) * 83 / 220;
  const court = `<g fill="none" stroke="#fff" stroke-opacity=".09" stroke-width="2">
    <path d="M${(95 - sl(yb) - 2000).toFixed(0)} 250H${(705 + sl(yb) + 2000).toFixed(0)}M95 250 ${(95 - sl(yb)).toFixed(0)} ${yb.toFixed(0)}M705 250 ${(705 + sl(yb)).toFixed(0)} ${yb.toFixed(0)}"/>
    <ellipse cx="400" cy="250" rx="80" ry="14"/>
    <path d="M335 330 ${(335 - (yb - 330) * .12).toFixed(0)} ${yb.toFixed(0)}M465 330 ${(465 + (yb - 330) * .12).toFixed(0)} ${yb.toFixed(0)}M335 330H465"/><ellipse cx="400" cy="330" rx="65" ry="15"/>
    <path d="M110 470A300 175 0 0 1 690 470L${(690 + (yb - 470) * .1).toFixed(0)} ${yb.toFixed(0)}M110 470 ${(110 - (yb - 470) * .1).toFixed(0)} ${yb.toFixed(0)}"/></g>`;
  // Spotlights hang at the top edge of the screen.
  const beams = [[110, 'l'], [400, 'c'], [690, 'r']].map(([x, k], i) => `<polygon class="beam" style="animation-delay:${i * 1.3}s" points="${x - 14},${vy} ${x + 14},${vy} ${x + (k === 'l' ? 210 : k === 'r' ? -10 : 150)},470 ${x + (k === 'l' ? 10 : k === 'r' ? -210 : -150)},470" fill="url(#hbeam)"/>
    <circle cx="${x}" cy="${vy + 4}" r="16" fill="url(#hlamp)"/>`).join('');
  const COLS = ['#4f7cff', '#eeeeee', '#e9b949', '#9db4ff', '#f4d37c', '#2f55d4'];
  const n = Math.min(110, Math.round(54 * vw * (Math.min(vb, 470) - vy) / (800 * 470)));
  const pieces = Array.from({ length: n }, (_, i) => {
    const x = vx + rnd() * vw, y = vy + rnd() * ((i % 4 ? 250 : 470) - vy), c = COLS[i % COLS.length], r = Math.round(rnd() * 180), w = 5 + rnd() * 5, ani = i % 3 === 0;
    return i % 5 === 4 ? `<circle class="${ani ? 'cf' : 'cf0'}" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="2.6" fill="${c}" style="--d:${(4 + rnd() * 4).toFixed(1)}s;--dl:${(-rnd() * 4).toFixed(1)}s"/>`
      : `<rect class="${ani ? 'cf' : 'cf0'}" x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(1)}" height="${(w * .45).toFixed(1)}" rx="1" fill="${c}" style="--r:${r}deg;--d:${(4 + rnd() * 4).toFixed(1)}s;--dl:${(-rnd() * 4).toFixed(1)}s"/>`;
  });
  const half = Math.round(n * .55), back = ids.slice(4), front = ids.slice(0, 4);
  const ball = `<g transform="translate(108 386)"><ellipse cx="0" cy="24" rx="20" ry="4" fill="#000" opacity=".35"/><circle r="21" fill="#ee6018"/><path d="M-21 0h42M0-21v42M-14.5-14.5q8.5 14.5 0 29M14.5-14.5q-8.5 14.5 0 29" stroke="#2a1206" stroke-width="2.2" fill="none"/></g>`;
  const box = `x="${vx.toFixed(1)}" y="${vy.toFixed(1)}" width="${vw.toFixed(1)}" height="${vh.toFixed(1)}"`;
  return `<svg class="hscene" viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}" role="img" aria-label="Team photo: ${ids.map(id => esc(P(id).name)).join(', ')} with the trophy">
    <defs>
      <radialGradient id="hglow" gradientUnits="userSpaceOnUse" cx="400" cy="272" r="${Math.max(440, vh * .55).toFixed(0)}"><stop offset="0" stop-color="#2f55d4" stop-opacity=".45"/><stop offset=".6" stop-color="#1c3896" stop-opacity=".12"/><stop offset="1" stop-color="#0c0c10" stop-opacity="0"/></radialGradient>
      <linearGradient id="hbeam" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <radialGradient id="hlamp"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#fff6d6" stop-opacity=".7"/><stop offset="1" stop-color="#fff6d6" stop-opacity="0"/></radialGradient>
      <radialGradient id="hfloor" gradientUnits="userSpaceOnUse" cx="400" cy="250" r="${Math.max(560, vw * .6).toFixed(0)}"><stop offset="0" stop-color="#e9b949" stop-opacity=".12"/><stop offset="1" stop-color="#e9b949" stop-opacity="0"/></radialGradient>
    </defs>
    <rect ${box} fill="#0c0c10"/><rect ${box} fill="url(#hglow)"/>
    <rect x="${vx.toFixed(1)}" y="250" width="${vw.toFixed(1)}" height="${Math.max(0, vb - 250).toFixed(1)}" fill="url(#hfloor)"/>
    ${court}${beams}
    <g>${pieces.slice(0, half).join('')}</g>
    ${back.map((id, i) => fig(id, [270, 400, 530][i], 138, 118)).join('')}
    ${front.map((id, i) => fig(id, [160, 290, 510, 640][i], 236, 138)).join('')}
    <ellipse cx="400" cy="390" rx="62" ry="9" fill="#000" opacity=".4"/>${TROPHY}${ball}
    <g>${pieces.slice(half).join('')}</g>
  </svg>`;
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
  const scrollDown = () => document.getElementById('s-games').scrollTo({ top: heroH(), behavior: reduced ? 'auto' : 'smooth' });
  return (
    <div className="ghero" id="home" ref={ref}>
      {size && <div className="hstage" dangerouslySetInnerHTML={{ __html: homeScene(size.w, size.h) }}/>}
      <button className="hcue" id="h-cue" aria-label="Scroll down to games" onClick={scrollDown}>Games<ChevDown width="18" height="18" /></button>
    </div>
  );
}
