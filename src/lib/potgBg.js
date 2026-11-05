// Backdrops for the Player of the game dancer, in the stage's units (the player's feet near 130, 226).
// Each gives the SVG behind the player, the bits that only show when celebrating (`party`), and where the feet go.
// Everything is drawn in chunky squares so it sits with the pixel players.
import { playerCourt } from './playerCourt.js';
import { crowd } from './homeBg.js';
import { figure } from './avatar.js';

const Y0 = 70, Y1 = 256;
// Both side edges move out for the wide stage (iPad and computer), the player staying in the middle at 130.
let X0 = 20, X1 = 240, W = X1 - X0;
const WIDE = 190;
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${extra}/>`;
const seeded = seed => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const PIX = 3.4;

// Pixel confetti drifting down: royal, white and gold squares, the same each time.
function confetti(n = 18, seed = 11) {
  const rnd = seeded(seed), cols = ['#2f55d4', '#4f7cff', '#ffffff', '#e9b949', '#f4d37c'];
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = X0 + 10 + rnd() * (W - 20), z = 2 + Math.round(rnd() * 2), d = (3 + rnd() * 3).toFixed(1), dl = (-rnd() * 6).toFixed(1);
    out += `<rect class="pg-conf" x="${x.toFixed(1)}" y="${Y0}" width="${z}" height="${z}" fill="${cols[i % cols.length]}" style="animation-duration:${d}s;animation-delay:${dl}s"/>`;
  }
  return out;
}

// A pixel number from a 3 × 5 font, for the podium steps.
const DIG = { 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '011', '001', '111'] };
const digit = (d, x, y, p, fill) => DIG[d].flatMap((row, j) => [...row].map((c, i) => c === '1' ? rect(x + i * p, y + j * p, p, p, fill) : '')).join('');

// 1. The arena from the player page, evenly lit (no spotlight pool), with confetti.
function arena() {
  return { svg: playerCourt().replace(/<ellipse[^>]*url\(#pc-pool\)[^>]*\/>/, ''), party: confetti(), feet: 226, view: '48 86 164 158', k: 1.1 };
}

// 2. A small podium: the player on the top step, champagne spraying from a bottle on step 3, two flutes on step 2.
function podium() {
  const feet = 204, p = 2, F = 246;
  const wall = `<defs><linearGradient id="pd-wall" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#0d0f16" stop-opacity="0"/><stop offset=".5" stop-color="#151a2a"/><stop offset="1" stop-color="#1b2136"/></linearGradient>
    <linearGradient id="pd-floor" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#20263a"/><stop offset="1" stop-color="#0f1118"/></linearGradient></defs>`
    + rect(X0, Y0, W, 150, 'url(#pd-wall)') + rect(X0, F, W, Y1 - F, 'url(#pd-floor)')
    // Faint banners hanging behind: royal with a gold edge.
    + [64, 178].map(x => rect(x, 92, 18, 52, '#1c2b66', ' opacity=".55"') + rect(x, 140, 18, 2, '#e9b949', ' opacity=".4"')).join('');
  // Steps: a lit top, a front face, a darker edge.
  const step = (x, top, w, n) => rect(x, top, w, 3, '#f2f2f2') + rect(x, top + 3, w, F - top - 3, '#c9ccd6') + rect(x + w - 3, top + 3, 3, F - top - 3, '#a9adba')
    + digit(n, x + w / 2 - 1.5 * p * 1.5, top + 8, p * 1.5, n === 1 ? '#e9b949' : '#2f55d4');
  const steps = step(58, 216, 36, 2) + step(166, 222, 36, 3) + step(94, feet, 72, 1);
  // Two flutes on step 2.
  const flute = x => rect(x, 199, 6, 10, '#f4d37c', ' opacity=".9"') + rect(x, 198, 6, 1.5, '#fff', ' opacity=".8"') + rect(x + 2.2, 209, 1.6, 5, '#dfe3ea') + rect(x, 214, 6, 2, '#dfe3ea');
  // The bottle on step 3, tipped toward the player, with the cork popped.
  const bottle = `<g transform="translate(190 222) rotate(-35)">${rect(-7, -30, 14, 30, '#1f5a34')}${rect(-4, -28, 3, 24, '#3a8a57')}${rect(-7, -17, 14, 9, '#f4d37c')}${rect(-3.5, -42, 7, 12, '#1f5a34')}${rect(-3.5, -44, 7, 4, '#e9b949')}</g>`;
  // The spray: foam squares arcing up and over the player from the bottle's neck.
  const rnd = seeded(5);
  let spray = '';
  for (let i = 0; i < 40; i++) {
    const dx = -(20 + rnd() * 80), dy = -(50 + rnd() * 60), z = 2.5 + Math.round(rnd() * 2), d = (1.1 + rnd() * .8).toFixed(2), dl = (-rnd() * 2).toFixed(2);
    spray += rect(0, 0, z, z, i % 3 ? '#fff4c9' : '#ffffff', ` class="pg-drop" style="--dx:${dx.toFixed(0)}px;--dy:${dy.toFixed(0)}px;animation-duration:${d}s;animation-delay:${dl}s"`);
  }
  return { svg: wall + steps + flute(66) + flute(76) + bottle, party: `<g transform="translate(172 184)">${spray}</g>` + confetti(12, 3), feet, view: '24 70 212 182', k: .92 };
}

