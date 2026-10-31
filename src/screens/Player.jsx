import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { S, set } from '../lib/store.js';
import { allGames, seasonList, seasonName, statPlayers, isStarter, playerAgg, calc, ratio, pctTxt, perTxt, tier, f1, ORD, P, numIn, buildTags, playerBadges } from '../lib/core.js';
import { go } from '../lib/nav.js';
import { drawRadar, drawTrend, P_STATS, P_MORE, SLOT_COL, SC_B, reduced } from '../lib/charts.js';
import { Avatar, figure } from '../components/Avatar.jsx';
import { pxShadow, BALL, BALL_C } from '../lib/avatar.js';
import { Back, BIC, MedalGold } from '../components/icons.jsx';
import { Chart, SeasonPick, StatChips, MoreBtn, EmptyState, PerPill } from '../components/ui.jsx';
import { ShootBar } from './Game.jsx';
import { H2HRows } from './Stats.jsx';

// One stat box. When Averages/Totals changes what it shows, it flips over to its new face.
function StatTile({ face, delay }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(face);
  const flipping = useRef(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (face.key === shown.key) return;
    if (reduced || !el) { setShown(face); return; }
    el.getAnimations().forEach(x => x.cancel());
    flipping.current = true;
    el.animate([{ transform: 'perspective(700px) rotateY(0deg)' }, { transform: 'perspective(700px) rotateY(90deg)' }], { duration: 170, delay, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' })
      .onfinish = () => setShown(face);
  }, [face.key]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const el = ref.current;
    if (!flipping.current || !el) return;
    flipping.current = false;
    el.getAnimations().forEach(x => x.cancel());
    el.animate([{ transform: 'perspective(700px) rotateY(-90deg)' }, { transform: 'perspective(700px) rotateY(0deg)' }], { duration: 240, easing: 'cubic-bezier(.2,.8,.3,1.15)', fill: 'forwards' })
      .onfinish = e => e.target.cancel();
  }, [shown]);
  return <div ref={ref} className={`ptile${shown.lead ? ' lead' : ''}`}>{shown.body}</div>;
}

function Badges({ id }) {
  const bs = playerBadges(id);
  const [on, setOn] = useState(null);
  const [n, setN] = useState(0);
  if (!bs.length) return null;
  const sel = bs.find(b => b.key === on);
  return <>
    <div className="pbadges" role="list" aria-label="Badges">{bs.map(b => (
      <button key={b.key} className={`pbadge ${b.tone}`} role="listitem" data-b={b.key} title={b.desc} aria-describedby="pbdesc" aria-pressed={on === b.key}
        onClick={e => { e.stopPropagation(); setOn(on === b.key ? null : b.key); setN(n + 1); }}>{BIC[b.icon]}<span>{b.name}</span></button>))}</div>
    <p className={`pbdesc${sel ? ' show' : ''}`} id="pbdesc" aria-live="polite" key={sel ? n : 'none'}>{sel ? <><b>{sel.name}.</b> {sel.desc}</> : null}</p>
  </>;
}

