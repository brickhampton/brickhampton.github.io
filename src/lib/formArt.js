// The pixel art for hot and cold form on the player page: the dragon, the snowman, the thermometer and the weather
// round the player. Everything is drawn in the player sprite's pixels (34 to the player's height, feet on row 34,
// the player's back at the left and their face at the right, around x 8-19) and placed with the same transform as
// the player, so it lines up with any player's look. Animations live in styles.css under "Hot and cold form".
import { formGeom } from './avatar.js';

const TF = `translate(50 0) scale(${(104 / 34).toFixed(4)}) translate(-13 0)`;
export const wrap = (s, cls = '') => `<g class="fm ${cls}" transform="${TF}" shape-rendering="crispEdges">${s}</g>`;
const hit = (x, y, w, h) => `<rect class="fm-hit" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
const px = (x, y, w, h, col, o) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${col}"${o != null ? ` opacity="${o}"` : ''}/>`;

// A picture from rows of letters: each letter is a colour from the palette, '.' is clear. Runs of one colour on a
// row become one rect. flip mirrors it (for facing left).
export function art(rows, pal, x0 = 0, y0 = 0, flip = false) {
  const w = Math.max(...rows.map(r => r.length));
  let out = '';
  rows.forEach((row, j) => {
    const r = flip ? row.padEnd(w, '.').split('').reverse().join('') : row;
    for (let i = 0; i < r.length;) {
      const ch = r[i];
      if (ch === '.' || ch === ' ' || !pal[ch]) { i++; continue; }
      let n = 1; while (r[i + n] === ch) n++;
      out += px(x0 + i, y0 + j, n, 1, pal[ch]);
      i += n;
    }
  });
  return out;
}

/* ---------------- the dragon ---------------- */
const DPAL = { R: '#e2492e', D: '#a32c1c', Y: '#f7c548', A: '#ff9440', a: '#c4521b', K: '#16121a', H: '#f5e6b8', W: '#ffffff' };
// Facing right, wings up and wings down. 16 wide, 11 tall.
const DRAGON_UP = [
  '......a.........',
  '.....aAa....H.H.',
  '....aAAAa...RRRR',
  '...aAAAAa..RRWKR',
  '...aAAAa...RRRRRR',
  '....aAa...RRRRDD',
  'D...RRRRRRRRYY..',
  'DR.RRRRRRRRYY...',
  '.RRRRRRRRRYY....',
  '...DD.RRRYY.....',
  '.....D...D......',
];
const DRAGON_DOWN = [
  '................',
  '............H.H.',
  '............RRRR',
  '...........RRWKR',
  '...........RRRRRR',
  '..........RRRRDD',
  'D...RRRRRRRRYY..',
  'DR.RaAAAAaRYY...',
  '.RRRRaAAAaYY....',
  '...DD.aAAa......',
  '.....D.aa.......',
];
// The baby: a big head and stubby wings. 11 wide, 8 tall.
const BABY_UP = [
  '...a.......',
  '..aAa..H.H.',
  '..aAa..RRRR',
  '...a..RRWKR',
  'D..RRRRRRRR',
  '.RRRRRRRYD.',
  '..RRRRRYY..',
  '...D...D...',
];
const BABY_DOWN = [
  '...........',
  '.......H.H.',
  '.......RRRR',
  '......RRWKR',
  'D..RRRRRRRR',
  '.RRaAaRRYD.',
  '..RRaAaYY..',
  '...D.a.D...',
];
// Sitting on the floor, head down, eyes shut, wings folded: the sad dragon. 14 wide, 9 tall.
const SAD = [
  '....aa..........',
  '...aAAa.........',
  '..aAAAAa........',
  '..RaAAaRR.......',
  '.RRRaaRRRR...H.H',
  'RRRRRRRRRRR.RRRR',
  'DRRRRRRRRRRRRDDR',
  '.DRRRRRRRYYRRRRR',
  '..DDDDDDDDYYDDD.',
];

