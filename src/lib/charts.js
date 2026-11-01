// Hand-drawn SVG charts, ported from the mockup. Each one draws into a wrapper element.
import { S } from './store.js';
import { P, calc, sumRows, ratio, perTxt, pctTxt, f1, esc, seasonList, seasonName, playerAgg, lineVal, statPlayers, RES } from './core.js';
import { figure } from '../components/Avatar.jsx';

export const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// Comparison charts colour by slot, in the team palette: royal blue, light grey, then cool accents (never orange or yellow).
// Head to head and Season vs season draw the right-hand side in light grey.
export const SC_B = '#c9cbd1';
export const SLOT_COL = ['#4f7cff', SC_B, '#3fb8c4', '#9b8cff', '#6fd6a0', '#f08fb8', '#ff8080'];

export const GT_STATS = { pts: 'PTS', reb: 'REB', ast: 'AST', stl: 'STL', to: 'TO', ts: 'TS%' };
// Everything else a game records, behind the More chip.
export const GT_MORE = { blk: 'BLK', oreb: 'OREB', dreb: 'DREB', per: 'PER', fgm: 'FGM', fga: 'FGA', fg: 'FG%', m2: '2FGM', a2: '2FGA', p2: '2FG%', m3: '3FGM', a3: '3FGA', p3: '3FG%', ftm: 'FTM', fta: 'FTA', ft: 'FT%', tsa: 'TSA' };
const GT_PCT = new Set(['ts', 'fg', 'p2', 'p3', 'ft']);
const splitSeason = list => list.every(g => Object.values(g.rows).every(r => r.oreb !== undefined));
export const moreFor = list => Object.entries(GT_MORE).filter(([k]) => (k !== 'oreb' && k !== 'dreb') || splitSeason(list));
export const STATS = { per: 'PER', pts: 'Points', reb: 'Rebounds', ast: 'Assists', stl: 'Steals', ts: 'TS%' };
export const P_STATS = { per: 'PER', pts: 'PTS', reb: 'REB', ast: 'AST', stl: 'STL', blk: 'BLK', to: 'TO', ts: 'TS%' };
// Everything else a player's box score line records, behind the More chip.
export const P_MORE = Object.fromEntries(Object.entries(GT_MORE).filter(([k]) => !['blk', 'oreb', 'dreb', 'per'].includes(k)));
export const TB_STATS = { pts: 'PTS', reb: 'REB', ast: 'AST', stl: 'STL', to: 'TO', ts: 'TS%' };
const TB_NAMES = { pts: 'Points', reb: 'Rebounds', ast: 'Assists', stl: 'Steals', to: 'Turnovers', ts: 'TS%' };

function teamVal(g, k) {
  const rows = Object.values(g.rows), t = sumRows(rows);
  const v = k === 'ts' ? t.ts : k === 'fg' ? ratio(t.fgm, t.fga) : k === 'p2' ? ratio(t.m2, t.a2) : k === 'p3' ? ratio(t.m3, t.a3) : k === 'ft' ? ratio(t.ftm, t.fta)
    : k === 'oreb' || k === 'dreb' ? rows.reduce((a, r) => a + (r[k] || 0), 0) : t[k];
  return v ?? 0;
}
// Line colour by kind of stat: main stats blue, steals and blocks purple, shooting green, turnovers pink.
const statCol = (k, blue) => ['stl', 'blk'].includes(k) ? '#a48cff' : k === 'to' ? '#f27a92' : ['ts', 'tsa', 'fg', 'fgm', 'fga', 'p2', 'm2', 'a2', 'p3', 'm3', 'a3', 'ft', 'ftm', 'fta'].includes(k) ? '#6fd6a0' : blue;
function niceMax(v) { if (v <= 0) return 1; const e = Math.pow(10, Math.floor(Math.log10(v))); const m = v / e; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * e; }

export function showTip(wrap, html, x, y) {
  let tip = wrap.querySelector('.tip'); if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; wrap.appendChild(tip); }
  tip.innerHTML = html; tip.hidden = false;
  const w = wrap.clientWidth, tw = tip.offsetWidth;
  tip.style.left = Math.max(0, Math.min(w - tw, x + 14)) + 'px'; tip.style.top = Math.max(0, y - 10) + 'px';
}
export const hideTip = wrap => { const t = wrap.querySelector('.tip'); if (t) t.hidden = true; };

