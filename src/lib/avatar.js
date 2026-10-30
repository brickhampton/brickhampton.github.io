// Pixel-art players in the team jersey, drawn from each player's look (saved in players.look).
// A look is { v: 2, skin, hair, style, eyes, eyeY, brows, beard, glasses, height, weight, muscle, socks,
// band, wrist, sleeve, stripe, shoe }: colours as hex, everything else an index into OPTS (0 is the default).
// Looks saved before the pixel style (no v) are converted, so every saved avatar still draws.

const HEX = /^#[0-9a-f]{6}$/i;
const color = (v, d) => HEX.test(v || '') ? v : d;
const pick = (v, list) => Number.isInteger(v) && v >= 0 && v < list.length ? v : 0;
// Mixes a colour toward black (t > 0) or white (t < 0), or blends two colours.
const mix = (hex, t) => '#' + [1, 3, 5].map(i => {
  const c = parseInt(hex.slice(i, i + 2), 16), v = t > 0 ? c * (1 - t) : c + (255 - c) * -t;
  return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
}).join('');
const blend = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');

export const SKINS = ['#f8dcc4', '#f4d1ad', '#f2c9a3', '#e9bd95', '#e0ac80', '#d6a077', '#c18557', '#a8704a', '#8a5638', '#6b4029'];
export const HAIRS = ['#0f0c0c', '#2b1d15', '#5a3a22', '#8a5a2b', '#c9a063', '#a3472a', '#8f8f8f', '#e6e6e6', '#2f55d4', '#c0392b'];
export const BANDS = ['#2f55d4', '#eeeeee', '#1b1b1b', '#c0392b', '#ee6018', '#e9b949'];
export const SHOES = ['#f2f2f2', '#1b1b1b', '#ee6018', '#c0392b', '#e9b949', '#2f55d4', '#2fb36b'];

// Each option list: the label shown in the builder. Index 0 is the default.
export const OPTS = {
  height: ['Average', 'Short', 'Tall', 'Very tall'],
  weight: ['Average', 'Broad', 'Heavy'],
  muscle: ['Toned', 'Athletic', 'Muscular'],
  style: ['Short', 'Buzz', 'Bald', 'Fringe', 'Swept', 'Curtains', 'Messy', 'Quiff', 'Spiky', 'Mohawk', 'Afro', 'Bun', 'Long', 'Cornrows'],
  eyes: ['Dots', 'Big', 'Shine', 'Small', 'Happy', 'Sleepy'],
  eyeY: ['Default', 'Higher', 'Lower'],
  brows: ['None', 'Thin', 'Thick', 'Angled', 'Raised'],
  beard: ['None', 'Stubble', 'Moustache', 'Goatee', 'Chinstrap', 'Beard'],
  glasses: ['None', 'Square', 'Round', 'Shades', 'Sport'],
  socks: ['Crew', 'High', 'Low'],
};
const NUMS = ['height', 'weight', 'muscle', 'style', 'eyes', 'eyeY', 'brows', 'beard', 'glasses', 'socks'];
const COLOURS = ['band', 'wrist', 'sleeve', 'stripe'];

// Looks saved by the first (cartoon) builder used other lists; map each old choice to its nearest pixel one.
const OLD = {
  style: [0, 0, 6, 4, 8, 1, 10, 9, 11, 12, 10, 6, 2, 5, 3, 7],
  weight: [0, 0, 2], muscle: [0, 0, 2], eyes: [0, 4, 1, 5, 3], beard: [0, 1, 2, 3, 5, 4], glasses: [0, 2, 1, 4, 3],
};
function fromOld(p) {
  const out = { ...p, v: 2 };
  for (const k in OLD) if (Number.isInteger(p[k])) out[k] = OLD[k][p[k]] ?? 0;
  if (Number.isInteger(p.style) && p.style >= OLD.style.length) out.style = 0;
  return out;
}

