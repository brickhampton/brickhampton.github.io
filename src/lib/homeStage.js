// The Home stage: centre court in an arena, the team on the centre circle, a crowd in two tiers and the team's
// banners behind them, lit softly from above. Now and then, shafts of skylight sweep across the scene.
import { camera, courtLines, keyPaint, hoop, crowd, flashes } from './homeBg.js';

const f1 = n => n.toFixed(1);
// Nothing on Home is blurred while it plays: a live blur is slow on an iPad. The soft edges are drawn with gradients
// shaped like a blur instead, worked out here once.
// How bright a box of half-width a, blurred by sd, is at distance x from its middle.
const erf = x => { const t = 1 / (1 + .3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * Math.exp(-x * x); return x < 0 ? -y : y; };
const soft = (x, a, sd) => .5 * (erf((a + x) / (sd * Math.SQRT2)) + erf((a - x) / (sd * Math.SQRT2)));
// A blurred ellipse as a radial gradient, filling an ellipse 3sd bigger than the original each way.
function softEllipse(id, cx, cy, rx, ry, sd, color, op) {
  const R = rx + 3 * sd, Ry = ry + 3 * sd, peak = soft(0, rx, sd) * soft(0, ry, sd);
  const stops = Array.from({ length: 13 }, (_, i) => { const t = i / 12, v = Math.sqrt(soft(t * R, rx, sd) * soft(0, ry, sd) * soft(0, rx, sd) * soft(t * Ry, ry, sd));
    return `<stop offset="${t.toFixed(3)}" stop-color="${color}" stop-opacity="${(op * Math.min(v, peak)).toFixed(4)}"/>`; }).join('');
  return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(R)}" gradientTransform="translate(${f1(cx)} ${f1(cy)}) scale(1 ${(Ry / R).toFixed(4)}) translate(${f1(-cx)} ${f1(-cy)})">${stops}</radialGradient>`;
}

// Looking down the whole court from one end, with the centre circle under the team. On a tall phone the players
// are drawn 1.3x bigger round (400, 300), so the court is too.
const FULL = { hz: 120, dc: 20.5, f: 614, hc: 1.92 };
const cam = A => { const k = A < 1 ? 1.3 : 1; return camera({ ...FULL, hz: 300 + (FULL.hz - 300) * k, f: FULL.f * k }); };

export function stage({ vx, vy, vw, vh, vb, A }) {
  const c = cam(A), top = c.pt(0, -3)[1], box = `x="${f1(vx)}" y="${f1(vy)}" width="${f1(vw)}" height="${f1(vh)}"`;
  const lines = courtLines(c, { full: true }), pool = c.pt(0, 14), cy = f1(pool[1]);
  const gy = vy + (pool[1] - vy) * .35, gry = (pool[1] - vy) * .55;
  const floor = `x="${f1(vx)}" y="${f1(top)}" width="${f1(vw)}" height="${f1(vb - top)}"`;
  return {
    refl: .22,
    defs: `${softEllipse('hbig', 400, gy, 230, gry, 45, '#fff6e0', .2)}
      <radialGradient id="hglow" gradientUnits="userSpaceOnUse" cx="400" cy="200" r="${Math.max(440, vh * .6).toFixed(0)}"><stop offset="0" stop-color="#2f55d4" stop-opacity=".4"/><stop offset=".6" stop-color="#1c3896" stop-opacity=".1"/><stop offset="1" stop-color="#0c0c10" stop-opacity="0"/></radialGradient>
      <linearGradient id="hfl" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${f1(top)}" y2="${f1(vb)}"><stop offset="0" stop-color="#0b0d15"/><stop offset=".4" stop-color="#151a2a"/><stop offset="1" stop-color="#0c0e15"/></linearGradient>
      <radialGradient id="hside" gradientUnits="userSpaceOnUse" cx="400" cy="${cy}" r="${f1(Math.max(500, vw * .6))}"><stop offset=".4" stop-color="#07080c" stop-opacity="0"/><stop offset="1" stop-color="#07080c" stop-opacity=".9"/></radialGradient>
      <radialGradient id="hpool" gradientUnits="userSpaceOnUse" cx="400" cy="${cy}" r="240" gradientTransform="translate(400 ${cy}) scale(1 .4) translate(-400 -${cy})"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".7" stop-color="#cfdcff" stop-opacity=".08"/><stop offset="1" stop-color="#cfdcff" stop-opacity="0"/></radialGradient>
      <radialGradient id="hov" gradientUnits="userSpaceOnUse" cx="400" cy="${cy}" r="300" gradientTransform="translate(400 ${cy}) scale(1 .42) translate(-400 -${cy})"><stop offset="0" stop-color="#fff8e8" stop-opacity=".45"/><stop offset=".6" stop-color="#fff1d0" stop-opacity=".1"/><stop offset="1" stop-color="#fff1d0" stop-opacity="0"/></radialGradient>
`,
    under: `<rect ${box} fill="#0b0c12"/><rect ${box} fill="url(#hglow)"/>${stands(vx, vw, vy, top)}
      <rect ${floor} fill="url(#hfl)"/>
      <polygon points="${keyPaint(c)}" fill="#2f55d4" opacity=".22"/>
      <polygon points="${c.poly(c.arc(0, 14, 1.8, 0, Math.PI * 2, 1, 0, 60))}" fill="#2f55d4" opacity=".2"/>
      <g fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="2" stroke-linejoin="round"><path d="${lines.solid}"/><path d="${lines.dash}" stroke-dasharray="7 7"/></g>
      <rect ${floor} fill="url(#hside)"/>
      <ellipse cx="400" cy="${cy}" rx="380" ry="170" fill="url(#hpool)"/>
      ${hoop(c, { dim: .8 })}
      <ellipse cx="400" cy="${f1(gy)}" rx="${f1(230 + 3 * 45)}" ry="${f1(gry + 3 * 45)}" fill="url(#hbig)"/>
      <ellipse cx="400" cy="${cy}" rx="520" ry="220" fill="url(#hov)"/>`,
    rays: skylights(vy, pool[1]),
  };
}

