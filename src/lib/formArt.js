// The pixel art for hot and cold form on the player page: the dragon, the snowman, the thermometer and the weather
// round the player. Everything is drawn in the player sprite's pixels (34 to the player's height, feet on row 34,
// the player's back at the left and their face at the right, around x 8-19) and placed with the same transform as
// the player, so it lines up with any player's look. The pets stand off to the player's left (x -27 to -6), clear of
// the player; the stage makes room for them (.pstage-wrap.pet). Animations live in styles.css under "Hot and cold form".
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
  const x = -23, y = 25;
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
  const x = size === 3 ? -20 : size === 2 ? -17 : -15, y = 34 - h;
  // The nose sits beside the eyes' row, pointing right (toward the player).
  const ey = y + (size === 1 ? 3 : size === 2 ? 2 : 6), nx = x + (size === 1 ? 6 : size === 2 ? 7 : 8);
  const nose = px(nx, ey, 2, 1, '#f08a24') + px(nx + 2, ey, 1, 1, '#d46a12');
  return `<g class="fm-snowman s${size}" style="--fall:${33 - ey}px">${hit(x - 2, y - 2, w + 4, h + 3)}${px(x - 1, 33, rows[0].length + 2 + (size === 3 ? 0 : 0), 1, '#e7eefb', .55)}${art(rows, SPAL, x, y)}<g class="fm-nose">${nose}</g></g>`;
}
// The melting snowman after a comeback: a puddle with the hat, the carrot and two coals in it, and steam rising.
export function meltedSnowman() {
  const x = -22, y = 25;
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

/* ---------------- the in-between pets ---------------- */
// Heating up: a little living flame with eyes, bouncing beside the player. It's bigger after 2 hot games in a row and
// throws off embers after 3. Two flicker frames for the tips; tapped, it jumps and flares.
const FLAME_BIG = [[
  '....R....',
  '...RO.R..',
  '...ROROR.',
  '..ROOOOR.',
  '.ROOYOOR.',
  '.ROYYYOOR',
  'ROOYYYYOR',
  'ROYKYYKYR',
  'ROYYYYYOR',
  'ROOYYYOOR',
  '.ROOOOOR.',
  '..RRRRR..',
], [
  '.R.......',
  '.RR..R...',
  '..RORR...',
  '..ROOOR..',
  '.ROOYOOR.',
  '.ROYYYOOR',
  'ROOYYYYOR',
  'ROYKYYKYR',
  'ROYYYYYOR',
  'ROOYYYOOR',
  '.ROOOOOR.',
  '..RRRRR..',
]];
const FLAME_SMALL = [[
  '...R...',
  '..ROR..',
  '.ROYOR.',
  'ROYYYOR',
  'RYKYKYR',
  'ROYYYOR',
  '.ROOOR.',
  '..RRR..',
], [
  '.R.....',
  '..RR.R.',
  '.ROYOR.',
  'ROYYYOR',
  'RYKYKYR',
  'ROYYYOR',
  '.ROOOR.',
  '..RRR..',
]];
export function flameBuddy(size) {
  const pal = { R: '#e8401c', O: '#ff8a1f', Y: '#ffd04a', K: '#3a1408' };
  const fr = size > 1 ? FLAME_BIG : FLAME_SMALL, h = fr[0].length, w = fr[0][0].length, x = size > 1 ? -18 : -17, y = 33 - h;
  // Happy eyes (^ ^) for the tap: the eye pixels go back to flame and a little arch sits above each.
  const ey = y + (size > 1 ? 7 : 4), ex = size > 1 ? [x + 3, x + 6] : [x + 2, x + 4];
  const happy = ex.map(e => px(e, ey, 1, 1, pal.Y) + px(e - 1, ey, 1, 1, pal.K) + px(e, ey - 1, 1, 1, pal.K) + px(e + 1, ey, 1, 1, pal.K)).join('');
  const embers = size > 2 ? [[-2, 2, '#ffd04a'], [w + 1, 4, '#ff8a1f'], [1, -2, '#ffb02e'], [w - 1, -1, '#ffd04a']].map(([dx, dy, c], i) => `<g class="fm-ember e${i}">${px(x + dx, y + dy, 1, 1, c)}</g>`).join('') : '';
  return `<g class="fm-flamebud s${size}">${hit(x - 3, y - 4, w + 6, h + 6)}<g class="fm-fsh">${px(x + 1, 33, w - 2, 1, '#000', .3)}</g>`
    + `<g class="fm-fbody"><g class="fm-ff f0">${art(fr[0], pal, x, y)}</g><g class="fm-ff f1">${art(fr[1], pal, x, y)}</g><g class="fm-happy">${happy}</g></g>${embers}</g>`;
}

// Steady: a turtle plodding up and back beside the player. It hides in its shell when tapped.
const SHELL = [
  '....SSSS....',
  '..SSsSSsSS..',
  '.SsSSSSSSsS.',
  'SSSSsSSsSSSS',
  'BBBBBBBBBBBB',
];
function turtle1(x, y, flip) {
  const pal = { S: '#4f9a52', s: '#2f6d37', B: '#d8c27a', H: '#9bd46e', K: '#16121a' };
  const head = art(['.HH.', 'HHKH', 'HHHH'], pal, flip ? x - 4 : x + 12, y + 2, flip);
  const tail = px(flip ? x + 12 : x - 1, y + 4, 1, 1, pal.H);
  const legs = k => `<g class="fm-leg l${k}">${px(x + 1 + k, y + 5, 2, 1, pal.H)}${px(x + 8 + k, y + 5, 2, 1, pal.H)}</g>`;
  return `<g class="fm-tdir ${flip ? 'fl' : 'fr'}"><g class="fm-tout">${legs(0)}${legs(1)}<g class="fm-thead">${head}</g>${tail}</g>${art(SHELL, pal, x, y)}</g>`;
}
export function turtle() {
  const x = -26, y = 28;
  return `<g class="fm-turtle">${hit(x - 3, y - 4, 24, 11)}${px(x, 33, 12, 1, '#000', .3)}<g class="fm-walk">${turtle1(x, y, false)}${turtle1(x, y, true)}</g></g>`;
}
// Cooling off: a penguin, the snowman's mate, waddling on the spot. It flaps and hops when tapped.
const PENG = [
  '...KKKK...',
  '..KKKKKK..',
  '.KKEKKEKK.',
  '.KPKOOKPK.',
  '.KKWWWWKK.',
  '.KWWWWWWK.',
  '.KWWWWWWK.',
  '.KWWWWWWK.',
  '..KWWWWK..',
  '...KKKK...',
];
export function penguin() {
  const x = -17, y = 22, pal = { K: '#1c2030', E: '#ffffff', O: '#f2a33a', W: '#f4f8ff', P: '#e98aa0' };
  const fl = up => `<g class="fm-flip ${up ? 'up' : 'dn'}">${up ? px(x - 1, y + 4, 2, 1, pal.K) + px(x - 2, y + 3, 1, 1, pal.K) + px(x + 9, y + 4, 2, 1, pal.K) + px(x + 11, y + 3, 1, 1, pal.K) : px(x, y + 5, 1, 3, pal.K) + px(x + 9, y + 5, 1, 3, pal.K)}</g>`;
  const feet = k => `<g class="fm-feet f${k}">${k ? px(x + 2, y + 10, 2, 1, pal.O) + px(x + 6, y + 11, 2, 1, pal.O) : px(x + 2, y + 11, 2, 1, pal.O) + px(x + 6, y + 10, 2, 1, pal.O)}</g>`;
  return `<g class="fm-peng">${hit(x - 3, y - 3, 16, 17)}${px(x + 1, 33, 8, 1, '#000', .3)}<g class="fm-pbody">${feet(0)}${feet(1)}${art(PENG, pal, x, y)}${fl(false)}${fl(true)}</g></g>`;
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
    const x = -28 + ((i * 37) % 56), d = 4 + (i * 7) % 5, del = -((i * 1.37) % d).toFixed(2), big = heavy && i % 3 === 0;
    out.push(`<g class="fm-flake" style="animation-duration:${d}s;animation-delay:${del}s;--sway:${i % 2 ? 2 : -2}px">${px(x, -8, big ? 2 : 1, big ? 2 : 1, '#f4f8ff', big ? .9 : .75)}</g>`);
  }
  return `<g class="fm-snow">${out.join('')}</g>`;
}
// A small lightning bolt beside the head, flashing now and then, to go with the thundercloud.
export function bolt(raw, gold) {
  const { hy } = formGeom(raw), x = 21, y = hy - 4;
  return `<g class="fm-bolt">${art([
    '..YY',
    '.YY.',
    'YYYY',
    '..Y.',
    '.Y..',
    'Y...',
  ], { Y: gold ? '#ffd23a' : '#eef4ff' }, x, y)}${px(x + 1, y + 2, 1, 1, '#fff')}</g>`;
}

