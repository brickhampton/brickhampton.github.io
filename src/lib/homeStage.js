// Mockup options for the Home background, picked with ?bg=N.
import { camera, courtLines, keyPaint, hoop, planks, crowd, flashes } from './homeBg.js';

export const BGV = (() => { try { return new URLSearchParams(location.search).get('bg') || '0'; } catch (e) { return '0'; } })();
const f1 = n => n.toFixed(1);

// The camera for the "under the hoop" views: free-throw line just in front of the back row,
// the three-point arc just in front of the front row.
const HALF = { hz: 100, dc: 12, f: 329, hc: 3.2 };
// Looking down the whole court from one end, the team on the centre circle.
const FULL = { hz: 120, dc: 20.5, f: 614, hc: 1.92 };

// On a tall phone the players are drawn 1.3x bigger round (400, 300), so the court is too.
const cam = (C, A) => { const k = A < 1 ? 1.3 : 1; return camera({ ...C, hz: 300 + (C.hz - 300) * k, f: C.f * k }); };
export function stage(v, o) {
  const B = { 1: arena, 2: centre, 3: pixel, 4: spot, 5: spot, 6: spot, 7: spot, 8: spot, 9: spot, 10: spot }[v] || current;
  return B(o, +v);
}

function current({ vx, vy, vw, vh, vb }) {
  const box = `x="${f1(vx)}" y="${f1(vy)}" width="${f1(vw)}" height="${f1(vh)}"`;
  const yb = vb + 40, sl = y => (y - 250) * 83 / 220;
  const court = `<g fill="none" stroke="#fff" stroke-opacity=".09" stroke-width="2">
    <path d="M${(95 - sl(yb) - 2000).toFixed(0)} 250H${(705 + sl(yb) + 2000).toFixed(0)}M95 250 ${(95 - sl(yb)).toFixed(0)} ${yb.toFixed(0)}M705 250 ${(705 + sl(yb)).toFixed(0)} ${yb.toFixed(0)}"/>
    <ellipse cx="400" cy="250" rx="80" ry="14"/>
    <path d="M335 330 ${(335 - (yb - 330) * .12).toFixed(0)} ${yb.toFixed(0)}M465 330 ${(465 + (yb - 330) * .12).toFixed(0)} ${yb.toFixed(0)}M335 330H465"/><ellipse cx="400" cy="330" rx="65" ry="15"/>
    <path d="M110 470A300 175 0 0 1 690 470L${(690 + (yb - 470) * .1).toFixed(0)} ${yb.toFixed(0)}M110 470 ${(110 - (yb - 470) * .1).toFixed(0)} ${yb.toFixed(0)}"/></g>`;
  const beams = [[110, 'l'], [400, 'c'], [690, 'r']].map(([x, k], i) => `<polygon class="beam" style="animation-delay:${i * 1.3}s" points="${x - 14},${vy} ${x + 14},${vy} ${x + (k === 'l' ? 210 : k === 'r' ? -10 : 150)},470 ${x + (k === 'l' ? 10 : k === 'r' ? -210 : -150)},470" fill="url(#hbeam)"/>
    <circle cx="${x}" cy="${vy + 4}" r="16" fill="url(#hlamp)"/>`).join('');
  return {
    defs: `<radialGradient id="hglow" gradientUnits="userSpaceOnUse" cx="400" cy="272" r="${Math.max(440, vh * .55).toFixed(0)}"><stop offset="0" stop-color="#2f55d4" stop-opacity=".45"/><stop offset=".6" stop-color="#1c3896" stop-opacity=".12"/><stop offset="1" stop-color="#0c0c10" stop-opacity="0"/></radialGradient>
      <linearGradient id="hbeam" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <radialGradient id="hlamp"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#fff6d6" stop-opacity=".7"/><stop offset="1" stop-color="#fff6d6" stop-opacity="0"/></radialGradient>
      <radialGradient id="hfloor" gradientUnits="userSpaceOnUse" cx="400" cy="250" r="${Math.max(560, vw * .6).toFixed(0)}"><stop offset="0" stop-color="#e9b949" stop-opacity=".12"/><stop offset="1" stop-color="#e9b949" stop-opacity="0"/></radialGradient>`,
    under: `<rect ${box} fill="#0c0c10"/><rect ${box} fill="url(#hglow)"/>
      <rect x="${f1(vx)}" y="250" width="${f1(vw)}" height="${f1(Math.max(0, vb - 250))}" fill="url(#hfloor)"/>${court}${beams}`,
  };
}

