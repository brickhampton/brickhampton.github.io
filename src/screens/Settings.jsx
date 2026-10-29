import { Lock } from '../components/icons.jsx';

// Admin mode unlocks here with the PIN. The PIN check lives on the server, so it arrives with the database (Phase 4).
export function Settings() {
  return <>
    <div className="ghead"><div><h1 className="page">Settings</h1></div></div>
    <div className="card admin-lock"><div className="lock-ic"><Lock /></div>
      <div><h3>Admin mode</h3><p className="hint">Edit past games and box scores, set results, add seasons, and manage the roster and opponents.</p></div>
      <button className="btn primary" id="unlock" disabled>Unlock with PIN</button></div>
    <p className="foot">Admin mode switches on once the stats database is connected. The PIN is checked on the server, and it locks after 5 wrong tries.</p>
  </>;
}