/* ---------------- the thundercloud (a career or season best) ---------------- */
// A proud little thundercloud with a gold crown floating to the player's left, zapping gold bolts onto the floor. The
// same for a career best and a season best (only the label differs). Tapped, it rumbles and lets off three.
const CLOUD = [
  '.....LLLL.......',
  '...LLLCCLL.LLL..',
  '..LCCCCCCCLCCCL.',
  '.LCCCCCCCCCCCCCL',
  'LCCCBKCCCCBKCCCC',
  'CCCCCCCCCCCCCCCC',
  'CCCCCCCKKCCCCCCD',
  '.DDDDDDDDDDDDDD.',
];
// A bolt from the cloud's bottom (x, y) down to the floor, zigzagging.
function zig(x, y, col) {
  const steps = [[0, 4], [-2, 0], [0, 4], [3, 0], [0, 4], [-2, 0], [0, 6]];
  let out = '', cx = x, cy = y;
  for (const [dx, dy] of steps) {
    if (dy) { out += px(cx, cy, 2, dy, col); cy += dy; }
    else { const l = Math.min(cx, cx + dx); out += px(l, cy - 1, Math.abs(dx) + 2, 2, col); cx += dx; }
  }
  return out + px(cx - 2, 33, 5, 1, col, .55) + px(cx - 4, 33, 9, 1, col, .2);
}
export function storm(career) {
  const x = -27, y = 3, col = career ? '#ffd23a' : '#eef4ff';
  const pal = { C: '#7f889e', L: '#aab2c4', D: '#4d5468', K: '#1c2030', B: '#ffffff' };
  const crown = career ? art(['G.G.G', 'GGGGG'], { G: '#ffd23a' }, x + 5, y - 2) : '';
  const bolts = [[x + 5, 'z0'], [x + 11, 'z1']].map(([bx, k]) => `<g class="fm-zap ${k}">${zig(bx, y + 8, col)}</g>`).join('');
  return `<g class="fm-storm${career ? ' gold' : ''}">${hit(x - 2, y - 4, 20, 36)}${bolts}<g class="fm-cloud">${crown}${art(CLOUD, pal, x, y)}</g></g>`;
}

