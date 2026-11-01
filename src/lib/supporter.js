// Our supporter on Home: she comes to every game, cheers us on and takes photos. Drawn in the same pixels as the
// players (same grid and scale, facing the same way), but in her own clothes: long dark-brown hair with bangs, and a
// cream sundress with a small floral print and thin straps. She holds a camera.
//
// supporter(frame) gives one frame of her: 'rest' (camera at her chest), 'cheer' / 'cheer2' (pumping her free fist,
// up and halfway down) or 'snap' (camera up to her eye). The flash that goes with 'snap' is supporterFlash().
// Everything sits in the players' 100 × 104 stage box, feet on the bottom.

const W = 30, H = 36, TOPM = 6, FEET = 34;
const SKIN = '#f6d9bf', SKIN2 = '#e8c4a6', HAIR = '#3a2219', HAIR2 = '#2a1812', HAIRL = '#4f3023';
const DRESS = '#f4ecdc', DRESS2 = '#dfd2bb', K = '#16121a', BLUSH = '#f2b2a6';
const FLOWERS = ['#e895ac', '#86a8de', '#e895ac', '#9cc58c', '#f0bf6a'];
const CAM = '#25252d', CAM2 = '#3c3c48', LENS = '#5d6676', GLINT = '#bfe3ff';
const TF = `translate(50 0) scale(${(104 / FEET).toFixed(4)}) translate(-13 0)`;

function grid() { return Array.from({ length: H + TOPM }, () => Array(W).fill(null)); }

function draw(frame) {
  const g = grid(), ge = grid();
  let t = g;
  const r = (x, y, w = 1, h = 1, col) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (j >= -TOPM && j < H && i >= 0 && i < W) t[j + TOPM][i] = col; };
  const hx = 8, hy = 6, ty = hy + 11;
  // ---- back arm (behind her): down at her side, or pumping a fist
  if (frame === 'cheer') {
    // Up high: from the shoulder out and up past her hair, a small fist at the top.
    [[17, 7, 2], [16, 6, 2], [15, 5, 2], [14, 5, 2], [13, 4, 2], [12, 4, 2], [11, 4, 2], [10, 4, 2]].forEach(([y, x, w]) => r(x, y, w, 1, SKIN2));
    r(3, 7, 4, 3, SKIN2); r(3, 7, 1, 3, mix(SKIN2, .1)); r(4, 8, 2, 1, mix(SKIN2, .12));
  } else if (frame === 'cheer2') {
    // Halfway: elbow bent, the fist at the side of her head.
    [[17, 5, 4], [16, 3, 2], [15, 3, 2], [14, 3, 2], [13, 3, 2]].forEach(([y, x, w]) => r(x, y, w, 1, SKIN2));
    r(2, 10, 4, 3, SKIN2); r(2, 10, 1, 3, mix(SKIN2, .1)); r(3, 11, 2, 1, mix(SKIN2, .12));
  } else {
    [[1, -1, 1], [2, -1, 1], [3, -1, 2], [4, -2, 2], [5, -2, 2], [6, -2, 2], [7, -2, 2], [8, -3, 3], [9, -3, 2]].forEach(([j, dx, w]) => r(9 + dx, ty + j, w, 1, SKIN2));
  }
  // ---- legs and shoes (white sneakers, toes pointing the way she faces)
  [10, 14].forEach(L => { r(L, 30, 2, 2, SKIN); r(L, 32, 3, 1, '#f1efea'); r(L, 33, 4, 1, '#f1efea'); r(L, 33, 4, 1, '#d6d3cc'); r(L + 1, 32, 1, 1, '#d6d3cc'); });
  // ---- dress: thin straps over bare shoulders, a fitted bodice, a gathered skirt flaring to mid-calf
  r(9, ty, 8, 2, SKIN); r(9, ty, 1, 1, SKIN2);
  r(10, ty, 1, 2, DRESS); r(15, ty, 1, 2, DRESS);
  r(9, ty + 2, 8, 4, DRESS); r(16, ty + 2, 1, 4, DRESS2); r(9, ty + 2, 8, 1, DRESS);
  r(12, ty + 2, 1, 4, DRESS2);                     // the seam down the bodice
  r(9, ty + 6, 8, 1, DRESS2);                      // the waist
  const SK = [[9, 8], [9, 9], [8, 10], [8, 10], [8, 11], [7, 12], [7, 12]];
  SK.forEach(([x, w], k) => r(x, ty + 7 + k, w, 1, DRESS));
  // Gathers: soft fold lines down the skirt, and a shaded far side.
  [[10, 2], [13, 1], [16, 3]].forEach(([x, from]) => r(x, ty + 7 + from, 1, 7 - from, DRESS2));
  SK.forEach(([x, w], k) => r(x + w - 1, ty + 7 + k, 1, 1, DRESS2));
  r(7, ty + 13, 12, 1, DRESS2);
  // A scattering of tiny flowers.
  [[10, 3], [14, 2], [11, 5], [15, 4], [13, 9], [9, 10], [16, 8], [11, 12], [14, 12], [17, 11], [8, 13], [12, 7]].forEach(([x, y], i) => r(x, ty + y, 1, 1, FLOWERS[i % FLOWERS.length]));
  // ---- head (as the players': 10 wide, a one-pixel nose), a little blush
  r(hx + 2, hy, 6, 1, SKIN); r(hx + 1, hy + 1, 8, 1, SKIN); r(hx, hy + 2, 10, 8, SKIN); r(hx + 1, hy + 10, 8, 1, SKIN); r(hx + 10, hy + 6, 1, 2, SKIN);
  r(hx + 8, hy + 8, 1, 1, BLUSH); r(hx + 3, hy + 8, 1, 1, BLUSH);
  // eyes on their own grid, so they can blink; when she's taking a photo she closes the eye away from the camera
  t = ge;
  if (frame === 'snap') r(hx + 2, hy + 7, 2, 1, K);
  else { r(hx + 3, hy + 6, 1, 2, K); r(hx + 7, hy + 6, 1, 2, K); }
  t = g;
  // ---- long hair: a crown, straight wispy bangs to just above the eyes, falling well past the shoulders at the back
  const HSP = [
    [-1, 2, 'HHHHHH'], [0, 0, 'HHHHHHHHHH'], [1, -1, 'HHHHHHHHHHHL'], [2, -1, 'HHHHLHHHHHHH'], [3, -1, 'HHHHHHHHHHHH'],
    [4, -1, 'HHHHH.H.HH.H'], [5, -2, 'HHHH.......H'], [6, -2, 'HHHD'], [7, -2, 'HHHD'], [8, -2, 'HHHD'], [9, -2, 'HHHD'],
    [10, -2, 'HHHD'], [11, -2, 'HHHHD'], [12, -2, 'HHHHD'], [13, -2, 'HHHHD'], [14, -2, 'HHHD'], [15, -2, 'HHHD'],
    [16, -2, 'HDHD'], [17, -1, 'HD'],
  ];
  const pal = { H: HAIR, D: HAIR2, L: HAIRL };
  HSP.forEach(([y, x, s]) => [...s].forEach((ch, i) => { if (pal[ch]) r(hx + x + i, hy + y, 1, 1, pal[ch]); }));
  // A strand falling forward over her front shoulder.
  r(hx + 8, hy + 9, 1, 3, HAIR);
  // ---- front arm and the camera
  if (frame === 'snap') {
    // Camera up to her eye, the lens pointing at the team; elbow down, hand under the camera.
    r(16, ty, 2, 2, SKIN); r(17, ty - 3, 2, 3, SKIN); r(18, ty - 2, 1, 2, SKIN2);
    camera(r, 15, hy + 5);
    r(16, hy + 9, 3, 1, SKIN);
  } else {
    // Camera held at her chest, ready.
    [[1, 0, 1], [2, 0, 2], [3, 0, 2], [4, 1, 2]].forEach(([j, dx, w]) => r(16 + dx, ty + j, w, 1, SKIN));
    camera(r, 16, ty + 3);
    r(16, ty + 6, 3, 1, SKIN); r(17, ty + 6, 2, 1, SKIN2);
  }
  return { g, ge };
}