// Shared pieces.
const lamps = (vx, vw, y, n, r = 30, gap = 0) => {
  const step = vw / n;
  return Array.from({ length: n }, (_, i) => { const x = vx + step * (i + .5); if (Math.abs(x - 400) < gap) return ''; return `<circle cx="${f1(x)}" cy="${y}" r="${r}" fill="url(#hhalo)"/><rect x="${f1(x - 11)}" y="${y - 6}" width="22" height="11" rx="2" fill="#1c2232"/><rect x="${f1(x - 8)}" y="${y - 1}" width="16" height="5" rx="1.5" fill="#fff6d6"/>`; }).join('');
};
const halo = '<radialGradient id="hhalo"><stop offset="0" stop-color="#fff6d6" stop-opacity=".55"/><stop offset=".3" stop-color="#fff1c4" stop-opacity=".18"/><stop offset="1" stop-color="#fff1c4" stop-opacity="0"/></radialGradient>';
const blur = (id, sd) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;

// Option 1: an arena, the team photo taken under the hoop at the top of the key.
function arena({ vx, vy, vw, vh, vb, A }) {
  const c = cam(HALF, A), top = c.pt(0, -3)[1], box = `x="${f1(vx)}" y="${f1(vy)}" width="${f1(vw)}" height="${f1(vh)}"`;
  const lines = courtLines(c), pool = c.pt(0, 6.6);
  return {
    refl: .16,
    defs: `${halo}${blur('hsoft', 14)}
      <linearGradient id="hwall" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#07080d"/><stop offset="1" stop-color="#121a33"/></linearGradient>
      <linearGradient id="hfade" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${f1(top)}" y2="${f1(vb)}"><stop offset="0" stop-color="#05060a" stop-opacity=".8"/><stop offset=".35" stop-color="#05060a" stop-opacity=".25"/><stop offset="1" stop-color="#05060a" stop-opacity=".55"/></linearGradient>
      <radialGradient id="hside" gradientUnits="userSpaceOnUse" cx="400" cy="${f1(pool[1])}" r="${f1(Math.max(520, vw * .62))}"><stop offset=".45" stop-color="#05060a" stop-opacity="0"/><stop offset="1" stop-color="#05060a" stop-opacity=".85"/></radialGradient>
      <radialGradient id="hpool" gradientUnits="userSpaceOnUse" cx="400" cy="${f1(pool[1])}" r="260" gradientTransform="translate(400 ${f1(pool[1])}) scale(1 .42) translate(-400 ${f1(-pool[1])})"><stop offset="0" stop-color="#ffe6b8" stop-opacity=".42"/><stop offset=".6" stop-color="#ffd58a" stop-opacity=".12"/><stop offset="1" stop-color="#ffd58a" stop-opacity="0"/></radialGradient>
      <linearGradient id="hcone" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff6d6" stop-opacity=".2"/><stop offset="1" stop-color="#fff6d6" stop-opacity=".03"/></linearGradient>`,
    under: `<rect ${box} fill="url(#hwall)"/>
      ${crowd({ x0: vx, x1: vx + vw, yb: top - 14, rows: 5, gap: 15, size: 7.5 })}
      ${flashes({ x0: vx, x1: vx + vw, y0: top - 85, y1: top - 20 })}
      <rect x="${f1(vx)}" y="${f1(top - 12)}" width="${f1(vw)}" height="12" fill="#14224f"/><rect x="${f1(vx)}" y="${f1(top - 12)}" width="${f1(vw)}" height="1.5" fill="#2f55d4" opacity=".8"/>
      <rect x="${f1(vx)}" y="${f1(top)}" width="${f1(vw)}" height="${f1(vb - top)}" fill="#2c1e14"/>
      ${planks(c)}
      <polygon points="${keyPaint(c)}" fill="#2f55d4" opacity=".5"/>
      <g fill="none" stroke="#f3ece0" stroke-opacity=".62" stroke-width="2" stroke-linejoin="round"><path d="${lines.solid}"/><path d="${lines.dash}" stroke-dasharray="7 7"/></g>
      <rect x="${f1(vx)}" y="${f1(top)}" width="${f1(vw)}" height="${f1(vb - top)}" fill="url(#hfade)"/>
      <rect x="${f1(vx)}" y="${f1(top)}" width="${f1(vw)}" height="${f1(vb - top)}" fill="url(#hside)"/>
      <ellipse cx="400" cy="${f1(pool[1])}" rx="420" ry="190" fill="url(#hpool)"/>
      ${hoop(c)}
      <polygon points="372,${f1(vy + 30)} 428,${f1(vy + 30)} 640,${f1(pool[1] + 20)} 160,${f1(pool[1] + 20)}" fill="url(#hcone)" filter="url(#hsoft)" class="beam"/>
      <rect x="${f1(vx)}" y="${f1(vy)}" width="${f1(vw)}" height="${f1(Math.max(0, 22 - vy + vy))}" fill="#05060a" opacity=".0"/>
      <rect x="${f1(vx)}" y="${f1(vy + 18)}" width="${f1(vw)}" height="4" fill="#161b29"/>
      ${lamps(vx, vw, vy + 26, Math.max(6, Math.round(vw / 105)))}`,
  };
}

