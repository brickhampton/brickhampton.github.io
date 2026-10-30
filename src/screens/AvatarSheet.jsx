import { useState } from 'react';
import { P } from '../lib/core.js';
import { adminEdit } from '../lib/admin.js';
import { figure, cleanLook, lookOf, randomLook, OPTS, SKINS, HAIRS, BANDS } from '../lib/avatar.js';
import { closeSheet } from '../components/Sheet.jsx';
import { useSave } from './Settings.jsx';

// Which part of the drawing each kind of thumbnail shows.
const VIEW = { body: '6 -14 88 120', head: '22 6 56 56', face: '30 26 40 34' };
const TABS = [
  ['body', 'Body', [['height', 'Height', 'body'], ['weight', 'Weight', 'body'], ['muscle', 'Muscle', 'body'], ['skin', 'Skin tone']]],
  ['hair', 'Hair', [['style', 'Style', 'head'], ['hair', 'Colour']]],
  ['face', 'Face', [['eyes', 'Eyes', 'face'], ['brows', 'Eyebrows', 'face'], ['mouth', 'Mouth', 'face'], ['beard', 'Facial hair', 'head']]],
  ['gear', 'Extras', [['glasses', 'Glasses', 'face'], ['band', 'Headband'], ['wrist', 'Wristbands']]],
];
const SWATCH = { skin: SKINS, hair: HAIRS, band: BANDS, wrist: BANDS };

const Thumb = ({ look, num, view }) => <svg viewBox={VIEW[view]} aria-hidden="true"
  dangerouslySetInnerHTML={{ __html: figure({ ...look, num }, { stage: view === 'body' }) }} />;

// The avatar builder: a live preview, and every part as a row of choices.
export function AvatarSheet({ id }) {
  const p = P(id), saved = cleanLook(p);
  const [look, setLook] = useState(saved), [tab, setTab] = useState('body');
  const { err, busy, run } = useSave();
  const put = (k, v) => setLook(l => ({ ...l, [k]: v }));
  const num = p.guest ? '' : p.num;
  const changed = JSON.stringify(lookOf(look)) !== JSON.stringify(lookOf(saved));

  const row = ([k, label, view]) => {
    const sw = SWATCH[k];
    const optional = k === 'band' || k === 'wrist';
    const list = sw ? [...(optional ? [null] : []), ...sw, ...(!optional && !sw.includes(look[k]) ? [look[k]] : [])] : OPTS[k].map((_, i) => i);
    return <div className="avb-row" key={k}><div className="avb-label">{label}</div>
      <div className={sw ? 'avb-swatches' : 'avb-opts'} role="radiogroup" aria-label={label}>{list.map(v => {
        const on = look[k] === v, name = sw ? (v ? v : 'None') : OPTS[k][v];
        return sw
          ? <button key={String(v)} role="radio" aria-checked={on} aria-label={name} data-k={k} data-v={String(v)} className={`avb-sw${v ? '' : ' none'}`} style={v ? { background: v } : undefined} onClick={() => put(k, v)} />
          : <button key={v} role="radio" aria-checked={on} data-k={k} data-v={v} className={`avb-opt ${view}`} onClick={() => put(k, v)}>
            <Thumb look={{ ...look, [k]: v, ...(k === 'style' ? { band: null } : {}) }} num={num} view={view} /><span>{name}</span></button>;
      })}</div></div>;
  };

  const save = () => run(() => adminEdit('save_look', { p_id: id, p_look: lookOf(look) }));
  return <>
    <h2>Edit avatar</h2><p className="sheet-sub">{p.name}. Shows everywhere straight away, and Undo in Change history puts it back</p>
    <div className="avb">
      <div className="avb-stage"><svg className="avb-fig" viewBox="-10 -24 120 168" aria-label={`${p.name}'s avatar`}
        dangerouslySetInnerHTML={{ __html: `<ellipse cx="50" cy="104" rx="30" ry="5" fill="#000" opacity=".35"/>${figure({ ...look, num }, { stage: true })}` }} />
        <div className="avb-tools"><button className="btn ghost sm" id="avb-shuffle" onClick={() => setLook(cleanLook(randomLook()))}>Shuffle</button>
          <button className="btn ghost sm" id="avb-reset" disabled={!changed} onClick={() => setLook(saved)}>Reset</button></div></div>
      <div className="avb-parts">
        <div className="chips" role="tablist" id="avb-tabs">{TABS.map(([k, l]) => <button key={k} role="tab" data-tab={k} aria-pressed={tab === k} aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>
        {TABS.find(t => t[0] === tab)[2].map(row)}
      </div>
    </div>
    {err && <p className="ferr" id="avb-err">{err}</p>}
    <div className="actions"><button className="btn ghost" id="avb-cancel" onClick={closeSheet}>Cancel</button>
      <button className="btn primary" id="avb-save" disabled={busy || !changed} onClick={save}>Save avatar</button></div>
  </>;
}