// A clean copy of a saved look with every part in range, so nothing odd from the database reaches the page.
export function cleanLook(raw = {}) {
  const p = raw.v === 2 ? raw : fromOld(raw);
  const out = { v: 2, skin: color(p.skin, SKINS[2]), hair: color(p.hair, HAIRS[0]), shoe: color(p.shoe, SHOES[0]) };
  for (const k of NUMS) out[k] = pick(p[k], OPTS[k]);
  for (const k of COLOURS) out[k] = HEX.test(p[k] || '') ? p[k] : null;
  if (p.band === true) out.band = BANDS[0];
  return out;
}

// Just the parts of a look that are worth saving (defaults left out).
export function lookOf(p) {
  const c = cleanLook(p), out = { v: 2, skin: c.skin, hair: c.hair };
  for (const k of NUMS) if (c[k]) out[k] = c[k];
  for (const k of COLOURS) if (c[k]) out[k] = c[k];
  if (c.shoe !== SHOES[0]) out.shoe = c.shoe;
  return out;
}

export function randomLook() {
  const r = n => Math.floor(Math.random() * n), any = list => list[r(list.length)];
  const some = (chance, list) => Math.random() < chance ? any(list) : null;
  const maybe = (chance, k) => Math.random() < chance ? 1 + r(OPTS[k].length - 1) : 0;
  return lookOf({
    v: 2, skin: any(SKINS), hair: any(HAIRS.slice(0, 7)), style: r(OPTS.style.length),
    eyes: maybe(.3, 'eyes'), brows: maybe(.4, 'brows'), beard: maybe(.4, 'beard'), glasses: maybe(.2, 'glasses'),
    height: r(4), weight: maybe(.4, 'weight'), muscle: r(3), socks: maybe(.3, 'socks'),
    band: some(.2, BANDS), wrist: some(.25, BANDS), stripe: some(.2, BANDS), shoe: any(SHOES),
  });
}

// ---------- The sprite ----------
// Measured from Geoff's reference sprites: an 11-row head (hair rows 0-2, forehead 3-5, eyes on rows 6-7 nearer the
// nose), no neck, no mouth, a 10-wide body (8 rows of jersey, 4 of shorts), arms 2-3 pixels thick, chunky shoes.
const W = 28, H = 36, FEET = 34;
const DIG = { 0: ['111', '101', '101', '101', '111'], 1: ['01', '11', '01', '01', '01'], 2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '011', '001', '111'], 4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'], 6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'], 8: ['111', '101', '111', '101', '111'], 9: ['111', '101', '111', '001', '111'] };
// Hair as spans on the head grid (x 0-9, nose at 10, back of the head at x 0): [y, x, pattern].
// H hair, D shade, B buzzed (hair over skin), '.' leave alone. In the same order as OPTS.style.
const TOP = [[0, 2, 'HHHHHH'], [1, 1, 'HHHHHHHH'], [2, 0, 'HHHHHHHHHH']];
const HAIR = [
  [...TOP, [3, 0, 'HHD......H'], [4, 0, 'HD'], [5, 0, 'H']],
  [[0, 2, 'BBBBBB'], [1, 1, 'BBBBBBBB'], [2, 0, 'BBBBBBBBBB'], [3, 0, 'BB'], [4, 0, 'B']],
  [],
  [...TOP, [3, 0, 'HHHHHHHHHH'], [4, 0, 'HHH.HH.HH'], [5, 0, 'H']],
  [[-1, 3, 'HHHH'], [0, 1, 'HHHHHHH'], [1, 0, 'HHHHHHHHHH'], [2, 0, 'HHHHHHHHHHH'], [3, 0, 'HHH..HHHHHH'], [4, 0, 'HD....HHD'], [5, 0, 'H']],
  [[-1, 2, 'HHHHHH'], [0, 1, 'HHHHHHHH'], [1, 0, 'HHHHHHDHHH'], [2, -1, 'HHHHHHD.DHHH'], [3, -1, 'HHHHHD...DHH'], [4, -1, 'HHHD.....DH'], [5, -1, 'HH'], [6, -1, 'HH'], [7, -1, 'D']],
  [[-2, 2, 'H..H'], [-1, 1, 'HH.HHH.H'], [0, 0, 'HHHHHHHHHH'], [1, -1, 'HHHHHHHHHHH'], [2, -1, 'HHHHHHHHHHH'], [3, 0, 'HHH.HH.HHH'], [4, 0, 'HH...H...H'], [5, 0, 'H']],
  [[-2, 5, 'HHHH'], [-1, 3, 'HHHHHH'], [0, 2, 'HHHHHHHH'], [1, 1, 'HHHHHHHHH'], [2, 0, 'DHHHHHHHHH'], [3, 0, 'DD.......H'], [4, 0, 'B']],
  [[-3, 2, 'H..H..H'], [-2, 1, 'HH.HH.HH'], [-1, 0, 'HHHHHHHHHH'], ...TOP, [3, 0, 'HHD.H..H.H'], [4, 0, 'HD'], [5, 0, 'H']],
  [[-3, 4, 'HHH'], [-2, 3, 'HHHHH'], [-1, 3, 'HHHHHH'], [0, 2, 'BHHHHB'], [1, 1, 'BBHHHHBB'], [2, 0, 'BBBBBBBBBB'], [3, 0, 'BB'], [4, 0, 'B']],
  [[-3, 2, 'HHHHHH'], [-2, 0, 'HHHHHHHHHH'], [-1, -1, 'HHHHHHHHHHHH'], [0, -2, 'HHHHHHHHHHHHH'], [1, -2, 'HHHHHHHHHHHHHD'], [2, -2, 'HHHHHHHHHHHHHD'], [3, -2, 'HHHH......HHD'], [4, -2, 'HHHD'], [5, -2, 'HHD'], [6, -1, 'D']],
  [[-3, 0, 'HHH'], [-2, -1, 'HHHH'], [-1, 0, 'DD'], ...TOP, [3, 0, 'HHD......H'], [4, 0, 'HD'], [5, 0, 'H']],
  [[-1, 2, 'HHHHHH'], [0, 1, 'HHHHHHHH'], [1, 0, 'HHHHHHHHHH'], [2, -1, 'HHHHHHHHHHH'], [3, -1, 'HHHH....HHH'], [4, -1, 'HHH.....HD'], [5, -1, 'HHH'], [6, -1, 'HHH'], [7, -1, 'HHH'], [8, -1, 'HHD'], [9, -1, 'HD'], [10, -1, 'HD'], [11, -1, 'D']],
  [[0, 2, 'HHHHHH'], [1, 1, 'BBBBBBBB'], [2, 0, 'HHHHHHHHHH'], [3, 0, 'BB.......B']],
];
const TALL = [1, 0, 2, 3], EYE_ROW = [6, 5, 7];
const K = '#16121a', T = '#f2f2f2', J = '#2f55d4', J2 = mix(J, .2);

