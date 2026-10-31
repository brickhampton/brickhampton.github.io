// Pixel-art players in the team jersey, drawn from each player's look (saved in players.look).
// A look is { v: 2, skin, hair, style, eyes, eyeY, brows, beard, glasses, height, weight, muscle, socks,
// band, wrist, sleeve, stripe, shoe, shoeAcc, glassesC, shirt, hairFlip, wristFlip, sleeveFlip }: colours as hex, everything else an index into OPTS (0 is the default).
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
// Hair: black, or any colour from the picker. Accessories, shoes and glasses: black, white, blue, grey and red, or any
// colour from the picker. Shoes keep their own white, the default saved looks already rely on.
export const HAIRS = ['#0f0c0c'];
export const BANDS = ['#1b1b1b', '#eeeeee', '#2f55d4', '#8a8f98', '#c0392b'];
export const SHOES = ['#f2f2f2', '#1b1b1b', '#2f55d4', '#8a8f98', '#c0392b'];

// Each option list: the label shown in the builder. Index 0 is the default.
export const OPTS = {
  height: ['Average', 'Short', 'Tall', 'Very tall', 'Very short', 'Shandy'],
  // Hair mirrored left to right; the wristband or arm sleeve on the right arm (as you look at the player) instead of the left.
  hairFlip: ['Normal', 'Flipped'], wristFlip: ['Left arm', 'Right arm'], sleeveFlip: ['Left arm', 'Right arm'],
  weight: ['Average', 'Broad', 'Heavy'],
  muscle: ['Toned', 'Athletic', 'Muscular'],
  style: ['Short', 'Buzz', 'Bald', 'Fringe', 'Swept', 'Curtains', 'Messy', 'Two-block', 'Spiky', 'Mohawk', 'Afro', 'Bun', 'Long', 'Cornrows',
    'Middle part', 'Bed hair', 'Comma', 'Side part', 'Bowl', 'Wolf cut'],
  eyes: ['Dots', 'Big', 'Shine', 'Small', 'Happy', 'Sleepy'],
  eyeY: ['Default', 'Higher', 'Lower'],
  brows: ['None', 'Thin', 'Thick', 'Angled', 'Raised'],
  beard: ['None', 'Stubble', 'Moustache', 'Goatee', 'Chinstrap', 'Beard'],
  glasses: ['None', 'Square', 'Round', 'Shades', 'Sport', 'Half frame'],
  socks: ['Crew', 'High', 'Low'],
  shoeType: ['Classic', 'High-top', 'Runner'],
};
// What the builder offers, in order. Parts left out (moustache, goatee, shades, sport glasses) still draw for old looks.
export const CHOICES = {
  style: [0, 14, 5, 15, 7, 16, 17, 18, 19, 3, 4, 6, 8, 1, 2, 9, 10, 11, 12, 13],
  beard: [0, 1, 4, 5], glasses: [0, 1, 2, 5], height: [4, 1, 0, 2, 3, 5],
};
const NUMS = ['hairFlip', 'wristFlip', 'sleeveFlip', 'height', 'weight', 'muscle', 'style', 'eyes', 'eyeY', 'brows', 'beard', 'glasses', 'socks', 'shoeType'];
const COLOURS = ['shirt', 'band', 'wrist', 'sleeve', 'stripe', 'shoeAcc', 'glassesC'];

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
  if (p.band === true) out.band = BANDS[2];
  // Moustache and goatee became stubble; shades and sport glasses became the rectangle frames.
  if (out.beard === 2 || out.beard === 3) out.beard = 1;
  if (out.glasses === 3 || out.glasses === 4) out.glasses = 1;
  // Muscle is no longer a choice in the builder, so every player is drawn with the standard arms.
  out.muscle = 0;
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
    v: 2, skin: any(SKINS), hair: Math.random() < .85 ? HAIRS[0] : any(['#2e2e33', '#24170f']), style: any(CHOICES.style), hairFlip: r(2),
    eyes: maybe(.3, 'eyes'), brows: maybe(.4, 'brows'), beard: Math.random() < .3 ? any(CHOICES.beard) : 0, glasses: Math.random() < .2 ? 1 + r(2) : 0,
    height: r(6), weight: maybe(.4, 'weight'), socks: maybe(.3, 'socks'), shoeType: r(3),
    band: some(.2, BANDS), wrist: some(.25, BANDS), stripe: some(.2, BANDS), shoe: any(SHOES), shoeAcc: some(.5, SHOES),
  });
}