// A pixel basketball painted in the centre circle.
const LOGO = ['..####..', '.#o#o##.', '#oo#oo##', '########', '#oo#oo##', '#oo#oo##', '.#o#o##.', '..####..'];
function logo(c, zc, cell = .34) {
  let s = '';
  LOGO.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === '.') return;
    const X = (i - 4) * cell, z = zc + (j - 4) * cell;
    s += `<polygon points="${c.poly([[X, z], [X + cell, z], [X + cell, z + cell], [X, z + cell]])}" fill="${ch === '#' ? '#2a1206' : '#ee6018'}" opacity="${ch === '#' ? .55 : .7}"/>`;
  }));
  return s;
}

// Option 2: centre court, looking down the length of the floor to the far hoop, under the arena's centre-hung scoreboard.
function centre({ vx, vy, vw, vh, vb, A }) {
  const c = cam(FULL, A), top = c.pt(0, -3)[1], box = `x="${f1(vx)}" y="${f1(vy)}" width="${f1(vw)}" height="${f1(vh)}"`;
  const lines = courtLines(c, { full: true }), pool = c.pt(0, 14);
  const circle = c.poly(c.arc(0, 14, 1.8, 0, Math.PI * 2, 1, 0, 60));
  const jy = Math.min(34, c.pt(0, 1.2, 3.95)[1] - 34);
  return {
    refl: .12,
    defs: `${halo}${blur('hsoft', 12)}
      <linearGradient id="hwall" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#06070c"/><stop offset="1" stop-color="#101a3a"/></linearGradient>
      <linearGradient id="hfade" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${f1(top)}" y2="${f1(vb)}"><stop offset="0" stop-color="#05060a" stop-opacity=".75"/><stop offset=".5" stop-color="#05060a" stop-opacity=".15"/><stop offset="1" stop-color="#05060a" stop-opacity=".5"/></linearGradient>
      <radialGradient id="hside" gradientUnits="userSpaceOnUse" cx="400" cy="${f1(pool[1])}" r="${f1(Math.max(520, vw * .6))}"><stop offset=".5" stop-color="#05060a" stop-opacity="0"/><stop offset="1" stop-color="#05060a" stop-opacity=".8"/></radialGradient>
      <radialGradient id="hpool" gradientUnits="userSpaceOnUse" cx="400" cy="${f1(pool[1])}" r="300" gradientTransform="translate(400 ${f1(pool[1])}) scale(1 .4) translate(-400 ${f1(-pool[1])})"><stop offset="0" stop-color="#fff0d0" stop-opacity=".38"/><stop offset=".6" stop-color="#ffd58a" stop-opacity=".1"/><stop offset="1" stop-color="#ffd58a" stop-opacity="0"/></radialGradient>
      <linearGradient id="hscr" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2f55d4"/><stop offset="1" stop-color="#16285f"/></linearGradient>
      <linearGradient id="hcone" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#cfdcff" stop-opacity=".2"/><stop offset="1" stop-color="#cfdcff" stop-opacity=".02"/></linearGradient>`,
    under: `<rect ${box} fill="url(#hwall)"/>
      ${crowd({ x0: vx, x1: vx + vw, yb: top - 12, rows: 6, gap: 13, size: 6.5, seed: 9 })}
      ${flashes({ x0: vx, x1: vx + vw, y0: top - 85, y1: top - 18, n: 12, seed: 5 })}
      <rect x="${f1(vx)}" y="${f1(top - 10)}" width="${f1(vw)}" height="10" fill="#14224f"/><rect x="${f1(vx)}" y="${f1(top - 10)}" width="${f1(vw)}" height="1.5" fill="#e9b949" opacity=".6"/>
      <rect x="${f1(vx)}" y="${f1(top)}" width="${f1(vw)}" height="${f1(vb - top)}" fill="#2c1e14"/>
      ${planks(c, { xs: 22, w: .45 })}
      <polygon points="${keyPaint(c)}" fill="#2f55d4" opacity=".5"/>
      <polygon points="${circle}" fill="#2f55d4" opacity=".4"/>
      ${logo(c, 14)}
      <g fill="none" stroke="#f3ece0" stroke-opacity=".6" stroke-width="2" stroke-linejoin="round"><path d="${lines.solid}"/><path d="${lines.dash}" stroke-dasharray="6 6"/></g>
      <rect x="${f1(vx)}" y="${f1(top)}" width="${f1(vw)}" height="${f1(vb - top)}" fill="url(#hfade)"/>
      <rect x="${f1(vx)}" y="${f1(top)}" width="${f1(vw)}" height="${f1(vb - top)}" fill="url(#hside)"/>
      <ellipse cx="400" cy="${f1(pool[1])}" rx="460" ry="200" fill="url(#hpool)"/>
      ${hoop(c)}
      <polygon points="360,${jy + 18} 440,${jy + 18} 690,${f1(pool[1] + 30)} 110,${f1(pool[1] + 30)}" fill="url(#hcone)" filter="url(#hsoft)" class="beam"/>
      <path d="M352 -200V${jy - 22}M448 -200V${jy - 22}" stroke="#2a3040" stroke-width="2"/>
      <rect x="326" y="${jy - 24}" width="148" height="44" rx="4" fill="#161b29"/>
      <rect x="332" y="${jy - 19}" width="136" height="32" rx="2" fill="url(#hscr)"/>
      <g fill="#e9b949" shape-rendering="crispEdges"><rect x="390" y="${jy - 14}" width="20" height="3"/><rect x="391" y="${jy - 11}" width="18" height="5"/><rect x="394" y="${jy - 6}" width="12" height="3"/><rect x="398" y="${jy - 3}" width="4" height="4"/><rect x="393" y="${jy + 1}" width="14" height="3"/><rect x="385" y="${jy - 13}" width="5" height="2"/><rect x="410" y="${jy - 13}" width="5" height="2"/><rect x="385" y="${jy - 11}" width="2" height="4"/><rect x="413" y="${jy - 11}" width="2" height="4"/></g>
      <rect x="326" y="${jy + 20}" width="148" height="5" fill="#0d1018"/>${Array.from({ length: 7 }, (_, i) => `<rect x="${336 + i * 20}" y="${jy + 21}" width="10" height="3" rx="1" fill="#fff6d6"/>`).join('')}
      ${lamps(vx, vw, vy + 18, 2 * Math.max(3, Math.round(vw / 240)), 26, 110).replace(/<rect[^>]*fill="#1c2232"\/>/g, '')}`,
  };
}

