import { S, set } from '../lib/store.js';
import { allGames, calc, sumRows, ratio, pctTxt, perTxt, tier, f1, fmtDate, RES, P, numIn, perfTags, teamFeat } from '../lib/core.js';
import { go } from '../lib/nav.js';
import { drawGameTrend, GT_STATS, moreFor } from '../lib/charts.js';
import { Avatar } from '../components/Avatar.jsx';
import { BoxScore } from '../components/BoxScore.jsx';
import { Back, Fwd, BIC, Pencil, ShareIcon } from '../components/icons.jsx';
import { isAdmin } from '../lib/admin.js';
import { openSheet } from '../components/Sheet.jsx';
import { EditGame } from './EditGame.jsx';
import { ShareSheet } from '../components/ShareSheet.jsx';
import { Chart, StatChips } from '../components/ui.jsx';

export function ShootBar({ k, label, m, a, v }) {
  const tr = tier(k, v, a).replace('t-', '');
  return (
    <div className={`sbar${tr ? ' ' + tr : ''}`}><div className="h"><span>{label}</span><b className="num">{pctTxt(v)}</b></div>
      <div className="track"><div className="fill" style={{ width: `${v === null ? 0 : Math.min(100, v * 100)}%` }} /></div><span className="m num">{m}</span></div>
  );
}

function Leader({ rows, k, label, fmt = v => v, g, games }) {
  const best = rows.reduce((a, b) => b.s[k] > a.s[k] ? b : a);
  if (k !== 'per' && best.s[k] <= 0) return (
    <div className="lead-card none"><div className="top"><div><div className="ln">Nobody</div><div className="ll">{label}</div></div></div><div className="lbot"><div className="lv num">0</div></div></div>
  );
  return (
    <div className="lead-card">
      <div className="top"><Avatar id={best.id} num={best.num} /><div><div className="ln">{P(best.id).name}</div><div className="ll">{label}</div></div></div>
      <div className="lbot"><div className={`lv num${k === 'per' ? (best.s.per >= 0 ? ' pos' : ' neg') : ''}`}>{fmt(best.s[k])}</div>
        <div className="ltags">{perfTags(g, best.id, k, games).map(t => <span key={t.t} className={`mtag sm ${t.t}`} title={t.title}>{BIC[t.icon]}{t.label}</span>)}</div></div>
    </div>
  );
}

function CmpTile({ label, val, base, lowerBetter, pctMode }) {
  const d = val - base, good = lowerBetter ? d < 0 : d > 0, flat = Math.abs(d) < (pctMode ? .0005 : .05);
  // TS% moves by a tenth of a point; the game's own TS% stays a whole number.
  const txt = pctMode ? (d >= 0 ? '+' : '−') + (Math.abs(d) * 100).toFixed(1) + '%' : (d >= 0 ? '+' : '−') + f1(Math.abs(d));
  return <div><span>{label}</span><b className="num">{pctMode ? pctTxt(val) : val}</b><em className={flat ? 'flat' : good ? 'up' : 'down'}>{flat ? '=' : good ? '▲' : '▼'} {txt}</em></div>;
}