// 3. A disco: a mirror ball, coloured light specks drifting over the wall, and a floor of tiles that light up in turn.
function disco() {
  const top = 192, rnd = seeded(17), cols = ['#ff4fd8', '#4fe3ff', '#ffe14f', '#8a5bff', '#4fff9a'];
  const wall = `<defs><linearGradient id="dc-wall" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#0c0814"/><stop offset="1" stop-color="#1d1033"/></linearGradient></defs>` + rect(X0, Y0, W, top - Y0, 'url(#dc-wall)');
  // Floor: rows of tiles, narrower toward the back, each one dark with its own colour fading in and out.
  let floor = rect(X0, top, W, Y1 - top, '#120a1e'), y = top, row = 0;
  for (const h of [9, 11, 13, 15, 18]) {
    const tw = 18, n = Math.ceil(W / tw) + 1, off = 2;
    for (let i = -1; i < n; i++) {
      const x = X0 - off + i * tw, c = cols[(i * 2 + row * 3 + 50) % cols.length];
      floor += rect(x + .8, y + .8, tw - 1.6, h - 1.6, '#2a1a44') + rect(x + .8, y + .8, tw - 1.6, h - 1.6, c, ` class="pg-tile" style="animation-delay:${(-rnd() * 3).toFixed(2)}s"`);
    }
    y += h; row++;
  }
  // Mirror ball, upper left, on a string.
  const bx = 196, by = 98, r = 13;
  let ball = rect(bx - .5, Y0, 1, by - r - Y0, '#6b6f7a');
  for (let i = -r; i < r; i += PIX) for (let j = -r; j < r; j += PIX) {
    if ((i + PIX / 2) ** 2 + (j + PIX / 2) ** 2 > r * r) continue;
    const lit = (i + j) < -4 ? '#f4f6fb' : (i + j) < 6 ? '#b8bfcc' : '#6f7685';
    ball += rect(bx + i, by + j, PIX - .5, PIX - .5, lit);
  }
  const glint = rect(bx - 6, by - 7, 2, 2, '#fff', ' class="pg-glint"');
  // Light specks thrown by the ball, drifting slowly across the wall and floor.
  let specks = '';
  for (let i = 0; i < 34; i++) {
    const x = X0 + rnd() * W, yy = Y0 + 6 + rnd() * 170, z = 2.5 + Math.round(rnd());
    specks += rect(x.toFixed(1), yy.toFixed(1), z, z, cols[i % cols.length], ` class="pg-speck" opacity=".75" style="animation-delay:${(-rnd() * 6).toFixed(2)}s"`);
  }
  return { svg: wall + floor + ball + glint, party: specks, feet: 226, view: '24 70 212 182', k: .92 };
}

// 4. Fireworks over the city at night, from the court outside.
function fireworks() {
  const ground = 200, rnd = seeded(29);
  const sky = `<defs><linearGradient id="fw-sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#070a16"/><stop offset="1" stop-color="#1a2147"/></linearGradient></defs>` + rect(X0, Y0, W, ground - Y0, 'url(#fw-sky)');
  let stars = '';
  for (let i = 0; i < 26; i++) stars += rect((X0 + rnd() * W).toFixed(1), (Y0 + rnd() * 70).toFixed(1), 1.4, 1.4, '#fff', ` opacity="${(.3 + rnd() * .5).toFixed(2)}"`);
  // A low pixel skyline, then the outdoor court.
  let city = '', x = X0;
  while (x < X1) { const w = 8 + Math.round(rnd() * 3) * PIX, h = 8 + Math.round(rnd() * 6) * PIX; city += rect(x, ground - h, w, h, '#0e1226'); if (rnd() < .6) city += rect(x + 3, ground - h + 4, 2, 2, '#e9b949', ' opacity=".5"'); x += w + 1; }
  const court = rect(X0, ground, W, Y1 - ground, '#16203f') + `<ellipse cx="130" cy="226" rx="80" ry="16" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="1.6"/>` + rect(X0, ground, W, 1.5, '#fff', ' opacity=".12"');
  // Bursts: squares flying out from a point, then fading.
  const burst = (cx, cy, col, dl) => {
    let s = '';
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; s += rect((Math.cos(a) * 26).toFixed(1), (Math.sin(a) * 26).toFixed(1), 3.4, 3.4, col) + rect((Math.cos(a + .2) * 14).toFixed(1), (Math.sin(a + .2) * 14).toFixed(1), 2.6, 2.6, '#fff'); }
    return `<g transform="translate(${cx} ${cy})"><g class="pg-burst" style="animation-delay:${dl}s">${s}${rect(-1.5, -1.5, 3, 3, '#fff')}</g></g>`;
  };
  const party = burst(62, 104, '#e9b949', 0) + burst(196, 96, '#4f7cff', -.8) + burst(178, 150, '#ff8080', -1.6) + burst(76, 158, '#4fff9a', -2.4);
  return { svg: sky + stars + city + court, party, feet: 226, view: '24 70 212 182', k: .92 };
}

