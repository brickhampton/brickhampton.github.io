import { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { S } from '../lib/store.js';
import { seasonList, seasonName, lastNo, isStarter, P } from '../lib/core.js';
import { rec, change, setupPlayers, syncPlaying, newSub, addSubs, subNumbers, todayIso, clearRecording } from '../lib/record.js';
import { adminCall } from '../lib/admin.js';
import { go } from '../lib/nav.js';
import { Avatar } from '../components/Avatar.jsx';
import { ChevDown, ChevUp, Pencil, X } from '../components/icons.jsx';
import { openSheet, closeSheet } from '../components/Sheet.jsx';

const Warn = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg>;
const Tick = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>;
// Starters' star: small, very rounded, solid light blue, in the same white bubble as the subs' tick.
const Star = () => <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path transform="translate(12 11.6) scale(.8) translate(-12 -11.6)" d="m12 2.8 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" fill="#5b86ff" stroke="#5b86ff" strokeWidth="5" strokeLinejoin="round" /></svg>;

// Opponents are kept per season and picked from a list.
function Opponents({ season }) {
  const [list, setList] = useState((S.opps[season] || []).slice());
  const [v, setV] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const done = async () => {
    setBusy(true);
    try {
      await adminCall('set_season_opponents', { p_season: season, p_names: list });
      S.opps = { ...S.opps, [season]: list };
      change(r => { if (!list.includes(r.game.opp)) r.game.opp = list[0] || ''; });
      closeSheet();
    } catch (e) { setErr(e.message); setBusy(false); }
  };
  const add = e => { e.preventDefault(); const t = v.trim(); if (t && !list.includes(t)) { setList([...list, t]); change(r => { r.game.opp = t; }); } setV(''); };
  return <>
    <h2>Opponents in {season}</h2><p className="sheet-sub">These teams show in the opponent list for {seasonName(season)}.</p>
    <ul className="opp-list" id="opp-list">{list.length ? list.map((o, i) => <li key={o}><span>{o}</span><button aria-label={`Remove ${o}`} onClick={() => setList(list.filter((_, j) => j !== i))}><X /></button></li>)
      : <li><span style={{ color: 'var(--granite)' }}>No opponents yet.</span></li>}</ul>
    <form className="opp-add" id="opp-add" onSubmit={add}><input id="opp-new" placeholder="Add a team, e.g. Net Gains" autoComplete="off" value={v} onChange={e => setV(e.target.value)} /><button className="btn primary" type="submit">Add</button></form>
    {err && <p className="ferr">{err}</p>}
    <div className="actions"><button className="btn primary" id="opp-done" disabled={busy} onClick={done}>Done</button></div>
  </>;
}

const Search = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;

// How many games each sub has played, and their latest one, newest first.
function subHistory() {
  const rank = c => S.seasons.length - S.seasons.indexOf(c), h = {};
  for (const g of S.games) for (const id of Object.keys(g.rows)) if (!isStarter(id)) {
    const e = h[id] ||= { n: 0, last: null, k: 0 }, k = rank(g.season) * 100 + g.no;
    e.n++; if (k > e.k) Object.assign(e, { k, last: g });
  }
  return h;
}

// Add subs: pick from everyone who has subbed before, or make a new one.
export function SubPicker({ initial = [], making: makeOpen = false, query = '' }) {
  const R = rec();
  const [picked, setPicked] = useState(initial);
  const [q, setQ] = useState(query);
  const [making, setMaking] = useState(makeOpen);
  const [name, setName] = useState(''), [num, setNum] = useState('');
  const [fresh, setFresh] = useState([]);
  const hist = subHistory();
  const list = S.subs.slice().sort((a, b) => fresh.includes(b.id) - fresh.includes(a.id) || (hist[b.id]?.k || 0) - (hist[a.id]?.k || 0) || a.name.localeCompare(b.name));
  const t = q.trim().toLowerCase();
  const shown = list.filter(p => !t || p.name.toLowerCase().includes(t));
  const flip = id => setPicked(picked.includes(id) ? picked.filter(x => x !== id) : [...picked, id]);
  const create = e => { e.preventDefault(); const n = name.trim(); if (!n) return; const p = newSub(n, num.trim()); setFresh([p.id, ...fresh]); setPicked([...picked, p.id]); setName(''); setNum(''); setMaking(false); setQ(''); };
  const meta = p => R.todaySubs.includes(p.id) ? 'In this game' : fresh.includes(p.id) ? 'New sub' : hist[p.id] ? `${hist[p.id].n} game${hist[p.id].n > 1 ? 's' : ''} · ${hist[p.id].last.season} G${hist[p.id].last.no}` : 'No games yet';
  const k = picked.length;
  return <div className="subpick">
    <button className="xbtn" type="button" aria-label="Close" onClick={closeSheet}><X width="18" height="18" /></button>
    <h2>Add subs</h2><p className="sheet-sub">Tap everyone who subbed in today, or add someone new.</p>
    <div className="subtools">
      <label className="subsearch"><Search /><input placeholder="Search subs" autoComplete="off" value={q} onChange={e => setQ(e.target.value)} /></label>
      {!making && <button className="btn pill" type="button" onClick={() => setMaking(true)}><span className="pplus">+</span>New sub</button>}
    </div>
    {making && <form className="newsub" onSubmit={create}>
      <div className="newsub-h"><b>New sub</b><span>They’ll be saved to the subs list for next time.</span></div>
      <div className="newsub-row">
        <input placeholder="Name" autoFocus required autoComplete="off" value={name} onChange={e => setName(e.target.value)} />
        <input className="nnum" placeholder="Jersey number" inputMode="numeric" value={num} onChange={e => setNum(e.target.value)} />
        <button className="btn primary pill" type="submit">Add</button>
        <button className="btn pill" type="button" onClick={() => setMaking(false)}>Cancel</button>
      </div>
    </form>}
    <div className="subgrid">
      {shown.map(p => {
        const inGame = R.todaySubs.includes(p.id), on = inGame || picked.includes(p.id);
        return <button key={p.id} type="button" className={`subcard${inGame ? ' in' : ''}`} aria-pressed={on} disabled={inGame} onClick={() => flip(p.id)}>
          <Avatar id={p.id} /><span className="sc-t"><span className="nm">{p.name}</span><span className={`meta${fresh.includes(p.id) ? ' new' : ''}`}>{meta(p)}</span></span>
          <span className="tick"><Tick /></span>
        </button>;
      })}
      {!shown.length && <div className="subnone">No subs called “{q.trim()}”. <button type="button" onClick={() => { setName(q.trim()); setMaking(true); }}>Add them as a new sub</button></div>}
    </div>
    <div className="actions subacts">
      <button className="btn pill" type="button" onClick={closeSheet}>Cancel</button>
      <button className="btn primary pill" type="button" disabled={!k} onClick={() => { addSubs(picked); closeSheet(); }}>{k ? `Add ${k} sub${k > 1 ? 's' : ''}` : 'Pick a sub'}</button>
    </div>
  </div>;
}

export const startRecording = () => {
  change(r => { syncPlaying(); if (!r.game.opp) r.game.opp = 'Opponent'; if (!r.playing.includes(r.sel)) r.sel = null; r.nums = subNumbers(); });
  closeSheet(); go('entry');
};

function startWarning() {
  const R = rec(), { season, no } = R.game, last = lastNo(season), next = last + 1;
  const exists = S.games.some(g => g.season === season && g.no === no);
  if (no <= next && !exists) return startRecording();
  const fix = () => { change(r => { r.game.no = next; }); startRecording(); };
  openSheet(<>
    <button className="xbtn" id="w-close" type="button" aria-label="Close" onClick={closeSheet}><X width="18" height="18" /></button>
    {exists ? <>
      <div className="warn"><Warn /><div><h2>{season} Game {no} already has stats</h2><p className="sheet-sub">Recorded games can't be overwritten. To change them, use Edit game in Admin mode. The next new game in {season} is Game {next}.</p></div></div>
      <div className="actions"><button className="btn ghost" id="w-back" onClick={closeSheet}>Go back</button><button className="btn primary" id="w-fix" onClick={fix}>Record Game {next} instead</button></div>
    </> : <>
      <div className="warn"><Warn /><div><h2>Game {no} skips ahead</h2><p className="sheet-sub">{last ? `The last ${season} game played is Game ${last}, so the next one should be Game ${next}.` : `No ${season} games have been played yet, so this should be Game 1.`}</p></div></div>
      <div className="actions"><button className="btn ghost" id="w-keep" onClick={startRecording}>Record Game {no} anyway</button><button className="btn primary" id="w-fix" onClick={fix}>Record Game {next} instead</button></div>
    </>}
  </>);
}

// Hold a starter's tile for a moment, then drag it to a new spot. A quick swipe still scrolls the page.
function useTileDrag(grid) {
  const suppress = useRef(false);
  useLayoutEffect(() => {
    const el = grid.current; if (!el) return;
    let tile = null, id = null, timer = null, dragging = false, sx = 0, sy = 0, gx = 0, gy = 0;
    const place = (x, y) => { tile.style.transform = ''; const b = tile.getBoundingClientRect(); tile.style.transform = `translate(${x - gx - b.left}px, ${y - gy - b.top}px) scale(1.06)`; };
    const begin = (t, x, y) => {
      tile = t; id = t.dataset.id; sx = x; sy = y; clearTimeout(timer);
      timer = setTimeout(() => {
        dragging = true; const r = tile.getBoundingClientRect(); gx = sx - r.left; gy = sy - r.top;
        tile.classList.add('lift'); tile.style.transform = 'scale(1.06)'; try { navigator.vibrate?.(12); } catch (e) { /* ignore */ }
      }, 300);
    };
    const moveTo = (x, y) => {
      if (!tile) return false;
      if (!dragging) { if (Math.hypot(x - sx, y - sy) > 8) clearTimeout(timer); return false; }
      const over = document.elementsFromPoint(x, y).map(n => n.closest?.('.ptile[data-id]:not(.sub)')).find(t => t && t !== tile);
      if (over) {
        const R = rec(), order = R.order.slice(), from = order.indexOf(id), to = order.indexOf(over.dataset.id);
        if (from >= 0 && to >= 0) { order.splice(from, 1); order.splice(to, 0, id); flushSync(() => change(r => { r.order = order; syncPlaying(); })); }
      }
      place(x, y);
      return true;
    };
    const end = () => {
      clearTimeout(timer); if (!tile) return; const t = tile; tile = null; if (!dragging) return; dragging = false;
      t.classList.remove('lift'); t.style.transform = ''; suppress.current = true; setTimeout(() => suppress.current = false, 80);
    };
    const target = e => e.target.closest?.('.ptile[data-id]:not(.sub)');
    const ts = e => { const t = target(e); if (t) begin(t, e.touches[0].clientX, e.touches[0].clientY); };
    const tm = e => { if (moveTo(e.touches[0].clientX, e.touches[0].clientY)) e.preventDefault(); };
    const md = e => {
      const t = target(e); if (!t || e.button) return; begin(t, e.clientX, e.clientY);
      const mm = ev => { if (moveTo(ev.clientX, ev.clientY)) ev.preventDefault(); };
      const mu = () => { removeEventListener('mousemove', mm); removeEventListener('mouseup', mu); end(); };
      addEventListener('mousemove', mm); addEventListener('mouseup', mu);
    };
    const cm = e => { if (target(e)) e.preventDefault(); };
    el.addEventListener('touchstart', ts, { passive: true }); el.addEventListener('touchmove', tm, { passive: false });
    el.addEventListener('touchend', end); el.addEventListener('touchcancel', end); el.addEventListener('mousedown', md); el.addEventListener('contextmenu', cm);
    return () => {
      el.removeEventListener('touchstart', ts); el.removeEventListener('touchmove', tm); el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end); el.removeEventListener('mousedown', md); el.removeEventListener('contextmenu', cm);
    };
  }, [grid]);
  return suppress;
}