// A dragon, facing right, with its top-left at (x, y): both wing frames (CSS shows one at a time), a flame jet from
// the snout (shown when tapped) and smoke rings it puffs now and then.
export function dragon(size, x, y, flip = false) {
  const big = size > 1, up = big ? DRAGON_UP : BABY_UP, dn = big ? DRAGON_DOWN : BABY_DOWN, w = big ? 16 : 11;
  const mouth = big ? [16, 4] : [11, 3], mx = flip ? x - (mouth[0] - w) - 1 : x + mouth[0];
  const fx = i => flip ? mx - i : mx + i;
  // The flame: a cone from the mouth, yellow at the core.
  let jet = '';
  const FL = big ? [[0, 1, 1, '#ffe27a'], [1, 1, 2, '#ffd04a'], [2, 1, 2, '#ffb02e'], [3, 0, 3, '#ff8a1f'], [4, 0, 3, '#ff6a1a'], [5, -1, 4, '#f24a17'], [6, -1, 3, '#d63414'], [7, 0, 2, '#b72a12']] : [[0, 0, 2, '#ffd04a'], [1, 0, 2, '#ffb02e'], [2, -1, 3, '#ff7a1f'], [3, -1, 3, '#f24a17'], [4, 0, 2, '#c72f13']];
  FL.forEach(([i, dy, h, c]) => { jet += px(fx(i), y + mouth[1] + dy, 1, h, c); });
  const ring = (k) => `<g class="fm-ring r${k}">${px(fx(1), y + mouth[1] - 2, 2, 1, '#c9ccd6')}${px(fx(0), y + mouth[1] - 1, 1, 1, '#c9ccd6')}${px(fx(3), y + mouth[1] - 1, 1, 1, '#c9ccd6')}${px(fx(1), y + mouth[1], 2, 1, '#c9ccd6')}</g>`;
  const h = up.length;
  return `<g class="fm-dragon${big ? ' big' : ''}${flip ? ' fm-l' : ''}">${hit(x - 2, y - 2, w + 4, h + 4)}<g class="fm-wu">${art(up, DPAL, x, y, flip)}</g><g class="fm-wd">${art(dn, DPAL, x, y, flip)}</g>`
    + `<g class="fm-jet">${jet}</g>${ring(1)}${ring(2)}</g>`;
}
// The sad dragon, sitting to the player's left, with a little flame on its tail that gutters out.
export function sadDragon() {
  const x = -13, y = 25;
  return `<g class="fm-sad">${hit(x - 2, y - 2, 20, 12)}${art(SAD, DPAL, x, y)}<g class="fm-tailfl">${px(x - 1, y + 4, 1, 2, '#ffb02e')}${px(x - 1, y + 3, 1, 1, '#f24a17')}</g>`
    + `<g class="fm-tear">${px(x + 13, y + 7, 1, 1, '#7fc4ff')}</g>`
    + `<g class="fm-sigh">${px(x + 16, y + 5, 1, 1, '#c9ccd6')}${px(x + 17, y + 4, 2, 1, '#c9ccd6')}</g></g>`;
}

