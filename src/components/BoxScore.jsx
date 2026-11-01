import { S } from '../lib/store.js';
import { P, sumRows, ratio, pctTxt, perTxt, tier } from '../lib/core.js';
import { Avatar } from './Avatar.jsx';
import { rebSplit } from '../lib/prefs.js';
import { PerPill, setSort } from './ui.jsx';

// Box score columns, in Geoff's order with TO straight after BLK. Every header sorts.
const BOXCOLS = [
  { k: 'per', l: 'PER', c: true, v: s => s.per },
  { k: 'pts', l: 'PTS', hi: true }, { k: 'reb', l: 'REB', hi: true },
  { k: 'ast', l: 'AST', hi: true }, { k: 'stl', l: 'STL', hi: true }, { k: 'blk', l: 'BLK', hi: true }, { k: 'to', l: 'TO', v: s => s.to, low: true },
  { k: 'm2', l: '2FG', v: s => s.m2, cell: s => `${s.m2}-${s.a2}` }, { k: 'p2', l: '2FG%', pct: ['m2', s => ratio(s.m2, s.a2), s => s.a2] },
  { k: 'm3', l: '3FG', v: s => s.m3, cell: s => `${s.m3}-${s.a3}` }, { k: 'p3', l: '3FG%', pct: ['m3', s => ratio(s.m3, s.a3), s => s.a3] },
  { k: 'fgm', l: 'FG', v: s => s.fgm, cell: s => `${s.fgm}-${s.fga}` }, { k: 'pfg', l: 'FG%', pct: ['fg', s => ratio(s.fgm, s.fga), s => s.fga] },
  { k: 'ftm', l: 'FT', v: s => s.ftm, cell: s => `${s.ftm}-${s.fta}` }, { k: 'pft', l: 'FT%', pct: ['ft', s => ratio(s.ftm, s.fta), s => s.fta] },
  { k: 'tsa', l: 'TSA', v: s => s.tsa, cell: s => s.tsa.toFixed(1) }, { k: 'ts', l: 'TS%', pct: ['ts', s => s.ts, s => s.tsa] },
];

// rows: [{id, c (counts), s (calculated), num}] in playing order.
// With the Settings option on, REB becomes OREB and DREB in games that recorded them.
const SPLITCOLS = BOXCOLS.flatMap(c => c.k === 'reb' ? [{ k: 'oreb', l: 'OREB', hi: true }, { k: 'dreb', l: 'DREB', hi: true }] : [c]);

export function BoxScore({ rows }) {
  const t = sumRows(rows.map(r => r.c));
  const split = rebSplit() && rows.length > 0 && rows.every(r => r.s.split);
  const COLS = split ? SPLITCOLS : BOXCOLS;
  if (split) for (const k of ['oreb', 'dreb']) t[k] = rows.reduce((a, r) => a + r.s[k], 0);
  const max = k => Math.max(...rows.map(r => r.s[k]));
  const val = (col, s) => col.v ? col.v(s) : col.pct ? col.pct[1](s) : s[col.k];
  const cell = (col, s, total) => {
    if (col.k === 'per') return <td key={col.k} className="c">{total ? <span className="per p-tot">{perTxt(s.per)}</span> : <PerPill v={s.per} />}</td>;
    if (col.cell) return <td key={col.k}>{col.cell(s)}</td>;
    if (col.pct) { const [tk, f, att] = col.pct, v = f(s); return <td key={col.k} className={tier(tk, v, att(s)) || undefined}>{pctTxt(v)}</td>; }
    if (col.low) { const tos = rows.map(r => r.s.to), lo = !total && new Set(tos).size > 1 && s.to === Math.min(...tos); return <td key={col.k}><span className={`n${lo ? ' hi' : ''}`}>{s.to}</span></td>; }
    const v = s[col.k], top = col.hi && !total && rows.length > 1 && v > 0 && v === max(col.k);
    return <td key={col.k}><span className={`n${top ? ' hi' : ''}`}>{v}</span></td>;
  };
  // No sort means the playing order.
  const sk = S.box?.k, bestDir = (sk === 'name' || sk === 'to') ? 1 : -1, dir = S.box?.best ? bestDir : -bestDir;
  const sortCol = COLS.find(c => c.k === sk);
  const sorted = !sk ? rows : rows.slice().sort((a, b) => {
    if (sk === 'name') return dir * P(a.id).name.localeCompare(P(b.id).name);
    const va = val(sortCol, a.s), vb = val(sortCol, b.s);
    if (va === null) return 1; if (vb === null) return -1;
    return dir * (va - vb);
  });
  const arrow = k => sk === k ? <span className="arr">{dir < 0 ? '▼' : '▲'}</span> : null;
  const aria = k => sk === k ? (dir < 0 ? 'descending' : 'ascending') : undefined;
  return (
    <div className="box">
      <div className="legend"><span><b style={{ color: 'var(--green)', fontWeight: 500 }}>52%</b>Good shooting</span>
        <span><b style={{ color: 'var(--neg)', fontWeight: 500 }}>21%</b>Poor shooting</span>
        <span><i style={{ background: 'var(--royal-soft)', boxShadow: 'inset 0 0 0 1px rgba(120,150,255,.6)' }} />Game best</span>
        <span><span className="per p-great" style={{ minWidth: 0, padding: '1px 6px' }}>+15</span>PER 15 or more</span></div>
      <div className="tbl-wrap"><table>
        <thead><tr>
          <th className="sortable" data-bk="name" aria-sort={aria('name')} onClick={() => setSort('box', 'name')}>Player{arrow('name')}</th>
          {COLS.map(c => <th key={c.k} className={`sortable${c.c ? ' c' : ''}`} data-bk={c.k} aria-sort={aria(c.k)} onClick={() => setSort('box', c.k)}>{arrow(c.k)}{c.l}</th>)}
        </tr></thead>
        <tbody>
          {sorted.map(r => <tr key={r.id}><td className="pl"><div className="plc"><Avatar id={r.id} num={r.num} />{P(r.id).name}</div></td>{COLS.map(c => cell(c, r.s, false))}</tr>)}
          <tr className="tot"><td className="pl"><div className="plc">Team</div></td>{COLS.map(c => cell(c, t, true))}</tr>
        </tbody>
      </table></div>
    </div>
  );
}
