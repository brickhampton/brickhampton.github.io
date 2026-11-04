import { useEffect, useState } from 'react';
import { P, hasPage, numIn, perTxt, perCls } from '../lib/core.js';
import { figure, cleanLook, pxShadow } from '../lib/avatar.js';
import { backdrop } from '../lib/potgBg.js';
import { playerOfGame, potgShort } from '../lib/potg.js';

// The dance, one frame a beat-and-a-half: [pose, body x, body y, head x], in sprite pixels.
// Fist pumps side to side, a shoulder shimmy (the body shakes, the head stays put), hands-up hops, then a head-nod groove.
const PUMPS = [['fist', 0, -1, 0], ['fist', 0, 0, 0], ['fistL', 0, -1, 0], ['fistL', 0, 0, 0]];
const SHIMMY = [1, -1, 1, -1, 1, -1, 1, -1].map(x => ['down', x, 0, -x]);
const HOP = [['down', 0, 1, 0], ['fist2', 0, -2, 0], ['fist2', 0, -3, 0], ['fist2', 0, -2, 0], ['fist2', 0, 0, 0], ['fist2', 0, 0, 0]];
const GROOVE = [['down', 0, 0, -1], ['down', 0, 1, -1], ['down', 0, 0, 0], ['down', 0, 1, 1], ['down', 0, 0, 1], ['down', 0, 1, 0], ['down', 0, 0, 0], ['down', 0, 1, 0]];
const DANCE = [...PUMPS, ...PUMPS, ...SHIMMY, ...HOP, ...HOP, ...GROOVE];
// After a loss there's no celebrating: just nodding along with the ball, no smile, no confetti.
const NOD = [['dribble', 0, 0, 0], ['dribble', 0, 1, 0], ['dribble', 0, 0, -1], ['dribble', 0, 1, -1], ['dribble', 0, 0, 0], ['dribble', 0, 1, 0], ['dribble', 0, 0, 1], ['dribble', 0, 1, 1]];
const BEAT = 160, U = 104 / 34;

// Preview only: ?pbg=podium|disco|fireworks picks the backdrop (the arena otherwise).
const BG = (typeof location !== 'undefined' && new URLSearchParams(location.search).get('pbg')) || 'arena';

export function PotgSection({ g, games }) {
  const potg = playerOfGame(g, games), p = P(potg.id);
  const calm = g.result === 'L', steps = calm ? NOD : DANCE;
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setN(x => x + 1), calm ? BEAT * 2 : BEAT);
    return () => clearInterval(t);
  }, [calm, reduced]);
  if (!p) return null;
  const look = { ...p, num: numIn(g, potg.id) ?? p.num };
  // Glasses wearers keep their normal eyes (smiling eyes read oddly behind the frames).
  const smile = !calm && !cleanLook(look).glasses;
  const [pose, dx, dy, hx] = reduced ? [calm ? 'dribble' : 'fist2', 0, 0, 0] : steps[n % steps.length];
  const bg = backdrop(BG), K = bg.k, fx = 130 - 50 * K, fy = bg.feet - 104 * K;
  const s = potg.s;
  const line = [['pts', 'PTS'], ['reb', 'REB'], ['ast', 'AST'], ['stl', 'STL'], ['blk', 'BLK']].filter(([k], i) => i < 3 || s[k] > 0);
  return (
    <div className="sec potg" id="g-potg">
      <div className="potg-row">
        <div className="potg-stage" data-av={p.id} data-nopage={hasPage(p.id) ? undefined : ''} role="img" aria-label={`${p.name}${calm ? '' : ' dancing'}`}>
          <svg viewBox={bg.view} aria-hidden="true" className={`bg-${BG}${smile ? ' smiling' : ''}`}>
            <g dangerouslySetInnerHTML={{ __html: bg.svg + (calm ? '' : bg.party) }} />
            <g transform={`translate(${fx} ${fy}) scale(${K})`}>
              <g dangerouslySetInnerHTML={{ __html: pxShadow(50, 103.5, 22, U) }} />
              <g transform={`translate(${dx * U} ${dy * U})`} style={{ '--hx': `${hx * U}px` }} dangerouslySetInnerHTML={{ __html: figure(look, { stage: true, pose }) }} />
            </g>
          </svg>
        </div>
        <div className="potg-txt">
          <div className="potg-kick">Player of the game</div>
          <div className="potg-name">{p.name}<span className={`potg-per ${perCls(s.per)}`}>{perTxt(s.per, true)} PER</span></div>
          <div className="potg-line">{line.map(([k, l]) => <div key={k}><b className="num">{s[k]}</b><span>{l}</span></div>)}</div>
          <p className="potg-why">{potgShort(potg, g)}</p>
        </div>
      </div>
    </div>
  );
}
