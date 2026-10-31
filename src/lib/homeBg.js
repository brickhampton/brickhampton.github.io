// Home backgrounds: a real court drawn in perspective, with arena lights.
// Court sizes are FIBA, in metres. X runs across the court, z runs from the far baseline towards the camera.
const f1 = n => n.toFixed(1);

export function camera({ hz, dc, f, hc }) {
  const pt = (X, z, Y = 0) => { const d = dc - z; return d < .4 ? null : [400 + f * X / d, hz + f * (hc - Y) / d]; };
  const line = pts => { let s = '', pen = false; for (const p of pts) { const q = pt(...p); if (!q) { pen = false; continue; } s += (pen ? 'L' : 'M') + f1(q[0]) + ' ' + f1(q[1]); pen = true; } return s; };
  const seg = (a, b, n = 30) => Array.from({ length: n + 1 }, (_, i) => a.map((v, k) => v + (b[k] - v) * i / n));
  // a = 0 points towards the camera when s = 1, away from it when s = -1.
  const arc = (cx, cz, r, a0, a1, s = 1, Y = 0, n = 48) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + r * Math.sin(a), cz + s * r * Math.cos(a), Y]; });
  const poly = pts => { const q = pts.map(p => pt(...p)); return q.some(v => !v) ? '' : q.map(v => f1(v[0]) + ',' + f1(v[1])).join(' '); };
  const unproject = (x, y) => { const d = f * hc / (y - hz); return { d, z: dc - d, X: (x - 400) * d / f }; };
  return { hz, dc, f, hc, pt, line, seg, arc, poly, unproject };
}

const R3 = 6.75, C3 = 6.6, Z3 = 1.575 + Math.sqrt(R3 * R3 - C3 * C3), A3 = Math.asin(C3 / R3);
// All the lines of one end of the court; s = -1 draws the other end, mirrored at z = 28.
function endLines(c, z0, s) {
  const z = v => z0 + s * v, L = [], sg = (a, b) => L.push(c.line(c.seg(a, b)));
  sg([-7.5, z(0)], [7.5, z(0)]);
  sg([-2.45, z(0)], [-2.45, z(5.8)]); sg([2.45, z(0)], [2.45, z(5.8)]); sg([-2.45, z(5.8)], [2.45, z(5.8)]);
  L.push(c.line(c.arc(0, z(5.8), 1.8, -Math.PI / 2, Math.PI / 2, s)));
  sg([-C3, z(0)], [-C3, z(Z3)]); sg([C3, z(0)], [C3, z(Z3)]);
  L.push(c.line(c.arc(0, z(1.575), R3, -A3, A3, s, 0, 90)));
  L.push(c.line(c.arc(0, z(1.575), 1.25, -Math.PI / 2, Math.PI / 2, s)));
  return { solid: L.join(''), dash: c.line(c.arc(0, z(5.8), 1.8, Math.PI / 2, Math.PI * 1.5, s)) };
}
export function courtLines(c, { full = false } = {}) {
  const a = endLines(c, 0, 1), b = full ? endLines(c, 28, -1) : { solid: '', dash: '' };
  const side = c.line(c.seg([-7.5, 0], [-7.5, 28], 80)) + c.line(c.seg([7.5, 0], [7.5, 28], 80));
  const mid = c.line(c.seg([-7.5, 14], [7.5, 14])) + c.line(c.arc(0, 14, 1.8, 0, Math.PI * 2, 1, 0, 72));
  return { solid: a.solid + b.solid + side + mid, dash: a.dash + b.dash };
}
// The painted key at one end.
export const keyPaint = (c, z0 = 0, s = 1) => c.poly([[-2.45, z0], [2.45, z0], [2.45, z0 + s * 5.8], [-2.45, z0 + s * 5.8]]);

// A small crowd in the stands: rows of heads and shoulders, dim, getting darker towards the back.
export function crowd({ x0, x1, yb, rows = 5, gap = 15, size = 7, seed = 3, light = 1 }) {
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const SK = ['#c99a74', '#e2b48b', '#a8704a', '#f0c8a2', '#8a5638'], SH = ['#2f55d4', '#e9b949', '#eeeeee', '#3a3f4f', '#c0392b', '#2f55d4', '#1b1b1b'];
  let out = '';
  for (let r = rows - 1; r >= 0; r--) {
    const y = yb - r * gap, op = (.24 - r * .035) * light, u = size * (1 - r * .06);
    out += `<g opacity="${op.toFixed(2)}" shape-rendering="crispEdges">`;
    for (let x = x0 + rnd() * u; x < x1; x += u * (1.5 + rnd() * .9)) {
      if (rnd() < .12) continue;
      const hy = y - u * 1.9 - (rnd() < .2 ? u * .5 : 0);
      out += `<rect x="${f1(x - u * .65)}" y="${f1(hy + u * .9)}" width="${f1(u * 1.3)}" height="${f1(u * 1.5)}" fill="${SH[Math.floor(rnd() * SH.length)]}"/><rect x="${f1(x - u * .4)}" y="${f1(hy)}" width="${f1(u * .8)}" height="${f1(u * .9)}" fill="${SK[Math.floor(rnd() * SK.length)]}"/>`;
    }
    out += '</g>';
  }
  return out;
}

