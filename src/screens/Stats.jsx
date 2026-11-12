import { S, set } from '../lib/store.js';
import { allGames, seasonList, seasonName, statPlayers, playerAgg, sumRows, ratio, pctTxt, perTxt, tier, aggTier, enoughShots, f1, calc, P, numIn } from '../lib/core.js';
import { go, openPlayer } from '../lib/nav.js';
import { shotDetail } from '../lib/prefs.js';
import { drawTrend, drawScatter, drawSeasonBars, STATS, TB_STATS, SLOT_COL, SC_B } from '../lib/charts.js';
import { Avatar } from '../components/Avatar.jsx';
import { TrophyGold } from '../components/icons.jsx';
import { Chart, SeasonPick, EmptyState, setSort } from '../components/ui.jsx';

const RCOLS = [['per', 'PER'], ['pts', 'PTS'], ['reb', 'REB'], ['ast', 'AST'], ['stl', 'STL'], ['blk', 'BLK'], ['to', 'TO'], ['fg', 'FG%'], ['m3', '3FG%'], ['ft', 'FT%'], ['ts', 'TS%'], ['gp', 'GP']];
export const aggVal = (a, k) => k === 'ts' ? a.s.ts : k === 'fg' ? ratio(a.s.fgm, a.s.fga) : k === 'm3' ? ratio(a.s.m3, a.s.a3) : k === 'ft' ? ratio(a.s.ftm, a.s.fta) : k === 'gp' ? a.gp : a.pg(k);
// Shooting columns: made and attempted keys, so Totals can show them as made-attempts (2-8).
// TS has no real "made" count, so it uses PTS / 2 over TSA, both rounded to whole numbers.
const SHOTS = { fg: ['fgm', 'fga'], m3: ['m3', 'a3'], ft: ['ftm', 'fta'], ts: ['tsm', 'tsa'] };
const shot = (a, k, i) => k === 'ts' ? Math.round(i ? a.s.tsa : a.s.pts / 2) : a.s[SHOTS[k][i]];
// Totals sort counting stats by their sums and shooting columns by shots made, like the box score.
const totVal = (a, k) => k === 'gp' ? a.gp : SHOTS[k] ? shot(a, k, 0) : a.s[k];

// Detailed shooting (Settings): each plain % column, then its made and attempts columns.
// TSM is the TS numerator, PTS / 2, so TSM / TSA = TS%.
const CNT = { fgm: 'fgm', fga: 'fga', m3m: 'm3', a3: 'a3', ftm: 'ftm', fta: 'fta', tsm: 'tsm', tsa: 'tsa' };
const DCOLS = RCOLS.flatMap(c => c[0] === 'fg' ? [c, ['fgm', 'FGM'], ['fga', 'FGA']] : c[0] === 'm3' ? [c, ['m3m', '3FGM'], ['a3', '3FGA']]
  : c[0] === 'ft' ? [c, ['ftm', 'FTM'], ['fta', 'FTA']] : c[0] === 'ts' ? [c, ['tsm', 'TS'], ['tsa', 'TSA']] : [c]);

