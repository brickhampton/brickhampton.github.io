import { useState } from 'react';
import { S } from '../lib/store.js';
import { seasonList, P, numIn, RES } from '../lib/core.js';
import { adminEdit } from '../lib/admin.js';
import { todayIso } from '../lib/record.js';
import { go } from '../lib/nav.js';
import { Avatar } from '../components/Avatar.jsx';
import { ChevDown, ChevUp, X } from '../components/icons.jsx';
import { openSheet, closeSheet } from '../components/Sheet.jsx';
import { useSave } from './Settings.jsx';

const Trash = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><g className="lid"><path d="M3 6h18" /><path d="M8 6V4h8v2" /></g><path d="M19 6l-1 14H6L5 6" /></svg>;
const PAIRS = [['m2', 'a2'], ['m3', 'a3'], ['ftm', 'fta']];
const badPairs = c => PAIRS.filter(([m, a]) => (c[m] || 0) > (c[a] || 0)).flat();

// Edit one game: details, result, opponent score and the full box score. Nothing is saved until Save.
export function EditGame({ id }) {
  const g = S.games.find(x => x.id === id);
  const [d, setD] = useState(() => g && { season: g.season, no: g.no, date: g.date, opp: g.opp, result: g.result, oppPts: g.oppPts ?? '' });
  const [rows, setRows] = useState(() => g && JSON.parse(JSON.stringify(g.rows)));
  const { err, setErr, busy, run } = useSave();
  if (!g) return <><h2>This game no longer exists</h2><div className="actions"><button className="btn primary" onClick={closeSheet}>Close</button></div></>;
  const split = Object.values(g.rows).some(r => r.oreb !== undefined) || (!Object.keys(g.rows).length && g.recorded);
  const COLS = [['m2', '2PM'], ['a2', '2PA'], ['m3', '3PM'], ['a3', '3PA'], ['ftm', 'FTM'], ['fta', 'FTA'], ...(split ? [['oreb', 'OREB'], ['dreb', 'DREB']] : [['reb', 'REB']]), ['ast', 'AST'], ['stl', 'STL'], ['blk', 'BLK'], ['to', 'TO']];
  const allOpps = [...new Set(S.games.map(x => x.opp))].sort();
  const patch = p => { setD(x => ({ ...x, ...p })); setErr(''); };
  const setCell = (pid, k, raw) => { const v = Math.max(0, Math.min(99, parseInt(raw, 10) || 0)); setRows(r => ({ ...r, [pid]: { ...r[pid], [k]: v } })); setErr(''); };
  const options = [...S.roster, ...S.subs].filter(p => !rows[p.id]);

  const save = () => {
    const opp = d.opp.trim(), pts = String(d.oppPts).trim();
    if (!opp) return setErr('Add the opponent.');
    if (!d.date || d.date > todayIso()) return setErr('The date can\'t be in the future.');
    if (pts && !/^\d{1,3}$/.test(pts)) return setErr('The opponent score should be a number, or left blank.');
    if (S.games.some(x => x.id !== id && x.season === d.season && x.no === d.no)) return setErr(`${d.season} Game ${d.no} already exists. Pick another game number.`);
    const wrong = Object.keys(rows).filter(pid => badPairs(rows[pid]).length);
    if (wrong.length) return setErr(`Made shots can't be more than attempts for ${wrong.map(pid => P(pid)?.name).join(', ')}.`);
    const lines = Object.entries(rows).map(([pid, c]) => ({ player_id: pid, num: g.nums?.[pid] ?? null, ...Object.fromEntries(COLS.map(([k]) => [k, c[k] || 0])) }));
    run(() => adminEdit('edit_game', { p_id: id, p_game: { season: d.season, no: d.no, date: d.date, opp, result: d.result, opp_pts: pts, lines } }),
      nid => { if (S.screen === 'game') go('game', { gameId: nid }); });
  };

  return <>
    <button className="xbtn" id="eg-x" type="button" aria-label="Close" onClick={closeSheet}><X width="16" height="16" /></button>
    <h2>Edit game</h2><p className="sheet-sub">{g.season}, Game {g.no} vs {g.opp}. Nothing changes until you tap Save.</p>
    <div className="eg-grid">
      <div className="field"><label htmlFor="eg-season">Season</label><select id="eg-season" value={d.season} onChange={e => patch({ season: e.target.value })}>{seasonList().map(({ code }) => <option key={code}>{code}</option>)}</select></div>
      <div className="field"><label id="eg-l-no">Game</label><div className="stepper" role="group" aria-labelledby="eg-l-no">
        <button type="button" id="eg-down" aria-label="Previous game number" disabled={d.no <= 1} onClick={() => patch({ no: Math.max(1, d.no - 1) })}><ChevDown width="18" height="18" /></button>
        <output id="eg-no" className="num">{d.no}</output>
        <button type="button" id="eg-up" aria-label="Next game number" disabled={d.no >= 40} onClick={() => patch({ no: Math.min(40, d.no + 1) })}><ChevUp width="18" height="18" /></button></div></div>
      <div className="field"><label htmlFor="eg-date">Date</label><input id="eg-date" type="date" value={d.date} max={todayIso()} onChange={e => patch({ date: e.target.value })} /></div>
      <div className="field"><label htmlFor="eg-opp">Opponent</label><input id="eg-opp" value={d.opp} list="eg-opps" autoComplete="off" onChange={e => patch({ opp: e.target.value })} />
        <datalist id="eg-opps">{allOpps.map(o => <option key={o} value={o} />)}</datalist></div>
      <div className="field res"><label>Result</label><div className="rseg big" id="eg-res">{['W', 'L', 'D', 'U'].map(x => <button key={x} type="button" data-r={x} aria-pressed={d.result === x} onClick={() => patch({ result: x })}>{x === 'U' ? 'Unknown' : RES[x]}</button>)}</div></div>
      <div className="field"><label htmlFor="eg-opp-pts">Opponent score</label><input id="eg-opp-pts" inputMode="numeric" value={d.oppPts} placeholder="Optional" onChange={e => patch({ oppPts: e.target.value })} /></div>
    </div>
    <h3 className="eg-h">Box score</h3>
    <div className="tbl-wrap"><table className="eg-tbl"><thead><tr><th>Player</th>{COLS.map(([, l]) => <th key={l}>{l}</th>)}<th><span className="sr">Remove</span></th></tr></thead>
      <tbody id="eg-body">{Object.keys(rows).length ? Object.keys(rows).map(pid => {
        const bad = badPairs(rows[pid]);
        return <tr key={pid} data-id={pid}><td className="pl"><div className="plc"><Avatar id={pid} num={numIn(g, pid)} />{P(pid)?.name || pid}</div></td>
          {COLS.map(([k]) => <td key={k}><input className={`num${bad.includes(k) ? ' bad' : ''}`} inputMode="numeric" data-k={k} value={rows[pid][k] ?? 0} aria-label={`${P(pid)?.name} ${k}`}
            onFocus={e => e.target.select()} onChange={e => setCell(pid, k, e.target.value)} /></td>)}
          <td><button className="iconbtn sm" data-rm={pid} aria-label={`Remove ${P(pid)?.name}`} onClick={() => setRows(r => { const n = { ...r }; delete n[pid]; return n; })}><X width="16" height="16" /></button></td></tr>;
      }) : <tr><td colSpan={COLS.length + 2} className="hint">No players. A game with no players shows as "No stats recorded".</td></tr>}</tbody></table></div>
    <div className="eg-add"><select id="eg-addp" aria-label="Add a player to this game" value="" onChange={e => { const pid = e.target.value; if (pid) setRows(r => ({ ...r, [pid]: Object.fromEntries(COLS.map(([k]) => [k, 0])) })); }}>
      <option value="">+ Add a player to this game</option>{options.map(p => <option key={p.id} value={p.id}>{p.name}{p.guest ? ' (sub)' : ''}</option>)}</select></div>
    {err && <p className="ferr" id="eg-err">{err}</p>}
    <div className="actions end-actions"><button className="iconbtn danger" id="eg-del" type="button" aria-label="Delete this game" title="Delete this game" onClick={() => openSheet(<DeleteGame id={id} />)}><Trash /></button>
      <span className="grow" /><button className="btn ghost" id="eg-cancel" onClick={closeSheet}>Cancel</button><button className="btn primary" id="eg-save" disabled={busy} onClick={save}>Save changes</button></div>
  </>;
}