// ---------- The sprite ----------
// Measured from Geoff's reference sprites: an 11-row head (hair rows 0-2, forehead 3-5, eyes on rows 6-7 nearer the
// nose), no neck, no mouth, a 10-wide body (8 rows of jersey, 4 of shorts), arms 2-3 pixels thick, chunky shoes.
// TOP rows above row 0 hold what a tall player puts over the box's top edge (hair, hands up), so it isn't cut off.
const W = 30, H = 36, FEET = 34, TOPM = 6;
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
  [[-1, 2, 'HHHHHH'], [0, 1, 'HHHHHHHH'], [1, 0, 'BHHHHHHHHHH'], [2, 0, 'BBHHHHHHHHH'], [3, 0, 'BB..HHHHHHH'], [4, 0, 'B....HH.HD'], [5, 0, 'B']],
  [[-3, 2, 'H..H..H'], [-2, 1, 'HH.HH.HH'], [-1, 0, 'HHHHHHHHHH'], ...TOP, [3, 0, 'HHD.H..H.H'], [4, 0, 'HD'], [5, 0, 'H']],
  [[-3, 4, 'HHH'], [-2, 3, 'HHHHH'], [-1, 3, 'HHHHHH'], [0, 2, 'BHHHHB'], [1, 1, 'BBHHHHBB'], [2, 0, 'BBBBBBBBBB'], [3, 0, 'BB'], [4, 0, 'B']],
  [[-3, 2, 'HHHHHH'], [-2, 0, 'HHHHHHHHHH'], [-1, -1, 'HHHHHHHHHHHH'], [0, -2, 'HHHHHHHHHHHHH'], [1, -2, 'HHHHHHHHHHHHHD'], [2, -2, 'HHHHHHHHHHHHHD'], [3, -2, 'HHHH......HHD'], [4, -2, 'HHHD'], [5, -2, 'HHD'], [6, -1, 'D']],
  [[-3, 0, 'HHH'], [-2, -1, 'HHHH'], [-1, 0, 'DD'], ...TOP, [3, 0, 'HHD......H'], [4, 0, 'HD'], [5, 0, 'H']],
  [[-1, 2, 'HHHHHH'], [0, 1, 'HHHHHHHH'], [1, 0, 'HHHHHHHHHH'], [2, -1, 'HHHHHHHHHHH'], [3, -1, 'HHHH....HHH'], [4, -1, 'HHH.....HD'], [5, -1, 'HHH'], [6, -1, 'HHH'], [7, -1, 'HHH'], [8, -1, 'HHD'], [9, -1, 'HD'], [10, -1, 'HD'], [11, -1, 'D']],
  [[0, 2, 'HHHHHH'], [1, 1, 'BBBBBBBB'], [2, 0, 'HHHHHHHHHH'], [3, 0, 'BB.......B']],
  // Middle part: full, parted in the middle, falling to the cheeks at the sides
  [[-2, 2, 'HHHHHH'], [-1, 0, 'HHHHHHHHHH'], [0, -1, 'HHHHHHHHHHHH'], [1, -1, 'HHHHHHDHHHHH'], [2, -1, 'HHHHHHD.DHHH'], [3, -1, 'HHHHHD...DHH'], [4, -1, 'HHHHD.....DH'], [5, -1, 'HHHD.......H'], [6, -1, 'HHH'], [7, -1, 'HHH'], [8, -1, 'HD'], [9, -1, 'D']],
  // Bed hair: medium length, tufts every which way
  [[-3, 2, 'H...H'], [-2, 1, 'HH.HHH.H'], [-1, 0, 'HHHHHHHHHH'], [0, -1, 'HHHHHHHHHHHH'], [1, -2, 'HHHHHHHHHHHHH'], [2, -2, 'HHHHHHHHHHHHH'], [3, -1, 'HHHHH.HH.HHH'], [4, -1, 'HHH.H...H.H'], [5, -2, 'HHH.......H'], [6, -1, 'HH'], [7, -2, 'H.H']],
  // Comma: short sides, the fringe swept down and curled under at the front
  [[-1, 2, 'HHHHHH'], [0, 1, 'HHHHHHHH'], [1, 0, 'BHHHHHHHHHH'], [2, 0, 'BBHHHHHHHHH'], [3, 0, 'BB....HHHHH'], [4, 0, 'B......HHH'], [5, 0, 'B.....HH.H']],
  // Side part: parted on the back side, combed over with a little lift at the front
  [[-2, 4, 'HHHHH'], [-1, 2, 'HHHHHHHH'], [0, 1, 'HDHHHHHHHH'], [1, 0, 'HHDHHHHHHHH'], [2, 0, 'HHHHHHHHHHH'], [3, 0, 'HHH.....HHH'], [4, 0, 'HD.......H'], [5, 0, 'H']],
  // Bowl: a round mushroom cut with a straight fringe
  [[-2, 2, 'HHHHHH'], [-1, 1, 'HHHHHHHH'], [0, 0, 'HHHHHHHHHH'], [1, -1, 'HHHHHHHHHHHH'], [2, -1, 'HHHHHHHHHHHH'], [3, -1, 'HHHHHHHHHHHH'], [4, -1, 'HHHHHHHHHHHD'], [5, -1, 'HHD'], [6, -1, 'HD']],
  // Wolf cut: shaggy layers, longer and choppy at the back
  [[-2, 1, 'H.HHHH.H'], [-1, 0, 'HHHHHHHHHH'], [0, -1, 'HHHHHHHHHHHH'], [1, -2, 'HHHHHHHHHHHHH'], [2, -2, 'HHHHHHHHHHHHH'], [3, -2, 'HHHHHH.HH.HHH'], [4, -2, 'HHHH.H.....H'], [5, -2, 'HHH'], [6, -2, 'HHH'], [7, -2, 'HH'], [8, -2, 'H.H'], [9, -1, 'H']],
];
// Very tall has an extra pixel of jersey; Shandy adds a pixel of leg on top.
const TALL = [1, 0, 2, 4, -1, 5], EYE_ROW = [6, 5, 7];
const K = '#16121a', T = '#f2f2f2', J = '#2f55d4', J2 = mix(J, .2);

