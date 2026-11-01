import { useEffect, useRef, useState } from 'react';
import { unlock } from '../lib/admin.js';
import { openSheet, closeSheet } from './Sheet.jsx';
import { openRecord } from '../lib/record.js';
import { X } from './icons.jsx';
import { sfx } from '../lib/sfx.js';

const until = t => new Date(t).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });

// Four-digit keypad. The database checks the PIN and locks for 15 minutes after five wrong tries.
export function PinSheet({ onDone, why = 'Unlocks Admin mode on this device.' }) {
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState(why);
  const [busy, setBusy] = useState(false);
  const dots = useRef(null), panel = useRef(null);
  useEffect(() => { panel.current?.closest('.panel')?.focus(); }, []);
  const shake = () => { const d = dots.current; d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake'); };
  const press = async k => {
    if (busy) return;
    const next = k === 'del' ? code.slice(0, -1) : code.length < 4 ? code + k : code;
    setCode(next);
    if (next.length !== 4) return;
    setBusy(true);
    const r = await unlock(next);
    setBusy(false);
    if (r.ok) { sfx('pinOk'); closeSheet(true); onDone?.(); return; }
    sfx('pinBad'); setCode(''); shake();
    setMsg(r.reason === 'locked' ? `Too many wrong tries. Try again after ${until(r.until)}.`
      : r.reason === 'wrong' ? `Wrong PIN. ${r.left} ${r.left === 1 ? 'try' : 'tries'} left before it locks for 15 minutes.`
        : r.reason === 'no_pin' ? 'No PIN has been set yet. Set one in the Supabase SQL editor first.'
          : 'Couldn\'t reach the database. Check your connection and try again.');
  };
  useEffect(() => {
    const key = e => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del'); };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  });
  return <>
    <button className="xbtn" id="pin-x" type="button" aria-label="Close" onClick={closeSheet}><X /></button>
    <div className="pin" ref={panel}><h2>Enter PIN</h2><p className="sheet-sub" id="pin-msg" aria-live="polite">{msg}</p>
      <div className="dots" id="dots" ref={dots}>{[0, 1, 2, 3].map(i => <i key={i} className={i < code.length ? 'on' : undefined} />)}</div>
      <div className="pad">{['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k, i) => !k ? <span key={i} />
        : <button key={k} type="button" data-k={k} aria-label={k === 'del' ? 'Delete digit' : undefined} onClick={() => press(k)}>{k === 'del' ? '⌫' : k}</button>)}</div></div>
  </>;
}

// Recording a game needs Admin mode, so the PIN is asked for first if it's locked.
export const recordGame = () => openRecord(retry => openSheet(<PinSheet why="Recording a game needs Admin mode." onDone={retry} />));