// A tiny 3 × 5 pixel font for the words on the magazine cover, the arcade screen and the jumbotron.
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', E: '111100110100111', G: '011100101101011', H: '101101111101101', I: '111010010010111',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '111101111100100', R: '110101110101101',
  S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', Y: '101101010010010', '!': '010010010000010', ' ': '000000000000000',
  0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001011001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001010010', 8: '111101111101111', 9: '111101111001111',
};
const text = (str, x, y, p, fill, extra = '') => `<g${extra}>` + [...String(str)].map((ch, k) => [...(FONT[ch] || FONT[' '])].map((c, i) => c === '1' ? rect((x + k * 4 * p + (i % 3) * p).toFixed(2), (y + Math.floor(i / 3) * p).toFixed(2), p, p, fill) : '').join('')).join('') + '</g>';
const textW = (str, p) => String(str).length * 4 * p - p;
const grad = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`;
const V = '24 70 212 182', K = .92;
// A camera flash: a white star that pops and fades.
const flash = (x, y, dl, z = 1) => `<g transform="translate(${x} ${y}) scale(${z})"><g class="pg-flash" style="animation-delay:${dl}s">${rect(-1.5, -7, 3, 14, '#fff')}${rect(-7, -1.5, 14, 3, '#fff')}${rect(-3, -3, 6, 6, '#fff')}</g></g>`;
const flashes = (pts, seed) => { const rnd = seeded(seed); return pts.map(([x, y]) => flash(x, y, (-rnd() * 3).toFixed(2), .8 + rnd() * .5)).join(''); };
// Things falling past: ticker tape, drink, stars.
function fall(n, seed, cols, { x0 = X0, x1 = X1, w = [2, 3], h = [2, 3], cls = 'pg-conf', dur = [3, 6], y0 = Y0 } = {}) {
  const rnd = seeded(seed); let out = '';
  for (let i = 0; i < n; i++) {
    const x = x0 + rnd() * (x1 - x0), ww = w[0] + rnd() * (w[1] - w[0]), hh = h[0] + rnd() * (h[1] - h[0]), d = (dur[0] + rnd() * (dur[1] - dur[0])).toFixed(1), dl = (-rnd() * 6).toFixed(1);
    out += rect(x.toFixed(1), y0, ww.toFixed(1), hh.toFixed(1), cols[i % cols.length], ` class="${cls}" style="animation-duration:${d}s;animation-delay:${dl}s"`);
  }
  return out;
}

// 5. Magazine cover: the player as the cover star, a bold masthead, cover lines, a barcode, and camera flashes.
function magazine() {
  const cx = 60, cy = 76, cw = 140, ch = 166;
  let cover = `<defs>${grad('mg-c', [[0, '#c63a2e'], [1, '#8d241c']])}</defs>` + rect(X0, Y0, W, Y1 - Y0, '#121216')
    + rect(cx + 2, cy + 3, cw, ch, '#000', ' opacity=".4"') + rect(cx, cy, cw, ch, 'url(#mg-c)');
  cover += text('POTG', cx + (cw - textW('POTG', 6)) / 2, cy + 6, 6, '#fff');
  cover += rect(cx + 8, cy + 40, cw - 16, 1.5, '#f4d37c', ' opacity=".8"') + text('ISSUE 1', cx + 8, cy + 44, 1.4, '#f4d37c');
  // Cover lines on the left, a barcode bottom right.
  for (let i = 0; i < 4; i++) cover += rect(cx + 6, cy + 62 + i * 14, 18 - (i % 2) * 5, 3, '#fff', ' opacity=".85"') + rect(cx + 6, cy + 67 + i * 14, 12, 2, '#f4d37c', ' opacity=".7"');
  cover += rect(cx + cw - 24, cy + ch - 20, 18, 14, '#fff');
  for (let i = 0; i < 8; i++) cover += rect(cx + cw - 22 + i * 2, cy + ch - 18, (i % 3 ? 1 : 1.5), 10, '#111');
  cover += text('BRICK', cx + 8, cy + ch - 16, 1.6, '#fff', ' opacity=".9"');
  return { svg: cover, party: flashes([[38, 110], [222, 96], [30, 196], [226, 180], [214, 236], [42, 240]], 41), feet: 226, view: V, k: K };
}

// 6. Red carpet: a wall of little ball logos, the carpet running back, gold posts and velvet rope, and paparazzi whose cameras flash every now and then.
function redcarpet() {
  let wall = `<defs>${grad('rc-w', [[0, '#0e0f14'], [1, '#1b1d28']])}${grad('rc-c', [[0, '#7d1a1a'], [1, '#b32525']])}</defs>` + rect(X0, Y0, W, 196 - Y0, 'url(#rc-w)');
  for (let y = 82, r = 0; y < 186; y += 22, r++) for (let x = X0 + (r % 2) * 14; x < X1; x += 28) wall += rect(x, y, 6, 6, '#e9b949', ' opacity=".18"') + rect(x + 2.5, y, 1, 6, '#0e0f14', ' opacity=".25"');
  const floor = rect(X0, 196, W, Y1 - 196, '#0d0d10') + `<path d="M96 196H164L200 ${Y1}H60Z" fill="url(#rc-c)"/>` + `<path d="M96 196H164L165 199H95Z" fill="#d14040" opacity=".6"/>`;
  // Posts with rope swags on both sides.
  const post = x => rect(x - 2, 198, 4, 30, '#e9b949') + rect(x - 4, 196, 8, 4, '#f4d37c') + rect(x - 5, 228, 10, 3, '#b8892a');
  const rope = (a, b) => { let r = ''; for (let i = 0; i <= 10; i++) { const t = i / 10, x = a + (b - a) * t, y = 201 + Math.sin(t * Math.PI) * 9; r += rect(x.toFixed(1), y.toFixed(1), 3.4, 3.4, '#8d1d2a'); } return r; };
  const posts = post(30) + post(66) + post(194) + post(230) + rope(30, 64) + rope(194, 228);
  // Paparazzi behind the rope on both sides, each one's camera going off every now and then with a burst and a glow.
  const rnd = seeded(7), pap = (x, face) => {
    const dur = (5 + rnd() * 4).toFixed(1), dl = (-rnd() * 8).toFixed(1), cx = x + face * 6;
    return rect(x - 4, 176, 8, 8, '#33364a') + rect(x - 6, 184, 12, 22, '#33364a') + rect(cx - 3, 177, 6, 5, '#3a3d4c') + rect(cx + (face > 0 ? 2 : -4), 178, 2, 3, '#555a6e')
      + `<g class="pg-pap" style="animation-duration:${dur}s;animation-delay:${dl}s"><circle cx="${cx}" cy="179" r="34" fill="url(#rc-f)"/>${rect(cx - 1.5, 172, 3, 14, '#fff')}${rect(cx - 7, 177.5, 14, 3, '#fff')}${rect(cx - 3, 176, 6, 6, '#fff')}</g>`;
  };
  const glow = `<defs><radialGradient id="rc-f"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`;
  const paps = glow + [28, 50, ...(W > 220 ? [6, -16] : [])].map(x => pap(x, 1) + pap(260 - x, -1)).join('');
  // Big bright flashes going off on their own all over the scene, each with a wide glow and a brief wash of light.
  const big = (x, y, i) => {
    const dur = (3.5 + rnd() * 3).toFixed(1), dl = (-rnd() * 6).toFixed(1), z = (1.4 + rnd() * .8).toFixed(2);
    return `<g class="pg-pap" style="animation-duration:${dur}s;animation-delay:${dl}s"><circle cx="${x}" cy="${y}" r="70" fill="url(#rc-b)"/>`
      + `<g transform="translate(${x} ${y}) scale(${z})">${rect(-1.5, -10, 3, 20, '#fff')}${rect(-10, -1.5, 20, 3, '#fff')}${rect(-4, -4, 8, 8, '#fff')}${rect(-6, -6, 2, 2, '#fff')}${rect(4, -6, 2, 2, '#fff')}${rect(-6, 4, 2, 2, '#fff')}${rect(4, 4, 2, 2, '#fff')}</g></g>`;
  };
  const bigs = `<defs><radialGradient id="rc-b"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".35" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`
    + [[X0 + 22, 96], [X0 + 60, 140], [X1 - 30, 104], [X1 - 64, 150], [130 - 46, 86], [130 + 48, 122], [X0 + 30, 186], [X1 - 22, 180]].map(([x, y], i) => big(x, y, i)).join('');
  return { svg: wall + floor + paps + posts + bigs, party: '', feet: 226, view: V, k: K };
}

// 9. Jumbotron: the player on the big screen above the crowd, who are lit up with phone lights.
function jumbotron(look) {
  let s = `<defs>${grad('jb-w', [[0, '#07080c'], [1, '#121522']])}</defs>` + rect(X0, Y0, W, Y1 - Y0, 'url(#jb-w)');
  s += crowd({ x0: X0, x1: X1, yb: 190, rows: 5, gap: 11, size: 6, seed: 4, light: 1.7 }) + rect(X0, 190, W, 10, '#14224f') + rect(X0, 190, W, 1.5, '#e9b949', ' opacity=".5"');
  s += rect(X0, 200, W, Y1 - 200, '#151a2a');
  // The screen: a frame, the player small in the middle, POTG either side.
  const sx = 56, sy = 74, sw = 148, sh = 58;
  s += rect(sx - 3, sy - 3, sw + 6, sh + 6, '#2a2e3a') + rect(sx, sy, sw, sh, '#0b1a44') + rect(sx, sy, sw, sh, '#2f55d4', ' class="pg-screen" opacity=".25"');
  s += `<g transform="translate(${130 - 27} ${sy + 3}) scale(.54)">${figure(look, { stage: true, pose: 'fist2' }).replace('<g class="av-eyes">', '<g class="av-eyes" opacity="0">').replace('<g class="av-smile">', '<g class="av-smile" style="opacity:1">')}</g>`;
  s += text('POTG', sx + 6, sy + 22, 2.2, '#f4d37c') + text('POTG', sx + sw - 6 - textW('POTG', 2.2), sy + 22, 2.2, '#f4d37c');
  for (let y = sy; y < sy + sh; y += 2) s += rect(sx, y, sw, .6, '#000', ' opacity=".18"');
  s += rect(126, Y0, 1.5, sy - 3 - Y0, '#2a2e3a') + rect(134, Y0, 1.5, sy - 3 - Y0, '#2a2e3a');
  // Phone lights twinkling in the crowd.
  const rnd = seeded(9); let lights = '';
  for (let i = 0; i < 30; i++) lights += rect((X0 + rnd() * W).toFixed(1), (148 + rnd() * 38).toFixed(1), 1.8, 1.8, '#fffbe0', ` class="pg-twinkle" style="animation-delay:${(-rnd() * 2).toFixed(2)}s"`);
  return { svg: s, party: lights, feet: 226, view: V, k: K };
}

// 10. Beach party at sunset: the sun on the sea, palm trees, a boombox, and a beach ball bouncing.
function beach() {
  let s = `<defs>${grad('bc-s', [[0, '#120a1c'], [.45, '#5a2148'], [.8, '#e0603a'], [1, '#f5a44a']])}</defs>` + rect(X0, Y0, W, 176 - Y0, 'url(#bc-s)');
  // The sun, in stripes, sitting on the horizon.
  for (let j = 0; j < 8; j++) { const y = 148 + j * 3.4, hw = Math.sqrt(Math.max(0, 28 ** 2 - (28 - j * 3.4) ** 2)); if (j % 3 !== 2) s += rect((130 - hw).toFixed(1), y.toFixed(1), (hw * 2).toFixed(1), 3.4, '#ffd27a'); }
  s += rect(X0, 176, W, 22, '#2b3f7a') + rect(X0, 176, W, 2, '#ffd27a', ' opacity=".5"');
  for (let i = 0; i < 6; i++) s += rect(112 + (i % 2) * 8, 182 + i * 3, 36 - i * 4, 1.5, '#ffd27a', ' opacity=".45"');
  s += rect(X0, 198, W, Y1 - 198, '#c9a26a') + rect(X0, 198, W, 3, '#e0be86');
  for (let i = 0, r = seeded(2); i < 30; i++) s += rect((X0 + r() * W).toFixed(1), (204 + r() * 48).toFixed(1), 2, 1.5, '#a8834f');
  // Palm trees: a leaning trunk and fronds.
  const palm = (x, dir) => {
    let t = '';
    for (let i = 0; i < 12; i++) t += rect((x + dir * i * i * .12).toFixed(1), 198 - i * 7, 7, 7, i % 2 ? '#4a3220' : '#5c3e27');
    const tx = x + dir * 13.2 + 3, ty = 116;
    for (const [dx, dy] of [[-1, 0], [1, 0], [-.7, .5], [.7, .5], [0, -.6]]) for (let k = 1; k <= 5; k++) t += rect((tx + dx * k * 6 - 3).toFixed(1), (ty + dy * k * 6 + (dx ? k * k * .5 : 0)).toFixed(1), 6, 4, '#1f6b3a');
    return t;
  };
  s += palm(34, 1) + palm(216, -1);
  // The boombox, speakers pulsing.
  const bx = 52, by = 214;
  s += rect(bx, by, 32, 18, '#2a2e3a') + rect(bx + 6, by - 5, 20, 2, '#8a93a6') + rect(bx + 6, by - 5, 2, 5, '#8a93a6') + rect(bx + 24, by - 5, 2, 5, '#8a93a6') + rect(bx + 13, by + 3, 6, 4, '#4fe3ff', ' opacity=".7"');
  const spk = x => `<g transform="translate(${x} ${by + 10})"><g class="pg-pulse">${rect(-4, -4, 8, 8, '#111')}${rect(-1.5, -1.5, 3, 3, '#555')}</g></g>`;
  // A little red crab on the sand to the right, claws up, scuttling side to side.
  const cx = 190, cy = 226, P = 2.2, O = '#e0322a', D = '#a5201c';
  const CRAB = ['.O.......O.', 'OO.......OO', '.O..o.o..O.', '..O.k.k.O..', '...OOOOO...', '..OOOOOOO..', '.DOOOOOOOD.', '..D.D.D.D..'];
  let crab = '';
  CRAB.forEach((row, j) => [...row].forEach((c, i) => { const f = { O, D, o: '#ffffff', k: '#111' }[c]; if (f) crab += rect((cx + (i - 5.5) * P).toFixed(1), (cy + (j - 8) * P).toFixed(1), P, P, f); }));
  s += `<ellipse cx="${cx}" cy="${cy + .6}" rx="11" ry="1.6" fill="#8a6a3c" opacity=".45"/><g class="pg-crab">${crab}</g>`;
  return { svg: s, party: spk(bx + 6) + spk(bx + 26), feet: 226, view: V, k: K };
}

// 11. Rooftop court at sunset: sky from orange to purple, the city behind a chain-link fence, the court underfoot.
function rooftop() {
  let s = `<defs>${grad('rt-s', [[0, '#140c26'], [.5, '#4b2a6a'], [.85, '#d4583a'], [1, '#f08a3c']])}</defs>` + rect(X0, Y0, W, 190 - Y0, 'url(#rt-s)');
  const rnd = seeded(37); let x = X0;
  while (x < X1) { const w = 10 + Math.round(rnd() * 3) * PIX, h = 20 + Math.round(rnd() * 10) * PIX; s += rect(x, 190 - h, w, h, '#1a1230'); for (let wy = 190 - h + 5; wy < 186; wy += 9) if (rnd() < .5) s += rect(x + 3, wy, 2.5, 3, '#f4b24a', ' opacity=".55"'); x += w + 2; }
  s += rect(X0, 190, W, Y1 - 190, '#2c5a5a') + rect(X0, 190, W, 2, '#3e7474');
  s += `<path d="M30 ${Y1}L74 198H186L230 ${Y1}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.6"/>` + `<ellipse cx="130" cy="232" rx="34" ry="8" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1.6"/>`;
  // Chain-link fence: diamonds over the skyline, with posts.
  let fence = '';
  for (let fx = X0; fx < X1; fx += 8) fence += `<path d="M${fx} 136L${fx + 40} 190M${fx + 40} 136L${fx} 190" stroke="#c9ced8" stroke-opacity=".22" stroke-width="1"/>`;
  for (let px = X0 + 8; px < X1; px += 52) fence += rect(px, 132, 3, 60, '#8a93a6', ' opacity=".7"');
  fence += rect(X0, 132, W, 2.5, '#8a93a6', ' opacity=".7"');
  const birds = `<g class="pg-birds">${rect(60, 96, 3, 1.5, '#1a1230')}${rect(63, 95, 3, 1.5, '#1a1230')}${rect(72, 102, 3, 1.5, '#1a1230')}${rect(75, 101, 3, 1.5, '#1a1230')}</g>`;
  return { svg: s + fence, party: birds + fall(10, 5, ['#f4d37c', '#ffffff'], {}), feet: 226, view: V, k: K };
}

