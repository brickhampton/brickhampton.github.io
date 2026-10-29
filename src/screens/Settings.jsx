import { useState } from 'react';
import { isAdmin, lock, changePin } from '../lib/admin.js';
import { Lock, Shield } from '../components/icons.jsx';
import { openSheet, closeSheet } from '../components/Sheet.jsx';
import { PinSheet, recordGame } from '../components/PinSheet.jsx';

function ChangePin() {
  const [a, setA] = useState(''), [b, setB] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const save = async () => {
    if (!/^\d{4}$/.test(a)) return setErr('Use exactly four digits.');
    if (a !== b) return setErr('The two PINs don\'t match.');
    setBusy(true);
    try { await changePin(a); closeSheet(); } catch (e) { setErr(e.message); setBusy(false); }
  };
  return <>
    <h2>Change PIN</h2><p className="sheet-sub">Four digits. You'll need it next time Admin mode locks.</p>
    <div className="eg-grid two"><div className="field"><label htmlFor="np1">New PIN</label><input id="np1" inputMode="numeric" maxLength={4} autoComplete="off" value={a} onChange={e => { setA(e.target.value); setErr(''); }} /></div>
      <div className="field"><label htmlFor="np2">Type it again</label><input id="np2" inputMode="numeric" maxLength={4} autoComplete="off" value={b} onChange={e => { setB(e.target.value); setErr(''); }} /></div></div>
    {err && <p className="ferr" id="np-err">{err}</p>}
    <div className="actions"><button className="btn ghost" onClick={closeSheet}>Cancel</button><button className="btn primary" disabled={busy} onClick={save}>Save PIN</button></div>
  </>;
}

// Admin mode unlocks here with the PIN.
export function Settings() {
  if (!isAdmin()) return <>
    <div className="ghead"><div><h1 className="page">Settings</h1></div></div>
    <div className="card admin-lock"><div className="lock-ic"><Lock /></div>
      <div><h3>Admin mode</h3><p className="hint">Record games, edit past games and box scores, set results, add seasons, and manage the roster and opponents.</p></div>
      <button className="btn primary" id="unlock" onClick={() => openSheet(<PinSheet />)}>Unlock with PIN</button></div>
    <p className="foot">The PIN is checked by the stats database, and it locks for 15 minutes after 5 wrong tries.</p>
  </>;
  return <>
    <div className="ghead"><div><h1 className="page">Settings</h1></div><span className="grow" />
      <span className="admin-on"><Shield />Admin mode on</span><button className="btn ghost sm" id="lock" onClick={lock}><Lock size={16} />Lock</button></div>
    <p className="hint top">Admin mode locks itself after 15 minutes without a tap.</p>
    <div className="adm-grid">
      <div className="sec wide"><h3>Record a game</h3><p className="hint">Pick who played, then tap a player and an action for every play.</p>
        <div className="card btnrow"><button className="btn primary" id="a-record" onClick={recordGame}>Record a game</button></div></div>
      <div className="sec wide"><h3>PIN</h3><div className="card btnrow"><button className="btn ghost" id="a-pin" onClick={() => openSheet(<ChangePin />)}>Change PIN</button></div></div>
    </div>
    <p className="foot">Editing past games, results, seasons, the roster and opponents arrives with the rest of Admin mode.</p>
  </>;
}
