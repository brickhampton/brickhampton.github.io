// Checks the imported games against Geoff's master sheet, row by row.
// Usage: npm run check -- path/to/brickhampton-master-data.csv
import { readFileSync } from 'node:fs';
import { PLAYERS, GUESTS, HIST } from '../src/data/seed.js';

const file = process.argv[2];
if (!file) { console.error('Pass the master sheet CSV: npm run check -- brickhampton-master-data.csv'); process.exit(1); }

const parse = text => {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
};
const [head, ...lines] = parse(readFileSync(file, 'utf8')).filter(r => r.length > 1);
const col = Object.fromEntries(head.map((h, i) => [h.trim(), i]));
const byName = Object.fromEntries([...PLAYERS, ...GUESTS].map(p => [p.name, p.id]));
const games = Object.fromEntries(HIST.map(([s, n, , , r]) => [`${s}-${n}`, r]));
const num = v => v === '' ? null : +String(v).replace('%', '');
const issues = []; let checked = 0;

for (const r of lines) {
  const key = `${r[col.Season]}-${r[col.Game]}`, name = r[col.Player]?.trim();
  if (!name) continue;
  const blank = ['PTS', 'REB', 'AST', '2FGA', '3FGA', 'FTA', 'TO'].every(k => r[col[k]] === '');
  const id = byName[name], g = games[key];
  if (!g) { issues.push(`${key}: game is missing from the import`); continue; }
  if (!id) { issues.push(`${key}: unknown player ${name}`); continue; }
  const v = g[id];
  if (blank) { if (v) issues.push(`${key} ${name}: blank row in the sheet (sat out) but imported with stats`); continue; }
  if (!v) { issues.push(`${key} ${name}: in the sheet but not imported`); continue; }
  const [m2, a2, m3, a3, ftm, fta, reb, ast, stl, blk, to] = v;
  const pts = 2 * m2 + 3 * m3 + ftm, tsa = a2 + a3 + 0.44 * fta;
  const want = {
    PTS: pts, REB: reb, AST: ast, STL: stl, BLK: blk, TO: to, '2FGM': m2, '2FGA': a2, '3FGM': m3, '3FGA': a3, FTM: ftm, FTA: fta,
    FGM: m2 + m3, FGA: a2 + a3, TSA: tsa,
    '2FG%': a2 ? m2 / a2 * 100 : null, '3FG%': a3 ? m3 / a3 * 100 : null, 'FG%': a2 + a3 ? (m2 + m3) / (a2 + a3) * 100 : null, 'FT%': fta ? ftm / fta * 100 : null,
    'TS%': tsa ? pts / (2 * tsa) * 100 : null,
  };
  for (const [k, w] of Object.entries(want)) {
    if (!(k in col)) continue;
    const got = num(r[col[k]]);
    const pct = k.endsWith('%') || k === 'TSA';
    const ok = got === null ? (w === null || w === 0) : w === null ? got === 0 : pct ? Math.abs(got - w) <= (k === 'TSA' ? 0.6 : 0.6) : got === w;
    if (!ok) issues.push(`${key} ${name}: ${k} sheet ${r[col[k]]}, import ${pct && w !== null ? w.toFixed(1) : w}`);
  }
  checked++;
}
console.log(`Checked ${checked} player rows across ${HIST.length} games.`);
console.log(issues.length ? issues.join('\n') : 'Every number matches.');
