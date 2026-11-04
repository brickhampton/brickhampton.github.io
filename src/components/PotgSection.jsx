import { useEffect, useState } from 'react';
import { P, hasPage, numIn, perTxt, perCls, ratio, pctTxt } from '../lib/core.js';
import { figure, cleanLook, pxShadow } from '../lib/avatar.js';
import { playerCourt } from '../lib/playerCourt.js';
import { playerOfGame, potgReason } from '../lib/potg.js';
import { BIC } from './icons.jsx';

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

const COURT = playerCourt();
const SPOT = `<defs><radialGradient id="pg-sp" cx="130" cy="170" r="90" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".13"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="pg-beam" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
  <path d="M112 90L148 90L196 226L64 226Z" fill="url(#pg-beam)"/><circle cx="130" cy="170" r="90" fill="url(#pg-sp)"/>`;
// Pixel confetti drifting down: royal, white and gold squares, the same each time.
const CONFETTI = (() => {
  let s = 11, out = ''; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647, cols = ['#2f55d4', '#4f7cff', '#ffffff', '#e9b949', '#f4d37c'];
  for (let i = 0; i < 18; i++) {
    const x = 58 + rnd() * 144, z = 2 + Math.round(rnd() * 2), d = (3 + rnd() * 3).toFixed(1), dl = (-rnd() * 6).toFixed(1);
    out += `<rect class="pg-conf" x="${x.toFixed(1)}" y="90" width="${z}" height="${z}" fill="${cols[i % cols.length]}" style="animation-duration:${d}s;animation-delay:${dl}s"/>`;
  }
  return out;
})();

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
  const K = 1.1, fx = 130 - 50 * K, fy = 226 - 104 * K;
  const s = potg.s;
  const line = [['pts', 'PTS'], ['reb', 'REB'], ['ast', 'AST'], ['stl', 'STL'], ['blk', 'BLK']].filter(([k], i) => i < 3 || s[k] > 0);
  const shots = [['FG', s.fgm, s.fga], ['3FG', s.m3, s.a3], ['FT', s.ftm, s.fta]].filter(([, , a]) => a > 0);
  return (
    <div className="sec potg" id="g-potg">
      <div className="potg-card">
        <div className="potg-stage" data-av={p.id} data-nopage={hasPage(p.id) ? undefined : ''} role="img" aria-label={`${p.name}${calm ? '' : ' dancing'}`}>
          <svg viewBox="48 86 164 158" aria-hidden="true" className={smile ? 'smiling' : ''}>
            <g dangerouslySetInnerHTML={{ __html: COURT + SPOT + (calm ? '' : CONFETTI) }} />
            <g transform={`translate(${fx} ${fy}) scale(${K})`}>
              <g dangerouslySetInnerHTML={{ __html: pxShadow(50, 103.5, 22, U) }} />
              <g transform={`translate(${dx * U} ${dy * U})`} style={{ '--hx': `${hx * U}px` }} dangerouslySetInnerHTML={{ __html: figure(look, { stage: true, pose }) }} />
            </g>
          </svg>
        </div>
        <div className="potg-head">
          <div className="potg-kick">Player of the game</div>
          <div className="potg-name">{p.name}</div>
          <div className="potg-tags">
            <span className={`potg-per ${perCls(s.per)}`}>{perTxt(s.per, true)} PER</span>
            {potg.tags.map(t => <span key={t.label} className={`mtag sm ${t.t}`}>{BIC.trophy}{t.label}</span>)}
          </div>
        </div>
        <div className="potg-body">
          <div className="potg-line">{line.map(([k, l]) => <div key={k}><b className="num">{s[k]}</b><span>{l}</span></div>)}</div>
          {shots.length ? <div className="potg-shots num">{shots.map(([l, m, a]) => <span key={l}>{l} {m}-{a} <i>{pctTxt(ratio(m, a))}</i></span>)}{s.to ? <span>TO {s.to}</span> : null}</div> : null}
          <p className="potg-why">{potgReason(potg, g, games)}</p>
        </div>
      </div>
    </div>
  );
}
