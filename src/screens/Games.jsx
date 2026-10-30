import { S, set } from '../lib/store.js';
import { allGames, emptyGames, seasonList, seasonName, teamPts, topPer, fmtDate, RES, P, numIn, f1 } from '../lib/core.js';
import { go } from '../lib/nav.js';
import { Avatar } from '../components/Avatar.jsx';
import { ChevRight } from '../components/icons.jsx';
import { PerPill, SeasonPick, MoreBtn, EmptyState } from '../components/ui.jsx';

function SeasonRecord({ games }) {
  const w = games.filter(g => g.result === 'W').length, l = games.filter(g => g.result === 'L').length, d = games.filter(g => g.result === 'D').length;
  const avg = games.reduce((t, g) => t + teamPts(g), 0) / games.length;
  return <>
    {(w + l + d) ? <><span><b>{w}</b> wins</span><span><b>{l}</b> losses</span>{d ? <span><b>{d}</b> draw{d > 1 ? 's' : ''}</span> : null}</> : <span>Results not recorded</span>}
    <span><b>{f1(avg)}</b> points a game</span>
  </>;
}

// Day and full month. On a phone the month drops under the day, so every row lines up the same way.
const DayMonth = ({ d }) => { const [day, month] = fmtDate(d, { day: 'numeric', month: 'long' }).split(' '); return <b><span className="dm">{day}</span> <span className="dm">{month}</span></b>; };

function GameRow({ g }) {
  if (!Object.keys(g.rows).length) return (
    <button className="grow-row nostats" disabled>
      <span className="d"><DayMonth d={g.date} /><span>Game {g.no}</span></span>
      <span className="o"><span className="opp">vs {g.opp}</span></span><span className="res"><span className={`badge ${g.result}`}>{g.result === 'U' ? 'Unknown' : RES[g.result]}</span></span>
      <span className="tp"><span className="ns">No stats recorded</span></span>
      <span className="pts num">–</span>
    </button>
  );
  const t = topPer(g);
  return (
    <button className="grow-row" data-g={g.id} onClick={() => go('game', { gameId: g.id })}>
      <span className="d"><DayMonth d={g.date} /><span>Game {g.no}</span></span>
      <span className="o"><span className="opp">vs {g.opp}</span>{g.live ? <span className="newtag">New</span> : null}</span>
      <span className="res"><span className={`badge ${g.result}`}>{g.result === 'U' ? 'Unknown' : RES[g.result]}</span></span>
      <span className="tp"><Avatar id={t.id} num={numIn(g, t.id)} /><span>{P(t.id).name}</span><PerPill v={t.s.per} /></span>
      <span className="pts num">{teamPts(g)}</span>
      <ChevRight />
    </button>
  );
}

export function Games() {
  const games = allGames();
  const codes = seasonList().map(s => s.code);
  const shown = codes.filter(c => S.gSeason === 'ALL' || c === S.gSeason);
  const toggle = c => {
    const open = !S.gOpen?.[c]; set({ gOpen: { ...S.gOpen, [c]: open } });
    if (!open) requestAnimationFrame(() => document.querySelector(`#games [data-more="${c}"]`)?.closest('.season-block')?.scrollIntoView({ block: 'nearest' }));
  };
  return <>
    <div className="ghead"><div><h1 className="page">Games</h1></div><span className="grow" />
      <SeasonPick id="g-chips" value={S.gSeason} seasons={codes} onPick={v => set({ gSeason: v })} /></div>
    {shown.map(code => {
      const list = games.filter(g => g.season === code).slice().reverse();
      if (!list.length) return null;
      const rowsOf = [...list, ...emptyGames().filter(g => g.season === code)].sort((a, b) => b.no - a.no);
      const open = !!S.gOpen?.[code];
      // On All time, each season shows its latest 3 games until expanded. A single season shows everything.
      const visible = S.gSeason !== 'ALL' || open ? rowsOf : rowsOf.slice(0, 3);
      return (
        <div className="season-block" key={code}>
          <div className="season-h"><span className="code">{code}</span><span className="nm">{seasonName(code)}</span><span className="srec num"><SeasonRecord games={list} /></span></div>
          {visible.map(g => <GameRow key={g.id} g={g} />)}
          {S.gSeason === 'ALL' && rowsOf.length > 3 ? <MoreBtn data-more={code} open={open} n={rowsOf.length} noun="games" onClick={() => toggle(code)} /> : null}
        </div>
      );
    })}
    {shown.some(c => games.some(g => g.season === c)) ? null : <EmptyState title={`No ${S.gSeason} games yet`} text="Games show up here as soon as they are recorded." />}
  </>;
}
