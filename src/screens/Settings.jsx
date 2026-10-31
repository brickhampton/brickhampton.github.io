import { useEffect, useRef, useState } from 'react';
import { S, set, useStore } from '../lib/store.js';
import { allGames, seasonList, seasonName, teamPts, fmtDate, RES, P, calc } from '../lib/core.js';
import { isAdmin, lock, changePin, adminEdit, loadHistory } from '../lib/admin.js';
import { Lock, Shield, Pencil, X } from '../components/icons.jsx';
import { openSheet, closeSheet } from '../components/Sheet.jsx';
import { PinSheet } from '../components/PinSheet.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { SeasonPick, MoreBtn } from '../components/ui.jsx';
import { EditGame, AddGame } from './EditGame.jsx';
import { AvatarSheet } from './AvatarSheet.jsx';
import { randomLook } from '../lib/avatar.js';

const Grip = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></svg>;
const UndoIc = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>;
const nextSeasonCode = () => { const top = S.seasons[0], yy = +top.slice(1); return top[0] === 'S' ? 'W' + String(yy + 1).padStart(2, '0') : 'S' + top.slice(1); };
const ago = t => { const m = Math.round((Date.now() - new Date(t)) / 60e3); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : fmtDate(new Date(t).toISOString().slice(0, 10), { day: 'numeric', month: 'long' }); };
// Players who appeared in the same game can't be merged.
const sharedGames = (a, b) => allGames().filter(g => g.rows[a] && g.rows[b]);
export const errText = e => e.locked ? 'Admin mode locked itself. Unlock it again to make changes.' : e.message;

// A sheet's Save button: runs the change, closes on success, shows the problem otherwise.
export function useSave() {
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const run = async (fn, after) => { setBusy(true); setErr(''); try { const r = await fn(); closeSheet(); after?.(r); } catch (e) { setErr(errText(e)); setBusy(false); } };
  return { err, setErr, busy, run };
}

function ChangePin() {
  const [a, setA] = useState(''), [b, setB] = useState('');
  const { err, setErr, busy, run } = useSave();
  const save = () => {
    if (!/^\d{4}$/.test(a)) return setErr('Use exactly four digits.');
    if (a !== b) return setErr('The two PINs don\'t match.');
    run(() => changePin(a));
  };
  return <>
    <h2>Change PIN</h2><p className="sheet-sub">Four digits. You'll need it next time Admin mode locks.</p>
    <div className="eg-grid two"><div className="field"><label htmlFor="np1">New PIN</label><input id="np1" inputMode="numeric" maxLength={4} autoComplete="off" value={a} onChange={e => { setA(e.target.value); setErr(''); }} /></div>
      <div className="field"><label htmlFor="np2">Type it again</label><input id="np2" inputMode="numeric" maxLength={4} autoComplete="off" value={b} onChange={e => { setB(e.target.value); setErr(''); }} /></div></div>
    {err && <p className="ferr" id="np-err">{err}</p>}
    <div className="actions"><button className="btn ghost" id="np-cancel" onClick={closeSheet}>Cancel</button><button className="btn primary" id="np-save" disabled={busy} onClick={save}>Save PIN</button></div>
  </>;
}