function SeasonCmp({ id, seasonsPlayed }) {
  if (seasonsPlayed.length < 2) return <EmptyState small title="One season so far" text={`Season comparison opens up once ${P(id).name} has played two seasons.`} />;
  let [a, b] = S.pSc || [];
  if (!seasonsPlayed.includes(a)) a = seasonsPlayed[0];
  if (!seasonsPlayed.includes(b) || b === a) b = seasonsPlayed.find(x => x !== a);
  const games = allGames(), A1 = playerAgg(games.filter(g => g.season === a), id), B1 = playerAgg(games.filter(g => g.season === b), id);
  const rowsDef = [['per', 'PER', x => perTxt(x, true)], ['pts', 'PTS', f1], ['reb', 'REB', f1], ['ast', 'AST', f1], ['stl', 'STL', f1], ['blk', 'BLK', f1], ['to', 'TO', f1], ['fg', 'FG%', pctTxt], ['m3', '3FG%', pctTxt], ['ts', 'TS%', pctTxt]];
  const keep = fn => { const el = document.getElementById('s-player'), st = el.scrollTop; fn(); requestAnimationFrame(() => el.scrollTop = st); };
  return (
    <div className="card scmp"><div className="h2h-head">
      <div className="side"><span className="sdot" style={{ background: SLOT_COL[0] }} /><select id="sc-a" aria-label="First season" value={a} onChange={e => keep(() => set({ pSc: [e.target.value, b === e.target.value ? a : b] }))}>{seasonsPlayed.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
      <span className="vs">vs</span>
      <div className="side r"><select id="sc-b" aria-label="Second season" value={b} onChange={e => keep(() => set({ pSc: [a === e.target.value ? b : a, e.target.value] }))}>{seasonsPlayed.map(c => <option key={c} value={c}>{c}</option>)}</select><span className="sdot" style={{ background: SC_B }} /></div>
    </div><H2HRows A1={A1} B1={B1} rowsDef={rowsDef} /></div>
  );
}

// The big player on the player page, bobbing like the player on the recording court. Every few seconds they bounce the
// ball a few times (or five quick ones), cross it over, or look around. Tapping them gets a
// reaction like the team photo on Home: a bob with each tap, then a random trick after a single tap. Rapid taps
// always smile; a single tap smiles only some of the time.
// Each trick is a few steps: a class that animates it, a pose, how long it lasts, and something to float over their
// head (their last game's PER when it beat their season average, or one of their badges).
const bounces = () => Array.from({ length: 3 + Math.floor(Math.random() * 3) }, () => ['bounce', '', 500]);
const TRICKS = {
  hop: () => [['hop', '', 700]],
  squash: () => [['squash', '', 800]],
  dribble: bounces,
  cross: () => [['bounce', '', 520], ['bounce', 'dribbleL', 520], ['bounce', '', 520], ['bounce', 'dribbleL', 520], ['bounce', '', 520]],
  spin: () => [['spin', 'spin', 2000]],
  behind: () => [['bounce', '', 520], ['behind', 'lowball', 360], ['bounce', 'dribbleL', 520], ['behindR', 'lowball', 360], ['bounce', '', 520]],
  fumble: () => [['fumble', 'down', 750], ['chase', 'down', 600], ['comeback', '', 600]],
  dance: () => [['dance', 'down', 1400]],
  mood: (m) => [['cheer', 'block', 1300, { text: `${m.per} PER`, tone: 'pos' }]],
  badge: (m) => { const b = m.badges[Math.floor(Math.random() * m.badges.length)]; return [['brag', '', 1700, { badge: b }]]; },
  look: () => [['look', '', 1900]],
  quick: () => Array.from({ length: 5 }, () => ['qbounce', '', 300]),
};
const IDLE = ['dribble', 'cross', 'quick', 'dribble', 'cross', 'quick', 'look'], IDLE_ONLY = ['quick', 'look'], RAPID = 320;
// The ball on its own, for when it leaves the player's hands: centred on (0, 0) in the stage's units.
const U = 104 / 34, LOOSE = BALL.map(([o, w], j) => `<rect x="${((o - 3.5) * U).toFixed(2)}" y="${((j - 3) * U).toFixed(2)}" width="${(w * U).toFixed(2)}" height="${U.toFixed(2)}" fill="${BALL_C}"/>`).join('');
function PStage({ p, num, mood }) {
  const [step, setStep] = useState(null), timer = useRef(0), busy = useRef(false), last = useRef(''), taps = useRef({ n: 0, at: 0 });
  const m = useRef(mood); m.current = mood;
  const run = (k, extra = '') => {
    clearTimeout(timer.current); last.current = k; busy.current = true;
    const steps = TRICKS[k](m.current);
    const next = i => {
      if (i === steps.length) { setStep(null); busy.current = false; return; }
      const [cls, pose, ms, fx] = steps[i]; setStep({ cls: cls + extra, pose, fx, n: Date.now() + i });
      timer.current = setTimeout(() => next(i + 1), ms);
    };
    next(0);
  };
  // Idle tricks, now and then, unless the viewer prefers less motion or is playing with the player.
  useEffect(() => {
    if (reduced) return;
    let idle = 0;
    const wait = () => { idle = setTimeout(() => { if (!busy.current) run(IDLE.filter(k => k !== last.current)[Math.floor(Math.random() * (IDLE.length - 1))] || 'dribble'); wait(); }, 4000 + Math.random() * 4000); };
    wait();
    return () => { clearTimeout(idle); clearTimeout(timer.current); };
  }, []);
  // Every tap smiles and bobs; rapid taps keep bobbing, and a single tap is followed by a random trick.
  const tap = () => {
    const t = taps.current, now = performance.now();
    t.n = now - t.at < RAPID * 1.4 ? t.n + 1 : 1; t.at = now;
    clearTimeout(timer.current); busy.current = true;
    const smile = t.n > 1 || Math.random() < .5 ? ' smile' : '';
    setStep({ cls: 'bob' + smile, pose: '', n: now });
    timer.current = setTimeout(() => {
      if (t.n > 1 || reduced) { timer.current = setTimeout(() => { setStep(null); busy.current = false; }, 400); return; }
      const ks = Object.keys(TRICKS).filter(x => x !== last.current && !IDLE_ONLY.includes(x) && (x !== 'badge' || m.current.badges.length) && (x !== 'mood' || m.current.per));
      run(ks[Math.floor(Math.random() * ks.length)], smile);
    }, RAPID);
  };
  const fx = step?.fx;
  return <button className={`pstage alive${step ? ' ' + step.cls : ''}`} id="p-stage" aria-label="Wave hello" onPointerDown={tap} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), tap())}>
    <span className="pglow" />
    <svg className="pfig" viewBox="0 0 100 104" aria-hidden="true" dangerouslySetInnerHTML={{ __html: pxShadow(50, 103.5, 22, 104 / 34) }} />
    <span className="phop" key={step?.n || 0}><svg className="pfig" viewBox="0 0 100 104" aria-hidden="true" dangerouslySetInnerHTML={{ __html: figure({ ...p, num }, { stage: true, pose: step?.pose || undefined }) }} /></span>
    <svg className="pfig ploose" viewBox="0 0 100 104" aria-hidden="true" key={'b' + (step?.n || 0)} dangerouslySetInnerHTML={{ __html: `<g class="pball" shape-rendering="crispEdges">${LOOSE}</g>` }} />
    {fx ? <span key={'f' + step.n} className={`pfloat ${fx.tone || 'brag'}`} aria-hidden="true">{fx.badge ? <>{BIC[fx.badge.icon]}{fx.badge.name}</> : fx.text}</span> : null}
  </button>;
}