export function Game() {
  const games = allGames();
  let i = games.findIndex(g => g.id === S.gameId);
  if (i < 0) i = games.length - 1;
  const g = games[i], prev = games[i - 1], next = games[i + 1];
  const rows = Object.entries(g.rows).map(([id, c]) => ({ id, c, s: calc(c), num: numIn(g, id) }));
  const t = sumRows(rows.map(r => r.c));
  const seasonGames = games.filter(x => x.season === g.season && x.id !== g.id);
  const feat = teamFeat(g, games);
  let cmp = null;
  if (seasonGames.length) {
    const tots = seasonGames.map(x => sumRows(Object.values(x.rows)));
    const avg = k => tots.reduce((a, b) => a + b[k], 0) / tots.length;
    const tsAvg = tots.reduce((a, b) => a + (b.ts || 0), 0) / tots.length;
    cmp = (
      <div className="sec"><h3>Compared with season average</h3><p className="hint">Team totals this game against the other {seasonGames.length} game{seasonGames.length === 1 ? '' : 's'} in {g.season}</p>
        <div className="cmp">
          <CmpTile label="Points" val={t.pts} base={avg('pts')} /><CmpTile label="Rebounds" val={t.reb} base={avg('reb')} /><CmpTile label="Assists" val={t.ast} base={avg('ast')} />
          <CmpTile label="Steals" val={t.stl} base={avg('stl')} /><CmpTile label="Turnovers" val={t.to} base={avg('to')} lowerBetter /><CmpTile label="TS%" val={t.ts} base={tsAvg} pctMode />
        </div></div>
    );
  }
  const seasonList = games.filter(x => x.season === g.season);
  const more = Object.fromEntries(moreFor(seasonList));
  const stat = S.gtStat in GT_STATS || S.gtStat in more ? S.gtStat : 'pts';
  return <>
    <div className="gnav game-nav">
      <button className="btn ghost" id="g-back" onClick={() => go('games', { gSeason: g.season })}><Back />All games</button>
      {isAdmin() && <button className="btn admin-edit" id="g-edit" onClick={() => openSheet(<EditGame id={g.id} />, { wide: true })}><Pencil width="16" height="16" />Edit game</button>}
      <span className="grow" />
      <div className="pager">
        <button className="btn" id="g-prev" aria-label="Previous game" disabled={!prev} onClick={() => prev && go('game', { gameId: prev.id })}><Back /><span className="nl">Previous</span></button>
        <i aria-hidden="true" />
        <button className="btn" id="g-next" aria-label="Next game" disabled={!next} onClick={() => next && go('game', { gameId: next.id })}><span className="nl">Next</span><Fwd /></button>
      </div>
    </div>
    <div className="jersey">
      <div><div className="team">Brickhampton</div><div className="big num">{t.pts}<small>points</small></div></div>
      <div className="who"><span className="vs">vs {g.opp}</span><span className="when">{g.season}, Game {g.no}, {fmtDate(g.date)}{g.oppPts != null ? ` · Final score ${t.pts}–${g.oppPts}` : ''}</span></div>
      <div className="jres">{feat ? <span className={`tfeat ${feat[0]}`}>{BIC[feat[1]]}{feat[2]}</span> : null}<span className={`badge ${g.result}`}>{RES[g.result]}</span></div>
    </div>
    <div className="sec"><h3>Top performances</h3><div className="leaders">
      <Leader rows={rows} g={g} games={games} k="per" label="Best PER" fmt={v => perTxt(v)} />
      <Leader rows={rows} g={g} games={games} k="pts" label="Most points" />
      <Leader rows={rows} g={g} games={games} k="reb" label="Most rebounds" />
      <Leader rows={rows} g={g} games={games} k="ast" label="Most assists" />
      <Leader rows={rows} g={g} games={games} k="stl" label="Most steals" />
      <Leader rows={rows} g={g} games={games} k="blk" label="Most blocks" />
    </div></div>
    {cmp}
    <div className="sec"><h3>Team shooting</h3><div className="shoot">
      <ShootBar k="fg" label="FG" m={`${t.fgm} of ${t.fga}`} a={t.fga} v={ratio(t.fgm, t.fga)} />
      <ShootBar k="m2" label="2FG" m={`${t.m2} of ${t.a2}`} a={t.a2} v={ratio(t.m2, t.a2)} />
      <ShootBar k="m3" label="3FG" m={`${t.m3} of ${t.a3}`} a={t.a3} v={ratio(t.m3, t.a3)} />
      <ShootBar k="ft" label="FT" m={`${t.ftm} of ${t.fta}`} a={t.fta} v={ratio(t.ftm, t.fta)} />
      <ShootBar k="ts" label="TS%" m={`${t.tsa.toFixed(1)} TSA`} a={t.tsa} v={t.ts} />
    </div></div>
    <div className="sec"><div className="sec-head"><h3>Box score</h3><button className="btn ghost share-btn" id="g-share" onClick={() => openSheet(<ShareSheet g={g} games={games} />, { cls: 'share-panel' })}><ShareIcon />Share</button></div><BoxScore rows={rows} /></div>
    <div className="sec"><h3>{g.season} game by game</h3>
      <div className="card" id="gtrend-card"><div className="ctrl"><StatChips id="gt-stat" main={GT_STATS} more={more} value={stat} onPick={k => set({ gtStat: k })} /></div>
        <Chart id="gtrend" draw={w => drawGameTrend(w, g, games, stat)} deps={[g, games, stat]} /></div></div>
  </>;
}