// 13. Arcade game: a starfield scrolling down, 1UP and HIGH SCORE at the top, a neon grid floor, coins popping out,
// and little space shooters sweeping about in the back, firing.
function arcade() {
  let s = rect(X0, Y0, W, Y1 - Y0, '#05050c');
  s += text('1UP', 50, 78, 2, '#ff4f6a') + text('2026', 50, 90, 2, '#fff') + text('HI SCORE', 210 - textW('HI SCORE', 2), 78, 2, '#ff4f6a') + text('99999', 210 - textW('99999', 2), 90, 2, '#fff');
  // The neon grid floor, lines running back to a point.
  s += rect(X0, 196, W, Y1 - 196, '#14062a') + rect(X0, 196, W, 1.5, '#ff4fd8');
  for (const y of [202, 210, 221, 236]) s += rect(X0, y, W, 1, '#ff4fd8', ' opacity=".55"');
  for (let i = -6; i <= 6; i++) s += `<path d="M${130 + i * 10} 196L${130 + i * 40} ${Y1}" stroke="#ff4fd8" stroke-opacity=".45" stroke-width="1"/>`;
  const stars = fall(30, 51, ['#ffffff', '#9fb4ff', '#ffe14f'], { y0: Y0, w: [1.2, 2], h: [1.2, 2], cls: 'pg-star', dur: [1.5, 3] });
  // Coins popping up from either side and falling back.
  const rnd = seeded(61); let coins = '';
  for (let i = 0; i < 6; i++) {
    const x = i < 3 ? 40 + i * 12 : 196 + (i - 3) * 12;
    coins += `<g transform="translate(${x} 196)"><g class="pg-coin" style="animation-delay:${(-rnd() * 2.4).toFixed(2)}s">${rect(-3, -8, 6, 8, '#e9b949')}${rect(-1, -7, 2, 6, '#fff2b0')}</g></g>`;
  }
  // Little space shooters in the back: each one sweeps side to side and fires bolts upward.
  const ship = (c, w) => rect(-1, -6, 2, 2, '#ffffff') + rect(-2, -4, 4, 3, c) + rect(-5, -1, 10, 3, c) + rect(-6, 1, 2, 3, w) + rect(4, 1, 2, 3, w) + rect(-1.5, 2, 3, 2, '#4fe3ff') + rect(-1, 4, 2, 1.5, '#ffb44f', ' class="pg-twinkle"');
  const bolts = dl => [0, 1, 2].map(i => rect(-.6, -10, 1.2, 4, '#ffe14f', ` class="pg-bolt" style="animation-delay:${(dl - i * .45).toFixed(2)}s"`)).join('');
  const chase = [[X0 + W * .26, 128, '#2f55d4', '#9fb4ff', 0, 4.2, 26], [X0 + W * .5, 116, '#c0392b', '#ff8080', -1.3, 5.4, -34], [X0 + W * .76, 140, '#8a5bff', '#cfc0ff', -2.6, 3.6, 22]]
    .map(([x, y, c, w, dl, dur, sw]) => `<g transform="translate(${x.toFixed(1)} ${y}) scale(1.5)"><g class="pg-ship" style="--sw:${sw}px;animation-duration:${dur}s;animation-delay:${dl}s">${bolts(dl)}${ship(c, w)}</g></g>`).join('');
  return { svg: s + chase, party: stars + coins, feet: 226, view: V, k: K };
}

