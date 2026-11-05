import { useEffect, useRef, useState } from 'react';
import { P, numIn, perTxt, perCls } from '../lib/core.js';
import { sfx } from '../lib/sfx.js';
import { figure, cleanLook, pxShadow, trickExtras } from '../lib/avatar.js';
import { backdrop, randomBackdrop, BACKDROPS } from '../lib/potgBg.js';
import { playerOfGame, potgShort } from '../lib/potg.js';

// The dance, one frame a beat-and-a-half: [pose, body x, body y, head x], in sprite pixels.
// Fist pumps side to side, a shoulder shimmy (the body shakes, the head stays put), hands-up hops, then a head-nod groove.
// Idle is a gentle bob with the arms down. Every few seconds the player does one of the tricks below, then goes back to bobbing.
// Frames: [pose, body x, body y, head x, extra], extra being 'spin' (the spinning marks) or 'shades' (sunglasses on).
const BOB = [['down', 0, 0, 0], ['down', 0, 1, 0]];
const bob = (pose, n, extra) => Array.from({ length: n }, (_, i) => [pose, 0, i % 2, 0, extra]);
const TRICKS = {
  // A glass of champagne: held out, a sip, held out again.
  champagne: [...bob('toast', 4), ['sip', 0, 0, 0], ['sip', 0, 0, 0], ['sip', 0, 0, 0], ['sip', 0, 0, 0], ['sip', 0, 0, 0], ...bob('toast', 4)],
  spin: [['down', 0, 0, 0], ...Array.from({ length: 12 }, (_, i) => ['spin', 0, 0, 0, i % 2 ? 'spin' : null]), ['down', 0, 0, 0]],
  // Sunglasses on, a cool bob, sunglasses off.
  shades: bob('down', 12, 'shades'),
  // The ball from one hand round the back to the other, and back again.
  behind: [['dribble', 0, 0, 0], ['dribble', 0, 1, 0], ['lowball', 0, 0, 0], ['dribbleL', 0, 0, 0], ['dribbleL', 0, 1, 0], ['lowball', 0, 0, 0], ['dribble', 0, 0, 0], ['dribble', 0, 1, 0]],
};
const TRICK_KEYS = Object.keys(TRICKS);
// After a loss, low-key tricks only and no smile: a few bounces of the ball, the ball behind the back, a look left and right, a shrug.
// 'bounce', 'look' and 'shrug' are classes on the stage that animate the ball and the eyes (see .potg-stage .pk-*).
TRICKS.bounce = Array.from({ length: 10 }, () => ['dribble', 0, 0, 0, 'bounce']);
TRICKS.look = Array.from({ length: 6 }, () => ['dribble', 0, 0, 0, 'look']);
// A shrug: palms up for a moment, head tipped down a touch, the ball left at his feet.
TRICKS.shrug = Array.from({ length: 6 }, () => ['shrug', 0, 0, 0, 'shrug']);
const CALM_KEYS = ['bounce', 'behind', 'look', 'shrug'];
const CLASS_EXTRAS = new Set(['bounce', 'look', 'shrug']);
// After a loss there's no celebrating: just nodding along with the ball, no smile, no confetti.
const NOD = [['dribble', 0, 0, 0], ['dribble', 0, 1, 0]];
// A tap: a double fist pump, jumping with both fists up, twice.
const CELEBRATE = [['down', 0, 1, 0], ['fist2', 0, -3, 0], ['fist2', 0, -6, 0], ['fist2', 0, -4, 0], ['fist2', 0, 0, 0],
  ['down', 0, 1, 0], ['fist2', 0, -3, 0], ['fist2', 0, -6, 0], ['fist2', 0, -4, 0], ['fist2', 0, 0, 0]];
// The clock ticks every 160 ms. A tap's celebration moves every tick, idle frames and tricks every 2, the after-a-loss nod every 3.
const BEAT = 160, U = 104 / 34;
// A burst of confetti from the player's middle, for a tap.
const POP = (() => {
  let s = 3, out = ''; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647, cols = ['#2f55d4', '#4f7cff', '#ffffff', '#e9b949', '#f4d37c', '#ff8080'];
  for (let i = 0; i < 30; i++) { const a = rnd() * Math.PI * 2, d = 40 + rnd() * 50, z = 2.5 + Math.round(rnd() * 2);
    out += `<rect class="pg-pop" x="130" y="170" width="${z}" height="${z}" fill="${cols[i % cols.length]}" style="--dx:${(Math.cos(a) * d * 1.3).toFixed(0)}px;--dy:${(Math.sin(a) * d - 20).toFixed(0)}px"/>`; }
  return out;
})();

// Preview only: ?pbg=<name> fixes the backdrop (otherwise it's a random one each time); ?ptrick=<name> picks the first idle trick.
const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams(), FIXED = Q.get('pbg'), FIRST = Q.get('ptrick');

