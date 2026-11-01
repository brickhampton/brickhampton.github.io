// The box score share image: the player of the game celebrating in the arena, then the full box score.
// Drawn on a canvas (1080 wide, at 2×) so it can be shared or saved as a PNG.
import { P, calc, sumRows, ratio, pctTxt, perTxt, perCls, tier, fmtDate, RES, numIn, teamFeat } from './core.js';
import { figure, raisedBall, trickExtras } from './avatar.js';
import { playerCourt } from './playerCourt.js';
import { playerOfGame } from './potg.js';

const W = 1080, PAD = 48, SCALE = 2;
const C = {
  canvas: '#101010', lift: '#1d1a18', lift2: '#272321', stroke: '#3d3a39', granite: '#8a8380', stone: '#b8b3b0', bone: '#eeeeee',
  royal: '#2f55d4', green: '#a0ca92', neg: '#e3826f', draw: '#e2b23a', gold: '#f4d37c', goodBg: 'rgba(160,202,146,.14)', poorBg: 'rgba(227,130,111,.14)',
};
const SANS = '"Geist", Inter, system-ui, sans-serif', MONO = '"Geist Mono", ui-monospace, Menlo, monospace';
const font = (w, s, f = SANS) => `${w} ${s}px ${f}`;

// An SVG string drawn into an image, ready for the canvas.
function svgImage(svg, vb, w, h) {
  const src = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}">${svg}</svg>`;
  return new Promise((ok, fail) => { const im = new Image(); im.onload = () => ok(im); im.onerror = fail; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src); });
}
// Smiling eyes on, open eyes off (the page does this with CSS; a standalone image needs it inline).
const plain = svg => svg.replace('<g class="av-smile">', '<g class="av-smile" opacity="0">');
const smiling = svg => svg.replace('<g class="av-eyes">', '<g class="av-eyes" opacity="0">');
const round = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
function pill(ctx, x, y, text, { bg, fg, f = font(600, 20), h = 34, px = 12, align = 'left', r = 8 }) {
  ctx.font = f; const w = Math.max(ctx.measureText(text).width + px * 2, h * 1.4), x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  if (bg) { ctx.fillStyle = bg; round(ctx, x0, y, w, h, r); ctx.fill(); }
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x0 + w / 2, y + h / 2 + 1);
  return w;
}
const PER_COL = { 'p-great': [C.green, '#132010'], 'p-good': [C.goodBg, C.green], 'p-mid': [C.lift2, C.stone], 'p-poor': [C.poorBg, C.neg] };
const TIER_COL = { 't-good': C.green, 't-poor': C.neg };