function PlayerSheet({ id }) {
  const starter = S.roster.find(p => p.id === id), sub = S.subs.find(p => p.id === id), p = starter || sub;
  const [name, setName] = useState(p?.name || ''), [num, setNum] = useState(starter ? String(p.num) : ''), [role, setRole] = useState(sub ? 'sub' : 'starter');
  const { err, setErr, busy, run } = useSave();
  const others = [...S.roster, ...S.subs].filter(x => x.id !== id);
  const v = name.trim().toLowerCase(), twin = v ? others.find(x => x.name.toLowerCase() === v) : null;
  const both = twin && p ? sharedGames(id, twin.id) : [];
  const n = p ? allGames().filter(g => g.rows[id]).length : 0;
  const save = () => {
    const nm = name.trim(), no = parseInt(num, 10);
    if (!nm) return setErr('Add a name.');
    if (twin && !p) return setErr(`${twin.name} is already on the roster.`);
    if (twin) {
      if (both.length) return setErr(`${p.name} and ${twin.name} played in the same game, so they can't be merged.`);
      return run(() => adminEdit('merge_player', { p_from: id, p_into: twin.id }));
    }
    if (role === 'starter' && !(no >= 0 && no <= 99)) return setErr('Starters need a jersey number.');
    const clash = role === 'starter' && S.roster.find(x => x.id !== id && x.num === no);
    if (clash) return setErr(`#${no} is already taken by ${clash.name}.`);
    run(() => adminEdit('save_player', { p_player: {
      id: p?.id || 'p' + Date.now().toString(36), name: nm, num: role === 'starter' ? String(no) : '0', role,
      look: p ? undefined : randomLook() } }));
  };
  return <>
    <h2>{p ? 'Edit player' : 'Add player'}</h2><p className="sheet-sub">{p ? 'Changes apply to every game this player played.' : 'New players start with no games, and a random avatar you can change later.'}</p>
    {p && <div className="pp-av"><Avatar id={id} num={sub ? '' : undefined} /><button className="btn ghost sm" id="pp-avatar" onClick={() => openSheet(<AvatarSheet id={id} />, { wide: true })}>Edit avatar</button></div>}
    <div className="eg-grid two"><div className="field"><label htmlFor="pp-name">Name</label><input id="pp-name" value={name} placeholder="Name" autoComplete="off" onChange={e => { setName(e.target.value); setErr(''); }} /></div>
      <div className="field"><label htmlFor="pp-num">Jersey number</label><input id="pp-num" inputMode="numeric" value={role === 'sub' ? '' : num} disabled={role === 'sub'} placeholder={role === 'sub' ? 'Subs wear 0 or 00' : 'Number'} onChange={e => { setNum(e.target.value); setErr(''); }} /></div></div>
    <div className="field"><label>Role</label><div className="rseg big" id="pp-role">{[['starter', 'Starter'], ['sub', 'Sub']].map(([k, l]) => <button key={k} data-v={k} aria-pressed={role === k} onClick={() => setRole(k)}>{l}</button>)}</div></div>
    {twin && p && <p className="hint" id="pp-note">{both.length
      ? `${twin.name} already exists, but they both played ${both.slice(0, 2).map(g => `${g.season} Game ${g.no}`).join(' and ')}${both.length > 2 ? ` and ${both.length - 2} other game${both.length > 3 ? 's' : ''}` : ''}, so they're different people. Pick another name.`
      : `${twin.name} already exists. Saving merges ${p.name}'s ${n} game${n === 1 ? '' : 's'} into ${twin.name}, and ${p.name} is removed.`}</p>}
    {err && <p className="ferr" id="pp-err">{err}</p>}
    <div className="actions"><button className="btn ghost" id="pp-cancel" onClick={closeSheet}>Cancel</button>
      <button className="btn primary" id="pp-save" disabled={busy || both.length > 0} onClick={save}>{twin && p && !both.length ? 'Merge players' : p ? 'Save' : 'Add player'}</button></div>
  </>;
}

function TeamSheet({ existing }) {
  const cur = S.current, list = S.opps[cur] || [];
  const [name, setName] = useState('');
  const { err, setErr, busy, run } = useSave();
  const ref = useRef(null);
  useEffect(() => { setTimeout(() => ref.current?.focus(), 50); }, []);
  const v = name.trim().toLowerCase(), m = v ? existing.find(o => o.toLowerCase() === v) : null, inCur = m && list.includes(m);
  const save = () => {
    const nm = m || name.trim();
    if (!nm) return setErr('Add a team name.');
    if (list.includes(nm)) return;
    run(() => adminEdit('set_season_opponents', { p_season: cur, p_names: [...list, nm], p_text: `Added ${nm} to ${cur}` }));
  };
  return <>
    <h2>Add team</h2><p className="sheet-sub">Adds a team to {seasonName(cur)}, so it shows in the opponent list when you record a game.</p>
    <div className="field"><label htmlFor="tm-name">Team name</label><input id="tm-name" ref={ref} placeholder="Team name" autoComplete="off" value={name}
      onChange={e => { setName(e.target.value); setErr(''); }} onKeyDown={e => { if (e.key === 'Enter') save(); }} /></div>
    {m && <p className="hint" id="tm-note" style={{ marginTop: 10 }}>{inCur ? `${m} is already in ${cur}.` : `${m} is already a team, so it moves into ${cur} with its history.`}</p>}
    {err && <p className="ferr" id="tm-err">{err}</p>}
    <div className="actions"><button className="btn ghost" id="tm-cancel" onClick={closeSheet}>Cancel</button><button className="btn primary" id="tm-save" disabled={busy || !!inCur} onClick={save}>Add team</button></div>
  </>;
}