// 14. Space: standing on the moon, the Earth rising behind, stars twinkling and a little rocket drifting by.
function space() {
  const rnd = seeded(83), ground = 208;
  let s = `<defs>${grad('sp-s', [[0, '#02030a'], [1, '#0c1026']])}</defs>` + rect(X0, Y0, W, Y1 - Y0, 'url(#sp-s)');
  let stars = '';
  for (let i = 0; i < 46; i++) stars += rect((X0 + rnd() * W).toFixed(1), (Y0 + rnd() * 130).toFixed(1), 1.6, 1.6, '#fff', ` class="${i % 3 ? '' : 'pg-twinkle'}" opacity="${(.35 + rnd() * .6).toFixed(2)}" style="animation-delay:${(-rnd() * 2).toFixed(2)}s"`);
  // The Earth: a pixel disc of sea with green land and a thin glow.
  const ex = 196, ey = 104, er = 20;
  let earth = `<circle cx="${ex}" cy="${ey}" r="${er + 3}" fill="#4f7cff" opacity=".18"/>`;
  for (let i = -er; i < er; i += PIX) for (let j = -er; j < er; j += PIX) {
    const d = (i + PIX / 2) ** 2 + (j + PIX / 2) ** 2; if (d > er * er) continue;
    const land = Math.sin(i * .21 + 1) + Math.cos(j * .26 - .5) > 1.1, night = i + j > 14;
    earth += rect(ex + i, ey + j, PIX, PIX, land ? (night ? '#1c5a30' : '#3a9a55') : (night ? '#1b3a8a' : '#2f6ad4'));
  }
  // The moon's surface: grey, with craters.
  let moon = rect(X0, ground, W, Y1 - ground, '#6d7080') + rect(X0, ground, W, 3, '#8d909e');
  for (const [x, y, w] of [[40, 222, 22], [92, 240, 16], [176, 232, 26], [214, 216, 14], [X0 + 6, 236, 18], [X1 - 30, 244, 20]]) moon += `<ellipse cx="${x}" cy="${y}" rx="${w / 2}" ry="${w / 6}" fill="#55586a"/><ellipse cx="${x}" cy="${y - 1}" rx="${w / 2 - 2}" ry="${w / 6 - 1}" fill="#4a4d5e"/>`;
  // A small flag planted beside the player.
  moon += rect(176, 176, 1.6, 34, '#cfd3db') + rect(177.6, 176, 18, 11, '#2f55d4') + rect(177.6, 176, 18, 2.5, '#e9b949');
  const rocket = `<g class="pg-rocket"><g transform="translate(${X0 + 10} 128) rotate(-20)">${rect(0, 0, 14, 6, '#e8e8ee')}${rect(14, 1, 4, 4, '#e74c3c')}${rect(3, 1.5, 3, 3, '#4fe3ff')}${rect(-3, -1, 3, 2, '#e74c3c')}${rect(-3, 5, 3, 2, '#e74c3c')}${rect(-7, 1.5, 5, 3, '#f4b24a', ' class="pg-twinkle"')}</g></g>`;
  return { svg: s + earth + moon, party: stars + rocket, feet: 226, view: V, k: K };
}

