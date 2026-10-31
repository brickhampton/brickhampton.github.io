import { useEffect, useState } from 'react';
import { closeSheet } from './Sheet.jsx';
import { drawShareCard } from '../lib/shareCard.js';
import { P } from '../lib/core.js';

// The share image for one game's box score, with Share (the phone's share sheet) and Save buttons.
export function ShareSheet({ g, games }) {
  const [card, setCard] = useState(null), [err, setErr] = useState(null);
  useEffect(() => {
    let live = true;
    drawShareCard(g, games).then(c => new Promise(ok => c.canvas.toBlob(b => ok({ ...c, blob: b, url: URL.createObjectURL(b) }), 'image/png')))
      .then(c => { if (live) setCard(c); }).catch(e => live && setErr(e?.message || String(e)));
    return () => { live = false; };
  }, [g, games]);
  useEffect(() => () => card && URL.revokeObjectURL(card.url), [card]);
  const file = card && new File([card.blob], card.name, { type: 'image/png' });
  const canShare = file && navigator.canShare?.({ files: [file] });
  const share = () => navigator.share({ files: [file], title: `Brickhampton vs ${g.opp}`, text: `Player of the game: ${P(card.potg.id).name}` }).catch(() => {});
  return <>
    <h2>Share box score</h2>
    <div className="share-img">{card ? <img src={card.url} alt={`Box score image: Brickhampton vs ${g.opp}, player of the game ${P(card.potg.id).name}`} /> : err ? <p>{err}</p> : <div className="share-wait" />}</div>
    <div className="actions end-actions"><span className="grow" />
      <button className="btn ghost" onClick={closeSheet}>Close</button>
      {card && <a className="btn ghost" href={card.url} download={card.name}>Save image</a>}
      {canShare && <button className="btn primary" onClick={share}>Share</button>}
    </div>
  </>;
}
