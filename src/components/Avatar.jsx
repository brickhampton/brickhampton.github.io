import { P } from '../lib/core.js';

// Placeholder cartoon players in the team jersey with their number. The avatar customiser comes later.
const HAIR = [
  'M29 40 Q28 17 50 16 Q72 17 71 40 Q66 27 50 27 Q36 27 29 40Z',
  'M31 34 Q33 19 50 19 Q67 19 69 34 Q60 26 50 26 Q40 26 31 34Z',
  'M30 37 Q24 26 33 20 Q36 11 47 14 Q55 8 63 15 Q75 17 72 30 Q75 36 70 40 Q64 28 50 28 Q36 28 30 37Z',
  'M29 41 Q27 18 50 17 Q70 17 72 34 Q58 33 52 24 Q46 33 31 33 Z',
  'M30 36 Q30 20 50 18 Q68 18 70 36 L66 30 L60 33 L56 27 L50 32 L44 27 L40 33 L34 30Z',
];
const escText = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');

// The figure as SVG markup, so charts and the Home scene can draw it inside their own SVG.
export function figure(p) {
  const band = p.band ? `<rect x="29" y="27" width="42" height="6" rx="3" fill="#2f55d4"/><rect x="29" y="27" width="42" height="1.4" fill="#fff" opacity=".8"/>` : '';
  return `<g class="av-fig">
    <ellipse cx="24" cy="80" rx="8" ry="9" fill="${p.skin}"/><ellipse cx="76" cy="80" rx="8" ry="9" fill="${p.skin}"/>
    <rect x="43" y="56" width="14" height="14" rx="4" fill="${p.skin}"/>
    <path d="M27 104 L28 78 Q29 70 37 68 L41 67 Q50 77 59 67 L63 68 Q71 70 72 78 L73 104Z" fill="#2f55d4"/>
    <path d="M41 67 Q50 77 59 67" stroke="#fff" stroke-width="2.6" fill="none"/>
    <path d="M37 68 Q31 73 30 82 M63 68 Q69 73 70 82" stroke="#fff" stroke-width="2.2" fill="none"/>
    <text x="50" y="96" text-anchor="middle" font-family="Geist, system-ui, sans-serif" font-weight="700" font-size="15" fill="#fff" stroke="#1c3896" stroke-width=".6">${escText(p.num)}</text>
    <g class="av-head">
      <circle cx="30" cy="43" r="4.5" fill="${p.skin}"/><circle cx="70" cy="43" r="4.5" fill="${p.skin}"/>
      <circle cx="50" cy="40" r="21" fill="${p.skin}"/>
      <path d="${HAIR[p.style % HAIR.length]}" fill="${p.hair}"/>${band}
      <g class="av-eyes"><ellipse cx="42.5" cy="42" rx="2.4" ry="3" fill="#1b1512"/><ellipse cx="57.5" cy="42" rx="2.4" ry="3" fill="#1b1512"/></g>
      <ellipse cx="37" cy="49" rx="3.2" ry="2" fill="#e8846a" opacity=".35"/><ellipse cx="63" cy="49" rx="3.2" ry="2" fill="#e8846a" opacity=".35"/>
      <path d="M44 50 Q50 55.5 56 50" stroke="#1b1512" stroke-width="2" fill="none" stroke-linecap="round"/>
    </g></g>`;
}

// A round avatar. Tapping one on Games, a game page or Stats opens that player's page.
export function Avatar({ id, num }) {
  const base = P(id);
  if (!base) return null;
  const p = num === undefined ? base : { ...base, num };
  return <div className="av-wrap" data-av={p.id} dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 100 100" aria-hidden="true">${figure(p)}</svg>` }} />;
}