function OppSheet({ name, existing }) {
  const [v, setV] = useState(name);
  const { err, busy, run } = useSave();
  const t = v.trim();
  const save = () => { if (!t || t === name) return closeSheet(); run(() => adminEdit('rename_opponent', { p_old: name, p_new: t })); };
  return <>
    <h2>Rename opponent</h2><p className="sheet-sub">Updates every game against {name}.</p>
    <div className="field"><label htmlFor="op-name">Team name</label><input id="op-name" value={v} autoComplete="off" list="op-list" onChange={e => setV(e.target.value)} />
      <datalist id="op-list">{existing.filter(o => o !== name).map(o => <option key={o} value={o} />)}</datalist></div>
    <p className="hint" id="op-note" style={{ marginTop: 10 }}>{t !== name && existing.includes(t) ? `${t} already exists, so these games will merge into it.` : ''}</p>
    {err && <p className="ferr">{err}</p>}
    <div className="actions"><button className="btn ghost" id="op-cancel" onClick={closeSheet}>Cancel</button><button className="btn primary" id="op-save" disabled={busy} onClick={save}>Save</button></div>
  </>;
}

// Drag rows by their grip, within a list or across lists. onDrop gets each list's row order and the moved key.
function useDragSort(refs, onDrop, deps) {
  useEffect(() => {
    const lists = refs.map(r => r.current).filter(Boolean), offs = [];
    lists.forEach(list => list.querySelectorAll('.drow').forEach(row => {
      const grip = row.querySelector('.dgrip');
      const down = e => {
        if (e.button) return; e.preventDefault();
        // Listen on window: moving the row in the DOM would drop pointer capture on the grip.
        const pid = e.pointerId, grabDy = e.clientY - row.getBoundingClientRect().top, home = row.parentNode, next = row.nextSibling;
        row.classList.add('dragging'); lists.forEach(l => l.classList.add('drop-on'));
        const place = y => { row.style.transform = ''; row.style.transform = `translateY(${y - grabDy - row.getBoundingClientRect().top}px)`; };
        const move = ev => {
          if (ev.pointerId !== pid) return; ev.preventDefault();
          const y = ev.clientY, target = lists.find(l => { const r = l.getBoundingClientRect(); return y >= r.top - 14 && y <= r.bottom + 14; });
          if (target) {
            const rows = [...target.querySelectorAll('.drow')].filter(r => r !== row);
            const before = rows.find(r => { const b = r.getBoundingClientRect(); return y < b.top + b.height / 2; }) || null;
            if (row.parentNode !== target || row.nextElementSibling !== before) target.insertBefore(row, before);
            lists.forEach(l => l.querySelectorAll('.hempty').forEach(h => { h.hidden = l.querySelector('.drow') !== null; }));
            lists.forEach(l => l.classList.toggle('drop-here', l === target && l !== list));
          }
          place(y);
        };
        const up = ev => {
          if (ev.pointerId !== pid) return;
          removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
          row.classList.remove('dragging'); row.style.transform = ''; lists.forEach(l => l.classList.remove('drop-on', 'drop-here'));
          const order = lists.map(l => [...l.querySelectorAll('.drow')].map(r => r.dataset.key));
          // Put the row back where React left it; the saved order then re-renders the lists.
          home.insertBefore(row, next);
          lists.forEach(l => l.querySelectorAll('.hempty').forEach(h => { h.hidden = false; }));
          onDrop(order, row.dataset.key);
        };
        addEventListener('pointermove', move, { passive: false }); addEventListener('pointerup', up); addEventListener('pointercancel', up);
      };
      grip.addEventListener('pointerdown', down);
      offs.push(() => grip.removeEventListener('pointerdown', down));
    }));
    return () => offs.forEach(f => f());
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

function Admin() {
  const s = useStore();
  const [open, setOpen] = useState({ subs: false, opps: false });
  const [err, setErr] = useState('');
  const cur = useRef(null), oth = useRef(null);
  useEffect(() => { loadHistory(); }, [s.games, s.roster, s.subs, s.opps, s.seasons, s.current]);
  const edit = async (fn, args) => { setErr(''); try { await adminEdit(fn, args); } catch (e) { setErr(errText(e)); } };
  const all = s.games, aRes = s.seasons.includes(s.aRes) ? s.aRes : s.current;

  // Seasons
  const seasons = seasonList().map(({ code }) => {
    const n = all.filter(g => g.season === code).length;
    return <div className="arow" key={code}><b className="code">{code}</b><span className="nm">{seasonName(code)}</span><span className="meta">{n} game{n === 1 ? '' : 's'}</span>
      {code === s.current ? <span className="tag cur">Current</span> : <button className="btn ghost sm" data-cur={code} onClick={() => { set({ gSeason: code, sSeason: code, aRes: code }); edit('set_current_season', { p_code: code }); }}>Make current</button>}
      {!n && code !== s.current && <button className="iconbtn sm" data-rm-season={code} aria-label={`Remove ${code}`} onClick={() => edit('remove_season', { p_code: code })}><X width="16" height="16" /></button>}</div>;
  });

  // Results
  const rs = all.filter(g => g.season === aRes).sort((a, b) => b.no - a.no);

  // Roster
  const gp = id => all.filter(g => g.rows[id]).length;
  const lastIn = id => Math.max(0, ...all.filter(g => g.rows[id]).map(g => +new Date(g.date)));
  // Subs: newest first (just-added ones with no games on top), then by their latest game.
  const subs = s.subs.map((p, i) => ({ p, i, t: gp(p.id) ? lastIn(p.id) : Infinity })).sort((a, b) => b.t - a.t || a.i - b.i).map(x => x.p);
  const prow = (p, role) => <div className="arow" key={p.id}><button className="av-btn" data-avatar={p.id} aria-label={`Edit ${p.name}'s avatar`} onClick={() => openSheet(<AvatarSheet id={p.id} />, { wide: true })}><Avatar id={p.id} num={role === 'sub' ? '' : undefined} /></button><span className="nm">{p.name}</span><span className="meta">{role === 'starter' ? '#' + p.num : gp(p.id) + ' GP'}</span>
    <button className="iconbtn sm" data-player={p.id} aria-label={`Edit ${p.name}`} onClick={() => openSheet(<PlayerSheet id={p.id} />)}><Pencil width="16" height="16" /></button></div>;

  // Opponents: the current season's list (its order when recording), then every other team by most recent game.
  const oc = {}; all.forEach(g => { oc[g.opp] = (oc[g.opp] || 0) + 1; });
  Object.values(s.opps).flat().forEach(o => { oc[o] ||= 0; });
  const curTeams = (s.opps[s.current] || []).slice();
  const lastVs = o => Math.max(0, ...all.filter(g => g.opp === o).map(g => +new Date(g.date)));
  const others = Object.keys(oc).filter(o => !curTeams.includes(o)).sort((a, b) => lastVs(b) - lastVs(a) || a.localeCompare(b));
  const orow = o => <div className="arow drow" data-key={o} key={o}><span className="dgrip" aria-hidden="true"><Grip /></span><span className="nm">{o}</span><span className="meta">{oc[o]} game{oc[o] === 1 ? '' : 's'}</span>
    <button className="iconbtn sm" data-opp={o} aria-label={`Rename ${o}`} onClick={() => openSheet(<OppSheet name={o} existing={Object.keys(oc)} />)}><Pencil width="16" height="16" /></button></div>;
  const shownOthers = open.opps ? others : others.slice(0, 5);
  useDragSort([cur, oth], ([keys], key) => {
    if (keys.join('|') === curTeams.join('|')) return;
    const moved = curTeams.includes(key) !== keys.includes(key);
    edit('set_season_opponents', { p_season: s.current, p_names: keys, p_text: moved ? (keys.includes(key) ? `Added ${key} to ${s.current}` : `Took ${key} out of ${s.current}`) : `Reordered ${s.current} opponents` });
  }, [curTeams.join('|'), shownOthers.join('|')]);

  const h = s.aHist || [];
  return <>
    <div className="ghead"><div><h1 className="page">Settings</h1></div><span className="grow" />
      <span className="admin-on"><Shield />Admin mode on</span><button className="btn ghost sm" id="lock" onClick={lock}><Lock size={16} />Lock</button></div>
    <p className="hint top">Admin mode locks itself after 15 minutes without a tap. To change a game's details or box score, open the game and tap <b>Edit game</b>, or use the pencil in Results</p>
    {err && <p className="ferr" id="a-err">{err}</p>}
    <div className="adm-grid">
      <div className="sec"><h3>Seasons</h3><p className="hint">New games go into the current season, and Games and Stats open on it</p>
        <div className="card alist" id="a-seasons">{seasons}
          <div className="arow"><button className="btn sm" id="a-add-season" onClick={() => edit('add_season', {})}>+ Add {nextSeasonCode()} ({seasonName(nextSeasonCode())})</button></div></div></div>
      <div className="sec"><h3>Change history</h3><p className="hint">Every Admin edit, newest first</p>
        <div className="card" id="a-hist">{h.length ? <ul className="hist">{h.map((x, i) => <li key={i}><span>{x.text}</span><em>{ago(x.at)}</em></li>)}</ul> : <div className="hempty">No changes yet.</div>}
          <div className="btnrow"><button className="btn ghost sm" id="a-undo" disabled={!h.length} onClick={() => edit('undo_last', {})}><UndoIc />Undo last change</button></div></div></div>
      <div className="sec wide"><h3>Results</h3><p className="hint">Tap W, L or D for each game. The dash means unknown. Games nobody kept stats for can be added at the bottom</p>
        <div className="card"><SeasonPick id="a-res-chips" value={aRes} seasons={s.seasons} all={null} onPick={v => set({ aRes: v })} />
          <div className="alist" id="a-results">{rs.length ? rs.map(g => (
            <div className="arow rrow" key={g.id}><span className="g">Game {g.no}</span><span className="nm">vs {g.opp}<em>{fmtDate(g.date, { day: 'numeric', month: 'long' })}</em></span>
              <span className="meta">{Object.keys(g.rows).length ? teamPts(g) + (g.oppPts != null ? '–' + g.oppPts : '') : 'no stats'}</span>
              <span className="rseg">{['W', 'L', 'D', 'U'].map(r => <button key={r} data-id={g.id} data-r={r} aria-pressed={g.result === r} aria-label={RES[r]}
                onClick={() => g.result !== r && edit('set_result', { p_game: g.id, p_result: r })}>{r === 'U' ? '–' : r}</button>)}</span>
              <button className="iconbtn sm" data-edit={g.id} aria-label={`Edit Game ${g.no}`} onClick={() => openSheet(<EditGame id={g.id} />, { wide: true })}><Pencil width="16" height="16" /></button></div>))
            : <div className="hempty">No {aRes} games yet.</div>}
            <div className="arow"><button className="btn sm" id="a-add-game" onClick={() => openSheet(<AddGame season={aRes} />, { wide: true })}>+ Add a game without stats</button></div></div></div></div>
      <div className="sec"><h3>Roster</h3><p className="hint">Starters show on Who played and in Stats. Subs only appear in the games they played. Tap an avatar to change it. Renaming a player to an existing player's name merges them</p>
        <div className="card alist" id="a-roster"><div className="sub-h">Starters</div>{s.roster.map(p => prow(p, 'starter'))}
          <div className="sub-h">Subs</div>{(open.subs ? subs : subs.slice(0, 5)).map(p => prow(p, 'sub'))}
          {subs.length > 5 && <div className="arow amore"><MoreBtn data-amore="subs" open={open.subs} n={subs.length} noun="subs" onClick={() => setOpen(o => ({ ...o, subs: !o.subs }))} /></div>}
          <div className="arow"><button className="btn sm" id="a-add-player" onClick={() => openSheet(<PlayerSheet id={null} />)}>+ Add player</button></div></div></div>
      <div className="sec"><h3>Opponents</h3><p className="hint">This season's teams come first, in the order they appear when you record a game. Drag to reorder, or drag between sections to add or remove a team from this season. Renaming to an existing team merges them</p>
        <div className="card alist" id="a-opps"><div className="sub-h">This season ({s.current})</div>
          <div className="dlist" id="a-opps-cur" ref={cur}>{curTeams.map(orow)}{!curTeams.length && <div className="hempty">No teams in {s.current} yet. Drag one up here or add a team.</div>}</div>
          <div className="sub-h">Other teams</div>
          <div className="dlist" id="a-opps-oth" ref={oth}>{shownOthers.map(orow)}{!others.length && <div className="hempty">Drag a team here to take it out of this season.</div>}</div>
          {others.length > 5 && <div className="arow amore"><MoreBtn data-amore="opps" open={open.opps} n={others.length} noun="teams" onClick={() => setOpen(o => ({ ...o, opps: !o.opps }))} /></div>}
          <div className="arow"><button className="btn sm" id="a-add-team" onClick={() => openSheet(<TeamSheet existing={Object.keys(oc)} />)}>+ Add team</button></div></div></div>
      <div className="sec wide"><h3>Backup and PIN</h3><div className="card btnrow"><button className="btn" id="a-csv" onClick={exportCsv}>Download all stats (CSV)</button>
        <button className="btn ghost" id="a-pin" onClick={() => openSheet(<ChangePin />)}>Change PIN</button></div></div>
    </div>
  </>;
}

// Every box score line as one spreadsheet, for a backup outside the database.
function exportCsv() {
  const head = ['Season', 'Game', 'Date', 'Opponent', 'Result', 'Opponent PTS', 'Player', 'PER', 'PTS', 'REB', 'OREB', 'DREB', 'AST', 'STL', 'BLK', 'TO', '2FGM', '2FGA', '3FGM', '3FGA', 'FTM', 'FTA', 'TSA', 'TS%'];
  const q = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v;
  const lines = [head];
  for (const g of allGames()) for (const [id, c] of Object.entries(g.rows)) {
    const st = calc(c);
    lines.push([g.season, g.no, g.date, g.opp, g.result === 'U' ? '' : RES[g.result], g.oppPts ?? '', P(id)?.name ?? id, st.per.toFixed(2), st.pts, st.reb, st.oreb ?? '', st.dreb ?? '', st.ast, st.stl, st.blk, st.to, st.m2, st.a2, st.m3, st.a3, st.ftm, st.fta, st.tsa.toFixed(2), st.ts === null ? '' : Math.round(st.ts * 100) + '%']);
  }
  const url = URL.createObjectURL(new Blob([lines.map(l => l.map(q).join(',')).join('\n')], { type: 'text/csv' }));
  const a = document.createElement('a'); a.href = url; a.download = 'brickhampton-stats.csv'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Admin mode unlocks here with the PIN.
export function Settings() {
  useStore();
  if (!isAdmin()) return <>
    <div className="ghead"><div><h1 className="page">Settings</h1></div></div>
    <div className="card admin-lock"><div className="lock-ic"><Lock /></div>
      <div><h3>Admin mode</h3><p className="hint">Record games, edit past games and box scores, set results, add seasons, and manage the roster and opponents</p></div>
      <button className="btn primary" id="unlock" onClick={() => openSheet(<PinSheet />)}>Unlock with PIN</button></div>
  </>;
  return <Admin />;
}