// pctOnly: All time Totals show shooting as just the % (made-attempts get too big).
function Rankings({ aggs, team, tot, pctOnly }) {
  const detail = shotDetail(), cols = detail ? DCOLS : RCOLS;
  const dash = tot && !pctOnly && !detail;
  const cnt = (a, k) => k === 'tsm' ? (tot ? Math.round(a.s.pts / 2) : a.pg('pts') / 2) : k === 'tsa' && tot ? Math.round(a.s.tsa) : tot ? a.s[CNT[k]] : a.pg(CNT[k]);
  const val = (a, k) => CNT[k] ? cnt(a, k) : tot ? (SHOTS[k] && !dash ? aggVal(a, k) : totVal(a, k)) : aggVal(a, k);
  const sk = S.rsort?.k, bestDir = (sk === 'name' || sk === 'to') ? 1 : -1, dir = S.rsort?.best ? bestDir : -bestDir;
  const sorted = !sk ? aggs : aggs.slice().sort((a, b) => {
    if (sk === 'name') return dir * P(a.id).name.localeCompare(P(b.id).name);
    const va = val(a, sk), vb = val(b, sk); if (va === null) return 1; if (vb === null) return -1; return dir * (va - vb);
  });
  const cell = (a, k, isTeam) => {
    const v = val(a, k);
    if (k === 'gp') return <td key={k}>{v}</td>;
    // PER: the leader in bright green, the next three in soft green, everyone else grey. The team row is plain.
    if (k === 'per') {
      if (isTeam) return <td key={k} className="c"><span className="per p-tot">{perTxt(v, !tot)}</span></td>;
      const rank = aggs.filter(x => val(x, 'per') > v).length;
      return <td key={k} className="c"><span className={`per ${rank === 0 ? 'p-great' : rank <= 3 ? 'p-good' : 'p-mid'}`}>{perTxt(v, !tot)}</span></td>;
    }
    if (CNT[k]) {
      // Made and attempts columns are plain: no game-best box.
      return <td key={k}><span className="n">{tot ? v : f1(v)}</span></td>;
    }
    if (SHOTS[k]) {
      const pct = aggVal(a, k);
      if (detail) return <td key={k} className={aggTier(k, pct, a) || undefined}>{pctTxt(pct)}</td>;
      // Averages show attempts a game under the %, e.g. 3.6 A.
      if (!tot) return <td key={k} className={aggTier(k, pct, a) || undefined}>{pctTxt(pct)}<span className="sp att">{f1(a.pg(SHOTS[k][1]))} A</span></td>;
      if (!dash) return <td key={k} className={aggTier(k, pct, a) || undefined}>{pctTxt(pct)}</td>;
      const at = shot(a, k, 1);
      return <td key={k} className={aggTier(k, pct, a) || undefined}>{shot(a, k, 0)}-{at}<span className="sp">{pctTxt(pct)}</span></td>;
    }
    const all = aggs.map(x => val(x, k)), top = !isTeam && (k === 'to' ? v === Math.min(...all) : v === Math.max(...all));
    return <td key={k}><span className={`n${top && aggs.length > 1 ? ' hi' : ''}`}>{tot ? v : f1(v)}</span></td>;
  };
  const arrow = k => sk === k ? <span className="arr">{dir < 0 ? '▼' : '▲'}</span> : null;
  const aria = k => sk === k ? (dir < 0 ? 'descending' : 'ascending') : undefined;
  return (
    <div className="tbl-wrap"><table id="rank">
      <thead><tr><th className="sortable" data-rk="name" aria-sort={aria('name')} onClick={() => setSort('rsort', 'name')}>Player{arrow('name')}</th>
        {cols.map(([k, l]) => <th key={k} className={`sortable${k === 'per' ? ' c' : ''}`} data-rk={k} aria-sort={aria(k)} onClick={() => setSort('rsort', k)}>{arrow(k)}{dash && SHOTS[k] ? l.slice(0, -1) : l}</th>)}</tr></thead>
      <tbody>{sorted.map(a => <tr key={a.id}><td className="pl"><div className="plc"><Avatar id={a.id} />{P(a.id).name}</div></td>{cols.map(([k]) => cell(a, k))}</tr>)}
        {team ? <tr className="tot"><td className="pl"><div className="plc">Team</div></td>{cols.map(([k]) => cell(team, k, true))}</tr> : null}</tbody>
    </table></div>
  );
}

// Two things side by side, row by row. The brighter bar wins the row. Used for head to head and season vs season.
export function H2HRows({ A1, B1, rowsDef }) {
  const v = (g, k) => k === 'ts' ? g.s.ts : k === 'fg' ? ratio(g.s.fgm, g.s.fga) : k === 'm3' ? ratio(g.s.m3, g.s.a3) : k === 'gp' ? g.gp : g.pg(k);
  return rowsDef.map(([k, l, fmt]) => {
    const va = v(A1, k) ?? 0, vb = v(B1, k) ?? 0, m = Math.max(Math.abs(va), Math.abs(vb)) || 1;
    const aWin = k === 'to' ? va < vb : va > vb, bWin = k === 'to' ? vb < va : vb > va;
    return (
      <div className="h2h-row" key={k}><span className={`v l num ${aWin ? 'win' : ''}`}>{fmt(va)}</span>
        <div className="tr l"><div className={aWin ? '' : 'lose'} style={{ width: `${Math.max(0, va) / m * 100}%`, background: SLOT_COL[0] }} /></div>
        <span className="lab">{l}</span>
        <div className="tr"><div className={bWin ? '' : 'lose'} style={{ width: `${Math.max(0, vb) / m * 100}%`, background: SC_B }} /></div>
        <span className={`v r num ${bWin ? 'win' : ''}`}>{fmt(vb)}</span></div>
    );
  });
}

