import { useState } from 'react';
import { S } from '../lib/store.js';
import { adminEdit } from '../lib/admin.js';
import { closeSheet } from './Sheet.jsx';
import { useSave } from '../screens/Settings.jsx';
import { X, VideoPlay } from './icons.jsx';

// Accepts youtube.com, m.youtube.com, youtu.be, /live/ and /shorts/ links, with or without https://.
export function cleanVideoUrl(raw) {
  let u = raw.trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  u = u.replace(/^http:/i, 'https:');
  try {
    const h = new URL(u).hostname.toLowerCase();
    if (!/(^|\.)(youtube\.com|youtu\.be)$/.test(h)) return null;
  } catch (e) { return null; }
  return u;
}

// Admin: add, change or remove a game's YouTube link.
export function VideoSheet({ id }) {
  const g = S.games.find(x => x.id === id);
  const [url, setUrl] = useState(g?.video || '');
  const { err, setErr, busy, run } = useSave();
  if (!g) return null;
  const save = (raw = url) => {
    const u = cleanVideoUrl(raw);
    if (u === null) return setErr('That doesn\'t look like a YouTube link. Copy it from Share → Copy link in YouTube.');
    run(() => adminEdit('set_video', { p_game: id, p_url: u }));
  };
  return <>
    <button className="xbtn" id="vs-x" type="button" aria-label="Close" onClick={closeSheet}><X width="16" height="16" /></button>
    <h2>Game video</h2><p className="sheet-sub">{g.season}, Game {g.no} vs {g.opp}. Paste the YouTube link for this game's recording.</p>
    <div className="field"><label htmlFor="vs-url">YouTube link</label>
      <input id="vs-url" type="url" inputMode="url" autoComplete="off" autoCapitalize="off" spellCheck="false" placeholder="https://youtu.be/…" value={url}
        onChange={e => { setUrl(e.target.value); setErr(''); }} onKeyDown={e => { if (e.key === 'Enter') save(); }} /></div>
    {err && <p className="ferr" id="vs-err">{err}</p>}
    <div className="actions end-actions">
      {g.video && <a className="btn ghost" id="vs-open" href={g.video} target="_blank" rel="noopener noreferrer"><VideoPlay width="20" height="20" />Watch</a>}
      {g.video && <button className="btn ghost" id="vs-rm" disabled={busy} onClick={() => save('')}>Remove</button>}
      <span className="grow" /><button className="btn ghost" id="vs-cancel" onClick={closeSheet}>Cancel</button>
      <button className="btn primary" id="vs-save" disabled={busy} onClick={() => save()}>Save</button></div>
  </>;
}
