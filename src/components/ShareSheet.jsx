import { useEffect, useState } from 'react';
import { closeSheet } from './Sheet.jsx';
import { drawShareCard, randomCelebration } from '../lib/shareCard.js';
import { P } from '../lib/core.js';
import { X, Dice, Download, ShareIcon } from './icons.jsx';

// The share image for one game's box score, with Share (the phone's share sheet) and Save buttons.
export function ShareSheet({ g, games }) {
  const [card, setCard] = useState(null), [err, setErr] = useState(null), [cel, setCel] = useState(() => randomCelebration());
  useEffect(() => {
    let live = true;
    drawShareCard(g, games, cel).then(c => new Promise(ok => c.canvas.toBlob(b => ok({ ...c, blob: b, url: URL.createObjectURL(b) }), 'image/png')))
      .then(c => { if (live) setCard(c); }).catch(e => live && setErr(e?.message || String(e)));
    return () => { live = false; };
  }, [g, games, cel]);
  useEffect(() => () => card && URL.revokeObjectURL(card.url), [card]);
  const file = card && new File([card.blob], card.name, { type: 'image/png' });
  const canShare = file && navigator.canShare?.({ files: [file] });
  const share = () => navigator.share({ files: [file], title: `Brickhampton vs ${g.opp}`, text: `Player of the game: ${P(card.potg.id).name}` }).catch(() => {});
  return <>
    <div className="share-top"><h2>Share box score</h2><button className="iconbtn share-ic" aria-label="Close" title="Close" onClick={closeSheet}><X width="20" height="20" /></button></div>
    <div className="share-img">{card ? <img src={card.url} alt={`Box score image: Brickhampton vs ${g.opp}, player of the game ${P(card.potg.id).name}`} /> : err ? <p>{err}</p> : <div className="share-wait" />}</div>
    <div className="share-acts">
      <button className="iconbtn share-ic" aria-label="New celebration" title="New celebration" disabled={!card} onClick={() => { setCard(null); setCel(randomCelebration(cel)); }}><Dice /></button>
      <span className="grow" />
      {card && <a className="iconbtn share-ic" href={card.url} download={card.name} aria-label="Save image" title="Save image"><Download /></a>}
      {canShare && <button className="iconbtn share-ic primary" aria-label="Share" title="Share" onClick={share}><ShareIcon width="20" height="20" /></button>}
    </div>
  </>;
}