// Warm shafts of light from high windows on the left. They stay hidden, then every minute or so drift in, sweep
// across the stands and the team, and fade away (see .hrays). They're drawn on their own layer between the arena and
// the team (see homeScene), so the iPad slides that layer along without redrawing the rest of the scene.
// Each shaft is an upright strip with soft sides, slanted with a skew; a mask fades them all from top to bottom.
function skylights(vy, py) {
  const dx = 260, y0 = vy - 40, h = py + 40 - y0, sd = 16, pad = 3 * sd, k = (dx / h).toFixed(4);
  let defs = '', shafts = '';
  [[-180, 70, .7], [-40, 46, .9], [90, 90, .6], [250, 50, .5], [380, 70, .4]].forEach(([x, w, o], n) => {
    const x0 = 400 + x - dx / 2, W = w + 2 * pad;
    const stops = Array.from({ length: 13 }, (_, i) => { const t = i / 12; return `<stop offset="${t.toFixed(3)}" stop-color="#ffe9c4" stop-opacity="${soft(t * W - W / 2, w / 2, sd).toFixed(4)}"/>`; }).join('');
    defs += `<linearGradient id="hsky${n}">${stops}</linearGradient>`;
    shafts += `<rect x="${f1(x0 - pad)}" y="${f1(y0)}" width="${f1(W)}" height="${f1(h)}" fill="url(#hsky${n})" opacity="${o}"/>`;
  });
  defs += `<linearGradient id="hsky-v" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${f1(y0)}" y2="${f1(y0 + h)}"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".75" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity=".03"/></linearGradient>
    <mask id="hsky-m" maskUnits="userSpaceOnUse" x="-2000" y="${f1(y0)}" width="5000" height="${f1(h)}"><rect x="-2000" y="${f1(y0)}" width="5000" height="${f1(h)}" fill="url(#hsky-v)"/></mask>`;
  return `<defs>${defs}</defs><g mask="url(#hsky-m)"><g transform="translate(0 ${f1(y0)}) matrix(1 0 ${k} 1 0 0) translate(0 ${f1(-y0)})">${shafts}</g></g>`;
}

// Behind the team: a dim crowd in two tiers, with the team's banners (pixel emblems, no words) hanging from the
// rafters in front of the upper tier. Further banners are smaller and fainter, so the arena has some depth.
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