// The sprite as a grid of [colour, layer] (layer: b body, h head, e eyes), plus where the head sits.
function sprite(c, num, pose) {
  const g = Array.from({ length: H + TOPM }, () => Array(W).fill(null));
  // The ball has its own grid, so the hand drawn over it doesn't cut holes in it when it bounces away.
  const go = Array.from({ length: H + TOPM }, () => Array(W).fill(null));
  // The eyes have their own grid too, so the face stays solid skin underneath: when the eyes blink or swap for the
  // smiling ones, no hole opens onto the background.
  const ge = Array.from({ length: H + TOPM }, () => Array(W).fill(null));
  let layer = 'b';
  // While rec is set, the body pixels drawn go into it too (an arm, so its accessories can go on afterwards).
  let rec = null;
  const r = (x, y, w = 1, h = 1, col, lay = layer) => { const t = lay === 'o' ? go : lay === 'e' ? ge : g; for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (j >= -TOPM && j < H && i >= 0 && i < W) { t[j + TOPM][i] = col ? [col, lay] : null; if (rec && lay === 'b' && col) rec.push([i, j, col]); } };
  const S = c.skin, S2 = mix(S, .12), SB = mix(S, .06), HR = c.hair;
  // Broad and Heavy add one and two pixels to the body's width, mostly at the back.
  const tall = TALL[c.height], wide = c.weight, aw = c.muscle > 1 ? 1 : 0;
  const hx = 8, hy = 3 + (3 - tall), ty = hy + 11, bx = hx - Math.ceil(wide / 2), bw = 10 + wide;
  const torsoH = 8 + Math.floor(tall / 2), shortsY = ty + torsoH, legY = shortsY + 4, legSkin = 1 + Math.ceil(tall / 2);
  // ---- legs, socks, shoes
  const L1 = bx + 1, L2 = bx + bw - 3, sockH = [2, 1 + legSkin, 1][c.socks];
  [L1, L2].forEach(L => { r(L, legY, 2, legSkin + 2, S); r(L, legY + legSkin + 2 - sockH, 2, sockH, T); if (c.stripe) r(L, legY + legSkin + 2 - sockH, 2, 1, c.stripe); });
  // Shoes in two colours. Classic: a flash on the side. High-top: up over the ankle with a coloured collar. Runner: the classic shape on a coloured sole.
  const sy = legY + legSkin + 2, shoe = c.shoe, light = parseInt(shoe.slice(1, 3), 16) > 200, st = c.shoeType;
  const acc = c.shoeAcc || (light ? '#c9ccd2' : st === 2 ? '#f2f2f2' : mix(shoe, -.3));
  // Classic and runner share a shape; the runner's second colour is its whole sole.
  r(L1 - 1, sy, 4, 1, shoe); r(L1 - 2, sy + 1, 5, 1, st === 2 ? acc : shoe); r(L2, sy, 4, 1, shoe); r(L2, sy + 1, 5, 1, st === 2 ? acc : shoe);
  if (st === 1) { r(L1, sy - 1, 2, 1, acc); r(L2, sy - 1, 2, 1, acc); r(L1, sy, 2, 1, shoe); r(L2, sy, 2, 1, shoe); }
  else if (st === 0) { r(L1 - 1, sy + 1, 2, 1, acc); r(L2 + 2, sy + 1, 2, 1, acc); }
  // ---- shorts
  r(bx, shortsY, bw, 4, J); r(bx + Math.floor(bw / 2) - 1, shortsY + 3, 1, 1, null); r(bx + bw - 1, shortsY, 1, 4, T);
  // ---- back arm: hangs just off the body, thickening from the shoulder to the hand
  // ---- free arm: relaxed at the side, widening to a loose hand with the fingers apart (as in the reference).
  // The arm sleeve and wristband go on this arm.
  const ARM = [[1, -1, 1], [2, -1, 1], [3, -2, 2], [4, -2, 2], [5, -2, 2], [6, -3, 3], [7, -3, 3]], HAND = [[8, -4, 4], [9, -4, 2], [9, -1, 1], [10, -3, 1]];
  const side = (spans, col, mirror) => spans.forEach(([j, dx, w]) => mirror ? r(fx - 1 - dx - w + 1, ty + j, w + aw, 1, col) : r(bx + dx - aw, ty + j, w + aw, 1, col));
  // A swapped wristband or sleeve goes on the front arm instead.
  const BS = c.sleeveFlip ? null : c.sleeve, BW = c.wristFlip ? null : c.wrist;
  const fx = bx + bw, freeArm = mirror => {
    side(ARM, SB, mirror); side(HAND, SB, mirror);
    if (BS) side(ARM.slice(0, 5), BS, mirror);
    if (BW) side([[6, -3, 3], [7, -3, 3]], BW, mirror);
  };
  rec = c.shirt ? [] : null;
  // Shooting, catching a rebound and blocking put the free arm up too.
  const up = pose === 'shoot' || pose === 'catch' || pose === 'block';
  if (up) {
    const top = pose === 'shoot' ? hy + 1 : hy - 2, ax = bx - 2 - aw;
    r(ax, top + 3, 2 + aw, ty + 2 - top - 3, SB); r(ax - 1, top - 1, 4 + aw, 4, SB); r(ax - 1, top - 2, 1, 1, SB); r(ax + 1, top - 2, 1, 1, SB); r(ax + 3 + aw, top - 2, 1, 1, SB);
    if (BS) r(ax, ty - 2, 2 + aw, 4, BS);
    if (BW) r(ax, top + 3, 2 + aw, 2, BW);
  } else if (pose === 'pass2') {
    // A two-handed pass: the free arm is drawn reaching across the jersey with the other one, below.
  } else if (pose === 'dribbleL') {
    // The ball crossed over to the free hand: that hand palms it, mirroring the usual dribble.
    ball(Math.max(bx - 5, 3), ty + 8, r);
    [[1, -1, 3 + aw], [2, 0, 5 + aw], [3, 1, 5 + aw], [4, 3, 5], [5, 3, 5]].forEach(([j, dx, w]) => r(bx - dx - w, ty + j, w, 1, SB));
    [3, 5, 7].forEach(dx => r(bx - dx - 1, ty + 6, 1, 1, SB));
    if (BS) r(bx - 1 - aw, ty + 1, 1 + aw, 2, BS);
  } else if (pose === 'trophy') {
    // Both hands hold the trophy by its handles: this upper arm comes forward from the shoulder to the near handle.
    r(bx - 2, ty + 1, 2, 4, SB); if (BS) r(bx - 2, ty + 1, 2, 2, BS);
  } else if (pose === 'fistL' || pose === 'fist2') {
    // A fist pump with this arm: the front arm's fist, mirrored onto this side.
    const m = (dx, y, w, h, col) => r(bx - dx - w, y, w, h, col);
    m(-1, ty, 2, 3, SB); m(0, hy + 2, 2 + aw, ty - hy - 1, SB); m(1 + aw, hy + 2, 1, ty - hy - 1, S2);
    m(-1, hy - 2, 4 + aw, 4, SB); m(0, hy - 1, 2, 1, S2); m(2 + aw, hy - 2, 1, 4, S2);
  } else freeArm(false);
  const back = rec && rec.filter(([x]) => x < bx);
  rec = null;
  // ---- jersey and number
  r(bx, ty, bw, torsoH, J); r(bx + bw - 1, ty, 1, torsoH, T); r(bx + bw - 2, ty + 1, 1, torsoH - 1, J2);
  r(bx + 3, ty, bw - 6, 1, T); r(bx + 4, ty, bw - 8, 1, S2); r(bx, ty, 1, 1, S);
  const d = String(num ?? '').split('').filter(ch => DIG[ch]).slice(0, 2), dw = d.map(ch => DIG[ch][0].length), total = dw.reduce((a, b) => a + b, 0) + d.length - 1;
  let nx = bx + Math.floor((bw - 1 - total) / 2);
  d.forEach((ch, k) => { DIG[ch].forEach((row, y) => [...row].forEach((v, x) => v === '1' && r(nx + x, ty + 2 + y, 1, 1, T))); nx += dw[k] + 1; });
  // ---- head: 10 wide plus a one-pixel nose, chin row narrower
  layer = 'h';
  r(hx + 2, hy, 6, 1, S); r(hx + 1, hy + 1, 8, 1, S); r(hx, hy + 2, 10, 8, S); r(hx + 1, hy + 10, 8, 1, S);
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
  const BR = parseInt(HR.slice(1, 3), 16) > 220 ? '#b9b9b9' : HR;
  E.forEach((x, k) => {
    if (c.brows === 1) r(x - 1, ey - 2, 2, 1, BR);
    if (c.brows === 2) r(x - 1, ey - 2, 3, 1, BR);
    if (c.brows === 3) { r(x - 1, ey - (k ? 1 : 2), 1, 1, BR); r(x, ey - (k ? 2 : 1), 1, 1, BR); }
    if (c.brows === 4) r(x - 1, ey - 3, 2, 1, BR);
  });
  // hair
  const pal = { H: HR, D: mix(HR, .25), B: blend(S, HR, .8) };
  // Flipped hair is mirrored across the head, so a style swept one way sweeps the other.
  const hf = c.hairFlip ? (x => 9 - x) : (x => x);
  HAIR[c.style].forEach(([y, x, pat]) => [...pat].forEach((ch, i) => { if (pal[ch]) r(hx + hf(x + i), hy + y, 1, 1, pal[ch]); }));
  if (c.style === 2) r(hx + 3, hy + 1, 2, 1, mix(S, -.35));
  // glasses: two thin 4 x 4 frames round the eyes with clear lenses, a bridge and an arm back to the ear.
  // Rectangle frames, round ones with the corners cut, or half frames with no top rim.
  if (c.glasses) {
    const G = c.glassesC || '#3b3946';
    [hx + 1, hx + 6].forEach(x => {
      const o = c.glasses === 2 ? 1 : 0;
      if (c.glasses !== 5) r(x + o, ey - 1, 4 - 2 * o, 1, G);
      r(x + o, ey + 2, 4 - 2 * o, 1, G); r(x, ey, 1, 2, G); r(x + 3, ey, 1, 2, G);
    });
    r(hx + 5, ey, 1, 1, G); r(hx, ey, 1, 1, G);
    // The frames sit over the eyes, as they did before the eyes had their own grid.
    g.forEach((row, y) => row.forEach((px, x) => { if (px && px[0] === G && px[1] === 'h') ge[y][x] = null; }));
  }
  if (c.band) { r(hx - 1, hy + 2, 11, 2, c.band); r(hx - 1, hy + 2, 11, 1, mix(c.band, -.25)); }
  // ---- front arm and whatever it holds
  layer = 'b';
  const FS = c.sleeveFlip ? c.sleeve : null, FW = c.wristFlip ? c.wrist : null;
  if (FS || FW || c.shirt) rec = [];
  if (pose === 'dribble' || !pose) {
    // Palming the ball: the forearm comes out level and a big hand sits on top, fingers spread over the ball.
    ball(fx + 5, ty + 8, r);
    [[1, -1, 3 + aw], [2, 0, 5 + aw], [3, 1, 5 + aw], [4, 3, 5], [5, 3, 5]].forEach(([j, dx, w]) => r(fx + dx, ty + j, w, 1, S));
    [3, 5, 7].forEach(dx => r(fx + dx, ty + 6, 1, 1, S));
  } else if (up || pose === 'block1') {
    // Arm straight up with an open hand: the release on a shot, both hands up for a rebound or a block.
    r(fx - 1, ty, 2, 2, S); r(fx, hy + 1, 2 + aw, ty - hy, S); r(fx + 1 + aw, hy + 1, 1, ty - hy, S2);
    r(fx - 1, hy - 3, 4 + aw, 4, S); [0, 2, 3 + aw].forEach(dx => r(fx - 1 + dx, hy - 4, 1, 1, S));
  } else if (pose === 'dribbleL') {
    [...ARM, ...HAND].forEach(([j, dx, w]) => r(fx - dx - w, ty + j, w + aw, 1, S));
  } else if (pose === 'spin') {
    // Spinning the ball on one finger: the forearm up beside the head, a fist, one finger up, the ball balanced on it.
    r(fx - 1, ty, 2, 2, S); r(fx + 1, hy + 7, 2 + aw, ty - hy - 6, S); r(fx + 2 + aw, hy + 7, 1, ty - hy - 6, S2);
    r(fx, hy + 4, 4 + aw, 3, S); r(fx + 1, hy + 2, 1, 2, S);
    ball(fx + 1, hy - 1, r);
  } else if (pose === 'pass2') {
    // Both arms push out toward the teammate, not quite at full stretch: the top one further, the lower one bent in short.
    r(fx - 1, ty + 1, 5, 2, S); r(fx - 1, ty + 2, 5, 1, S2); r(fx + 4, ty, 2, 4, S);
    r(bx + 2, ty + 4, fx + 1 - bx - 2, 2, SB); r(bx + 2, ty + 5, fx + 1 - bx - 2, 1, S2); r(fx + 1, ty + 3, 2, 4, S);
  } else if (pose === 'pass') {
    // Arm thrust out level, as on a pass or a reach for a steal.
    r(fx - 1, ty + 1, 7, 2 + aw, S); r(fx + 6, ty, 2, 4 + aw, S); r(fx - 1, ty + 2 + aw, 7, 1, S2);
  } else if (pose === 'fist' || pose === 'fist2') {
    r(fx - 1, ty, 2, 3, S); r(fx, hy + 2, 2 + aw, ty - hy - 1, S); r(fx + 1 + aw, hy + 2, 1, ty - hy - 1, S2);
    r(fx - 1, hy - 2, 4 + aw, 4, S); r(fx, hy - 1, 2, 1, S2); r(fx + 2 + aw, hy - 2, 1, 4, S2);
  } else if (pose === 'ball') {
    ball(bx + Math.floor(bw / 2), ty + 5, r);
    r(fx - 1, ty + 1, 2, 3, S); r(fx - 3, ty + 3, 3, 3, S); r(fx - 3, ty + 5, 3, 1, S2);
  } else if (pose === 'trophy') {
    // Held one pixel below the collar, a hand on each handle.
    const cx = bx + Math.floor(bw / 2) - 1, G = '#f2c14e', G2 = '#c98f22', t = ty + 1;
    r(cx - 2, t + 1, 6, 3, G); r(cx - 1, t + 4, 4, 1, G); r(cx, t + 5, 2, 1, G2); r(cx - 1, t + 6, 4, 1, G); r(cx - 2, t + 7, 6, 1, '#4a3418');
    r(cx + 2, t + 1, 2, 4, G2); r(cx - 1, t + 1, 1, 2, '#fff2c4'); r(cx - 4, t + 1, 2, 1, G); r(cx + 4, t + 1, 2, 1, G);
    r(cx - 4, t + 2, 2, 2, SB);
    r(fx - 1, ty + 1, 2, 3, S); r(cx + 4, t + 2, 2, 2, S);
  } else {
    // Arms down. 'lowball' also has the ball behind the player's back, on its way from one hand to the other.
    if (pose === 'lowball') ball(bx + Math.floor(bw / 2), ty + 8, r);
    [...ARM, ...HAND].forEach(([j, dx, w]) => r(fx - dx - w, ty + j, w + aw, 1, S));
  }
  // Walk each arm out from the shoulder, painting accessories by how far along the arm a pixel is: the sleeve covers the
  // first few pixels, the wristband the two after, and an undershirt's short sleeve just the top of the arm.
  const walk = (cells, near, paint) => {
    const key = (x, y) => (y + TOPM) * W + x, arm = new Set(cells.map(([x, y]) => key(x, y))), dist = new Map();
    let edge = cells.filter(([x, y]) => near(x) && y >= ty - 1 && y <= ty + 1);
    if (!edge.length && cells.length) edge = [cells.reduce((a, b) => (b[1] < a[1] ? b : a))];
    edge.forEach(([x, y]) => dist.set(key(x, y), 0));
    for (let q = edge; q.length;) {
      const next = [];
      q.forEach(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        const k = key(x + dx, y + dy);
        if (arm.has(k) && !dist.has(k)) { dist.set(k, dist.get(key(x, y)) + 1); next.push([x + dx, y + dy]); }
      }));
      q = next;
    }
    dist.forEach((d, k) => { const col = paint(d); if (col) g[Math.floor(k / W)][k % W] = [col, 'b']; });
  };
  if (rec) {
    const front = rec.filter(([, , col]) => col === S || col === S2);
    rec = null;
    walk(front, x => x >= fx - 1 && x <= fx, d => c.shirt && d <= 1 ? c.shirt : d <= 4 ? FS : d <= 6 ? FW : null);
  }
  if (back) walk(back, x => x >= bx - 2 - aw, d => d <= 1 ? c.shirt : null);
  // The undershirt's collar shows in the jersey's neckline, and it covers the back shoulder at the jersey's corner.
  if (c.shirt) { r(bx + 4, ty, bw - 8, 1, c.shirt); r(bx, ty, 1, 1, c.shirt); }
  return { g, go, ge, hy };
}
// A shadow in the same chunky pixels as the players: three stepped rows, centred on (cx, cy), u units to a pixel.
export function pxShadow(cx, cy, rx, u = 3, op = .35) {
  const row = (w, y) => { const ww = Math.max(1, Math.round(w / u)) * u; return `<rect x="${(cx - ww / 2).toFixed(1)}" y="${(cy + y * u).toFixed(1)}" width="${ww.toFixed(1)}" height="${u}"/>`; };
  return `<g class="pxsh" fill="#000" opacity="${op}" shape-rendering="crispEdges">${row(rx * 1.3, -1.5)}${row(rx * 2, -.5)}${row(rx * 1.3, .5)}</g>`;
}
// A flat orange ball, 7 wide and 6 tall, like the reference.
export const BALL = [[1, 5], [0, 7], [0, 7], [0, 7], [0, 7], [1, 5]], BALL_C = '#f39a2b';
function ball(cx, cy, r) { BALL.forEach(([o, w], j) => r(cx - 3 + o, cy - 2 + j, w, 1, BALL_C, 'o')); }