// Everything for one player's form, in three layers: behind the player, moving with the player (shoes, breath,
// sparks), and in front. fm is from playerForm, pet from petOf.
export function formLayers(raw, fm, pet) {
  let back = '', mid = '', front = '';
  const lv = fm.level, hot = lv === 'fire' || lv === 'heat', cold = lv === 'cool' || lv === 'ice';
  if (pet.kind === 'dragon') front += `<g class="fm-hover">${dragon(pet.size, pet.size > 1 ? -27 : -22, pet.size > 1 ? 6 : 10)}</g>`;
  else if (pet.kind === 'snowman') back += snowman(pet.size);
  else if (pet.kind === 'melt') back += meltedSnowman();
  else if (pet.kind === 'sad') back += sadDragon();
  else if (pet.kind === 'flame') back += flameBuddy(pet.size);
  else if (pet.kind === 'storm') back += storm(true);
  else if (pet.kind === 'penguin') back += penguin();
  else back += turtle();
  if (lv === 'fire') mid += flamingShoes(raw);
  if (hot) mid += sparks(raw);
  if (cold) { mid += frostBreath(raw); front += snowfall(lv === 'ice'); }
  if (fm.best) front += bolt(raw, true);
  return { back: wrap(back), mid: mid && wrap(mid), front: front && wrap(front) };
}
