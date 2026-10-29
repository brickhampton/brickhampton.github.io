import { Fragment, useLayoutEffect, useRef } from 'react';
import { S, set } from '../lib/store.js';
import { perCls, perTxt } from '../lib/core.js';
import { BallArt, ChevDown, ChevUp, SmallChev, MoreIcon } from './icons.jsx';

export const PerPill = ({ v, dec }) => <span className={`per ${perCls(v)}`}>{perTxt(v, dec)}</span>;

/* Season picker: All time, the current season, and More for the rest. */
export function SeasonPick({ id, value, seasons, all = 'All time', onPick, className = '' }) {
  const cur = seasons.includes(S.current) ? S.current : null, rest = seasons.filter(c => c !== cur), inMore = rest.includes(value);
  return (
    <div className={`chips spick${className ? ' ' + className : ''}`} id={id}>
      {all && <button data-s="ALL" aria-pressed={value === 'ALL'} onClick={() => onPick('ALL')}>{all}</button>}
      {cur && <button data-s={cur} aria-pressed={value === cur} onClick={() => onPick(cur)}>{cur}</button>}
      {rest.length > 0 && (
        <label className={`chipsel${inMore ? ' on' : ''}`} title="Other seasons">
          <select aria-label="Other seasons" value={inMore ? value : ''} onChange={e => e.target.value && onPick(e.target.value)}>
            <option value="" disabled>More</option>
            {rest.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <SmallChev />
        </label>
      )}
    </div>
  );
}

/* Stat chips with a More drop-down for the less common stats. */
export function StatChips({ id, main, more, value, onPick }) {
  const inMore = value in more;
  return (
    <div className="chips" id={id}>
      {Object.entries(main).map(([k, l]) => <button key={k} data-k={k} aria-pressed={value === k} onClick={() => onPick(k)}>{l}</button>)}
      <label className={`chipsel${inMore ? ' on' : ''}`} title="More stats">
        <MoreIcon />
        <select aria-label="More stats" value={inMore ? value : ''} onChange={e => e.target.value && onPick(e.target.value)}>
          <option value="" disabled>More</option>
          {Object.entries(more).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <SmallChev />
      </label>
    </div>
  );
}

export function MoreBtn({ open, n, noun, onClick, ...rest }) {
  return (
    <button className="more-btn" aria-expanded={open} onClick={onClick} {...rest}>
      {open ? 'Show less' : `Show all ${n} ${noun}`}{open ? <ChevUp /> : <ChevDown />}
    </button>
  );
}

export function EmptyState({ title, text, children, small }) {
  return <div className={`card estate${small ? ' sm' : ''}`}><BallArt /><h4>{title}</h4><p>{text}</p>{children}</div>;
}

// A chart drawn by one of the SVG functions in lib/charts.js. It redraws when its inputs change or the window resizes.
export function Chart({ id, draw, deps, className = 'chart' }) {
  const ref = useRef(null);
  const drawRef = useRef(draw); drawRef.current = draw;
  useLayoutEffect(() => { if (ref.current) drawRef.current(ref.current); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    let t, w = window.innerWidth;
    const on = () => { clearTimeout(t); t = setTimeout(() => { if (ref.current && window.innerWidth !== w) { w = window.innerWidth; drawRef.current(ref.current); } }, 150); };
    addEventListener('resize', on);
    return () => { removeEventListener('resize', on); clearTimeout(t); };
  }, []);
  return <div className={className} id={id} ref={ref} />;
}

// Loading shimmers, shown while the games load.
export const Skeleton = ({ kind }) => kind === 'player'
  ? <div className="skel"><div className="sk-hero"><div className="sk circ" /><div className="sk h1" /></div><div className="sk-grid">{[0, 1, 2, 3].map(i => <div key={i} className="sk tile" />)}</div><div className="sk chart" /></div>
  : kind === 'stats'
    ? <div className="skel"><div className="sk h1" /><div className="sk sh" /><div className="sk-grid">{[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="sk tile" />)}</div><div className="sk chart" /></div>
    : <div className="skel"><div className="sk h1" />{[0, 1].map(i => <Fragment key={i}><div className="sk sh" /><div className="sk row" /><div className="sk row" /><div className="sk row" /></Fragment>)}</div>;

export const setSort = (key, k) => set({ [key]: S[key]?.k !== k ? { k, best: true } : S[key].best ? { k, best: false } : null });