// One path per colour for each layer, built from runs of pixels, so a whole player is a handful of elements.
function paths(g, layer) {
  const runs = new Map();
  g.forEach((row, y) => {
    for (let x = 0; x < W;) {
      const px = row[x];
      if (!px || px[1] !== layer) { x++; continue; }
      let w = 1; while (x + w < W && row[x + w] && row[x + w][0] === px[0] && row[x + w][1] === layer) w++;
      runs.set(px[0], (runs.get(px[0]) || '') + `M${x} ${y - TOPM}h${w}v1h${-w}z`);
      x += w;
    }
  });
  return [...runs].map(([c, d]) => `<path d="${d}" fill="${c}"/>`).join('');
}

// The trophy lifted over the head, to go with the 'catch' pose (both hands up): the hands hold the ends of its base.
// It sits above the sprite's grid, so it's drawn on its own, in the same pixels and the same 100 × 104 stage box.
export function raisedTrophy(raw) {
  const c = cleanLook(raw), tall = TALL[c.height], aw = c.muscle > 1 ? 1 : 0;
  const hy = 3 + (3 - tall), bx = 8 - Math.ceil(c.weight / 2), fx = bx + 10 + c.weight, ax = bx - 2 - aw;
  const l = ax + 3 + aw, w = fx - 1 - l, t = hy - 10, G = '#f2c14e', G2 = '#c98f22';
  const px = (x, y, ww, h, col) => `<rect x="${x}" y="${y}" width="${ww}" height="${h}" fill="${col}"/>`;
  const m = l + Math.floor(w / 2);
  return `<g class="av-trophy" transform="translate(50 0) scale(${(104 / FEET).toFixed(4)}) translate(-13 0)" shape-rendering="crispEdges">`
    + px(l + 1, t, w - 2, 4, G) + px(l + w - 3, t, 2, 4, G2) + px(l + 2, t, 1, 2, '#fff2c4') + px(l, t + 1, 1, 1, G) + px(l + w - 1, t + 1, 1, 1, G)
    + px(l + 2, t + 4, w - 4, 1, G) + px(m - 1, t + 5, 2, 1, G2) + px(m - 2, t + 6, 4, 1, G) + px(l - 1, t + 7, w + 2, 1, '#4a3418') + '</g>';
}