// The sprite as a grid of [colour, layer] (layer: b body, h head, e eyes), plus where the head sits.
function sprite(c, num, pose) {
  const g = Array.from({ length: H }, () => Array(W).fill(null));
  let layer = 'b';
  const r = (x, y, w = 1, h = 1, col) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (j >= 0 && j < H && i >= 0 && i < W) g[j][i] = col ? [col, layer] : null; };
  const S = c.skin, S2 = mix(S, .12), SB = mix(S, .06), HR = c.hair;
  const tall = TALL[c.height], wide = c.weight, aw = c.muscle > 1 ? 1 : 0;
  const hx = 8, hy = 3 + (3 - tall), ty = hy + 11, bx = hx - wide, bw = 10 + wide * 2;
  const torsoH = 8 + Math.floor(tall / 2), shortsY = ty + torsoH, legY = shortsY + 4, legSkin = 1 + Math.ceil(tall / 2);
  // ---- legs, socks, shoes
  const L1 = bx + 1, L2 = bx + bw - 3, sockH = [2, 1 + legSkin, 1][c.socks];
  [L1, L2].forEach(L => { r(L, legY, 2, legSkin + 2, S); r(L, legY + legSkin + 2 - sockH, 2, sockH, T); if (c.stripe) r(L, legY + legSkin + 2 - sockH, 2, 1, c.stripe); });
  const sy = legY + legSkin + 2, shoe = c.shoe, acc = mix(shoe, shoe === SHOES[0] ? .25 : -.3);
  r(L1 - 1, sy, 4, 1, shoe); r(L1 - 2, sy + 1, 5, 1, shoe); r(L2, sy, 4, 1, shoe); r(L2, sy + 1, 5, 1, shoe);
  r(L1 - 1, sy + 1, 1, 1, acc); r(L2 + 3, sy + 1, 1, 1, acc);
  // ---- shorts
  r(bx, shortsY, bw, 4, J); r(bx + Math.floor(bw / 2) - 1, shortsY + 3, 1, 1, null); r(bx + bw - 1, shortsY, 1, 4, T);
  // ---- back arm: hangs just off the body, thickening from the shoulder to the hand
  const BACK = [[1, -2, 2], [2, -2, 2], [3, -3, 2], [4, -3, 2], [5, -3, 3], [6, -4, 3], [7, -4, 3], [8, -5, 3], [9, -5, 3], [10, -4, 1]];
  BACK.forEach(([j, dx, w]) => r(bx + dx - aw, ty + j, w + aw, 1, SB)); r(bx - 5 - aw, ty + 9, 2, 1, S2);
  if (c.wrist) { r(bx - 4 - aw, ty + 7, 3 + aw, 1, c.wrist); r(bx - 5 - aw, ty + 8, 3 + aw, 1, c.wrist); }
  // ---- jersey and number
  r(bx, ty, bw, torsoH, J); r(bx + bw - 1, ty, 1, torsoH, T); r(bx + bw - 2, ty + 1, 1, torsoH - 1, J2);
  r(bx + 3, ty, bw - 6, 1, T); r(bx + 4, ty, bw - 8, 1, S2); r(bx, ty, 1, 1, S);
  const d = String(num ?? '').split('').filter(ch => DIG[ch]).slice(0, 2), dw = d.map(ch => DIG[ch][0].length), total = dw.reduce((a, b) => a + b, 0) + d.length - 1;
  let nx = bx + Math.floor((bw - 1 - total) / 2);
  d.forEach((ch, k) => { DIG[ch].forEach((row, y) => [...row].forEach((v, x) => v === '1' && r(nx + x, ty + 2 + y, 1, 1, T))); nx += dw[k] + 1; });
  // ---- head: 10 wide plus a one-pixel nose, chin row narrower
  layer = 'h';
  r(hx + 2, hy, 6, 1, S); r(hx + 1, hy + 1, 8, 1, S); r(hx, hy + 2, 10, 8, S); r(hx + 1, hy + 10, 8, 1, S); r(hx + 1, hy + 10, 3, 1, SB);
  r(hx + 10, hy + 6, 1, 2, S);
  // facial hair (there is no mouth, so it sits below the nose and round the jaw)
  const beard = c.beard;
  if (beard === 1) { const st = blend(S, HR, .25); r(hx, hy + 8, 10, 2, st); r(hx + 1, hy + 10, 8, 1, st); r(hx, hy + 6, 1, 2, st); }
  if (beard === 2 || beard === 3) r(hx + 6, hy + 8, 4, 1, HR);
  if (beard === 3) r(hx + 7, hy + 9, 2, 2, HR);
  if (beard === 4) { r(hx, hy + 5, 1, 5, HR); r(hx + 1, hy + 9, 1, 1, HR); r(hx + 1, hy + 10, 8, 1, HR); }
  if (beard === 5) { r(hx, hy + 5, 2, 4, HR); r(hx, hy + 8, 10, 2, HR); r(hx + 1, hy + 10, 8, 1, HR); r(hx + 2, hy + 11, 6, 1, HR); r(hx + 3, hy + 9, 2, 1, mix(HR, -.2)); }
  // eyes
  const ey = hy + EYE_ROW[c.eyeY], E = [hx + 3, hx + 7];
  layer = 'e';
  E.forEach(x => {
    if (c.eyes === 0) r(x, ey, 1, 2, K);
    if (c.eyes === 1 || c.eyes === 2) { r(x - 1, ey, 2, 2, K); if (c.eyes === 2) r(x, ey, 1, 1, '#ffffff'); }
    if (c.eyes === 3) r(x, ey + 1, 1, 1, K);
    if (c.eyes === 4) { r(x, ey, 1, 1, K); r(x - 1, ey + 1, 1, 1, K); r(x + 1, ey + 1, 1, 1, K); }
    if (c.eyes === 5) r(x - 1, ey + 1, 2, 1, K);
  });
  layer = 'h';
  // brows
  const BR = HR === HAIRS[7] ? '#b9b9b9' : HR;
  E.forEach((x, k) => {
    if (c.brows === 1) r(x - 1, ey - 2, 2, 1, BR);
    if (c.brows === 2) r(x - 1, ey - 2, 3, 1, BR);
    if (c.brows === 3) { r(x - 1, ey - (k ? 1 : 2), 1, 1, BR); r(x, ey - (k ? 2 : 1), 1, 1, BR); }
    if (c.brows === 4) r(x - 1, ey - 3, 2, 1, BR);
  });
  // hair
  const pal = { H: HR, D: mix(HR, .25), B: blend(S, HR, .6) };
  HAIR[c.style].forEach(([y, x, pat]) => [...pat].forEach((ch, i) => { if (pal[ch]) r(hx + x + i, hy + y, 1, 1, pal[ch]); }));
  if (c.style === 2) r(hx + 3, hy + 1, 2, 1, mix(S, -.35));
  // glasses: two 5 x 4 frames sharing the bridge, wider than they are tall
  if (c.glasses >= 1 && c.glasses <= 3) {
    const G = '#26232c', LN = c.glasses === 3 ? '#1f2a38' : '#d6e6f5';
    [hx, hx + 4].forEach((x, k) => {
      r(x, ey - 1, 5, 4, G); r(x + 1, ey, 3, 2, LN);
      if (c.glasses === 3) r(x + 1, ey, 1, 1, '#6f8bb0'); else { layer = 'e'; r(E[k], ey, 1, 2, K); layer = 'h'; }
      if (c.glasses === 2) { r(x, ey - 1, 1, 1, S); r(x, ey + 2, 1, 1, S); if (k) { r(x + 4, ey - 1, 1, 1, S); r(x + 4, ey + 2, 1, 1, S); } }
    });
    r(hx - 1, ey, 1, 1, G);
  }
  if (c.glasses === 4) { const G = '#2b2b2b', LN = '#9fd3f0'; r(hx - 1, ey - 1, 11, 3, G); r(hx + 2, ey - 1, 3, 2, LN); r(hx + 6, ey - 1, 3, 2, LN); r(hx + 2, ey - 1, 1, 1, '#ffffff'); r(hx + 6, ey - 1, 1, 1, '#ffffff'); }
  if (c.band) { r(hx - 1, hy + 2, 11, 2, c.band); r(hx - 1, hy + 2, 11, 1, mix(c.band, -.25)); }
  // ---- front arm and whatever it holds
  layer = 'b';
  const fx = bx + bw, sleeve = spans => c.sleeve && spans.forEach(([j, dx, w]) => r(fx + dx, ty + j, w, 1, c.sleeve));
  if (pose === 'dribble') {
    ball(fx + 4, ty + 8, r);
    [[1, -1, 3 + aw], [2, 0, 3 + aw], [3, 0, 6], [4, 1, 6]].forEach(([j, dx, w]) => r(fx + dx, ty + j, w, 1, S)); r(fx + 1, ty + 4, 3, 1, S2);
    sleeve([[1, -1, 3 + aw], [2, 0, 3 + aw], [3, 0, 2], [4, 1, 1]]);
    if (c.wrist) r(fx + 3, ty + 3, 2, 2, c.wrist);
    r(fx + 4, ty + 5, 3, 1, S); r(fx + 6, ty + 4, 1, 2, S2);
  } else if (pose === 'fist') {
    r(fx - 1, ty, 2, 3, S); r(fx, hy + 2, 2 + aw, ty - hy - 1, S); r(fx + 1 + aw, hy + 2, 1, ty - hy - 1, S2);
    if (c.sleeve) r(fx, hy + 6, 2 + aw, ty - hy - 5, c.sleeve);
    if (c.wrist) r(fx, hy + 2, 2 + aw, 2, c.wrist);
    r(fx - 1, hy - 2, 4 + aw, 4, S); r(fx, hy - 1, 2, 1, S2); r(fx + 2 + aw, hy - 2, 1, 4, S2);
  } else if (pose === 'ball') {
    ball(bx + Math.floor(bw / 2), ty + 5, r);
    r(fx - 1, ty + 1, 2, 3, S); r(fx - 3, ty + 3, 3, 3, S); r(fx - 3, ty + 5, 3, 1, S2);
  } else if (pose === 'trophy') {
    const cx = bx + Math.floor(bw / 2) - 1, G = '#f2c14e', G2 = '#c98f22';
    r(cx - 2, ty + 1, 6, 3, G); r(cx - 1, ty + 4, 4, 1, G); r(cx, ty + 5, 2, 1, G2); r(cx - 1, ty + 6, 4, 1, G); r(cx - 2, ty + 7, 6, 1, '#4a3418');
    r(cx + 2, ty + 1, 2, 4, G2); r(cx - 1, ty + 1, 1, 2, '#fff2c4'); r(cx - 4, ty + 1, 2, 1, G); r(cx + 4, ty + 1, 2, 1, G);
    r(cx - 4, ty + 2, 2, 2, S); r(cx + 4, ty + 2, 2, 2, S); r(fx - 1, ty + 1, 2, 2, S);
  } else {
    BACK.forEach(([j, dx, w]) => r(fx - dx - w, ty + j, w + aw, 1, S)); r(fx + 3, ty + 9, 2, 1, S2);
    sleeve(BACK.slice(0, 5).map(([j, dx, w]) => [j, -dx - w, w + aw]));
    if (c.wrist) { r(fx + 1, ty + 7, 3 + aw, 1, c.wrist); r(fx + 2, ty + 8, 3 + aw, 1, c.wrist); }
  }
  return { g, hy };
}
function ball(cx, cy, r) {
  const O = '#f5a623', O2 = '#df8c1c';
  [[1, 5], [0, 7], [0, 7], [0, 7], [0, 7], [1, 5]].forEach(([o, w], j) => r(cx - 3 + o, cy - 2 + j, w, 1, O));
  r(cx - 2, cy - 1, 1, 1, '#ffc766'); r(cx - 1, cy + 3, 4, 1, O2); r(cx + 2, cy + 2, 2, 1, O2); r(cx + 3, cy + 1, 1, 1, O2);
}