export function Player() {
  const games = allGames();
  const id = S.playerId && P(S.playerId) ? S.playerId : statPlayers()[0], p = P(id);
  const mine = games.filter(g => g.rows[id]);
  const backTo = () => S.pFrom === 'game' && S.gameId ? go('game') : go(S.pFrom && S.pFrom !== 'player' ? S.pFrom : 'stats');
  if (!mine.length) return <>
    <div className="gnav"><button className="btn ghost" id="p-back" onClick={backTo}><Back />Back</button></div>
    <h1 className="page pname">{p.name}</h1>
    <EmptyState title="No games yet" text={`${p.name}'s stats, charts and milestones appear here after their first game.`} />
  </>;
  const seasonsPlayed = seasonList().map(s => s.code).filter(c => mine.some(g => g.season === c));
  let scope = S.pScope;
  if (!scope || (scope !== 'ALL' && !seasonsPlayed.includes(scope))) scope = seasonsPlayed.includes(S.current) ? S.current : 'ALL';
  const inScope = scope === 'ALL' ? games : games.filter(g => g.season === scope);
  const list = inScope.filter(g => g.rows[id]);
  const totals = !!S.pTotals, starter = isStarter(id);
  const num = starter ? p.num : numIn(mine[mine.length - 1], id);
  const career = playerAgg(games, id);
  const a = playerAgg(inScope, id);
  const scopeName = scope === 'ALL' ? 'All time' : seasonName(scope);

  // Team comparison set: starters with games in this scope (plus this player if a sub).
  const peers = [...new Set([...statPlayers(), id])].map(x => playerAgg(inScope, x)).filter(Boolean);
  const val = (agg, k, tot) => k === 'gp' ? agg.gp : k === 'ts' ? agg.s.ts : k === 'fg' ? ratio(agg.s.fgm, agg.s.fga) : k === 'p3' ? ratio(agg.s.m3, agg.s.a3) : k === 'ft' ? ratio(agg.s.ftm, agg.s.fta) : tot ? agg.s[k] : agg.pg(k);
  const rankOf = (k, lowerBetter, tot) => {
    if (!starter || peers.length < 2) return 0; const v = val(a, k, tot); if (v === null) return 0;
    return 1 + peers.filter(x => x.id !== id && val(x, k, tot) !== null && (lowerBetter ? val(x, k, tot) < v : val(x, k, tot) > v)).length;
  };

  // The player on the stage celebrates when their latest game's PER beat their own average for that season.
  const lastG = mine[mine.length - 1], lastPer = calc(lastG.rows[id]).per, seasonAvg = playerAgg(games.filter(g => g.season === lastG.season), id).pg('per');
  const mood = { per: lastPer > seasonAvg ? perTxt(lastPer, true) : '', badges: playerBadges(id) };

  // Stat tiles
  const n1 = (v, tot) => tot ? v : f1(v);
  const tiles = [
    ['per', 'PER', (v, tot) => perTxt(v, !tot)], ['pts', 'Points', n1], ['reb', 'Rebounds', n1], ['ast', 'Assists', n1],
    ['stl', 'Steals', n1], ['blk', 'Blocks', n1], ['to', 'Turnovers', n1, true],
    ['fg', 'FG%', pctTxt, false, `${a.s.fgm}/${a.s.fga}`], ['p3', '3FG%', pctTxt, false, `${a.s.m3}/${a.s.a3}`], ['ft', 'FT%', pctTxt, false, `${a.s.ftm}/${a.s.fta}`],
    ['ts', 'TS%', pctTxt, false, `${a.s.tsa.toFixed(1)} TSA`], ['gp', 'Games', v => v],
  ];
  const faceFor = tot => tiles.map(([k, l, fmt, low, sub]) => {
    const v = val(a, k, tot), r = k === 'gp' ? 0 : rankOf(k, low, tot);
    const tcls = k === 'per' ? (v >= 0 ? ' pos' : ' neg') : ['fg', 'p3', 'ft', 'ts'].includes(k) ? ' ' + tier(k === 'p3' ? 'm3' : k, v) : '';
    const txt = v === null ? '–' : fmt(v, tot);
    return {
      key: `${txt}|${r}`, lead: r === 1,
      body: <><span className="l">{l}</span><b className={`num${tcls}`}>{txt}</b><span className="r">{r === 1 ? 'Team best' : r ? ORD(r) : sub ? <span className="num">{sub}</span> : '\u00a0'}</span></>,
    };
  });
  // Only the boxes that show a different number flip, one after another.
  const faces = faceFor(totals), other = faceFor(!totals);
  let flipN = 0;
  const delays = faces.map((f, i) => f.key !== other[i].key ? 40 * flipN++ : 0);

  // Recent form: last 5 games overall
  const last5 = mine.slice(-5);
  const formPer = last5.reduce((t, g) => t + calc(g.rows[id]).per, 0) / (last5.length || 1);
  const formD = formPer - career.pg('per');

  // Points mix
  const p2 = 2 * a.s.m2, p3 = 3 * a.s.m3, pf = a.s.ftm, pt = p2 + p3 + pf || 1;
  const mix = [['2PT', p2, '#4f7cff'], ['3PT', p3, '#9b8cff'], ['FT', pf, '#3fb8c4']];

  // Highs in scope
  const lines = list.map(g => ({ g, s: calc(g.rows[id]) }));
  const highs = [['per', 'Best PER'], ['pts', 'Most points'], ['reb', 'Most rebounds'], ['ast', 'Most assists'], ['stl', 'Most steals'], ['blk', 'Most blocks'], ['m3', 'Most threes'], ['ftm', 'Most free throws']]
    .map(([k, l]) => ({ k, l, b: lines.reduce((x, y) => y.s[k] > x.s[k] ? y : x) }));

  // Career-high trophies in the game log, with the full text on hover
  const TG = buildTags().byGame;
  const logTags = g => { const tags = (TG[g.id]?.[id] || []).filter(t => t.type === 'high'); return tags.length ? <span className="mt high" title={tags.map(t => t.text).join(', ')}>{BIC.trophy}</span> : null; };
  // Game log, newest first, with the player's best in scope highlighted
  const LOGK = ['pts', 'reb', 'ast', 'stl', 'blk'];
  const best = Object.fromEntries(LOGK.map(k => [k, Math.max(...lines.map(l => l.s[k]))]));
  const minTo = Math.min(...lines.map(l => l.s.to));
  const logRows = lines.slice().reverse();
  const shown = S.pLogAll ? logRows : logRows.slice(0, 10);

  const strip = statPlayers().filter(x => games.some(g => g.rows[x]));
  const pcmp = S.pCmp && S.pCmp !== id && peers.some(x => x.id === S.pCmp) ? S.pCmp : 'team';
  const keepScroll = patch => { const el = document.getElementById('s-player'), st = el.scrollTop; set(patch); requestAnimationFrame(() => el.scrollTop = st); };
  const openGame = gid => go('game', { gameId: gid });
  const pStat = S.pStat in P_STATS || S.pStat in P_MORE ? S.pStat : 'per';

  return <>
    <div className="gnav">
      <button className="btn ghost" id="p-back" onClick={backTo}><Back />Back</button>
      <span className="grow" />
      <div className="p-strip" role="list" aria-label="Starters">{strip.map(x => (
        <button key={x} role="listitem" data-pl={x} aria-current={x === id} aria-label={P(x).name} onClick={() => x !== id && go('player', { playerId: x, pScope: S.pScope })}><Avatar id={x} /></button>))}</div>
    </div>

    <div className="phero">
      <div className="pnum" aria-hidden="true">{num}</div>
      <PStage p={p} num={num} mood={mood} />
      <div className="pid"><h1 className="page pname">{p.name}<span className="pno num">#{num}</span></h1><Badges id={id} key={id} /></div>
    </div>

    {last5.length ? <div className="sec"><h3>Recent form</h3>
      <div className="form">{last5.slice().reverse().map(g => {
        const s = calc(g.rows[id]);
        return <button key={g.id} className="fchip" data-g={g.id} title={`${g.opp}, ${g.season} Game ${g.no}`} onClick={() => openGame(g.id)}><span className="fo">{g.opp}<em>{g.season} Game {g.no}</em></span><PerPill v={s.per} /><span className="fs num">{s.pts} PTS<i> · {s.reb} REB · {s.ast} AST</i></span></button>;
      })}</div>
      <p className="fnote">Averaging <b className="num">{perTxt(formPer, true)}</b> PER over the last {last5.length}, <span className={Math.abs(formD) < .5 ? '' : formD > 0 ? 'up' : 'down'}>{Math.abs(formD) < .5 ? 'in line with' : `${perTxt(formD, true).replace('+', '')} ${formD > 0 ? 'above' : 'below'}`}</span> their career average.</p>
    </div> : null}

    <div className="sec">
      <div className="phead"><h3>{scope === 'ALL' ? 'Career' : scopeName}</h3>
        <span className="grow" />
        <div className={`tog${totals ? ' r' : ''}`} id="p-mode" role="group" aria-label="Averages or totals">
          <button data-m="avg" aria-pressed={!totals} onClick={() => totals && set({ pTotals: false })}>Averages</button>
          <button data-m="tot" aria-pressed={totals} onClick={() => !totals && set({ pTotals: true })}>Totals</button></div></div>
      <SeasonPick id="p-scope" className="pscope" value={scope} seasons={seasonsPlayed} onPick={v => keepScroll({ pScope: v, pLogAll: false })} />
      <div className="ptiles">{faces.map((f, i) => <StatTile key={`${id}|${scope}|${tiles[i][0]}`} face={f} delay={delays[i]} />)}</div>
    </div>

    <div className="two">
      <div className="sec"><h3>Skill shape</h3>
        <div className="card"><div className="ctrl"><div className="legend rleg"><span><i style={{ background: '#4f7cff' }} />{p.name}</span><span><i className="dash" />{pcmp === 'team' ? 'Team average' : P(pcmp).name}</span></div>
          <span className="grow" /><select id="p-cmp" aria-label="Compare with" value={pcmp} onChange={e => set({ pCmp: e.target.value })}><option value="team">vs team average</option>{peers.filter(x => x.id !== id).map(x => <option key={x.id} value={x.id}>vs {P(x.id).name}</option>)}</select></div>
          <Chart id="p-radar" draw={w => drawRadar(w, a, peers, pcmp)} deps={[id, scope, pcmp, games]} /></div></div>
      <div className="sec"><h3>Shooting</h3>
        <div className="card pshoot">
          <div className="mixh"><span>Where the points come from</span><b className="num">{a.s.pts} PTS</b></div>
          <div className="mix">{mix.map(([l, v, c]) => v ? <span key={l} style={{ flex: v, background: c }} title={`${l} ${v} points`} /> : null)}</div>
          <div className="legend">{mix.map(([l, v, c]) => <span key={l}><i style={{ background: c }} />{l} <b className="num">{Math.round(v / pt * 100)}%</b></span>)}</div>
          <div className="shoot two-col">
            <ShootBar k="m2" label="2FG" m={`${a.s.m2} of ${a.s.a2}`} a={a.s.a2} v={ratio(a.s.m2, a.s.a2)} />
            <ShootBar k="m3" label="3FG" m={`${a.s.m3} of ${a.s.a3}`} a={a.s.a3} v={ratio(a.s.m3, a.s.a3)} />
            <ShootBar k="ft" label="FT" m={`${a.s.ftm} of ${a.s.fta}`} a={a.s.fta} v={ratio(a.s.ftm, a.s.fta)} />
            <ShootBar k="ts" label="TS%" m={`${a.s.tsa.toFixed(1)} TSA`} a={a.s.tsa} v={a.s.ts} />
          </div>
        </div></div>
    </div>

    <div className="sec"><h3>{scope === 'ALL' ? 'Season by season' : 'Season performance'}</h3>
      <div className="card"><div className="ctrl"><StatChips id="p-stat" main={P_STATS} more={P_MORE} value={pStat} onPick={k => set({ pStat: k })} /></div>
        <Chart id="p-trend" draw={w => drawTrend(w, games, { k: pStat, ids: [id], season: scope, single: true })} deps={[id, scope, pStat, games]} /></div></div>

    <div className="two">
      <div className="sec"><h3>Season vs season</h3><SeasonCmp id={id} seasonsPlayed={seasonsPlayed} /></div>
      <div className="sec"><h3 className="h-ico">{scope === 'ALL' ? 'Career highs' : scope + ' highs'}<MedalGold /></h3><div className="recs one" id="p-highs">
        {highs.map(({ k, l, b }) => <button key={k} className="rec" data-g={b.g.id} onClick={() => openGame(b.g.id)}><span className="rk">{P_STATS[k] || (k === 'm3' ? '3PM' : 'FTM')}</span><span><div className="rl">{l}</div><div className="rg">vs {b.g.opp}, {b.g.season} Game {b.g.no}</div></span><b className={`num${k === 'per' && b.s.per > 0 ? ' great' : ''}`}>{k === 'per' ? perTxt(b.s.per) : b.s[k]}</b></button>)}
      </div></div>
    </div>

    <div className="sec"><h3>Game log</h3>
      <div className="tbl-wrap"><table className="plog"><thead><tr><th>Game</th><th className="c">Result</th><th className="c">PER</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>FG</th><th>3FG</th><th>FT</th><th>TS%</th></tr></thead><tbody>
        {shown.map(({ g, s }) => (
          <tr key={g.id} data-g={g.id} tabIndex={0} onClick={() => openGame(g.id)} onKeyDown={e => e.key === 'Enter' && openGame(g.id)}>
            <td><div className="lg"><b>{g.opp}{logTags(g)}</b><span>{g.season} Game {g.no}</span></div></td>
            <td className="c"><span className={`rdot ${g.result}`}>{g.result === 'U' ? '–' : g.result}</span></td><td className="c"><PerPill v={s.per} /></td>
            {LOGK.map(k => <td key={k}><span className={`n${s[k] === best[k] && s[k] > 0 && lines.length > 1 ? ' hi' : ''}`}>{s[k]}</span></td>)}
            <td><span className={`n${s.to === minTo && lines.length > 1 ? ' hi' : ''}`}>{s.to}</span></td>
            <td className={tier('fg', ratio(s.fgm, s.fga), s.fga) || undefined}>{s.fgm}/{s.fga}</td><td className={tier('m3', ratio(s.m3, s.a3), s.a3) || undefined}>{s.m3}/{s.a3}</td><td className={tier('ft', ratio(s.ftm, s.fta), s.fta) || undefined}>{s.ftm}/{s.fta}</td>
            <td className={tier('ts', s.ts, s.tsa) || undefined}>{pctTxt(s.ts)}</td></tr>))}
      </tbody></table></div>
      {logRows.length > 10 ? <MoreBtn id="p-logmore" open={!!S.pLogAll} n={logRows.length} noun="games" onClick={() => keepScroll({ pLogAll: !S.pLogAll })} /> : null}
    </div>
  </>;
}