// Option 4: the current spotlit stage, cleaned up: a real court on a dark polished floor, two spotlights from the
// corners crossing on the team, and the players reflected in the floor.
// Options 5 and 6 are this clean floor seen from option 2's centre-court angle: 5 keeps the corner spotlights,
// 6 lights the team from a row of ceiling lights instead.
function spot({ vx, vy, vw, vh, vb, A }, v) {
  const full = v >= 5, c = cam(full ? FULL : HALF, A), top = c.pt(0, -3)[1], box = `x="${f1(vx)}" y="${f1(vy)}" width="${f1(vw)}" height="${f1(vh)}"`;
  const lines = courtLines(c, { full }), pool = full ? c.pt(0, 14) : c.pt(0, 6.6);
  const circle = full ? `<polygon points="${c.poly(c.arc(0, 14, 1.8, 0, Math.PI * 2, 1, 0, 60))}" fill="#2f55d4" opacity=".2"/>` : '';
  const hid = v >= 7, L = hid ? [vx + vw * .06, vy - 70] : [vx + vw * .1, vy + 30], R = hid ? [vx + vw * .94, vy - 70] : [vx + vw * .9, vy + 30], T = [400, pool[1] + 10];
  const beam = ([x, y], w) => { const dx = T[0] - x, dy = T[1] - y, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
    return `${f1(x + nx * 8)},${f1(y + ny * 8)} ${f1(x - nx * 8)},${f1(y - ny * 8)} ${f1(T[0] - nx * w)},${f1(T[1] - ny * w)} ${f1(T[0] + nx * w)},${f1(T[1] + ny * w)}`; };
  const can = ([x, y], k) => { const a = Math.atan2(T[1] - y, T[0] - x) * 180 / Math.PI;
    return `<circle cx="${f1(x)}" cy="${f1(y)}" r="46" fill="url(#hhalo)"/><g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(a)})"><rect x="-22" y="-11" width="30" height="22" rx="4" fill="#232a3b"/><rect x="6" y="-12" width="6" height="24" rx="2" fill="#2d3548"/><ellipse cx="12" cy="0" rx="3" ry="10" fill="#fff6d6"/></g><path d="M${f1(x)} ${f1(y)}V${f1(vy - 10)}" stroke="#232a3b" stroke-width="3"/>`; };
  return {
    refl: .22,
    defs: `${halo}${blur('hsoft', 9)}
      <radialGradient id="hglow" gradientUnits="userSpaceOnUse" cx="400" cy="200" r="${Math.max(440, vh * .6).toFixed(0)}"><stop offset="0" stop-color="#2f55d4" stop-opacity=".4"/><stop offset=".6" stop-color="#1c3896" stop-opacity=".1"/><stop offset="1" stop-color="#0c0c10" stop-opacity="0"/></radialGradient>
      <linearGradient id="hfl" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${f1(top)}" y2="${f1(vb)}"><stop offset="0" stop-color="#0b0d15"/><stop offset=".4" stop-color="#151a2a"/><stop offset="1" stop-color="#0c0e15"/></linearGradient>
      <radialGradient id="hside" gradientUnits="userSpaceOnUse" cx="400" cy="${f1(pool[1])}" r="${f1(Math.max(500, vw * .6))}"><stop offset=".4" stop-color="#07080c" stop-opacity="0"/><stop offset="1" stop-color="#07080c" stop-opacity=".9"/></radialGradient>
      <radialGradient id="hpool" gradientUnits="userSpaceOnUse" cx="400" cy="${f1(pool[1])}" r="240" gradientTransform="translate(400 ${f1(pool[1])}) scale(1 .4) translate(-400 ${f1(-pool[1])})"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".7" stop-color="#cfdcff" stop-opacity=".08"/><stop offset="1" stop-color="#cfdcff" stop-opacity="0"/></radialGradient>
      <linearGradient id="hbL" gradientUnits="userSpaceOnUse" x1="${f1(L[0])}" y1="${f1(L[1])}" x2="${T[0]}" y2="${f1(T[1])}"><stop offset="0" stop-color="#fff6d6" stop-opacity=".34"/><stop offset="1" stop-color="#fff6d6" stop-opacity=".04"/></linearGradient>
      <linearGradient id="hcone" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff6d6" stop-opacity=".22"/><stop offset="1" stop-color="#fff6d6" stop-opacity=".03"/></linearGradient>
      <linearGradient id="hbR" gradientUnits="userSpaceOnUse" x1="${f1(R[0])}" y1="${f1(R[1])}" x2="${T[0]}" y2="${f1(T[1])}"><stop offset="0" stop-color="#fff6d6" stop-opacity=".34"/><stop offset="1" stop-color="#fff6d6" stop-opacity=".04"/></linearGradient>`,
    under: `<rect ${box} fill="#0b0c12"/><rect ${box} fill="url(#hglow)"/>${hid ? stands(vx, vw, vy, top) : ''}
      <rect x="${f1(vx)}" y="${f1(top)}" width="${f1(vw)}" height="${f1(vb - top)}" fill="url(#hfl)"/>
      <polygon points="${keyPaint(c)}" fill="#2f55d4" opacity=".22"/>${circle}
      <g fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="2" stroke-linejoin="round"><path d="${lines.solid}"/><path d="${lines.dash}" stroke-dasharray="7 7"/></g>
      <rect x="${f1(vx)}" y="${f1(top)}" width="${f1(vw)}" height="${f1(vb - top)}" fill="url(#hside)"/>
      <ellipse cx="400" cy="${f1(pool[1])}" rx="380" ry="170" fill="url(#hpool)"/>
      ${hoop(c, { dim: full ? .65 : .5 })}
      ${v >= 8 ? natural(v, { vx, vy, vw, vh, vb, top, pool }) : v === 6 ? `<polygon class="beam" points="370,${f1(vy + 24)} 430,${f1(vy + 24)} 640,${f1(pool[1] + 30)} 160,${f1(pool[1] + 30)}" fill="url(#hcone)" filter="url(#hsoft)"/>
      <rect x="${f1(vx)}" y="${f1(vy + 14)}" width="${f1(vw)}" height="3" fill="#161b29"/>${lamps(vx, vw, vy + 22, Math.max(6, Math.round(vw / 105)))}`
    : `<g filter="url(#hsoft)"><polygon class="beam" points="${beam(L, 120)}" fill="url(#hbL)"/><polygon class="beam" style="animation-delay:2s" points="${beam(R, 120)}" fill="url(#hbR)"/></g>
      ${hid ? '' : can(L) + can(R)}`}`,
  };
}

