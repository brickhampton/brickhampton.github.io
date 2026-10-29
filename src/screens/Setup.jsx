import { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { S } from '../lib/store.js';
import { seasonList, seasonName, lastNo, isStarter } from '../lib/core.js';
import { rec, change, setupPlayers, syncPlaying, addSub, subNumbers, todayIso, clearRecording } from '../lib/record.js';
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

function AddForm({ onClose }) {
  const [name, setName] = useState(''), [num, setNum] = useState('');
  const ref = useRef(null);
  useLayoutEffect(() => ref.current?.focus(), []);
  const submit = e => { e.preventDefault(); const n = name.trim(); if (!n) return; addSub(n, num.trim()); onClose(); };
  return (
    <div className="ptile addtile"><form className="addform" id="addform" onSubmit={submit}>
      <input id="add-name" ref={ref} placeholder="Name" required autoComplete="off" value={name} onChange={e => setName(e.target.value)} />
      <input id="add-num" placeholder="Jersey number" inputMode="numeric" value={num} onChange={e => setNum(e.target.value)} />
      <button className="btn primary" type="submit">Add sub</button>
      <button className="btn ghost" type="button" id="add-cancel" onClick={onClose}>Cancel</button>
    </form></div>
  );
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
  const [adding, setAdding] = useState(false);
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
        <p className="lede">Every starter is starred. Tap anyone who missed the game to take them out. Add player brings in a sub for this game only. Hold a starter and drag them to change the order they appear in.</p>
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
        {adding ? <AddForm onClose={() => setAdding(false)} />
          : <button className="ptile addtile" id="add" onClick={() => setAdding(true)}><span className="plus">+</span><span>Add player</span></button>}
      </div>
      <div className="startrow">
        <button className="btn primary" id="start" disabled={!n} onClick={startWarning}>{n ? `Start recording with ${n} player${n > 1 ? 's' : ''}` : 'Tick at least one player'}</button>
        <button className="btn ghost" id="setup-cancel" onClick={() => { if (!R.events.length) clearRecording(); go('games'); }}>Cancel</button>
        <span className="note">Avatars are placeholders.</span>
      </div>
    </div>
  );
}