// Little pixel confetti round the player: royal, white and gold squares, placed the same way every time.
function confetti(cx, cy, seed = 7) {
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647, cols = ['#2f55d4', '#4f7cff', '#ffffff', '#e9b949', '#f4d37c'];
  let out = '';
  for (let i = 0; i < 46; i++) {
    const a = rnd() * Math.PI * 2, d = 70 + rnd() * 120, x = cx + Math.cos(a) * d * 1.25, y = cy - 40 + Math.sin(a) * d * .75;
    if (y > 200 || x > 255) continue;
    const z = 3 + Math.round(rnd() * 3);
    out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${z}" height="${z}" fill="${cols[i % cols.length]}" opacity="${(.45 + rnd() * .5).toFixed(2)}" transform="rotate(${Math.round(rnd() * 40 - 20)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }
  return out;
}

// The ways the player of the game can celebrate. One is picked at random each time the image is made.
export const CELEBRATIONS = [
  { pose: 'fist2', label: 'Both fists up' },
  { pose: 'fist', label: 'Fist pump' },
  { pose: 'fistL', label: 'Fist pump, other arm' },
  { pose: 'catch', ball: true, label: 'Ball held up high' },
  { pose: 'spin', trick: 'spin', label: 'Spinning the ball on a finger' },
  { pose: 'dribble', label: 'Palming the ball' },
  { pose: 'down', behind: 'behind', label: 'Ball round the back' },
  { pose: 'ball', label: 'Ball under the arm' },
];
// After a loss there's no celebrating: no smile, no confetti, just standing there, ball at the side or in front, or none.
export const CALM = [
  { pose: 'down', calm: true, label: 'Standing still' },
  { pose: 'dribble', calm: true, label: 'Ball at the side' },
  { pose: 'ball', calm: true, label: 'Ball in front' },
];
export const posesFor = g => g.result === 'L' ? CALM : CELEBRATIONS;
export const randomCelebration = (not, g) => { const l = (g ? posesFor(g) : CELEBRATIONS).filter(c => c !== not); return l[Math.floor(Math.random() * l.length)]; };

// Box score columns: the same as the Game page, with each made-attempted pair and its % sharing one cell.
const COLS = [
  { k: 'per', l: 'PER' }, { k: 'pts', l: 'PTS', hi: 1 }, { k: 'reb', l: 'REB', hi: 1 }, { k: 'ast', l: 'AST', hi: 1 }, { k: 'stl', l: 'STL', hi: 1 }, { k: 'blk', l: 'BLK', hi: 1 },
  { k: 'to', l: 'TO', low: 1 },
  { k: 'm2', l: '2FG', sh: s => [`${s.m2}-${s.a2}`, ratio(s.m2, s.a2), s.a2] }, { k: 'm3', l: '3FG', sh: s => [`${s.m3}-${s.a3}`, ratio(s.m3, s.a3), s.a3] },
  { k: 'fg', l: 'FG', sh: s => [`${s.fgm}-${s.fga}`, ratio(s.fgm, s.fga), s.fga] }, { k: 'ft', l: 'FT', sh: s => [`${s.ftm}-${s.fta}`, ratio(s.ftm, s.fta), s.fta] },
  { k: 'ts', l: 'TS%', ts: 1 },
];

export async function drawShareCard(g, games, cel = randomCelebration(null, g)) {
  if (!posesFor(g).includes(cel)) cel = randomCelebration(null, g);
  await Promise.all([font(400, 20), font(500, 20), font(600, 20), font(700, 20), font(400, 20, MONO), font(500, 20, MONO)].map(f => document.fonts.load(f).catch(() => {})));
  const rows = Object.entries(g.rows).map(([id, c]) => ({ id, s: calc(c), num: numIn(g, id) ?? P(id).num })), t = sumRows(Object.values(g.rows));
  const potg = playerOfGame(g, games), star = P(potg.id), feat = teamFeat(g, games);

  const HEAD = 196, HERO = 400, ROW = 66, BOX_TOP = HEAD + HERO + 4, TH = 52;
  const H = BOX_TOP + 64 + TH + ROW * (rows.length + 1) + 72;
  const cv = document.createElement('canvas'); cv.width = W * SCALE; cv.height = H * SCALE;
  const ctx = cv.getContext('2d'); ctx.scale(SCALE, SCALE);
  ctx.fillStyle = C.canvas; ctx.fillRect(0, 0, W, H);

  // ---- The game: who, when, the score and the result ----
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.granite; ctx.font = font(500, 22); ctx.fillText('Brickhampton', PAD, 70);
  ctx.fillStyle = C.bone; ctx.font = font(500, 104); ctx.letterSpacing = '-5px'; ctx.fillText(String(t.pts), PAD - 4, 166);
  const ptsW = ctx.measureText(String(t.pts)).width; ctx.letterSpacing = '0px';
  ctx.fillStyle = C.granite; ctx.font = font(400, 22); ctx.fillText('points', PAD + ptsW + 6, 164);
  const mid = PAD + ptsW + 110;
  ctx.fillStyle = C.bone; ctx.font = font(500, 40); ctx.letterSpacing = '-1px'; ctx.fillText(`vs ${g.opp}`, mid, 122); ctx.letterSpacing = '0px';
  ctx.fillStyle = C.granite; ctx.font = font(400, 22);
  ctx.fillText(`${g.season}, Game ${g.no}, ${fmtDate(g.date)}${g.oppPts != null ? ` · Final ${t.pts}–${g.oppPts}` : ''}`, mid, 160);
  const RB = { W: [C.royal, '#fff'], L: ['#4d4947', C.bone], D: [C.draw, '#2a1f00'], U: [null, C.granite] }[g.result] || [null, C.granite];
  const bw = pill(ctx, W - PAD, 46, RES[g.result], { bg: RB[0], fg: RB[1], f: font(600, 20), h: 40, px: 18, align: 'right', r: 20 });
  if (feat) pill(ctx, W - PAD - bw - 10, 46, feat[2], { bg: 'rgba(233,185,73,.13)', fg: C.gold, f: font(500, 19), h: 40, px: 16, align: 'right', r: 20 });
  ctx.fillStyle = C.lift2; ctx.fillRect(PAD, HEAD - 6, W - PAD * 2, 1); ctx.fillStyle = C.royal; ctx.fillRect(PAD, HEAD - 7, 96, 2);

  // ---- Player of the game: the arena, the spotlight, the player celebrating ----
  // The backdrop is the player page's arena, in its own units (feet at 130, 226), with the player 1.976× a 100 × 104 box.
  // 1.22 px to a unit puts the player at about 250 px tall, standing on the centre circle on the left.
  const K = 1.22, vw = W / K, vh = HERO / K, vx = 130 - 250 / K, vy = 226 + 52 - vh;
  const look = { ...star, num: numIn(g, potg.id) ?? star.num };
  const fig = (cel.calm ? plain : smiling)(figure(look, { stage: true, pose: cel.pose }));
  const spot = `<defs><radialGradient id="sp" cx="130" cy="120" r="130" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".14"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="beam" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <path d="M105 ${vy.toFixed(1)}L155 ${vy.toFixed(1)}L220 226L40 226Z" fill="url(#beam)"/><circle cx="130" cy="120" r="130" fill="url(#sp)"/>`;
  const player = `<g transform="translate(31.2 20.8) scale(1.976)">${cel.ball ? raisedBall(look) : ''}${cel.behind ? trickExtras(look, 'behind') : ''}${fig}${cel.trick ? trickExtras(look, cel.trick) : ''}</g>`;
  const hero = `${playerCourt()}${spot}${cel.calm ? '' : confetti(130, 120, 1 + Math.floor(Math.random() * 9999))}${player}`;
  const heroIm = await svgImage(hero, `${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`, W * SCALE, HERO * SCALE);
  ctx.imageSmoothingEnabled = false; ctx.drawImage(heroIm, 0, HEAD, W, HERO); ctx.imageSmoothingEnabled = true;
  // Blend the arena into the page: fade it out at the top, the left, the bottom, and under the words on the right.
  const fade = (x0, y0, x1, y1, stops) => { const gr = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, a]) => gr.addColorStop(o, `rgba(16,16,16,${a})`)); return gr; };
  ctx.fillStyle = fade(0, HEAD, 0, HEAD + 24, [[0, 1], [1, 0]]); ctx.fillRect(0, HEAD, W, 24);
  ctx.fillStyle = fade(0, 0, 150, 0, [[0, 1], [.35, .75], [1, 0]]); ctx.fillRect(0, HEAD, 150, HERO);
  ctx.fillStyle = fade(0, HEAD + HERO - 130, 0, HEAD + HERO, [[0, 0], [.6, .8], [1, 1]]); ctx.fillRect(0, HEAD + HERO - 130, W, 130);
  ctx.fillStyle = fade(420, 0, W, 0, [[0, 0], [.3, .7], [1, .88]]); ctx.fillRect(420, HEAD, W - 420, HERO);

  const tx = 500; let ty = HEAD + 104;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.gold; ctx.font = font(500, 16, MONO); ctx.letterSpacing = '3px'; ctx.fillText('PLAYER OF THE GAME', tx, ty); ctx.letterSpacing = '0px';
  ty += 52; ctx.fillStyle = C.bone; ctx.font = font(600, 46); ctx.letterSpacing = '-1.5px'; ctx.fillText(star.name, tx, ty); ctx.letterSpacing = '0px';
  ty += 18;
  const [pb, pf] = PER_COL[perCls(potg.s.per)];
  const pw = pill(ctx, tx, ty, `${perTxt(potg.s.per, true)} PER`, { bg: pb, fg: pf, f: font(600, 20), h: 38, px: 12, r: 8 });
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = C.stone; ctx.font = font(400, 18);
  if (potg.why) ctx.fillText(potg.why, tx + pw + 14, ty + 25);
  ty += 80;
  // The line: points, rebounds, assists, then steals and blocks if they had any.
  const line = [['pts', 'PTS'], ['reb', 'REB'], ['ast', 'AST'], ['stl', 'STL'], ['blk', 'BLK']].filter(([k], i) => i < 3 || potg.s[k] > 0).slice(0, 5);
  let lx = tx;
  for (const [k, l] of line) {
    ctx.fillStyle = C.bone; ctx.font = font(500, 34); ctx.letterSpacing = '-1px'; ctx.fillText(String(potg.s[k]), lx, ty); const vw2 = ctx.measureText(String(potg.s[k])).width; ctx.letterSpacing = '0px';
    ctx.fillStyle = C.granite; ctx.font = font(400, 14, MONO); ctx.fillText(l, lx, ty + 22);
    lx += Math.max(vw2, 32) + 34;
  }
  ty += 46; lx = tx;
  for (const tg of potg.tags) {
    const [bg, fg] = tg.t === 'high' ? ['rgba(233,185,73,.15)', C.gold] : ['rgba(47,85,212,.22)', '#c7d4ff'];
    lx += pill(ctx, lx, ty, tg.label, { bg, fg, f: font(500, 15), h: 30, px: 12, r: 15 }) + 8;
  }

  // ---- The full box score ----
  let y = BOX_TOP + 40;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = C.bone; ctx.font = font(500, 30); ctx.letterSpacing = '-.5px'; ctx.fillText('Box score', PAD, y); ctx.letterSpacing = '0px';
  y += 24;
  const NAMEW = 214, LASTW = 92, cw = (W - PAD * 2 - NAMEW - LASTW - 8) / (COLS.length - 1), cx = i => i === COLS.length - 1 ? W - PAD - 8 - LASTW / 2 : PAD + NAMEW + cw * i + cw / 2;
  round(ctx, PAD, y, W - PAD * 2, TH + ROW * (rows.length + 1), 16); ctx.fillStyle = C.lift; ctx.fill();
  ctx.save(); round(ctx, PAD, y, W - PAD * 2, TH + ROW * (rows.length + 1), 16); ctx.clip();
  ctx.fillStyle = C.lift2; ctx.fillRect(PAD, y, W - PAD * 2, TH);
  ctx.font = font(400, 15, MONO); ctx.fillStyle = C.granite; ctx.textBaseline = 'middle';
  ctx.textAlign = 'left'; ctx.fillText('PLAYER', PAD + 20, y + TH / 2);
  ctx.textAlign = 'center'; COLS.forEach((c, i) => ctx.fillText(c.l, cx(i), y + TH / 2));
  const tops = Object.fromEntries(COLS.filter(c => c.hi).map(c => [c.k, Math.max(...rows.map(r => r.s[c.k]))]));
  const tos = rows.map(r => r.s.to), loTo = new Set(tos).size > 1 ? Math.min(...tos) : null;
  const heads = await Promise.all(rows.map(r => svgImage(plain(figure({ ...P(r.id), num: r.num })), '0 0 100 100', 88, 88)));
  y += TH;
  const drawRow = (s, yy, r, head) => {
    const m = yy + ROW / 2;
    if (r) {
      if (r.id === potg.id) { ctx.fillStyle = 'rgba(233,185,73,.07)'; ctx.fillRect(PAD, yy, W - PAD * 2, ROW); ctx.fillStyle = '#e9b949'; ctx.fillRect(PAD, yy, 4, ROW); }
      ctx.save(); ctx.beginPath(); ctx.arc(PAD + 40, m, 22, 0, Math.PI * 2); ctx.fillStyle = '#1f2a52'; ctx.fill(); ctx.clip(); ctx.imageSmoothingEnabled = false; ctx.drawImage(head, PAD + 18, m - 22, 44, 44); ctx.imageSmoothingEnabled = true; ctx.restore();
      ctx.textAlign = 'left'; ctx.fillStyle = C.bone; ctx.font = font(500, 21); ctx.fillText(P(r.id).name, PAD + 74, m - 9);
      ctx.fillStyle = C.granite; ctx.font = font(400, 15, MONO); ctx.fillText(`#${r.num}`, PAD + 74, m + 14);
    } else { ctx.textAlign = 'left'; ctx.fillStyle = C.bone; ctx.font = font(600, 21); ctx.fillText('Team', PAD + 20, m); }
    COLS.forEach((c, i) => {
      const x = cx(i);
      if (c.k === 'per') { const [b, f] = r ? PER_COL[perCls(s.per)] : [null, C.bone]; pill(ctx, x, m - 17, perTxt(s.per), { bg: b, fg: f, f: font(600, 19), h: 34, px: 8, align: 'center', r: 7 }); return; }
      if (c.sh || c.ts) {
        const [txt, v, att] = c.ts ? [s.tsa.toFixed(1), s.ts, s.tsa] : c.sh(s), tr = tier(c.k, v, att);
        ctx.textAlign = 'center'; ctx.fillStyle = C.bone; ctx.font = font(400, 19); ctx.fillText(c.ts ? pctTxt(v) : txt, x, m - 9);
        ctx.fillStyle = c.ts ? C.granite : (TIER_COL[tr] || C.granite); ctx.font = font(400, 14, MONO); ctx.fillText(c.ts ? `${txt} TSA` : pctTxt(v), x, m + 14);
        if (c.ts && TIER_COL[tr]) { ctx.fillStyle = TIER_COL[tr]; ctx.font = font(400, 19); ctx.fillText(pctTxt(v), x, m - 9); }
        return;
      }
      const v = s[c.k], best = r && rows.length > 1 && ((c.hi && v > 0 && v === tops[c.k]) || (c.low && loTo !== null && v === loTo));
      if (best) { ctx.fillStyle = 'rgba(57,105,230,.32)'; round(ctx, x - 22, m - 17, 44, 34, 7); ctx.fill(); ctx.strokeStyle = 'rgba(120,150,255,.45)'; ctx.lineWidth = 1; ctx.stroke(); }
      ctx.textAlign = 'center'; ctx.fillStyle = best ? '#d6e3ff' : C.bone; ctx.font = font(best ? 600 : 400, 21); ctx.fillText(String(v), x, m + 1);
    });
    ctx.fillStyle = C.lift2; ctx.fillRect(PAD, yy + ROW - 1, W - PAD * 2, 1);
  };
  rows.forEach((r, i) => drawRow(r.s, y + ROW * i, r, heads[i]));
  ctx.fillStyle = C.lift2; ctx.fillRect(PAD, y + ROW * rows.length, W - PAD * 2, ROW);
  drawRow(t, y + ROW * rows.length, null);
  ctx.restore();

  // ---- Where it's from ----
  ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = C.granite; ctx.font = font(400, 17, MONO);
  ctx.fillText('brickhampton.github.io', W - PAD, H - 30);
  return { canvas: cv, potg, cel, name: `Brickhampton ${g.season} G${g.no} vs ${g.opp}.png` };
}