// 15. Neon city rooftop at night: a big flickering MVP sign, rain falling, and the ground shining with its reflection.
function neon() {
  const ground = 204;
  let s = `<defs>${grad('ne-s', [[0, '#05060e'], [1, '#141030']])}${grad('ne-g', [[0, '#1a1630'], [1, '#0a0912']])}</defs>` + rect(X0, Y0, W, ground - Y0, 'url(#ne-s)');
  // Blurred city lights far off.
  const rnd = seeded(13), cols = ['#ff4fd8', '#4fe3ff', '#ffe14f', '#8a5bff'];
  for (let i = 0; i < 40; i++) { const z = 3 + rnd() * 5; s += `<circle cx="${(X0 + rnd() * W).toFixed(1)}" cy="${(150 + rnd() * 50).toFixed(1)}" r="${z.toFixed(1)}" fill="${cols[i % 4]}" opacity="${(.08 + rnd() * .12).toFixed(2)}"/>`; }
  // The sign on its frame, glowing.
  // The M is five pixels wide (the 3 × 5 font's M reads as an H); V and P come from the font.
  const NP = 7, mw = 5 * NP, tw = mw + NP + textW('VP', NP), tx = 130 - tw / 2, ty = 92;
  const M = ['10001', '11011', '10101', '10001', '10001'];
  const word = (x, y, p, fill, extra = '') => `<g${extra}>${M.flatMap((row, j) => [...row].map((c, i) => c === '1' ? rect(x + i * p, y + j * p, p, p, fill) : '')).join('')}</g>` + text('VP', x + 6 * p, y, p, fill, extra);
  s += rect(tx - 8, ty - 6, tw + 16, 50, '#14121e') + rect(tx - 8, ty - 6, tw + 16, 50, 'none', ' stroke="#2a2638" stroke-width="2"');
  s += rect(tx + 4, ty + 44, 2, ground - ty - 44, '#2a2638') + rect(tx + tw - 6, ty + 44, 2, ground - ty - 44, '#2a2638');
  const sign = `<g class="pg-neon">${word(tx - 1.5, ty - 1.5, NP + .6, '#ff4fd8', ' opacity=".25"')}${word(tx, ty, NP, '#ff7ae4')}</g>`;
  // The wet ground: dark, with the sign reflected in streaks.
  s += rect(X0, ground, W, Y1 - ground, 'url(#ne-g)') + rect(X0, ground, W, 1.5, '#ff4fd8', ' opacity=".35"');
  let refl = '';
  for (let i = 0; i < 9; i++) refl += rect(tx + i * tw / 9, ground + 6 + (i % 3) * 4, tw / 12, 18 + (i % 2) * 10, '#ff4fd8', ' opacity=".12"');
  const rain = fall(40, 101, ['#9fb4ff', '#cfe0ff'], { w: [.7, 1], h: [7, 11], cls: 'pg-rain', dur: [.5, .9], y0: Y0 - 10 });
  return { svg: s + refl, party: sign + rain, feet: 226, view: V, k: K };
}