// Option 3: the arena from option 1, drawn in chunky pixels to match the players.
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function pixel({ vx, vy, vw, vh, vb, A }) {
  const U = 4, W = Math.ceil(vw / U), H = Math.ceil(vh / U), c = cam(HALF, A);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), img = g.createImageData(W, H), px = img.data;
  const set = (i, j, [r, gg, b]) => { if (i < 0 || j < 0 || i >= W || j >= H) return; const k = (j * W + i) * 4; px[k] = r; px[k + 1] = gg; px[k + 2] = b; px[k + 3] = 255; };
  const get = (i, j) => { const k = (j * W + i) * 4; return [px[k], px[k + 1], px[k + 2]]; };
  const top = c.pt(0, -3)[1], WOOD = ['#3d2a1a', '#36251a', '#42301e', '#33231a'].map(hex), PAINT = hex('#22409a'), LINE = hex('#e8e1d4');
  const near = (a, w) => Math.abs(a) < w;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = vx + (i + .5) * U, y = vy + (j + .5) * U, dith = (i + j) & 1;
    if (y < top) { // the wall: dark, a little bluer towards the floor, in stepped bands
      const t = Math.floor(Math.max(0, (y - vy) / (top - vy)) * 4 + dith * .5) / 4;
      set(i, j, [7 + 10 * t, 8 + 14 * t, 13 + 34 * t]); continue;
    }
    const { d, z, X } = c.unproject(x, y), m = U * d / c.f, w = Math.max(.03, m * .55);
    const plank = Math.floor((X + 30) / .38);
    let col = WOOD[(plank * 7 + (plank >> 2)) % 4];
    if (Math.abs(X) < 2.45 && z > 0 && z < 5.8) col = PAINT;
    const r3 = Math.hypot(X, z - 1.575), rf = Math.hypot(X, z - 5.8);
    const line = (z > -w && near(z, w) && near(X, 7.5)) || near(Math.abs(X) - 7.5, w)
      || (z > 0 && z < 5.8 && near(Math.abs(X) - 2.45, w)) || (near(z - 5.8, w) && Math.abs(X) < 2.45)
      || (z > 5.8 && near(rf - 1.8, w)) || (z < 5.8 && near(rf - 1.8, w) && Math.floor(Math.atan2(X, z - 5.8) * 6) % 2 === 0)
      || (z > 0 && z < Z3 && near(Math.abs(X) - 6.6, w)) || (z >= Z3 && near(r3 - 6.75, w)) || (z > 1.575 && near(r3 - 1.25, w));
    if (line && z > -w) col = LINE;
    // A stepped pool of light round the team, dithered between steps.
    const Lt = Math.exp(-((X / 3.6) ** 2 + ((z - 6.6) / 2.6) ** 2)), q = Math.floor(Lt * 4 + dith * .5) / 4;
    const far = Math.min(1, Math.max(0, (z + 3) / 9)), edge = Math.max(0, 1 - Math.max(0, Math.abs(X) - 5) / 6);
    const k = (.35 + .25 * far * edge) + .7 * q;
    set(i, j, col.map((v, n) => Math.min(255, v * k + [38, 28, 10][n] * q)));
  }
  // Rows of fans in the stands.
  let s = 5; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const SK = ['#c99a74', '#e2b48b', '#a8704a', '#f0c8a2'].map(hex), SH = ['#2f55d4', '#e9b949', '#dddddd', '#3a3f4f', '#c0392b'].map(hex);
  const jt = Math.floor((top - vy) / U);
  for (let r = 4; r >= 0; r--) {
    const jy = jt - 4 - r * 4, dim = .55 - r * .08;
    for (let i = Math.floor(rnd() * 3); i < W; i += 3 + (rnd() < .3 ? 1 : 0)) {
      if (rnd() < .12) continue;
      const sk = SK[Math.floor(rnd() * 4)].map(v => v * dim), sh = SH[Math.floor(rnd() * 5)].map(v => v * dim), up = rnd() < .2 ? 1 : 0;
      set(i, jy - 3 - up, sk); set(i + 1, jy - 3 - up, sk); set(i, jy - 2 - up, sh); set(i + 1, jy - 2 - up, sh); set(i, jy - 1, sh); set(i + 1, jy - 1, sh);
    }
  }
  // An LED board along the front of the stands, every few lights lit.
  for (let i = 0; i < W; i++) { set(i, jt - 2, [22, 38, 92]); set(i, jt - 1, i % 6 < 2 ? [233, 185, 73] : [22, 38, 92]); }
  // Ceiling lights, each with a stepped halo, and the beam from the middle one down to the team.
  const jl = Math.floor(22 / U) + 1, n = Math.max(6, Math.round(vw / 105));
  for (let l = 0; l < n; l++) {
    const ci = Math.floor((vw / n) * (l + .5) / U);
    for (let dj = -3; dj <= 3; dj++) for (let di = -5; di <= 5; di++) { const rr = Math.hypot(di / 1.6, dj); if (rr < 3.2 && ((di + dj) & 1 || rr < 2)) { const v = get(ci + di, jl + dj); set(ci + di, jl + dj, v.map((x, nn) => x + [60, 56, 40][nn] * (1 - rr / 3.2))); } }
    for (let di = -2; di <= 2; di++) set(ci + di, jl, [255, 246, 214]);
    for (let di = -2; di <= 2; di++) set(ci + di, jl - 1, [40, 46, 62]);
  }
  const pj = Math.floor((c.pt(0, 6.6)[1] - vy) / U), mid = Math.floor((400 - vx) / U);
  for (let j = jl + 2; j < Math.min(H, pj); j++) {
    const half = 5 + (j - jl) * .62;
    for (let i = Math.floor(mid - half); i <= mid + half; i++) if ((i + j) % 2 === 0 && i >= 0 && i < W) { const v = get(i, j); set(i, j, v.map(x => Math.min(255, x + 16))); }
  }
  // The hoop: stanchion, backboard, rim and net.
  const P = (X, z, Y) => { const p = c.pt(X, z, Y); return [Math.round((p[0] - vx) / U), Math.round((p[1] - vy) / U)]; };
  const foot = P(0, -1.3, 0), arm = P(0, -1.3, 3.35);
  for (let j = arm[1]; j <= foot[1]; j++) set(foot[0], j, [58, 65, 82]);
  for (let i = foot[0] - 2; i <= foot[0] + 2; i++) { set(i, foot[1], [31, 58, 143]); set(i, foot[1] - 1, [31, 58, 143]); }
  const [b0, b1] = [P(-.9, 1.2, 3.95), P(.9, 1.2, 2.9)];
  for (let j = b0[1]; j <= b1[1]; j++) for (let i = b0[0]; i <= b1[0]; i++) {
    const edge = j === b0[1] || j === b1[1] || i === b0[0] || i === b1[0];
    set(i, j, edge ? [235, 238, 245] : get(i, j).map((v, nn) => v * .6 + [150, 170, 210][nn] * .3));
  }
  const [q0, q1] = [P(-.295, 1.2, 3.5), P(.295, 1.2, 3.05)];
  for (let i = q0[0]; i <= q1[0]; i++) { set(i, q0[1], [235, 238, 245]); }
  for (let j = q0[1]; j <= q1[1]; j++) { set(q0[0], j, [235, 238, 245]); set(q1[0], j, [235, 238, 245]); }
  const rim = P(0, 1.575, 3.05), rw = Math.max(2, Math.round(.25 * c.f / (c.dc - 1.575) / U));
  for (let i = rim[0] - rw; i <= rim[0] + rw; i++) set(i, rim[1], [238, 96, 24]);
  for (let jj = 1; jj <= 3; jj++) for (let i = rim[0] - rw + jj; i <= rim[0] + rw - jj; i++) if ((i + jj) % 2 === 0) set(i, rim[1] + jj, [235, 238, 245]);
  g.putImageData(img, 0, 0);
  return {
    refl: 0,
    defs: '',
    under: `<image href="${cv.toDataURL()}" x="${f1(vx)}" y="${f1(vy)}" width="${f1(W * U)}" height="${f1(H * U)}" preserveAspectRatio="none" style="image-rendering:pixelated"/>`,
  };
}
const Z3 = 1.575 + Math.sqrt(6.75 ** 2 - 6.6 ** 2);

