// Backdrops for the Player of the game dancer, in the stage's units (the player's feet near 130, 226).
// Each gives the SVG behind the player, the bits that only show when celebrating (`party`), and where the feet go.
// Everything is drawn in chunky squares so it sits with the pixel players.
import { playerCourt } from './playerCourt.js';

const X0 = 20, Y0 = 70, X1 = 240, Y1 = 256, W = X1 - X0, H = Y1 - Y0;
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

export const BACKDROPS = { arena, podium, disco, fireworks };
const built = {};
export const backdrop = k => (built[k] ||= (BACKDROPS[k] || arena)());
