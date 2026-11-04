import { useEffect, useRef, useState } from 'react';
import { P, numIn, perTxt, perCls } from '../lib/core.js';
import { sfx } from '../lib/sfx.js';
import { figure, cleanLook, pxShadow } from '../lib/avatar.js';
import { backdrop, randomBackdrop, BACKDROPS } from '../lib/potgBg.js';
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
// A tap: jump with both fists up, pump each arm, jump again.
const CELEBRATE = [['fist2', 0, 0, 0], ['fist2', 0, -3, 0], ['fist2', 0, -6, 0], ['fist2', 0, -7, 0], ['fist2', 0, -5, 0], ['fist2', 0, -2, 0], ['down', 0, 1, 0],
  ['fist', 0, -1, 0], ['fist', 0, 0, 0], ['fistL', 0, -1, 0], ['fistL', 0, 0, 0], ['catch', 0, 1, 0], ['catch', 0, -4, 0], ['catch', 0, -6, 0], ['catch', 0, -4, 0], ['catch', 0, 0, 0]];
const BEAT = 160, U = 104 / 34;
// A burst of confetti from the player's middle, for a tap.
const POP = (() => {
  let s = 3, out = ''; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647, cols = ['#2f55d4', '#4f7cff', '#ffffff', '#e9b949', '#f4d37c', '#ff8080'];
  for (let i = 0; i < 30; i++) { const a = rnd() * Math.PI * 2, d = 40 + rnd() * 50, z = 2.5 + Math.round(rnd() * 2);
    out += `<rect class="pg-pop" x="130" y="170" width="${z}" height="${z}" fill="${cols[i % cols.length]}" style="--dx:${(Math.cos(a) * d * 1.3).toFixed(0)}px;--dy:${(Math.sin(a) * d - 20).toFixed(0)}px"/>`; }
  return out;
})();

// Preview only: ?pbg=<name> fixes the backdrop; otherwise it's a random one each time.
const FIXED = typeof location !== 'undefined' && new URLSearchParams(location.search).get('pbg');

export function PotgSection({ g, games }) {
  const potg = playerOfGame(g, games), p = P(potg.id);
  const calm = g.result === 'L', steps = calm ? NOD : DANCE;
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [bgKey] = useState(() => FIXED in BACKDROPS ? FIXED : randomBackdrop());
  const [n, setN] = useState(0), [grin, setGrin] = useState(false), [party, setParty] = useState(0);
  const cel = useRef(null);
  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => {
      setN(x => x + 1);
      if (cel.current) { cel.current.i++; if (cel.current.i >= CELEBRATE.length) { cel.current = null; setGrin(false); } }
    }, calm ? BEAT * 2 : BEAT);
    return () => clearInterval(t);
  }, [calm, reduced]);
  // Now and then, a smile while dancing (not after a loss).
  useEffect(() => {
    if (reduced || calm) return;
    let t;
    const next = () => { t = setTimeout(() => { if (!cel.current) setGrin(true); t = setTimeout(() => { if (!cel.current) setGrin(false); next(); }, 1400 + Math.random() * 800); }, 2500 + Math.random() * 4000); };
    next();
    return () => clearTimeout(t);
  }, [calm, reduced]);
  if (!p) return null;
  const look = { ...p, num: numIn(g, potg.id) ?? p.num };
  const bg = backdrop(bgKey, look), K = bg.k, fx = 130 - 50 * K, fy = bg.feet - 104 * K;
  // Tap to celebrate: a jump, fist pumps, both hands up, a pop of confetti and a cheer.
  const tap = () => { sfx('cheer'); if (reduced) { setGrin(true); setTimeout(() => setGrin(false), 1500); return; } cel.current = { i: 0 }; setGrin(true); setParty(x => x + 1); };
  // Glasses wearers keep their normal eyes (smiling eyes read oddly behind the frames).
  const smile = grin && !cleanLook(look).glasses;
  const [pose, dx, dy, hx] = cel.current ? CELEBRATE[cel.current.i] : reduced ? [calm ? 'dribble' : 'fist2', 0, 0, 0] : steps[n % steps.length];
  const s = potg.s;
  const line = [['pts', 'PTS'], ['reb', 'REB'], ['ast', 'AST'], ['stl', 'STL'], ['blk', 'BLK']].filter(([k], i) => i < 3 || s[k] > 0);
  return (
    <div className="sec potg" id="g-potg">
      <div className="potg-row">
        <button className="potg-stage" onClick={tap} aria-label={`${p.name}, player of the game. Tap to celebrate`}>
          <svg viewBox={bg.view} aria-hidden="true" className={`bg-${bgKey}${smile ? ' smiling' : ''}`}>
            <g dangerouslySetInnerHTML={{ __html: bg.svg + (calm ? '' : bg.party) }} />
            <g transform={`translate(${fx} ${fy}) scale(${K})`}>
              <g dangerouslySetInnerHTML={{ __html: pxShadow(50, 103.5, 22, U) }} />
              <g transform={`translate(${dx * U} ${dy * U})`} style={{ '--hx': `${hx * U}px` }} dangerouslySetInnerHTML={{ __html: figure(look, { stage: true, pose }) }} />
            </g>
            {party ? <g key={party} transform={`translate(0 ${bg.feet - 226})`} dangerouslySetInnerHTML={{ __html: POP }} /> : null}
          </svg>
        </button>
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