// Option 7's backdrop: a dim crowd in two tiers, with the team's banners hanging from the rafters in front of
// the upper tier. Further banners are smaller and fainter, so the arena has some depth.
const EMBLEM = {
  trophy: ['#######', '#.###.#', '.#####.', '..###..', '...#...', '..###..', '.#####.'],
  ball: ['..###..', '.#.#.#.', '#..#..#', '#######', '#..#..#', '.#.#.#.', '..###..'],
  star: ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '##...##'],
};
function banner(x, y, w, h, kind, op) {
  const u = w / 11, e = EMBLEM[kind];
  let px = '';
  e.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') px += `<rect x="${f1(x + (i + 2) * u)}" y="${f1(y + h * .3 + j * u)}" width="${f1(u + .2)}" height="${f1(u + .2)}"/>`; }));
  const cut = h + w * .28;
  return `<g opacity="${op}"><path d="M${f1(x - 2)} ${f1(y - 400)}V${f1(y)}M${f1(x + w + 2)} ${f1(y - 400)}V${f1(y)}" stroke="#1d2436" stroke-width="1.2"/>
    <path d="M${f1(x)} ${f1(y)}h${f1(w)}V${f1(y + h)}L${f1(x + w / 2)} ${f1(y + cut)}L${f1(x)} ${f1(y + h)}Z" fill="#16295e"/>
    <path d="M${f1(x + u)} ${f1(y)}V${f1(y + h - u * .4)}L${f1(x + w / 2)} ${f1(y + cut - u * 1.3)}L${f1(x + w - u)} ${f1(y + h - u * .4)}V${f1(y)}" fill="none" stroke="#e9b949" stroke-width="${f1(u * .7)}" opacity=".75"/>
    <rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(u * 1.6)}" fill="#e9b949" opacity=".8"/>
    <g fill="${kind === 'ball' ? '#ee6018' : '#e9b949'}" shape-rendering="crispEdges">${px}</g></g>`;
}
function stands(vx, vw, vy, top) {
  // Lower tier right behind the floor, upper tier above a dark gap, fainter and smaller.
  let s = crowd({ x0: vx, x1: vx + vw, yb: top - 12, rows: 5, gap: 12, size: 6.5, seed: 9 })
    + `<rect x="${f1(vx)}" y="${f1(top - 82)}" width="${f1(vw)}" height="9" fill="#0d1226"/><rect x="${f1(vx)}" y="${f1(top - 74)}" width="${f1(vw)}" height="1.2" fill="#2f55d4" opacity=".55"/>`
    + crowd({ x0: vx, x1: vx + vw, yb: top - 86, rows: 4, gap: 10, size: 5, seed: 21, light: .7 })
    + flashes({ x0: vx, x1: vx + vw, y0: top - 120, y1: top - 16, n: 12, seed: 5 })
    + `<rect x="${f1(vx)}" y="${f1(top - 10)}" width="${f1(vw)}" height="10" fill="#14224f"/><rect x="${f1(vx)}" y="${f1(top - 10)}" width="${f1(vw)}" height="1.5" fill="#e9b949" opacity=".5"/>`;
  // Banners: a far row, small and faint, and a near pair on each side, bigger and closer to the edges.
  const kinds = ['trophy', 'star', 'ball'], far = [], near = [];
  const gapX = x => Math.abs(x - 400) < 70;
  for (let i = 0, x = 400 - 115; x > vx - 20; x -= 64, i++) far.push([x, i], [800 - x, i + 1]);
  far.forEach(([x, i]) => { if (!gapX(x)) s += banner(x - 13, top - 150, 26, 44, kinds[i % 3], .45); });
  for (let i = 0, x = 400 - 225; x > vx - 40; x -= 125, i++) near.push([x, i + 1], [800 - x, i + 2]);
  near.forEach(([x, i]) => { s += banner(x - 21, Math.max(top - 175, vy + 12) + (i % 2) * 6, 42, 70, kinds[i % 3], .8); });
  // A haze over the stands and banners, so they sit back behind the team.
  return s + `<defs><linearGradient id="hhaze" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${f1(vy)}" y2="${f1(top)}"><stop offset="0" stop-color="#0b0c12" stop-opacity=".55"/><stop offset=".7" stop-color="#0d1430" stop-opacity=".3"/><stop offset="1" stop-color="#0d1430" stop-opacity=".1"/></linearGradient></defs><rect x="${f1(vx)}" y="${f1(vy)}" width="${f1(vw)}" height="${f1(top - vy)}" fill="url(#hhaze)"/>`;
}