// On iPad and computer the stage is wider, the backdrop reaching out either side of the player.
const WIDE_MQ = '(min-width: 701px)';
const useWide = () => {
  const mq = typeof matchMedia === 'function' ? matchMedia(WIDE_MQ) : null;
  const [w, setW] = useState(() => !!mq?.matches);
  useEffect(() => { if (!mq) return; const f = () => setW(mq.matches); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f); }, []);
  return w;
};
export function PotgSection({ g, games }) {
  const potg = playerOfGame(g, games), p = P(potg.id);
  const calm = g.result === 'L';
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [bgKey] = useState(() => FIXED in BACKDROPS ? FIXED : randomBackdrop());
  const [n, setN] = useState(0), [grin, setGrin] = useState(false), [party, setParty] = useState(0);
  // What's playing now (a tap's celebration or an idle trick): its frames, which one, and how many ticks each lasts.
  const play = useRef(null), lastTrick = useRef(null);
  const start = (frames, every, smile) => { play.current = { frames, i: 0, t: 0, every }; if (smile) setGrin(true); };
  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => {
      setN(x => x + 1);
      const pl = play.current;
      if (pl && ++pl.t >= pl.every) { pl.t = 0; if (++pl.i >= pl.frames.length) { play.current = null; setGrin(false); } }
    }, BEAT);
    return () => clearInterval(t);
  }, [reduced]);
  // Idle: every few seconds a trick, never the same one twice running; in between, now and then a smile (not after a loss).
  useEffect(() => {
    if (reduced) return;
    const keys = calm ? CALM_KEYS : TRICK_KEYS;
    let t;
    const next = () => { t = setTimeout(() => {
      if (!play.current) {
        if (!calm && Math.random() < .3) { setGrin(true); setTimeout(() => !play.current && setGrin(false), 1600); }
        else { const ks = keys.filter(k => k !== lastTrick.current), k = ks[Math.floor(Math.random() * ks.length)]; lastTrick.current = k; start(TRICKS[k], 2, !calm); }
      }
      next();
    }, 3500 + Math.random() * 3500); };
    const first = keys.includes(FIRST) ? FIRST : keys[Math.floor(Math.random() * keys.length)];
    t = setTimeout(() => { if (!play.current) { lastTrick.current = first; start(TRICKS[first], 2, !calm); } next(); }, FIRST ? 300 : 1500);
    return () => clearTimeout(t);
  }, [calm, reduced]);
  if (!p) return null;
  const look = { ...p, num: numIn(g, potg.id) ?? p.num };
  const wide = useWide();
  const bg = backdrop(bgKey, look, wide), K = bg.k, fx = 130 - 50 * K, fy = bg.feet - 104 * K;
  // Tap to celebrate: a double fist pump with a jump, a pop of confetti and a cheer.
  // After a loss a tap gets a shrug: no jump, confetti, smile or cheer.
  const tap = () => {
    if (calm) { if (!reduced) start(TRICKS.shrug, 2, false); return; }
    sfx('cheer'); if (reduced) { setGrin(true); setTimeout(() => setGrin(false), 1500); return; } start(CELEBRATE, 1, true); setParty(x => x + 1);
  };
  // Glasses wearers keep their normal eyes (smiling eyes read oddly behind the frames).
  const smile = grin && !cleanLook(look).glasses;
  const pl = play.current;
  const [pose, dx, dy, hx, extra] = pl ? pl.frames[pl.i] : reduced ? [calm ? 'dribble' : 'down', 0, 0, 0] : calm ? NOD[Math.floor(n / 3) % NOD.length] : BOB[Math.floor(n / 2) % BOB.length];
  const s = potg.s;
  const line = [['pts', 'PTS'], ['reb', 'REB'], ['ast', 'AST'], ['stl', 'STL'], ['blk', 'BLK']].filter(([k], i) => i < 3 || s[k] > 0);
  return (
    <div className="sec potg" id="g-potg">
      <div className="potg-row">
        <button className={`potg-stage${wide ? ' wide' : ''}`} onClick={tap} aria-label={`${p.name}, player of the game. Tap to celebrate`}>
          <svg viewBox={bg.view} aria-hidden="true" className={`bg-${bgKey}${smile ? ' smiling' : ''}${CLASS_EXTRAS.has(extra) ? ` pk-${extra}` : ''}`}>
            <g dangerouslySetInnerHTML={{ __html: bg.svg + (calm ? '' : bg.party) }} />
            <g transform={`translate(${fx} ${fy}) scale(${K})`}>
              <g dangerouslySetInnerHTML={{ __html: pxShadow(50, 103.5, 22, U) }} />
              <g transform={`translate(${dx * U} ${dy * U})`} style={{ '--hx': `${hx * U}px` }} dangerouslySetInnerHTML={{ __html: figure(look, { stage: true, pose }) + (extra && !CLASS_EXTRAS.has(extra) ? trickExtras(look, extra) : '') }} />
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