// One path per colour for each layer, built from runs of pixels, so a whole player is a handful of elements.
function paths(g, layer) {
  const runs = new Map();
  g.forEach((row, y) => {
    for (let x = 0; x < W;) {
      const px = row[x];
      if (!px || px[1] !== layer) { x++; continue; }
      let w = 1; while (x + w < W && row[x + w] && row[x + w][0] === px[0] && row[x + w][1] === layer) w++;
      runs.set(px[0], (runs.get(px[0]) || '') + `M${x} ${y}h${w}v1h${-w}z`);
      x += w;
    }
  });
  return [...runs].map(([c, d]) => `<path d="${d}" fill="${c}"/>`).join('');
}

const cache = new Map();
// SVG markup for a player. Round avatars (the default) show the head and the top of the jersey in a 100 × 100 box.
// opts.stage draws the whole player at their height, feet on the bottom of a 100 × 104 box: the court, the Home
// photo, the player page and the builder. opts.pose: 'dribble', 'fist', 'ball', 'trophy', or arms down (the default).
export function figure(raw, opts = {}) {
  const c = cleanLook(raw), key = JSON.stringify([c, raw.num, !!opts.stage, opts.pose || '']);
  if (cache.has(key)) return cache.get(key);
  const { g, hy } = sprite(c, raw.num, opts.pose);
  // The head and eyes are their own groups (outside the pixel scale) so the bob and blink animations work in the box's units.
  const tf = opts.stage ? `translate(50 0) scale(${(104 / FEET).toFixed(4)}) translate(-13 0)` : `scale(6.25) translate(-5 ${3 - hy})`, at = s => `<g transform="${tf}">${s}</g>`;
  const svg = `<g class="av-fig" shape-rendering="crispEdges">${at(paths(g, 'b'))}<g class="av-head">${at(paths(g, 'h'))}<g class="av-eyes">${at(paths(g, 'e'))}</g></g></g>`;
  if (cache.size > 400) cache.clear();
  cache.set(key, svg);
  return svg;
}