export const BACKDROPS = { podium, disco, fireworks, magazine, redcarpet, jumbotron, beach, rooftop, arcade, space, neon };
export const BACKDROP_KEYS = Object.keys(BACKDROPS);
const built = new Map();
// Built once per backdrop (and per player for the jumbotron, which shows them on the screen).
export function backdrop(k, look, wide) {
  const key = (k === 'jumbotron' ? k + JSON.stringify(look) : k) + (wide ? ':wide' : '');
  if (!built.has(key)) {
    if (wide) { X0 = 130 - WIDE; X1 = 130 + WIDE; W = X1 - X0; }
    const b = (BACKDROPS[k] || arena)(look);
    X0 = 20; X1 = 240; W = X1 - X0;
    // The wide view keeps the same top and bottom, and reaches out the same distance either side of the player.
    if (wide) { const [, y, , h] = b.view.split(' ').map(Number); b.view = `${130 - WIDE + 6} ${y} ${2 * (WIDE - 6)} ${h}`; }
    built.set(key, b);
  }
  return built.get(key);
}
// A different backdrop from last time, each time a Game page opens.
let last = null;
export function randomBackdrop() {
  const ks = BACKDROP_KEYS.filter(k => k !== last);
  return (last = ks[Math.floor(Math.random() * ks.length)]);
}