function HeadToHead({ games, pickable }) {
  const [a, b] = S.h2h, A1 = playerAgg(games, a), B1 = playerAgg(games, b);
  const pick = (i, id) => { const h = S.h2h.slice(); h[i] = id; set({ h2h: h }); };
  const rowsDef = [['per', 'PER', v => perTxt(v, true)], ['pts', 'PTS', f1], ['reb', 'REB', f1], ['ast', 'AST', f1], ['stl', 'STL', f1], ['blk', 'BLK', f1], ['to', 'TO', f1], ['fg', 'FG%', pctTxt], ['m3', '3FG%', pctTxt], ['ts', 'TS%', pctTxt], ['gp', 'Games', v => v]];
  return (
    <div className="card" id="h2h">
      <div className="h2h-head">
        <div className="side"><Avatar id={a} /><select id="h-a" aria-label="First player" value={a} onChange={e => pick(0, e.target.value)}>{pickable.map(id => <option key={id} value={id}>{P(id).name}</option>)}</select></div>
        <span className="vs">vs</span>
        <div className="side r"><select id="h-b" aria-label="Second player" value={b} onChange={e => pick(1, e.target.value)}>{pickable.map(id => <option key={id} value={id}>{P(id).name}</option>)}</select><Avatar id={b} /></div>
      </div>
      {!A1 || !B1 ? <p className="hint">One of these players has no games in this season.</p> : <H2HRows A1={A1} B1={B1} rowsDef={rowsDef} />}
    </div>
  );
}

function Records({ games }) {
  const starters = new Set(statPlayers());
  const lines = games.flatMap(g => Object.entries(g.rows).filter(([id]) => starters.has(id)).map(([id, c]) => ({ g, id, s: calc(c) })));
  const defs = [['per', 'Best PER'], ['pts', 'Most points'], ['reb', 'Most rebounds'], ['ast', 'Most assists'], ['stl', 'Most steals'], ['blk', 'Most blocks'], ['m3', 'Most threes'], ['to', 'Most turnovers', true]];
  return (
    <div className="recs" id="recs">{defs.map(([k, l, anti]) => {
      const b = lines.reduce((x, y) => y.s[k] > x.s[k] ? y : x);
      return (
        <button key={k} className={`rec${anti ? ' anti' : ''}`} data-g={b.g.id} onClick={() => go('game', { gameId: b.g.id })}><Avatar id={b.id} num={numIn(b.g, b.id)} />
          <span><div className="rl">{l}</div><div className="rn">{P(b.id).name}</div><div className="rg">vs {b.g.opp}, {b.g.season} Game {b.g.no}</div></span>
          <b className={`num${k === 'per' && b.s.per > 0 ? ' great' : ''}`}>{k === 'per' ? perTxt(b.s.per) : b.s[k]}</b></button>
      );
    })}</div>
  );
}