// Monotone cubic curve through the points: smooth, and never overshoots a real value.
function smooth(pts) {
  if (!pts.length) return '';
  return `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}` + smoothSegs(pts).join('');
}
// One cubic per gap between neighbouring points, so a single curve can be drawn in pieces.
function smoothSegs(pts) {
  const n = pts.length, dx = [], m = [], t = [], out = [];
  if (n < 2) return out;
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]; }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    out.push(` C${(pts[i][0] + h).toFixed(1)} ${(pts[i][1] + t[i] * h).toFixed(1)} ${(pts[i + 1][0] - h).toFixed(1)} ${(pts[i + 1][1] - t[i + 1] * h).toFixed(1)} ${pts[i + 1][0].toFixed(1)} ${pts[i + 1][1].toFixed(1)}`);
  }
  return out;
}
const drawIn = (p, duration) => {
  if (reduced || !p.getTotalLength) return;
  const L = p.getTotalLength(); p.style.strokeDasharray = L;
  p.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration, easing: 'cubic-bezier(.2,.8,.2,1)' }).finished.then(() => p.style.strokeDasharray = 'none').catch(() => {});
};

// A game's season, game by game, with this game highlighted and the season average dashed.
export function drawGameTrend(wrap, g, games, stat) {
  const list = games.filter(x => x.season === g.season);
  const k = stat in GT_STATS || moreFor(list).some(([m]) => m === stat) ? stat : 'pts', LBL = { ...GT_STATS, ...GT_MORE };
  const vals = list.map(x => teamVal(x, k)), c = statCol(k, '#3987e5');
  const cur = list.findIndex(x => x.id === g.id);
  const W = Math.max(320, Math.round(wrap.clientWidth) || 800), H = W < 560 ? 220 : 260, ml = W < 560 ? 16 : 36, mr = 16, mt = 30, mb = 30;
  const max = Math.max(...vals), min = Math.min(...vals);
  const pct = GT_PCT.has(k), fmt = v => pct ? Math.round(v * 100) + '%' : k === 'per' ? perTxt(v) : Number.isInteger(v) ? v : f1(v);
  const span = max - min || (pct ? .1 : 1), lo = min < 0 ? min - span * .15 : Math.max(0, min - span * .35), hi = max + span * .25;
  const y = v => mt + (H - mt - mb) * (1 - (v - lo) / (hi - lo));
  const step = (W - ml - mr) / Math.max(1, list.length - 1), x = i => ml + i * step;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const pts = vals.map((v, i) => [x(i), y(v)]);
  const line = smooth(pts);
  const area = line + ` L${x(list.length - 1).toFixed(1)} ${H - mb} L${x(0).toFixed(1)} ${H - mb} Z`;
  const every = Math.ceil(list.length / Math.max(4, Math.floor((W - ml - mr) / 40)));
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Team ${LBL[k]} by game">
    <defs><linearGradient id="gtfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".28"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs>
    <line x1="${ml}" x2="${W - mr}" y1="${H - mb}" y2="${H - mb}" stroke="#3d3a39"/>
    <line x1="${x(cur)}" x2="${x(cur)}" y1="${mt - 8}" y2="${H - mb}" stroke="${c}" stroke-width="1" stroke-dasharray="3 4" opacity=".7"/>
    <line x1="${ml}" x2="${W - mr}" y1="${y(avg)}" y2="${y(avg)}" stroke="#8a8380" stroke-width="1.2" stroke-dasharray="5 5"/>
    <text x="${ml}" y="${y(avg) - 6}" font-size="11" fill="#8a8380" font-family="Geist Mono, monospace">Avg ${pct ? fmt(avg) : f1(avg)}</text>
    <path d="${area}" fill="url(#gtfill)"/>
    <path d="${line}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round" class="gline"/>`;
  svg += `<circle cx="${x(cur)}" cy="${y(vals[cur])}" r="11" fill="${c}" opacity=".22"/><circle cx="${x(cur)}" cy="${y(vals[cur])}" r="6.5" fill="#eeeeee" stroke="${c}" stroke-width="3"/>
    <text x="${Math.min(W - mr - 4, Math.max(ml + 4, x(cur)))}" y="${y(vals[cur]) - 16}" text-anchor="${cur === 0 ? 'start' : cur === list.length - 1 ? 'end' : 'middle'}" font-size="14" font-weight="600" fill="#eeeeee" font-family="Geist, sans-serif" stroke="#1d1a18" stroke-width="4" paint-order="stroke">${fmt(vals[cur])}</text>`;
  list.forEach((gg, i) => { if (i % every === 0 || i === cur || i === list.length - 1) svg += `<text x="${x(i)}" y="${H - 9}" text-anchor="middle" font-size="11" fill="${i === cur ? '#eeeeee' : '#8a8380'}" font-family="Geist Mono, monospace">G${gg.no}</text>`; });
  svg += `<line class="gxh" x1="0" x2="0" y1="${mt}" y2="${H - mb}" stroke="#8a8380" stroke-dasharray="3 3" opacity="0"/><circle class="ghd" r="5" fill="${c}" stroke="#1d1a18" stroke-width="2" opacity="0" pointer-events="none"/><rect x="${ml - step / 2}" y="0" width="${W - ml - mr + step}" height="${H}" fill="transparent" class="hit"/></svg>`;
  wrap.innerHTML = svg;
  drawIn(wrap.querySelector('.gline'), 650);
  const svgEl = wrap.querySelector('svg'), xh = wrap.querySelector('.gxh'), hd = wrap.querySelector('.ghd'), hit = wrap.querySelector('.hit');
  const move = ev => {
    const r = svgEl.getBoundingClientRect(), sx = (ev.clientX - r.left) * W / r.width;
    const i = Math.max(0, Math.min(list.length - 1, Math.round((sx - ml) / step)));
    xh.setAttribute('x1', x(i)); xh.setAttribute('x2', x(i)); xh.setAttribute('opacity', 1);
    hd.setAttribute('cx', x(i)); hd.setAttribute('cy', y(vals[i])); hd.setAttribute('opacity', i === cur ? 0 : 1);
    showTip(wrap, `<div class="tt">Game ${list[i].no} vs ${esc(list[i].opp)}${i === cur ? ' (this game)' : ''}</div><div class="tr"><span><i style="background:${c}"></i>${LBL[k]}</span><b class="num">${fmt(vals[i])}</b></div>`, x(i) * r.width / W, ev.clientY - r.top);
  };
  hit.addEventListener('pointermove', move); hit.addEventListener('pointerdown', move);
  hit.addEventListener('pointerleave', () => { xh.setAttribute('opacity', 0); hd.setAttribute('opacity', 0); hideTip(wrap); });
}

// Line chart of players across a season (game by game) or across seasons (per-game averages).
// The Stats tab uses it for several players; the Player page passes one player, with a soft area and an average line.
export function drawTrend(wrap, games, { k, ids, season, single: one = false }) {
  let xs, getV; const isPct = GT_PCT.has(k);
  if (season === 'ALL') {
    xs = seasonList().reverse().map(s => ({ label: s.code, games: games.filter(g => g.season === s.code) })).filter(x => x.games.length);
    getV = (x, id) => { const a = playerAgg(x.games, id); return a ? (isPct ? lineVal(a.s, k) ?? 0 : a.pg(k)) : null; };
  } else {
    xs = games.filter(g => g.season === season).map(g => ({ label: 'G' + g.no, g }));
    getV = (x, id) => { const c = x.g.rows[id]; if (!c) return null; return lineVal(calc(c), k) ?? 0; };
  }
  // A single player's all-time view starts at their first season.
  if (one && season === 'ALL') xs = xs.filter(x => getV(x, ids[0]) !== null);
  if (!ids.length) { wrap.innerHTML = '<p class="hint">Pick at least one player above.</p>'; return; }
  const series = ids.map(id => ({ id, vals: xs.map(x => getV(x, id)) }));
  const all = series.flatMap(s => s.vals).filter(v => v !== null);
  const W = Math.max(320, Math.round(wrap.clientWidth) || 800), narrow = W < 560, H = narrow ? 240 : 280, ml = narrow ? 24 : 36, mr = one ? 14 : narrow ? 52 : 70, mt = 14, mb = 30;
  const lo = Math.min(0, ...all); let hi = isPct ? 1 : niceMax(Math.max(...all, 1));
  const loN = lo < 0 ? -niceMax(-lo) : 0;
  const step = (W - ml - mr) / Math.max(1, xs.length - 1);
  const x = i => ml + i * step;
  const ticks = []; const tStep = Math.max(isPct ? 0 : .5, niceMax((hi - loN) / 4) / (niceMax((hi - loN) / 4) > (hi - loN) / 2.5 ? 2 : 1));
  // Top the scale at the first gridline above the highest value, so there is no empty band.
  if (!isPct) hi = Math.max(tStep, Math.ceil(Math.max(...all, 0) / tStep - 1e-9) * tStep);
  const y = v => mt + (H - mt - mb) * (1 - (v - loN) / (hi - loN));
  for (let v = loN; v <= hi + 1e-9; v += tStep) ticks.push(+v.toFixed(4));
  const fmt = v => isPct ? Math.round(v * 100) + '%' : k === 'per' ? perTxt(v, season === 'ALL') : Number.isInteger(v) ? v : f1(v);
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${STATS[k] || k} trend">`;
  ticks.forEach(t => svg += `<line x1="${ml}" x2="${W - mr}" y1="${y(t)}" y2="${y(t)}" stroke="${t === 0 ? '#4d4947' : '#2a2624'}" stroke-width="1"/><text x="${ml - (narrow ? 5 : 8)}" y="${y(t) + 4}" text-anchor="end" font-size="${narrow ? 10 : 11}" fill="#8a8380" font-family="Geist Mono, monospace">${isPct ? Math.round(t * 100) + '%' : +t.toFixed(1)}</text>`);
  const every = Math.ceil(xs.length / Math.max(4, Math.floor((W - ml - mr) / 44)));
  xs.forEach((p, i) => { if (i % every === 0 || i === xs.length - 1) svg += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#8a8380" font-family="Geist Mono, monospace">${p.label}</text>`; });
  const ends = [];
  series.forEach(s => {
    const c = one ? statCol(k, SLOT_COL[0]) : SLOT_COL[ids.indexOf(s.id)];
    if (s.vals.every(v => v === null)) return;
    // DNP counts as zero so the whole line is one smooth curve. Stretches touching a DNP are faint and dashed.
    const pts = s.vals.map((v, i) => [x(i), y(v ?? 0)]), cs = smoothSegs(pts);
    const solidAt = i => s.vals[i] !== null && s.vals[i + 1] !== null;
    let solid = '', dashed = '';
    cs.forEach((cmd, i) => { const piece = `M${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}${cmd}`; if (solidAt(i)) solid += piece; else dashed += piece; });
    if (dashed) svg += `<path d="${dashed}" fill="none" stroke="${c}" stroke-width="1.6" stroke-dasharray="3 5" stroke-linecap="round" opacity=".45"/>`;
    if (one) {
      const real = s.vals.filter(v => v !== null), avg = real.reduce((a, v) => a + v, 0) / real.length, full = smooth(pts);
      svg += `<defs><linearGradient id="parea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".28"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs>`;
      svg += `<path d="${full} L${pts[pts.length - 1][0].toFixed(1)} ${y(Math.max(loN, 0))} L${pts[0][0].toFixed(1)} ${y(Math.max(loN, 0))}Z" fill="url(#parea)" class="parea"/>`;
      svg += `<line x1="${ml}" x2="${W - mr}" y1="${y(avg)}" y2="${y(avg)}" stroke="#b8b3b0" stroke-dasharray="4 4" opacity=".6"/><rect x="${ml + 4}" y="${y(avg) - 21}" width="${(String(fmt(avg)).length + 4) * 7 + 12}" height="17" rx="8.5" fill="#272321"/><text x="${ml + 10}" y="${y(avg) - 9}" font-size="11" fill="#eeeeee" font-family="Geist Mono, monospace">AVG ${fmt(avg)}</text>`;
    }
    if (solid) svg += `<path d="${solid}" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" class="tline"/>`;
    s.vals.forEach((v, i) => { if (v !== null) svg += `<circle cx="${x(i)}" cy="${y(v)}" r="${one ? 4.5 : 4}" fill="${c}" stroke="#1d1a18" stroke-width="2"/>`; });
    const li = s.vals.map((v, i) => v === null ? -1 : i).filter(i => i >= 0).pop();
    if (li !== undefined && !one) ends.push({ id: s.id, c, yy: y(s.vals[li]), xx: x(li) });
  });
  ends.sort((a, b) => a.yy - b.yy); const gap = narrow ? 13 : 14; for (let i = 1; i < ends.length; i++) if (ends[i].yy - ends[i - 1].yy < gap) ends[i].yy = ends[i - 1].yy + gap;
  ends.forEach(e => svg += `<text x="${W - mr + (narrow ? 6 : 8)}" y="${e.yy + 4}" font-size="${narrow ? 11 : 12}" fill="#b8b3b0" font-family="Geist, sans-serif">${esc(P(e.id).name)}</text>`);
  svg += `<line class="xh" x1="0" x2="0" y1="${mt}" y2="${H - mb}" stroke="#8a8380" stroke-width="1" stroke-dasharray="3 3" opacity="0"/>`;
  svg += `<rect x="${ml - step / 2}" y="0" width="${W - ml - mr + step}" height="${H}" fill="transparent" class="hit"/></svg>`;
  wrap.innerHTML = svg;
  const svgEl = wrap.querySelector('svg'), xh = wrap.querySelector('.xh');
  wrap.querySelectorAll('.tline').forEach(p => drawIn(p, 700));
  const move = ev => {
    const r = svgEl.getBoundingClientRect(), sx = (ev.clientX - r.left) * W / r.width;
    const i = Math.max(0, Math.min(xs.length - 1, Math.round((sx - ml) / step)));
    xh.setAttribute('x1', x(i)); xh.setAttribute('x2', x(i)); xh.setAttribute('opacity', 1);
    const opp = xs[i].g ? ` vs ${esc(xs[i].g.opp)}` : '';
    showTip(wrap, `<div class="tt">${xs[i].g ? 'Game ' + xs[i].g.no : xs[i].label}${opp}</div>` +
      series.map(s => `<div class="tr"><span><i style="background:${one ? statCol(k, SLOT_COL[0]) : SLOT_COL[ids.indexOf(s.id)]}"></i>${one ? ({ ...P_STATS, ...P_MORE })[k] || k : esc(P(s.id).name)}</span><b class="num">${s.vals[i] === null ? 'DNP' : fmt(s.vals[i])}</b></div>`).join(''),
      x(i) * r.width / W, (ev.clientY - r.top));
  };
  const hit = wrap.querySelector('.hit');
  hit.addEventListener('pointermove', move); hit.addEventListener('pointerdown', move);
  hit.addEventListener('pointerleave', () => { xh.setAttribute('opacity', 0); hideTip(wrap); });
}

// Team totals per game for the Stats page: each season's per-game average, or every game in one season.
export function drawSeasonBars(wrap, games, stat, season) {
  const k = stat in TB_STATS ? stat : 'pts', pct = k === 'ts', name = TB_NAMES[k];
  const fmt = v => pct ? Math.round(v * 100) + '%' : f1(v);
  if (season !== 'ALL') return drawGameBars(games.filter(g => g.season === season), wrap, k, pct, name);
  const data = seasonList().reverse().map(s => {
    const gs = games.filter(g => g.season === s.code);
    const t = gs.length ? sumRows(gs.flatMap(g => Object.values(g.rows))) : null;
    return { code: s.code, n: gs.length, v: !t ? 0 : pct ? t.ts || 0 : t[k] / gs.length };
  }).filter(d => d.n).map(d => ({ label: d.code, v: d.v, txt: fmt(d.v), tip: `<div class='tt'>${seasonName(d.code)}</div><div class='tr'><span>${pct ? 'TS%' : name + ' a game'}</span><b>${fmt(d.v)}</b></div><div class='tr'><span>Games</span><b>${d.n}</b></div>` }));
  barChart(wrap, data, { label: `Team ${name.toLowerCase()} per game by season`, fmt, fill: true });
}

const RES_COL = { W: '#4f7cff', L: '#6b6663', D: '#e2b23a', U: '#4f7cff' };
function drawGameBars(gs, wrap, k = 'pts', pct = false, name = 'Points') {
  const fmt = v => pct ? Math.round(v * 100) + '%' : Number.isInteger(v) ? v : f1(v);
  const data = gs.map(g => {
    const t = sumRows(Object.values(g.rows)), v = pct ? t.ts || 0 : t[k]; return {
      label: 'G' + g.no, v, txt: fmt(v), col: RES_COL[g.result],
      tip: `<div class='tt'>Game ${g.no} vs ${esc(g.opp)}</div><div class='tr'><span>${name}</span><b>${fmt(v)}</b></div><div class='tr'><span>Result</span><b>${RES[g.result]}</b></div>`,
    };
  });
  const known = gs.some(g => g.result !== 'U');
  barChart(wrap, data, {
    label: `Team ${name.toLowerCase()} in each game`, fmt, fill: true, avg: data.reduce((t, d) => t + d.v, 0) / data.length,
    legend: known ? `<div class="legend"><span><i style="background:${RES_COL.W}"></i>Win</span><span><i style="background:${RES_COL.L}"></i>Loss</span><span><i style="background:${RES_COL.D}"></i>Draw</span></div>` : '',
  });
}
// Rounded bars with a soft fade, quiet gridlines, and the average marked in the left gutter so it never sits on a bar label.
function barChart(wrap, data, { label, avg, legend = '', fmt = f1, fill = false }) {
  // With fill, the chart grows to use the card's spare height, so it lines up with the card beside it.
  let H = 250; const W = 440;
  if (fill) {
    wrap.innerHTML = legend; const lg = wrap.firstElementChild, wr = wrap.getBoundingClientRect();
    const avail = wr.bottom - (lg ? lg.getBoundingClientRect().bottom + 10 : wr.top) - 4;
    if (wr.width) H = Math.max(H, Math.min(520, Math.floor(avail * W / wr.width)));
  }
  const ml = avg === undefined ? 30 : 46, mr = 6, mt = 22, mb = 26;
  const top = Math.max(...data.map(d => d.v), 1e-6) * 1.08, tick = niceMax(top / 4), hi = Math.ceil(top / tick) * tick, y = v => H - mb - (H - mt - mb) * v / hi;
  const bw = (W - ml - mr) / data.length, w = Math.max(4, Math.min(34, bw * .62)), r = Math.min(w / 2, 8);
  const many = data.length > 10, last = data.length - 1;
  const every = many ? Math.ceil(data.length / 9) : 1;
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}"><defs>`;
  const cols = [...new Set(data.map(d => d.col || '#4f7cff'))];
  cols.forEach((c, i) => svg += `<linearGradient id="bg${i}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity=".28"/></linearGradient>`);
  svg += `</defs>`;
  for (let v = tick; v <= hi + 1e-9; v += tick) {
    svg += `<line x1="${ml}" x2="${W - mr}" y1="${y(v)}" y2="${y(v)}" stroke="#2a2624"/>`;
    if (avg === undefined || Math.abs(y(v) - y(avg)) > 26) svg += `<text x="${ml - 8}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="#6b6663" font-family="Geist Mono, monospace">${fmt === f1 || !String(fmt(v)).includes('%') ? +v.toFixed(1) : fmt(v)}</text>`;
  }
  svg += `<line x1="${ml}" x2="${W - mr}" y1="${H - mb}" y2="${H - mb}" stroke="#3d3a39"/>`;
  data.forEach((d, i) => {
    const cx = ml + bw * (i + .5), x0 = cx - w / 2, y0 = y(d.v), h = H - mb - y0, rr = Math.min(r, h);
    const fillUrl = `url(#bg${cols.indexOf(d.col || '#4f7cff')})`;
    svg += `<path class="bar" d="M${x0} ${H - mb} V${y0 + rr} A${rr} ${rr} 0 0 1 ${x0 + rr} ${y0} H${x0 + w - rr} A${rr} ${rr} 0 0 1 ${x0 + w} ${y0 + rr} V${H - mb}Z" fill="${fillUrl}" data-tip="${esc(d.tip)}"/>`;
    if (!many || i === last) svg += `<text x="${cx}" y="${y0 - 7}" text-anchor="middle" font-size="${i === last ? 13 : 11}" font-weight="${i === last ? 600 : 400}" fill="${i === last ? '#eeeeee' : '#b8b3b0'}" font-family="Geist, sans-serif" stroke="#1d1a18" stroke-width="4" paint-order="stroke">${d.txt}</text>`;
    if ((i % every === 0 && last - i >= every) || i === last) svg += `<text x="${cx}" y="${H - 8}" text-anchor="middle" font-size="10.5" fill="${i === last ? '#eeeeee' : '#8a8380'}" font-family="Geist Mono, monospace">${d.label}</text>`;
  });
  if (avg !== undefined) svg += `<line x1="${ml}" x2="${W - mr}" y1="${y(avg)}" y2="${y(avg)}" stroke="#b8b3b0" stroke-width="1" stroke-dasharray="4 4" opacity=".7" pointer-events="none"/>
    <rect x="0" y="${y(avg) - 9}" width="${ml - 4}" height="18" rx="9" fill="#272321"/><text x="${(ml - 4) / 2}" y="${y(avg) + 4}" text-anchor="middle" font-size="10.5" fill="#eeeeee" font-family="Geist Mono, monospace">${fmt(avg)}</text>
    <text x="${(ml - 4) / 2}" y="${y(avg) - 13}" text-anchor="middle" font-size="9" fill="#8a8380" font-family="Geist, sans-serif" letter-spacing=".04em">AVG</text>`;
  wrap.innerHTML = legend + svg + '</svg>';
  wrap.querySelectorAll('.bar').forEach(el => {
    const show = ev => { const rc = wrap.getBoundingClientRect(); wrap.querySelectorAll('.bar').forEach(b => b.style.opacity = b === el ? 1 : .55); showTip(wrap, el.dataset.tip, ev.clientX - rc.left, ev.clientY - rc.top); };
    el.addEventListener('pointermove', show); el.addEventListener('pointerdown', show);
    el.addEventListener('pointerleave', () => { wrap.querySelectorAll('.bar').forEach(b => b.style.opacity = ''); hideTip(wrap); });
  });
  if (!reduced) wrap.querySelectorAll('.bar').forEach((el, i) => el.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 520, delay: i * 18, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
}

// Volume and efficiency: shots a game against true shooting, one avatar per player.
export function drawScatter(wrap, list, openPlayer) {
  const pts = list.filter(a => a.s.ts !== null).map(a => ({ id: a.id, x: a.s.tsa / a.gp, y: a.s.ts, gp: a.gp, ppg: a.pg('pts') }));
  if (pts.length < 2) { wrap.innerHTML = '<p class="hint">Needs at least two players with shots.</p>'; return; }
  const W = Math.max(300, Math.round(wrap.clientWidth) || 700), narrow = W < 560, H = narrow ? 300 : 360, ml = narrow ? 34 : 44, mr = narrow ? 14 : 24, mt = 30, mb = 38, R = narrow ? 15 : 19;
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const x0 = Math.max(0, Math.floor(Math.min(...xs) - 1.5)), x1 = Math.ceil(Math.max(...xs) + 1.5);
  const y0 = Math.max(0, Math.floor((Math.min(...ys) - .07) * 20) / 20), y1 = Math.min(1, Math.ceil((Math.max(...ys) + .04) * 20) / 20);
  const X = v => ml + (W - ml - mr) * (v - x0) / (x1 - x0), Y = v => mt + (H - mt - mb) * (1 - (v - y0) / (y1 - y0));
  const mx = xs.reduce((t, v) => t + v, 0) / xs.length, my = ys.reduce((t, v) => t + v, 0) / ys.length;
  const xStep = (x1 - x0) > 12 ? 4 : 2, yStep = (y1 - y0) > .3 ? .1 : .05;
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Shots a game against true shooting"><defs><clipPath id="sclip"><circle r="${R}"/></clipPath>
    <radialGradient id="qglow" cx="1" cy="0" r="1"><stop offset="0" stop-color="#3969e6" stop-opacity=".16"/><stop offset="1" stop-color="#3969e6" stop-opacity="0"/></radialGradient></defs>`;
  svg += `<rect x="${X(mx)}" y="${mt}" width="${W - mr - X(mx)}" height="${Y(my) - mt}" fill="url(#qglow)"/><line x1="${ml}" x2="${W - mr}" y1="${mt}" y2="${mt}" stroke="#2a2624"/>`;
  for (let v = Math.ceil(y0 / yStep) * yStep; v <= y1 + 1e-9; v += yStep) svg += `<line x1="${ml}" x2="${W - mr}" y1="${Y(v)}" y2="${Y(v)}" stroke="#2a2624"/><text x="${ml - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="${narrow ? 10 : 11}" fill="#8a8380" font-family="Geist Mono, monospace">${Math.round(v * 100)}%</text>`;
  for (let v = Math.ceil(x0 / xStep) * xStep; v <= x1 + 1e-9; v += xStep) svg += `<text x="${X(v)}" y="${H - mb + 18}" text-anchor="middle" font-size="${narrow ? 10 : 11}" fill="#8a8380" font-family="Geist Mono, monospace">${v}</text>`;
  svg += `<text x="${W - mr}" y="${H - 4}" text-anchor="end" font-size="11" fill="#8a8380" font-family="Geist, sans-serif">Shots a game (TSA) →</text>`;
  svg += `<line x1="${X(mx)}" x2="${X(mx)}" y1="${mt}" y2="${H - mb}" stroke="#4d4947" stroke-dasharray="4 4"/><line x1="${ml}" x2="${W - mr}" y1="${Y(my)}" y2="${Y(my)}" stroke="#4d4947" stroke-dasharray="4 4"/>`;
  const qbox = [];
  const q = (t, x, y, a) => { const w = t.length * (narrow ? 6.2 : 6.8); qbox.push({ x: a === 'end' ? x - w / 2 : x + w / 2, y: y - 3, w }); return `<text x="${x}" y="${y}" text-anchor="${a}" font-size="${narrow ? 10 : 11}" fill="#6b6663" font-family="Geist Mono, monospace" letter-spacing=".04em">${t}</text>`; };
  // Quadrant names sit above the plot (top pair) and in the bottom corners, clear of the avatars.
  svg += q(narrow ? 'HIGH VOL, EFFICIENT' : 'HIGH VOLUME, EFFICIENT', W - mr, 14, 'end') + q(narrow ? 'LOW VOL, EFFICIENT' : 'LOW VOLUME, EFFICIENT', ml, 14, 'start') + q(narrow ? 'HIGH VOL, COLD' : 'HIGH VOLUME, COLD', W - mr - 6, H - mb - 8, 'end') + q(narrow ? 'LOW VOL, COLD' : 'LOW VOLUME, COLD', ml + 6, H - mb - 8, 'start');
  // Labels go under each avatar, or above it when two labels would collide.
  const boxes = pts.map(p => ({ x: X(p.x), y: Y(p.y) })), labels = [...qbox];
  const hits = (bx, by, bw) => labels.some(o => Math.abs(o.x - bx) < (o.w + bw) / 2 + 4 && Math.abs(o.y - by) < 14) || boxes.some(o => Math.abs(o.x - bx) < bw / 2 + R && Math.abs(o.y - (by - 4)) < R + 6);
  let labelSvg = '';
  pts.forEach(p => {
    const cx = X(p.x), cy = Y(p.y), name = P(p.id).name, bw = name.length * (narrow ? 6 : 6.6);
    const spots = [[cx, cy + R + 14, 'middle'], [cx, cy - R - 7, 'middle'], [cx + R + 6 + bw / 2, cy + 4, 'middle'], [cx - R - 6 - bw / 2, cy + 4, 'middle']];
    const [lx, ly] = spots.find(([x, y]) => !hits(x, y, bw) && y < H - mb + 6 && x - bw / 2 > ml && x + bw / 2 < W - mr) || spots[0];
    labels.push({ x: lx, y: ly, w: bw });
    labelSvg += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="${narrow ? 11 : 12}" fill="#d4d0cd" font-family="Geist, sans-serif" paint-order="stroke" stroke="#1d1a18" stroke-width="3" pointer-events="none">${esc(name)}</text>`;
  });
  pts.forEach((p, i) => {
    const cx = X(p.x), cy = Y(p.y), pl = P(p.id);
    svg += `<g class="sdot" data-av="${p.id}" data-i="${i}" transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)})" tabindex="0" role="button" aria-label="${esc(pl.name)}: ${f1(p.x)} shots a game, ${pctTxt(p.y)} true shooting">
      <g class="sd-in"><circle r="${R + 2.5}" fill="#1d1a18" stroke="${SLOT_COL[statPlayers().indexOf(p.id)] || '#8a8380'}" stroke-width="2"/><circle r="${R}" fill="#272321"/>
      <g clip-path="url(#sclip)"><svg x="${-R}" y="${-R * .86}" width="${2 * R}" height="${2 * R}" viewBox="0 0 100 100">${figure(pl)}</svg></g></g></g>`;
  });
  wrap.innerHTML = svg + labelSvg + '</svg>';
  const svgEl = wrap.querySelector('svg');
  wrap.querySelectorAll('.sdot').forEach((g, i) => {
    const p = pts[+g.dataset.i];
    const tip = () => { const r = svgEl.getBoundingClientRect(); showTip(wrap, `<div class="tt">${esc(P(p.id).name)}</div><div class="tr"><span>Shots a game</span><b class="num">${f1(p.x)}</b></div><div class="tr"><span>True shooting</span><b class="num">${pctTxt(p.y)}</b></div><div class="tr"><span>Points a game</span><b class="num">${f1(p.ppg)}</b></div><div class="tr"><span>Games</span><b class="num">${p.gp}</b></div>`, X(p.x) * r.width / W, Y(p.y) * r.height / H - R); };
    g.addEventListener('pointerenter', tip); g.addEventListener('focus', tip);
    g.addEventListener('pointerleave', () => hideTip(wrap)); g.addEventListener('blur', () => hideTip(wrap));
    g.addEventListener('keydown', e => { if (e.key === 'Enter') openPlayer(p.id); });
    if (!reduced) g.querySelector('.sd-in').animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: .7 }, { transform: 'scale(1)' }], { duration: 420, delay: 80 + i * 50, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
  });
}

// Five-point radar. Each axis is scaled to the best per-game value among the peers.
export function drawRadar(wrap, a, peers, cmp) {
  const AX = [['ast', 'AST'], ['reb', 'REB'], ['stl', 'STL'], ['blk', 'BLK'], ['ts', 'TS%']];
  const v = (agg, k) => k === 'ts' ? (agg.s.ts || 0) : agg.pg(k);
  const max = Object.fromEntries(AX.map(([k]) => [k, Math.max(1e-6, ...peers.map(x => v(x, k)))]));
  const other = cmp === 'team' ? Object.fromEntries(AX.map(([k]) => [k, peers.reduce((t, x) => t + v(x, k), 0) / peers.length])) : Object.fromEntries(AX.map(([k]) => [k, v(peers.find(x => x.id === cmp), k)]));
  const W = 360, H = 320, cx = W / 2, cy = H / 2 + 6, R = 112;
  const pt = (i, f) => { const ang = -Math.PI / 2 + i * 2 * Math.PI / AX.length; return [cx + Math.cos(ang) * R * f, cy + Math.sin(ang) * R * f]; };
  const poly = vals => vals.map((f, i) => pt(i, Math.max(.04, Math.min(1, f))).map(n => n.toFixed(1)).join(',')).join(' ');
  const mine = AX.map(([k]) => v(a, k) / max[k]), theirs = AX.map(([k]) => other[k] / max[k]);
  const fmt = (k, x) => k === 'ts' ? Math.round(x * 100) + '%' : f1(x);
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Radar of ${AX.map(([, l]) => l).join(', ')}"><defs><radialGradient id="rfill" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#4f7cff" stop-opacity=".55"/><stop offset="1" stop-color="#4f7cff" stop-opacity=".18"/></radialGradient></defs>`;
  [.25, .5, .75, 1].forEach(f => svg += `<polygon points="${poly(AX.map(() => f))}" fill="${f === 1 ? '#191614' : 'none'}" stroke="#2f2b29" stroke-width="1"/>`);
  AX.forEach((_, i) => { const [x, y] = pt(i, 1); svg += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#2f2b29"/>`; });
  svg += `<polygon points="${poly(theirs)}" fill="none" stroke="#eeeeee" stroke-width="1.4" stroke-dasharray="4 4" opacity=".55"/>`;
  svg += `<g class="rshape"><polygon points="${poly(mine)}" fill="url(#rfill)" stroke="#4f7cff" stroke-width="2.2" stroke-linejoin="round"/>
    ${mine.map((f, i) => { const [x, y] = pt(i, Math.max(.04, Math.min(1, f))); return `<circle cx="${x}" cy="${y}" r="4" fill="#4f7cff" stroke="#1d1a18" stroke-width="2"/>`; }).join('')}</g>`;
  AX.forEach(([k, l], i) => {
    const [x, y] = pt(i, 1.24), anchor = Math.abs(x - cx) < 8 ? 'middle' : x > cx ? 'start' : 'end';
    svg += `<text x="${x}" y="${y - 3}" text-anchor="${anchor}" font-size="11" fill="#8a8380" font-family="Geist Mono, monospace" letter-spacing=".04em">${l}</text>
      <text x="${x}" y="${y + 13}" text-anchor="${anchor}" font-size="15" font-weight="600" fill="#eeeeee" font-family="Geist, sans-serif">${fmt(k, v(a, k))}</text>`;
  });
  wrap.innerHTML = svg + '</svg>';
  if (!reduced) {
    const g = wrap.querySelector('.rshape'); g.style.transformOrigin = `${cx}px ${cy}px`;
    g.animate([{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
}