const cache = new Map();
// SVG markup for a player. Round avatars (the default) show the head and the top of the jersey in a 100 × 100 box.
// opts.stage draws the whole player at their height, feet on the bottom of a 100 × 104 box: the court, the Home
// photo, the player page and the builder. opts.pose: 'fist', 'fistL' (the other arm), 'fist2' (both), 'ball', 'trophy', 'shoot', 'catch', 'block', 'block1', 'pass', 'pass2', 'dribbleL', 'spin', 'lowball' (arms down, the ball behind the back), 'down' (arms down), or palming the ball (the default, as in the reference).
export function figure(raw, opts = {}) {
  const c = cleanLook(raw), key = JSON.stringify([c, raw.num, !!opts.stage, opts.pose || '']);
  if (cache.has(key)) return cache.get(key);
  const { g, go, ge, hy } = sprite(c, raw.num, opts.pose), smile = sprite({ ...c, eyes: 4 }, raw.num, opts.pose).ge;
  // The ball, head, eyes and smiling eyes are their own groups (outside the pixel scale), so the bounce, blink and smile
  // animations work in the box's units. The smiling eyes stay hidden until an animation shows them.
  const tf = opts.stage ? `translate(50 0) scale(${(104 / FEET).toFixed(4)}) translate(-13 0)` : `scale(6.25) translate(-5 ${3 - hy})`, at = s => `<g transform="${tf}">${s}</g>`;
  // A palmed ball sits behind the hand; a ball held in front of the chest sits over the body.
  const bl = `<g class="av-ball" style="--drop:${((5 + TALL[c.height]) * 104 / FEET).toFixed(1)}px">${at(paths(go, 'o'))}</g>`, body = at(paths(g, 'b'));
  const svg = `<g class="av-fig" shape-rendering="crispEdges">${opts.pose === 'ball' ? body + bl : bl + body}`
    + `<g class="av-head">${at(paths(g, 'h'))}<g class="av-eyes">${at(paths(ge, 'e'))}</g><g class="av-smile">${at(paths(smile, 'e'))}</g></g></g>`;
  if (cache.size > 400) cache.clear();
  cache.set(key, svg);
  return svg;
}