/* ---------------- the snowman ---------------- */
const SPAL = { W: '#f4f8ff', S: '#c6d4ea', K: '#1b1b22', O: '#f08a24', R: '#d23b2c', r: '#8f2a20', H: '#3a3a4a', h: '#d23b2c', B: '#7a5230' };
// Size 1: a single snowball with a face, sitting on the snow.
const SNOW1 = [
  '..WWWW..',
  '.WWWWWW.',
  'WWKWWKWW',
  'WWWWWWWW',
  'SWWWWWWS',
  '.SSSSSS.',
];
// Size 2: two balls.
const SNOW2 = [
  '...WWWW...',
  '..WKWWKW..',
  '..WWWWWW..',
  '..SWWWWS..',
  '...SSSS...',
  '..WWWWWW..',
  '.WWWKWWWW.',
  'WWWWWWWWWW',
  'WWWWKWWWWW',
  'SWWWWWWWWS',
  '.SSSSSSSS.',
];
// Size 3: hat, scarf and stick arms.
const SNOW3 = [
  '....HHHH.....',
  '....HHHH.....',
  '....hhhh.....',
  '...HHHHHH....',
  '....WWWW.....',
  '...WKWWKW....',
  '...WWWWWW....',
  '...SWWWWS....',
  '...RRRRRR....',
  'B..WRrWWWW..B',
  '.B.WRRWWWW.B.',
  '..BWRrWKWWWB.',
  '..WWWWWWWWWW.',
  '..WWWWWKWWWW.',
  '..SWWWWWWWWS.',
  '...SSSSSSSS..',
];
// The snowman to the player's left, feet on the floor, with its carrot nose as its own group (it falls off when tapped).
export function snowman(size) {
  const rows = size === 1 ? SNOW1 : size === 2 ? SNOW2 : SNOW3, h = rows.length, w = rows[0].length;
  const x = size === 3 ? -10 : size === 2 ? -8 : -6, y = 34 - h;
  // The nose sits beside the eyes' row, pointing right (toward the player).
  const ey = y + (size === 1 ? 3 : size === 2 ? 2 : 6), nx = x + (size === 1 ? 6 : size === 2 ? 7 : 8);
  const nose = px(nx, ey, 2, 1, '#f08a24') + px(nx + 2, ey, 1, 1, '#d46a12');
  return `<g class="fm-snowman s${size}" style="--fall:${33 - ey}px">${hit(x - 2, y - 2, w + 4, h + 3)}${px(x - 1, 33, rows[0].length + 2 + (size === 3 ? 0 : 0), 1, '#e7eefb', .55)}${art(rows, SPAL, x, y)}<g class="fm-nose">${nose}</g></g>`;
}
// The melting snowman after a comeback: a puddle with the hat, the carrot and two coals in it, and steam rising.
export function meltedSnowman() {
  const x = -11, y = 25;
  const lump = art([
    '....HHHH........',
    '....HHHH........',
    '...hhhhhh.......',
    '..HHHHHHHH......',
    '...WWWWWW.......',
    '..WWKWWKWW......',
    '.SWWWWWWWOO.....',
    'SWWWWWWWWWWS....',
    'PSSWWWWWWWSSPPP.',
  ], { ...SPAL, H: '#4a4a5c', h: '#d23b2c', P: '#9cc7f2' }, x, y);
  const steam = [0, 1, 2].map(k => `<g class="fm-steam st${k}">${px(x + 1 + k * 5, y + 2, 1, 2, '#e8eef8', .7)}${px(x + 2 + k * 5, y, 1, 2, '#e8eef8', .5)}</g>`).join('');
  return `<g class="fm-melt">${hit(x - 2, y - 3, 19, 13)}${px(x - 1, 33, 18, 1, '#7fb0e8', .35)}${lump}${steam}</g>`;
}

/* ---------------- the thermometer ---------------- */
// A garden thermometer in the floor to the player's left. The mercury shows the form: t from -1 (ice cold) to 1 (on fire).
export function thermometer(t, tone = t >= .3 ? 'hot' : t <= -.3 ? 'cold' : '') {
  const x = -5, top = 17, bulbY = 30, tube = bulbY - top - 1;
  const lvl = Math.max(1, Math.min(tube - 1, Math.round((t + 1) / 2 * (tube - 2)) + 1));
  const col = tone === 'hot' ? '#ff4a2a' : tone === 'cold' ? '#5fa8ff' : '#ff6a4a';
  const glass = '#d9e1f0', back = '#2a3048';
  let s = px(x, top, 3, tube + 1, glass) + px(x + 1, top + 1, 1, tube, back);
  // Ticks down the side.
  for (let j = top + 2; j < bulbY - 1; j += 3) s += px(x + 3, j, 1, 1, '#8b93a8');
  s += px(x - 1, bulbY - 1, 5, 4, glass) + px(x, bulbY, 3, 2, col) + px(x, bulbY - 1, 3, 1, glass) + px(x + 1, bulbY - 1, 1, 1, col);
  // The stake into the floor.
  s += px(x + 1, bulbY + 3, 1, 1, '#8b93a8');
  // The mercury: its own group so it can wobble, or shoot up when tapped.
  const up = tone === 'cold' ? lvl - 1 : -(tube - 1 - lvl);
  const merc = `<g class="fm-merc" style="--up:${up}px">${px(x + 1, bulbY - 1 - lvl, 1, lvl, col)}</g>`;
  return `<g class="fm-thermo ${tone}">${hit(x - 3, top - 2, 9, 34 - top + 2)}${s}${merc}${px(x + 1, top + 1, 1, 1, '#fff', .5)}</g>`;
}