// A few phone flashes going off in the crowd.
export function flashes({ x0, x1, y0, y1, n = 10, seed = 11 }) {
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: n }, () => `<circle class="hflash" cx="${f1(x0 + rnd() * (x1 - x0))}" cy="${f1(y0 + rnd() * (y1 - y0))}" r="2.2" fill="#fff" style="--fd:${(3 + rnd() * 5).toFixed(1)}s;--fl:${(-rnd() * 8).toFixed(1)}s"/>`).join('');
}

// A stadium hoop: backboard, rim and net on a charcoal stanchion with a padded base, so it sits back in the dim arena.
export function hoop(c, { dim = 1, glass = '#d8e2f5' } = {}) {
  const P = (X, z, Y) => c.pt(X, z, Y), q = pts => c.poly(pts);
  const S = { base: '#22252e', baseS: '#14161c', baseT: '#2f3340', post: '#3a3f4d', postS: '#23262f', pad: '#22252e' };
  // A padded base on the floor behind the baseline, a thick post at its front that stops below the board, an arm
  // angling up and forward from its top to the padded bottom of the board, and a diagonal brace from the base to the arm.
  const bw = 0.9, z0 = -3.4, z1 = -0.9, bh = 1.05, pw = 0.26, pz = -1.3, py = 2.15, ax = .17, az = 1.1, ay = 2.86;
  const front = q([[-bw, z1, 0], [bw, z1, 0], [bw, z1, bh], [-bw, z1, bh]]);
  const top = q([[-bw, z1, bh], [bw, z1, bh], [bw * .9, z0, bh], [-bw * .9, z0, bh]]);
  const shade = q([[-bw, z1, bh * .14], [bw, z1, bh * .14], [bw, z1, 0], [-bw, z1, 0]]);
  const post = q([[-pw, pz, bh], [pw, pz, bh], [pw, pz, py + .2], [-pw, pz, py + .2]]);
  const postS = q([[pw * .35, pz, bh], [pw, pz, bh], [pw, pz, py + .2], [pw * .35, pz, py + .2]]);
  const armT = q([[-ax, pz, py + .2], [ax, pz, py + .2], [ax, az, ay + .1], [-ax, az, ay + .1]]);
  const armMid = q([[-ax, pz, py + .2], [ax, pz, py + .2], [ax, az, ay + .1], [ax, az, ay - .06], [ax, pz, py - .02], [-ax, pz, py - .02]]);
  const b0 = P(0, z1 - .05, bh), b1 = P(0, (pz + az) / 2, (py + ay) / 2 - .05);
  const sw = Math.max(1.5, c.f * .09 / (c.dc - z1));
  const board = q([[-.9, 1.2, 3.95], [.9, 1.2, 3.95], [.9, 1.2, 2.9], [-.9, 1.2, 2.9]]);
  const boardPad = q([[-.9, 1.2, 2.9], [.9, 1.2, 2.9], [.9, 1.2, 2.78], [-.9, 1.2, 2.78]]);
  const box = q([[-.295, 1.2, 3.5], [.295, 1.2, 3.5], [.295, 1.2, 3.05], [-.295, 1.2, 3.05]]);
  const rim = c.line(c.arc(0, 1.575, .23, 0, Math.PI * 2, 1, 3.05, 36));
  const net = Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2; return c.line([[.23 * Math.sin(a), 1.575 + .23 * Math.cos(a), 3.05], [.13 * Math.sin(a + .4), 1.575 + .13 * Math.cos(a + .4), 2.62]]); }).join('')
    + c.line(c.arc(0, 1.575, .13, 0, Math.PI * 2, 1, 2.62, 24));
  return `<g opacity="${dim}">
    <polygon points="${top}" fill="${S.baseT}"/><polygon points="${front}" fill="${S.base}"/><polygon points="${shade}" fill="${S.baseS}"/>
    <path d="M${f1(b0[0])} ${f1(b0[1])}L${f1(b1[0])} ${f1(b1[1])}" stroke="${S.postS}" stroke-width="${f1(sw)}"/>
    <polygon points="${post}" fill="${S.post}"/><polygon points="${postS}" fill="${S.postS}"/>
    <polygon points="${armMid}" fill="${S.postS}"/><polygon points="${armT}" fill="${S.post}"/>
    <polygon points="${board}" fill="${glass}" fill-opacity=".22" stroke="#fff" stroke-opacity=".85" stroke-width="1.6"/>
    <polygon points="${boardPad}" fill="${S.pad}"/>
    <polygon points="${box}" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.3"/>
    <path d="${net}" stroke="#fff" stroke-opacity=".7" stroke-width=".9" fill="none"/>
    <path d="${rim}" stroke="#ee6018" stroke-width="2.4" fill="none"/></g>`;
}