export function Stats() {
  const games = allGames();
  const all = S.sSeason === 'ALL';
  const inSeason = all ? games : games.filter(g => g.season === S.sSeason);
  const label = all ? 'All time' : seasonName(S.sSeason);
  const aggs = statPlayers().map(id => playerAgg(inSeason, id)).filter(Boolean);
  const codes = seasonList().map(s => s.code);
  const head = <div className="ghead"><div><h1 className="page">Stats</h1></div><span className="grow" />
    <SeasonPick id="s-chips" value={S.sSeason} seasons={codes} onPick={v => set({ sSeason: v })} /></div>;
  if (!aggs.length) return <>{head}<EmptyState title={`No ${S.sSeason} stats yet`} text="Leaders, rankings and charts appear here after the first game of the season is recorded." /></>;
  const totals = !!S.sTotals;
  // The team row counts everyone who played, subs included, across the games with stats.
  const teamS = sumRows(inSeason.flatMap(g => Object.values(g.rows)));
  const team = { id: 'team', gp: inSeason.length, s: teamS, pg: k => teamS[k] / inSeason.length };
  const minGP = Math.min(3, Math.max(...aggs.map(a => a.gp))), qual = aggs.filter(a => a.gp >= minGP);
  const pickable = statPlayers();
  // The trend chart starts with the season's top 3 by PER, so a phone isn't a tangle of 7 lines. The chips add more.
  if (!Array.isArray(S.trend)) S.trend = qual.slice().sort((x, y) => y.pg('per') - x.pg('per')).slice(0, 3).map(x => x.id);
  const trend = S.trend.filter(id => pickable.includes(id));
  if (!S.h2h.every(id => pickable.includes(id))) S.h2h = pickable.slice(0, 2);
  const leadTile = (k, l, fmt) => {
    const pool = qual.filter(x => enoughShots(x, k)), b = (pool.length ? pool : qual).reduce((x, y) => aggVal(y, k) > aggVal(x, k) ? y : x);
    return <div className="ltile" key={k} data-op={b.id}><div className="top"><Avatar id={b.id} /><span className="nm">{P(b.id).name}</span></div>
      <b className={`num${k === 'per' ? (aggVal(b, k) >= 0 ? ' pos' : ' neg') : ''}`}>{fmt(aggVal(b, k))}</b><span className="l">{l}</span></div>;
  };
  const togglePlayer = id => set({ trend: trend.includes(id) ? trend.filter(x => x !== id) : [...trend, id].slice(-7) });
  return <>
    {head}
    <div className="sec"><h3>{all ? 'All-time leaders' : label + ' season leaders'}</h3><div className="lgrid">
      {leadTile('per', 'PER', v => perTxt(v, true))}{leadTile('pts', 'Points', f1)}{leadTile('reb', 'Rebounds', f1)}{leadTile('ast', 'Assists', f1)}{leadTile('stl', 'Steals', f1)}{leadTile('ts', 'True shooting', pctTxt)}
    </div></div>

    <div className="sec">
      <div className="phead rhead"><h3>{all ? 'All time' : 'Season'} {totals ? 'totals' : 'averages'}</h3>
        <span className="grow" />
        <div className={`tog${totals ? ' r' : ''}`} id="s-mode" role="group" aria-label="Averages or totals">
          <button data-m="avg" aria-pressed={!totals} onClick={() => totals && set({ sTotals: false })}>Averages</button>
          <button data-m="tot" aria-pressed={totals} onClick={() => !totals && set({ sTotals: true })}>Totals</button></div></div>
      <div id="rank-wrap"><Rankings aggs={aggs} team={team} tot={totals} pctOnly={all} /></div></div>

    <div className="sec"><h3>{all ? 'Season by season' : 'Trend over the season'}</h3>
      <div className="card" id="trend-card"><div className="ctrl"><div className="chips" id="t-players">{pickable.map(id => (
        <button key={id} data-id={id} aria-pressed={trend.includes(id)} onClick={() => togglePlayer(id)}><span className="sw" style={{ background: trend.includes(id) ? SLOT_COL[trend.indexOf(id)] : 'var(--mid)' }} />{P(id).name}</button>))}</div>
        <span className="grow" /><span className="statpick"><label className="sr" htmlFor="t-stat" style={{ fontSize: 13, color: 'var(--granite)' }}>Stat</label>
        <select id="t-stat" value={S.tStat in STATS ? S.tStat : 'per'} onChange={e => set({ tStat: e.target.value })}>{Object.entries(STATS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></span></div>
        <Chart id="trend" draw={w => drawTrend(w, games, { k: S.tStat in STATS ? S.tStat : 'per', ids: trend, season: S.sSeason })} deps={[games, S.tStat, trend.join(), S.sSeason]} /></div></div>

    <div className="sec"><h3>Volume and efficiency</h3><p className="hint">Shots per game against true shooting {all ? 'in all games' : 'in ' + S.sSeason}</p>
      <div className="card"><Chart id="scatter" draw={w => drawScatter(w, qual, openPlayer)} deps={[games, S.sSeason]} /></div></div>

    <div className="two">
      <div className="sec"><h3>Head to head</h3><HeadToHead games={inSeason} pickable={pickable} /></div>
      <div className="sec"><h3>Team stats per game</h3>
        <div className="card"><div className="ctrl"><div className="chips" id="tb-stat">{Object.entries(TB_STATS).map(([k, l]) => <button key={k} data-k={k} aria-pressed={S.tbStat === k} onClick={() => set({ tbStat: k })}>{l}</button>)}</div></div>
          <Chart id="sbars" draw={w => drawSeasonBars(w, games, S.tbStat, S.sSeason)} deps={[games, S.tbStat, S.sSeason, S.h2h.join()]} /></div></div>
    </div>

    <div className="sec"><h3 className="h-ico">{all ? 'All-time records' : S.sSeason + ' records'}<TrophyGold /></h3><p className="hint">Best single-game performances {all ? 'of all time' : 'in ' + S.sSeason}</p><Records games={inSeason} /></div>
  </>;
}