export function Setup() {
  const R = rec();
  const [dateErr, setDateErr] = useState(false);
  const grid = useRef(null);
  const suppress = useTileDrag(grid);
  if (!R) return null;
  const g = R.game;
  const opps = S.opps[g.season] || [];
  const n = R.playing.length;
  const setGame = patch => change(r => { r.game = { ...r.game, ...patch }; });
  const toggle = id => { if (suppress.current) return; change(r => { r.playing = r.playing.includes(id) ? r.playing.filter(x => x !== id) : [...r.playing, id]; syncPlaying(); }); };
  return (
    <div className="wrap setup">
      <div>
        <h1 className="page">Who played today?</h1>
        <p className="lede">Every starter is starred. Tap anyone who missed the game to take them out. Add subs picks from past subs or adds a new one, for this game only. Hold a starter and drag them to change the order they appear in.</p>
      </div>
      <div className="fields">
        <div className="field"><label htmlFor="f-season">Season</label>
          <select id="f-season" value={g.season} onChange={e => { const s = e.target.value; setGame({ season: s, no: lastNo(s) + 1, opp: (S.opps[s] || [])[0] || '' }); }}>
            {seasonList().map(({ code }) => <option key={code}>{code}</option>)}</select></div>
        <div className="field"><label id="l-no">Game</label><div className="stepper" role="group" aria-labelledby="l-no">
          <button type="button" id="no-down" aria-label="Previous game number" disabled={g.no <= 1} onClick={() => setGame({ no: Math.max(1, g.no - 1) })}><ChevDown width="18" height="18" /></button>
          <output id="f-no" className="num" aria-live="polite">{g.no}</output>
          <button type="button" id="no-up" aria-label="Next game number" disabled={g.no >= 40} onClick={() => setGame({ no: Math.min(40, g.no + 1) })}><ChevUp width="18" height="18" /></button></div></div>
        <div className="field"><label htmlFor="f-date">Date</label><input id="f-date" type="date" max={todayIso()} value={g.date}
          onChange={e => { let d = e.target.value; const future = d > todayIso(); if (future) d = todayIso(); setDateErr(future); if (d) setGame({ date: d }); }} />
          {dateErr && <span className="ferr" id="date-err">Games can't be in the future.</span>}</div>
        <div className="field"><label htmlFor="f-opp">Opponent</label><div className="oppsel">
          <select id="f-opp" value={opps.includes(g.opp) ? g.opp : ''} onChange={e => setGame({ opp: e.target.value })}>
            {opps.length ? opps.map(o => <option key={o} value={o}>{o}</option>) : <option value="">Add an opponent first</option>}</select>
          <button className="iconbtn" id="edit-opps" type="button" aria-label="Edit opponents" onClick={() => openSheet(<Opponents season={g.season} />)}><Pencil width="18" height="18" /></button></div></div>
      </div>
      <div className="roster" id="roster" ref={grid}>
        {setupPlayers().map(p => {
          const sub = !isStarter(p.id);
          return (
            <button key={p.id} className={`ptile${sub ? ' sub' : ''}`} aria-pressed={R.playing.includes(p.id)} data-id={p.id} onClick={() => toggle(p.id)}>
              <span className={`tick${sub ? '' : ' star'}`} title={sub ? 'Sub' : 'Starter'}>{sub ? <Tick /> : <Star />}</span>
              <Avatar id={p.id} /><span className="nm">{p.name}</span><span className="no">#{String(p.num)}{sub ? ' · Sub' : ''}</span>
            </button>
          );
        })}
        <button className="ptile addtile" id="add" onClick={() => openSheet(<SubPicker />, { cls: 'subs' })}><span className="plus">+</span><span>Add subs</span></button>
      </div>
      <div className="startrow">
        <button className="btn primary" id="start" disabled={!n} onClick={startWarning}>{n ? `Start recording with ${n} player${n > 1 ? 's' : ''}` : 'Tick at least one player'}</button>
        <button className="btn ghost" id="setup-cancel" onClick={() => { if (!R.events.length) clearRecording(); go('games'); }}>Cancel</button>
        <span className="note">Avatars are placeholders.</span>
      </div>
    </div>
  );
}