function DeleteGame({ id }) {
  const g = S.games.find(x => x.id === id);
  const { err, busy, run } = useSave();
  if (!g) return null;
  return <>
    <h2>Delete {g.season} Game {g.no}?</h2><p className="sheet-sub">The game vs {g.opp} and its box score come out of every stat. You can bring it back with Undo in Change history.</p>
    {err && <p className="ferr">{err}</p>}
    <div className="actions"><button className="btn ghost" id="dg-back" onClick={() => openSheet(<EditGame id={id} />, { wide: true })}>Go back</button>
      <button className="btn danger" id="dg-ok" disabled={busy} onClick={() => run(() => adminEdit('delete_game', { p_id: id }), () => { if (S.screen === 'game') go('games', { gSeason: g.season }); })}><Trash />Delete game</button></div>
  </>;
}

const isSunday = iso => new Date(iso + 'T12:00:00').getDay() === 0;
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
// The most recent Sunday on or before a date.
const sundayOnOrBefore = iso => addDays(iso, -new Date(iso + 'T12:00:00').getDay());

// Add a game that has no stats: details only. It shows in Games as "No stats recorded" until Edit game adds a box score.
export function AddGame({ season }) {
  const nos = S.games.filter(x => x.season === season).map(x => x.no);
  // The first missing game number in the season, otherwise the next one.
  let no = 1; while (nos.includes(no)) no++;
  const before = S.games.filter(x => x.season === season && x.no < no).sort((a, b) => b.no - a.no)[0];
  const today = sundayOnOrBefore(todayIso());
  const date = before ? (addDays(before.date, 7) < today ? addDays(before.date, 7) : today) : today;
  const [d, setD] = useState({ season, no, date, opp: '', result: 'U', oppPts: '' });
  const { err, setErr, busy, run } = useSave();
  const seasonOpps = S.opps[d.season] || [];
  const allOpps = [...new Set([...seasonOpps, ...[...new Set(S.games.map(x => x.opp))].sort()])];
  const patch = p => { setD(x => ({ ...x, ...p })); setErr(''); };

  const save = () => {
    const opp = d.opp.trim(), pts = String(d.oppPts).trim();
    if (S.games.some(x => x.season === d.season && x.no === d.no)) return setErr(`${d.season} Game ${d.no} already exists. Pick another game number.`);
    if (!d.date || d.date > todayIso()) return setErr('The date can\'t be in the future.');
    if (!isSunday(d.date)) return setErr('Games are always on a Sunday.');
    if (!opp) return setErr('Add the opponent.');
    if (pts && !/^\d{1,3}$/.test(pts)) return setErr('The opponent score should be a number, or left blank.');
    run(() => adminEdit('add_game', { p_game: { season: d.season, no: d.no, date: d.date, opp, result: d.result, opp_pts: pts } }));
  };

  return <>
    <button className="xbtn" id="ag-x" type="button" aria-label="Close" onClick={closeSheet}><X width="16" height="16" /></button>
    <h2>Add a game</h2><p className="sheet-sub">For a game nobody kept stats for: no players or box score. It shows in Games as "No stats recorded" and its result counts in the season record. You can add a box score later with Edit game.</p>
    <div className="eg-grid">
      <div className="field"><label htmlFor="ag-season">Season</label><select id="ag-season" value={d.season} onChange={e => patch({ season: e.target.value })}>{seasonList().map(({ code }) => <option key={code}>{code}</option>)}</select></div>
      <div className="field"><label id="ag-l-no">Game</label><div className="stepper" role="group" aria-labelledby="ag-l-no">
        <button type="button" id="ag-down" aria-label="Previous game number" disabled={d.no <= 1} onClick={() => patch({ no: Math.max(1, d.no - 1) })}><ChevDown width="18" height="18" /></button>
        <output id="ag-no" className="num">{d.no}</output>
        <button type="button" id="ag-up" aria-label="Next game number" disabled={d.no >= 40} onClick={() => patch({ no: Math.min(40, d.no + 1) })}><ChevUp width="18" height="18" /></button></div></div>
      <div className="field"><label htmlFor="ag-date">Date</label><input id="ag-date" type="date" value={d.date} max={todayIso()} onChange={e => patch({ date: e.target.value })} /></div>
      <div className="field"><label htmlFor="ag-opp">Opponent</label><input id="ag-opp" value={d.opp} list="ag-opps" autoComplete="off" placeholder="Team name" onChange={e => patch({ opp: e.target.value })} />
        <datalist id="ag-opps">{allOpps.map(o => <option key={o} value={o} />)}</datalist></div>
      <div className="field res"><label>Result</label><div className="rseg big" id="ag-res">{['W', 'L', 'D', 'U'].map(x => <button key={x} type="button" data-r={x} aria-pressed={d.result === x} onClick={() => patch({ result: x })}>{x === 'U' ? 'Unknown' : RES[x]}</button>)}</div></div>
      <div className="field"><label htmlFor="ag-opp-pts">Opponent score</label><input id="ag-opp-pts" inputMode="numeric" value={d.oppPts} placeholder="Optional" onChange={e => patch({ oppPts: e.target.value })} /></div>
    </div>
    {err && <p className="ferr" id="ag-err">{err}</p>}
    <div className="actions end-actions"><span className="grow" /><button className="btn ghost" id="ag-cancel" onClick={closeSheet}>Cancel</button><button className="btn primary" id="ag-save" disabled={busy} onClick={save}>Add game</button></div>
  </>;
}