// Options 8-10: option 7 lit more naturally, with no beams from the sides.
//  8 even arena light: the whole floor and the stands lit softly, brightest round the team.
//  9 soft light from above: a broad diffuse glow over the team and a bigger pool at their feet.
// 10 skylights: warm, soft shafts of light falling at an angle from high windows.
function natural(v, { vx, vy, vw, vh, vb, top, pool }) {
  const box = `x="${f1(vx)}" y="${f1(vy)}" width="${f1(vw)}" height="${f1(vh)}"`, cy = f1(pool[1]);
  if (v === 8) return `<defs><radialGradient id="hev" gradientUnits="userSpaceOnUse" cx="400" cy="${cy}" r="${f1(Math.max(600, vw * .75))}" gradientTransform="translate(400 ${cy}) scale(1 .55) translate(-400 -${cy})"><stop offset="0" stop-color="#e8eeff" stop-opacity=".2"/><stop offset=".55" stop-color="#c9d6ff" stop-opacity=".08"/><stop offset="1" stop-color="#c9d6ff" stop-opacity="0"/></radialGradient>
      <linearGradient id="hevs" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#c9d6ff" stop-opacity=".02"/><stop offset="1" stop-color="#c9d6ff" stop-opacity=".09"/></linearGradient></defs>
    <rect x="${f1(vx)}" y="${f1(vy)}" width="${f1(vw)}" height="${f1(top - vy)}" fill="url(#hevs)"/><rect ${box} fill="url(#hev)"/>`;
  if (v === 9) return `<defs>${blur('hbig', 45)}<radialGradient id="hov" gradientUnits="userSpaceOnUse" cx="400" cy="${cy}" r="300" gradientTransform="translate(400 ${cy}) scale(1 .42) translate(-400 -${cy})"><stop offset="0" stop-color="#fff8e8" stop-opacity=".45"/><stop offset=".6" stop-color="#fff1d0" stop-opacity=".1"/><stop offset="1" stop-color="#fff1d0" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="400" cy="${f1(vy + (pool[1] - vy) * .35)}" rx="230" ry="${f1((pool[1] - vy) * .55)}" fill="#fff6e0" opacity=".2" filter="url(#hbig)"/>
    <ellipse cx="400" cy="${cy}" rx="520" ry="220" fill="url(#hov)"/>`;
  // Skylights: parallel shafts from the upper left.
  const dx = 260, h = pool[1] + 40 - (vy - 40);
  const shafts = [[-180, 70, .07], [-40, 46, .09], [90, 90, .06], [250, 50, .05], [380, 70, .04]].map(([x, w, o], i) => {
    const x0 = 400 + x - dx / 2, y0 = vy - 40;
    return `<polygon class="beam" style="animation-delay:${i * 1.4}s" points="${f1(x0)},${f1(y0)} ${f1(x0 + w)},${f1(y0)} ${f1(x0 + w + dx)},${f1(y0 + h)} ${f1(x0 + dx)},${f1(y0 + h)}" fill="url(#hsky)" opacity="${o * 10}"/>`; }).join('');
  return `<defs>${blur('hsky-b', 16)}<linearGradient id="hsky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffe9c4" stop-opacity=".42"/><stop offset=".75" stop-color="#ffe9c4" stop-opacity=".12"/><stop offset="1" stop-color="#ffe9c4" stop-opacity=".03"/></linearGradient>
    <radialGradient id="hskp" gradientUnits="userSpaceOnUse" cx="430" cy="${cy}" r="300" gradientTransform="translate(430 ${cy}) scale(1 .4) translate(-430 -${cy})"><stop offset="0" stop-color="#ffe2b0" stop-opacity=".26"/><stop offset="1" stop-color="#ffe2b0" stop-opacity="0"/></radialGradient></defs>
    <g filter="url(#hsky-b)">${shafts}</g><ellipse cx="430" cy="${cy}" rx="520" ry="210" fill="url(#hskp)"/>`;
}