/* ---------------- weather round the player ---------------- */
// Flames licking up round both shoes (two frames, flickering).
export function flamingShoes(raw) {
  const { L1, L2 } = formGeom(raw);
  const f = (x, k) => `<g class="fm-flame f${k}">`
    + (k ? px(x - 2, 31, 1, 1, '#ff6a1a') + px(x - 1, 30, 1, 2, '#ffb02e') + px(x, 29, 1, 3, '#ff8a1f') + px(x + 1, 30, 1, 2, '#ffd04a') + px(x + 2, 29, 1, 2, '#ff6a1a') + px(x + 3, 31, 1, 1, '#ffb02e')
      : px(x - 2, 30, 1, 2, '#ffb02e') + px(x - 1, 31, 1, 1, '#ff6a1a') + px(x, 30, 1, 2, '#ffd04a') + px(x + 1, 28, 1, 4, '#ff8a1f') + px(x + 2, 31, 1, 1, '#ffb02e') + px(x + 3, 30, 1, 2, '#ff6a1a'))
    + '</g>';
  return `<g class="fm-shoes">${f(L1, 0)}${f(L1, 1)}${f(L2 + 1, 1)}${f(L2 + 1, 0)}</g>`;
}
// Sparks that fly up off the floor where the ball bounces (shown with each bounce).
export function sparks(raw) {
  const { fx } = formGeom(raw), x = fx + 3;
  return `<g class="fm-sparks">${[[-3, -2, '#ffd04a'], [-1, -4, '#fff2b0'], [2, -3, '#ffb02e'], [4, -1, '#ff8a1f'], [0, -6, '#ffd04a']].map(([dx, dy, c], i) => `<g class="sp sp${i}" style="--dx:${dx}px;--dy:${dy}px">${px(x, 33, 1, 1, c)}</g>`).join('')}</g>`;
}
// Frosty breath from the mouth, a puff at a time.
export function frostBreath(raw) {
  const { hy } = formGeom(raw), y = hy + 8;
  return `<g class="fm-breath">${px(20, y, 2, 1, '#e8f1ff', .8)}${px(22, y - 1, 2, 2, '#e8f1ff', .6)}${px(24, y - 1, 1, 1, '#e8f1ff', .4)}</g>`;
}
// Snow falling in front of and round the player: light flurries (cool) or a proper fall (ice).
export function snowfall(heavy) {
  const n = heavy ? 16 : 7, out = [];
  for (let i = 0; i < n; i++) {
    const x = -12 + ((i * 37) % 44), d = 4 + (i * 7) % 5, del = -((i * 1.37) % d).toFixed(2), big = heavy && i % 3 === 0;
    out.push(`<g class="fm-flake" style="animation-duration:${d}s;animation-delay:${del}s;--sway:${i % 2 ? 2 : -2}px">${px(x, -8, big ? 2 : 1, big ? 2 : 1, '#f4f8ff', big ? .9 : .75)}</g>`);
  }
  return `<g class="fm-snow">${out.join('')}</g>`;
}
// A lightning bolt beside the head for a career-best game (flashes now and then).
export function bolt(raw) {
  const { hy } = formGeom(raw), x = 21, y = hy - 4;
  return `<g class="fm-bolt">${art([
    '..YY',
    '.YY.',
    'YYYY',
    '..Y.',
    '.Y..',
    'Y...',
  ], { Y: '#ffe45a' }, x, y)}${px(x + 1, y + 2, 1, 1, '#fff')}</g>`;
}

// Everything for one player's form, in three layers: behind the player, moving with the player (shoes, breath,
// sparks), and in front. fm is from playerForm, pet from petOf.
export function formLayers(raw, fm, pet) {
  let back = '', mid = '', front = '';
  const lv = fm.level, hot = lv === 'fire' || lv === 'heat', cold = lv === 'cool' || lv === 'ice';
  if (pet.kind === 'dragon') {
    const big = pet.size > 1, x = big ? 5 : 8, y = big ? 12 : 14;
    const orbit = (inner, cls) => `<g class="fm-orbx"><g class="fm-orby"><g class="${cls}">${inner}</g></g></g>`;
    back += orbit(dragon(pet.size, x, y, true), 'fm-back');
    front += orbit(dragon(pet.size, x, y), 'fm-front');
  } else if (pet.kind === 'snowman') back += snowman(pet.size);
  else if (pet.kind === 'melt') back += meltedSnowman();
  else if (pet.kind === 'sad') back += sadDragon();
  else back += thermometer(Math.max(-1, Math.min(1, fm.f / 1.1)), hot ? 'hot' : cold ? 'cold' : '');
  if (lv === 'fire') mid += flamingShoes(raw);
  if (hot) mid += sparks(raw);
  if (cold) { mid += frostBreath(raw); front += snowfall(lv === 'ice'); }
  if (fm.bolt) front += bolt(raw);
  return { back: wrap(back), mid: mid && wrap(mid), front: front && wrap(front) };
}