// A small mirrorless camera, side on: a black body, a dark lens pointing right with a glint, a little flash on top.
function camera(r, x, y) {
  r(x, y, 6, 4, CAM); r(x, y, 6, 1, CAM2); r(x + 1, y - 1, 2, 1, CAM2); r(x + 4, y + 1, 1, 1, '#d0d0d8');
  r(x + 6, y + 1, 2, 2, LENS); r(x + 7, y + 1, 1, 1, GLINT); r(x, y + 3, 6, 1, '#101016');
}

function mix(hex, t) {
  return '#' + [1, 3, 5].map(i => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - t)))).toString(16).padStart(2, '0')).join('');
}

function paths(g) {
  const runs = new Map();
  g.forEach((row, y) => {
    for (let x = 0; x < W;) {
      const c = row[x]; if (!c) { x++; continue; }
      let w = 1; while (x + w < W && row[x + w] === c) w++;
      runs.set(c, (runs.get(c) || '') + `M${x} ${y - TOPM}h${w}v1h${-w}z`);
      x += w;
    }
  });
  return [...runs].map(([c, d]) => `<path d="${d}" fill="${c}"/>`).join('');
}

const cache = new Map();
export function supporter(frame = 'rest') {
  if (cache.has(frame)) return cache.get(frame);
  const { g, ge } = draw(frame);
  const svg = `<g class="av-fig" shape-rendering="crispEdges"><g transform="${TF}">${paths(g)}</g><g class="av-eyes"><g transform="${TF}">${paths(ge)}</g></g></g>`;
  cache.set(frame, svg);
  return svg;
}

// The camera flash for the 'snap' frame: a bright pixel star at the flash and a soft burst of light round it.
export function supporterFlash() {
  const x = 26, y = 12.5, px = (a, b, w, h, o = 1) => `<rect x="${a}" y="${b}" width="${w}" height="${h}" fill="#fff" opacity="${o}"/>`;
  return `<g class="sup-flash"><g transform="${TF}"><circle cx="${x}" cy="${y}" r="4.2" fill="#fff8d8" opacity=".3"/><circle cx="${x}" cy="${y}" r="2.6" fill="#fff" opacity=".5"/>`
    + `<g shape-rendering="crispEdges">${px(x - .5, y - 4.5, 1, 9)}${px(x - 4.5, y - .5, 9, 1)}${px(x - 1.5, y - 1.5, 3, 3)}${px(x - 3.5, y - 3.5, 1, 1, .7)}${px(x + 2.5, y - 3.5, 1, 1, .7)}${px(x - 3.5, y + 2.5, 1, 1, .7)}${px(x + 2.5, y + 2.5, 1, 1, .7)}</g></g></g>`;
}
