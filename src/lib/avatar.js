// Cartoon players in the team jersey, drawn from swappable parts. A player's look is saved in players.look:
// { skin, hair, style, eyes, brows, mouth, beard, glasses, band, wrist, height, weight, muscle }.
// Every part is optional, so looks saved before the avatar builder still draw the same way.

const HEX = /^#[0-9a-f]{6}$/i;
const color = (v, d) => HEX.test(v || '') ? v : d;
const pick = (v, list) => Number.isInteger(v) && v >= 0 && v < list.length ? v : 0;
const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
// Mixes a colour toward black (t > 0) or white (t < 0).
const shade = (hex, t) => '#' + [1, 3, 5].map(i => {
  const c = parseInt(hex.slice(i, i + 2), 16), v = t > 0 ? c * (1 - t) : c + (255 - c) * -t;
  return Math.round(v).toString(16).padStart(2, '0');
}).join('');

export const SKINS = ['#f8dcc4', '#f4d1ad', '#f2c9a3', '#e9bd95', '#e0ac80', '#d6a077', '#c18557', '#a8704a', '#8a5638', '#6b4029'];
export const HAIRS = ['#0f0c0c', '#2b1d15', '#5a3a22', '#8a5a2b', '#c9a063', '#a3472a', '#8f8f8f', '#e6e6e6', '#2f55d4', '#c0392b'];
export const BANDS = ['#2f55d4', '#eeeeee', '#1b1b1b', '#c0392b', '#ee6018', '#e9b949'];

// Each option list: the label shown in the builder. Index 0 is the default.
export const OPTS = {
  height: ['Average', 'Short', 'Tall', 'Very tall'],
  weight: ['Average', 'Slim', 'Heavy'],
  muscle: ['Toned', 'Lean', 'Muscular'],
  style: ['Short', 'Crop', 'Messy', 'Swept', 'Spiky', 'Buzz', 'Afro', 'Mohawk', 'Top knot', 'Long', 'High top', 'Curly', 'Bald', 'Curtains', 'Fringe', 'Quiff'],
  eyes: ['Dots', 'Happy', 'Wide', 'Sleepy', 'Focused'],
  brows: ['None', 'Soft', 'Thick', 'Fierce', 'Raised'],
  mouth: ['Smile', 'Grin', 'Smirk', 'Calm', 'Shout'],
  beard: ['None', 'Stubble', 'Moustache', 'Goatee', 'Beard', 'Chinstrap'],
  glasses: ['None', 'Round', 'Square', 'Sport', 'Shades'],
};
export const HEIGHT = [1, .9, 1.08, 1.16];

// A clean copy of a saved look with every part in range, so nothing odd from the database reaches the page.
export function cleanLook(p = {}) {
  const band = p.band === true ? BANDS[0] : HEX.test(p.band || '') ? p.band : null;
  const n = k => pick(p[k], OPTS[k]);
  return {
    skin: color(p.skin, SKINS[2]), hair: color(p.hair, HAIRS[0]),
    style: Number.isInteger(p.style) && p.style >= 0 ? p.style % OPTS.style.length : 0,
    eyes: n('eyes'), brows: n('brows'), mouth: n('mouth'), beard: n('beard'), glasses: n('glasses'),
    height: n('height'), weight: n('weight'), muscle: n('muscle'),
    band, wrist: HEX.test(p.wrist || '') ? p.wrist : null,
  };
}

// Just the parts of a look that are worth saving (defaults left out).
export function lookOf(p) {
  const c = cleanLook(p), out = { skin: c.skin, hair: c.hair, style: c.style };
  for (const k of ['eyes', 'brows', 'mouth', 'beard', 'glasses', 'height', 'weight', 'muscle']) if (c[k]) out[k] = c[k];
  if (c.band) out.band = c.band;
  if (c.wrist) out.wrist = c.wrist;
  return out;
}

export function randomLook() {
  const r = n => Math.floor(Math.random() * n), any = list => list[r(list.length)];
  const some = (chance, list) => Math.random() < chance ? any(list) : null;
  return lookOf({
    skin: any(SKINS), hair: any(HAIRS.slice(0, 7)), style: r(OPTS.style.length),
    eyes: r(OPTS.eyes.length), brows: r(OPTS.brows.length), mouth: r(OPTS.mouth.length),
    beard: Math.random() < .5 ? 0 : 1 + r(OPTS.beard.length - 1), glasses: Math.random() < .75 ? 0 : 1 + r(OPTS.glasses.length - 1),
    height: r(4), weight: r(3), muscle: r(3), band: some(.3, BANDS), wrist: some(.3, BANDS),
  });
}

// ---------- Parts ----------
const HAIR = [
  'M29 40 Q28 17 50 16 Q72 17 71 40 Q66 27 50 27 Q36 27 29 40Z',
  'M31 34 Q33 19 50 19 Q67 19 69 34 Q60 26 50 26 Q40 26 31 34Z',
  'M30 37 Q24 26 33 20 Q36 11 47 14 Q55 8 63 15 Q75 17 72 30 Q75 36 70 40 Q64 28 50 28 Q36 28 30 37Z',
  'M29 41 Q27 18 50 17 Q70 17 72 34 Q58 33 52 24 Q46 33 31 33 Z',
  'M30 36 Q30 20 50 18 Q68 18 70 36 L66 30 L60 33 L56 27 L50 32 L44 27 L40 33 L34 30Z',
];
function hairPart(style, c) {
  if (style < HAIR.length) return `<path d="${HAIR[style]}" fill="${c}"/>`;
  switch (OPTS.style[style]) {
    case 'Buzz': return `<path d="M29.5 39 Q28.5 19 50 19 Q71.5 19 70.5 39 Q68 28 50 27 Q32 28 29.5 39Z" fill="${c}" opacity=".62"/>`;
    case 'Afro': return `<path d="M28 44 Q16 36 20 22 Q26 5 50 5 Q74 5 80 22 Q84 36 72 44 Q70 28 50 27 Q30 28 28 44Z" fill="${c}"/>`;
    case 'Mohawk': return `<path d="M30.5 37 Q30 21 50 20 Q70 21 69.5 37 Q66 28 50 27 Q34 28 30.5 37Z" fill="${c}" opacity=".35"/>
      <path d="M44 27 Q42 12 50 4 Q58 12 56 27 Q50 25 44 27Z" fill="${c}"/>`;
    case 'Top knot': return `<path d="${HAIR[1]}" fill="${c}"/><circle cx="50" cy="15" r="7" fill="${c}"/><rect x="45" y="19" width="10" height="2.6" rx="1.3" fill="${shade(c, -.25)}"/>`;
    case 'Long': return `<path d="M27 58 Q23 20 50 17 Q77 20 73 58 Q70 60 66 58 Q68 36 61 28 Q50 31 39 28 Q32 36 34 58 Q30 60 27 58Z" fill="${c}"/>`;
    case 'High top': return `<path d="M30 36 L31 9 Q50 5 69 9 L70 36 Q66 27 50 27 Q34 27 30 36Z" fill="${c}"/>`;
    case 'Curly': {
      const dots = [];
      for (let i = 0; i <= 9; i++) { const a = Math.PI * (1.08 + .84 * i / 9); dots.push(`<circle cx="${(50 + 20 * Math.cos(a)).toFixed(1)}" cy="${(37 + 19 * Math.sin(a)).toFixed(1)}" r="6"/>`); }
      return `<g fill="${c}"><path d="M30 38 Q30 19 50 18 Q70 19 70 38 Q65 28 50 28 Q35 28 30 38Z"/>${dots.join('')}</g>`;
    }
    case 'Curtains': return `<path d="M28.5 46 Q25 17 50 15.5 Q75 17 71.5 46 Q69 33 61 30.5 Q54 29 50 35 Q46 29 39 30.5 Q31 33 28.5 46Z" fill="${c}"/>`;
    case 'Fringe': return `<path d="M29 43 Q27 16.5 50 16 Q73 16.5 71 43 Q70 35 65 34 Q57 31 50 34.5 Q43 31 35 34 Q30 35 29 43Z" fill="${c}"/>`;
    case 'Quiff': return `<path d="M30 38 Q28 20 40 15 Q52 8 64 14 Q73 19 70 38 Q67 28 58 27 Q55 22 48 25 Q38 26 30 38Z" fill="${c}"/>`;
    case 'Bald':
    default: return `<ellipse cx="42" cy="26" rx="5" ry="2.6" fill="#fff" opacity=".2" transform="rotate(-20 42 26)"/>`; // Bald: a little shine
  }
}

function eyesPart(i, ink) {
  switch (OPTS.eyes[i]) {
    case 'Happy': return `<path d="M39.5 43 Q42.5 39 45.5 43 M54.5 43 Q57.5 39 60.5 43" stroke="${ink}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    case 'Wide': return `<g><ellipse cx="42.5" cy="42" rx="3.6" ry="4.2" fill="#fff"/><ellipse cx="57.5" cy="42" rx="3.6" ry="4.2" fill="#fff"/>
      <circle cx="43" cy="42.6" r="2.2" fill="${ink}"/><circle cx="58" cy="42.6" r="2.2" fill="${ink}"/><circle cx="43.8" cy="41.6" r=".7" fill="#fff"/><circle cx="58.8" cy="41.6" r=".7" fill="#fff"/></g>`;
    case 'Sleepy': return `<path d="M39.5 42 Q42.5 45.5 45.5 42Z M54.5 42 Q57.5 45.5 60.5 42Z" fill="${ink}"/><path d="M39 41.6 H46 M54 41.6 H61" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/>`;
    case 'Focused': return `<ellipse cx="42.5" cy="42.5" rx="2.8" ry="1.9" fill="${ink}"/><ellipse cx="57.5" cy="42.5" rx="2.8" ry="1.9" fill="${ink}"/>`;
    default: return `<ellipse cx="42.5" cy="42" rx="2.4" ry="3" fill="${ink}"/><ellipse cx="57.5" cy="42" rx="2.4" ry="3" fill="${ink}"/>`;
  }
}

function browsPart(i, c) {
  const s = (d, w) => `<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  switch (OPTS.brows[i]) {
    case 'Soft': return s('M39 36.5 Q42.5 35 46 36.5 M54 36.5 Q57.5 35 61 36.5', 1.6);
    case 'Thick': return s('M38.5 36.5 Q42.5 34 46.5 36 M53.5 36 Q57.5 34 61.5 36.5', 3);
    case 'Fierce': return s('M38.5 35 L46.5 37.5 M53.5 37.5 L61.5 35', 2.6);
    case 'Raised': return s('M39 35.5 Q42.5 32.5 46 35 M54 35 Q57.5 32.5 61 35.5', 2);
    default: return '';
  }
}

function mouthPart(i, ink) {
  switch (OPTS.mouth[i]) {
    case 'Grin': return `<path d="M43.5 49.5 Q50 50.5 56.5 49.5 Q55.5 56 50 56 Q44.5 56 43.5 49.5Z" fill="${ink}"/><path d="M44.4 50.2 Q50 51.2 55.6 50.2 L55.2 52 Q50 52.8 44.8 52Z" fill="#fff"/>`;
    case 'Smirk': return `<path d="M45 52 Q51 53.5 56 49.5" stroke="${ink}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    case 'Calm': return `<path d="M45.5 52 Q50 53 54.5 52" stroke="${ink}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    case 'Shout': return `<ellipse cx="50" cy="52.5" rx="3.6" ry="4" fill="${ink}"/><ellipse cx="50" cy="54.6" rx="2.2" ry="1.5" fill="#d9655b"/>`;
    default: return `<path d="M44 50 Q50 55.5 56 50" stroke="${ink}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }
}

function beardPart(i, c, rx) {
  const L = 50 - rx, R = 50 + rx;
  switch (OPTS.beard[i]) {
    case 'Stubble': return `<path d="M${L + 1} 44 Q${L + 2} 61 50 62 Q${R - 2} 61 ${R - 1} 44 Q${R - 4} 53 58 55 Q50 47 42 55 Q${L + 4} 53 ${L + 1} 44Z" fill="${c}" opacity=".28"/>`;
    case 'Moustache': return `<path d="M42.5 49.6 Q46 46 50 48 Q54 46 57.5 49.6 Q54 50.2 50 49.4 Q46 50.2 42.5 49.6Z" fill="${c}"/>`;
    case 'Goatee': return `<path d="M43.5 49.4 Q46.5 46.8 50 48.4 Q53.5 46.8 56.5 49.4 Q53 50 50 49.4 Q47 50 43.5 49.4Z" fill="${c}"/><path d="M45 56.5 Q50 55 55 56.5 Q54 62.5 50 63 Q46 62.5 45 56.5Z" fill="${c}"/>`;
    case 'Beard': return `<path d="M${L} 41 Q${L} 64 50 65 Q${R} 64 ${R} 41 Q${R - 2} 51 59 54 Q56 48 50 48 Q44 48 41 54 Q${L + 2} 51 ${L} 41Z" fill="${c}"/>`;
    case 'Chinstrap': return `<path d="M${L} 41 Q${L} 63 50 63.5 Q${R} 63 ${R} 41 Q${R - 2} 59 50 59.5 Q${L + 2} 59 ${L} 41Z" fill="${c}"/>`;
    default: return '';
  }
}

function glassesPart(i) {
  switch (OPTS.glasses[i]) {
    case 'Round': return `<g fill="none" stroke="#1b1512" stroke-width="1.6"><circle cx="42.5" cy="42" r="5.6"/><circle cx="57.5" cy="42" r="5.6"/><path d="M48 41.5 Q50 40 52 41.5 M37 41 L30.5 39.5 M63 41 L69.5 39.5"/></g>`;
    case 'Square': return `<g fill="none" stroke="#1b1512" stroke-width="1.9"><rect x="36" y="37.5" width="12.5" height="9" rx="2"/><rect x="51.5" y="37.5" width="12.5" height="9" rx="2"/><path d="M48.5 41 H51.5 M36 40 L30.5 39 M64 40 L69.5 39"/></g>`;
    case 'Sport': return `<path d="M29.5 41 L36 40" stroke="#1b1b1b" stroke-width="2.6"/><path d="M70.5 41 L64 40" stroke="#1b1b1b" stroke-width="2.6"/>
      <path d="M35.5 38 Q50 35 64.5 38 L63.5 45 Q57 47.5 51.5 44 Q50 43 48.5 44 Q43 47.5 36.5 45Z" fill="#9fe3ff" fill-opacity=".45" stroke="#1b1b1b" stroke-width="1.8"/>`;
    case 'Shades': return `<g fill="#141414" stroke="#141414" stroke-width="1.4"><path d="M36 38.5 H48.5 Q48.5 46.5 42 46.5 Q36 46.5 36 38.5Z"/><path d="M51.5 38.5 H64 Q64 46.5 58 46.5 Q51.5 46.5 51.5 38.5Z"/><path d="M48.5 39.5 H51.5 M36 39 L30.5 38.5 M64 39 L69.5 38.5" fill="none"/></g>
      <path d="M38.5 40.5 L41 40.5" stroke="#fff" stroke-opacity=".5" stroke-width="1.2" stroke-linecap="round"/>`;
    default: return '';
  }
}

// ---------- The figure ----------
// Things a player can hold in the Home team photo, drawn around (50, 88) in front of the jersey.
const TROPHY = `<defs><linearGradient id="avt-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset=".55" stop-color="#e9b949"/><stop offset="1" stop-color="#b9821f"/></linearGradient></defs>
  <path d="M38 70 Q30 70 30 77 Q30 84 39 85 M62 70 Q70 70 70 77 Q70 84 61 85" stroke="#d9a63a" stroke-width="3" fill="none"/>
  <path d="M37 66 H63 V77 Q63 91 50 91 Q37 91 37 77Z" fill="url(#avt-g)"/><path d="M42 70 V80" stroke="#fff6d6" stroke-width="2" stroke-linecap="round" opacity=".8"/>
  <rect x="47.5" y="90" width="5" height="8" fill="#c9922c"/><rect x="40" y="97" width="20" height="5" rx="1.5" fill="#3a2a10"/><rect x="38" y="101.5" width="24" height="6" rx="1.5" fill="url(#avt-g)"/>`;
const BALL = `<circle cx="50" cy="91" r="14" fill="#ee6018"/><path d="M36 91h28M50 77v28M40 81q7 10 0 20M60 81q-7 10 0 20" stroke="#5a2204" stroke-width="1.5" fill="none" opacity=".85"/>`;

// Drawn in a 100 × 104 box with the head at (50, 40). opts.stage draws the player at their height, for the court,
// the Home photo and the player page; round avatars always draw everyone the same size.
// opts.pose ('fist', 'trophy' or 'ball') and opts.crouch are for the Home team photo.
export function figure(raw, opts = {}) {
  const p = cleanLook(raw), num = esc(raw.num);
  const skin = p.skin, sk2 = shade(skin, .14), ink = '#1b1512', brow = shade(p.hair, .2);
  const w = p.weight === 1 ? -1 : p.weight === 2 ? 1 : 0, m = p.muscle === 1 ? -1 : p.muscle === 2 ? 1 : 0;
  // Body: shoulder and hip half-widths, neck, arm size, and a belly for a heavier build.
  const sw = 22 + 2.6 * w + 2.8 * m, hw = 23 + 4.2 * w - (m < 0 ? 2.6 : 1.6 * m), nw = 7 + .9 * w + 1.3 * m, arm = 1 + .1 * w + .2 * m;
  const rx = 21 + 1.4 * Math.max(w, 0) - .6 * Math.max(-w, 0);
  const L = 50 - sw, R = 50 + sw, ax = sw + 3.5 + 1.5 * m;
  const belly = w > 0 ? ` Q${(50 - hw - 5).toFixed(1)} 92 ${(50 - hw).toFixed(1)} 104` : ` L${(50 - hw).toFixed(1)} 104`;
  const bellyR = w > 0 ? `Q${(50 + hw + 5).toFixed(1)} 92 ${(R).toFixed(1)} 78` : `L${R.toFixed(1)} 78`;
  const torso = `M${L.toFixed(1)} 78${belly} L${(50 + hw).toFixed(1)} 104 ${bellyR} Q${(R - 1).toFixed(1)} 70 ${(R - 9).toFixed(1)} 68 L${(50 + nw + 2).toFixed(1)} 67 Q50 77 ${(50 - nw - 2).toFixed(1)} 67 L${(L + 9).toFixed(1)} 68 Q${(L + 1).toFixed(1)} 70 ${L.toFixed(1)} 78Z`;
  const armAt = (x, dir) => {
    const cx = (50 + dir * ax).toFixed(1), erx = (8 * arm).toFixed(1), ery = (9 * arm).toFixed(1);
    const deltoid = m > 0 ? `<ellipse cx="${(50 + dir * (ax - 2)).toFixed(1)}" cy="72" rx="6.5" ry="5.5" fill="${skin}"/>` : '';
    const band = p.wrist ? `<rect x="${(+cx - 8 * arm).toFixed(1)}" y="${(80 + 9 * arm - 6).toFixed(1)}" width="${(16 * arm).toFixed(1)}" height="4.5" rx="2" fill="${p.wrist}"/>` : '';
    return `${deltoid}<ellipse cx="${cx}" cy="80" rx="${erx}" ry="${ery}" fill="${skin}"/>${band}`;
  };
  const headband = p.band ? `<rect x="${50 - rx + .5}" y="27" width="${2 * rx - 1}" height="6" rx="3" fill="${p.band}"/><rect x="${50 - rx + .5}" y="27" width="${2 * rx - 1}" height="1.4" fill="#fff" opacity="${p.band === BANDS[1] ? .25 : .8}"/>` : '';
  const neck = 2 * nw;
  const pose = opts.pose, hand = (x, y) => `<circle cx="${x}" cy="${y}" r="${(5.5 * arm).toFixed(1)}" fill="${skin}"/><path d="M${x - 3} ${y - 2.5} h6" stroke="${sk2}" stroke-width="1"/>`;
  // A raised fist on the right: the arm comes up out of the armhole.
  const fist = `<path d="M${(R - 5).toFixed(1)} 74 Q${(R + 8).toFixed(1)} 64 ${(R + 9).toFixed(1)} 44" stroke="${skin}" stroke-width="${(13 * arm).toFixed(1)}" stroke-linecap="round" fill="none"/>
    ${p.wrist ? `<path d="M${(R + 9 - 7 * arm).toFixed(1)} 47 h${(14 * arm).toFixed(1)}" stroke="${p.wrist}" stroke-width="4.5"/>` : ''}
    <rect x="${(R + 9 - 7.5 * arm).toFixed(1)}" y="${(37 - 7 * arm).toFixed(1)}" width="${(15 * arm).toFixed(1)}" height="${(13 * arm).toFixed(1)}" rx="5" fill="${skin}"/>
    <path d="M${(R + 9 - 4 * arm).toFixed(1)} ${(37 - 7 * arm).toFixed(1)} v4 M${(R + 9).toFixed(1)} ${(37 - 7 * arm).toFixed(1)} v4 M${(R + 9 + 4 * arm).toFixed(1)} ${(37 - 7 * arm).toFixed(1)} v4" stroke="${sk2}" stroke-width="1.2"/>`;
  const held = pose === 'trophy' ? `${TROPHY}${hand(31, 79)}${hand(69, 79)}` : pose === 'ball' ? `${BALL}${hand(36.5, 93)}${hand(63.5, 93)}` : '';
  // Crouching: shorts and knees below the jersey, with white shoes.
  const legs = opts.crouch ? `<path d="M${(50 - hw).toFixed(1)} 100 Q${(50 - hw - 12).toFixed(1)} 104 ${(50 - hw - 13).toFixed(1)} 116 Q${(50 - hw - 8).toFixed(1)} 124 ${(50 - hw + 8).toFixed(1)} 120 L50 110 L${(50 + hw - 8).toFixed(1)} 120 Q${(50 + hw + 8).toFixed(1)} 124 ${(50 + hw + 13).toFixed(1)} 116 Q${(50 + hw + 12).toFixed(1)} 104 ${(50 + hw).toFixed(1)} 100Z" fill="#2648b8"/>
    ${[-1, 1].map(d => `<rect x="${(50 + d * (hw + 6) - 6).toFixed(1)}" y="114" width="12" height="18" rx="5" fill="${skin}"/><rect x="${(50 + d * (hw + 6) - 6).toFixed(1)}" y="127" width="12" height="5" fill="#f2f2f2"/><ellipse cx="${(50 + d * (hw + 6) + d * 2).toFixed(1)}" cy="135" rx="10" ry="5" fill="#f2f2f2"/><path d="M${(50 + d * (hw + 6) - 6).toFixed(1)} 136 h14" stroke="#c9c9c9" stroke-width="1.2"/>`).join('')}` : '';
  const body = `<g class="av-fig">
    ${legs}${armAt(L, -1)}${pose === 'fist' ? fist : armAt(R, 1)}
    <rect x="${50 - nw}" y="56" width="${neck}" height="14" rx="4" fill="${skin}"/><path d="M${50 - nw} 60 Q50 66 ${50 + nw} 60 V58 H${50 - nw}Z" fill="${sk2}" opacity=".7"/>
    <path d="${torso}" fill="#2f55d4"/>
    <path d="M${(50 - nw - 2).toFixed(1)} 67 Q50 77 ${(50 + nw + 2).toFixed(1)} 67" stroke="#fff" stroke-width="2.6" fill="none"/>
    <path d="M${(L + 9).toFixed(1)} 68 Q${(L + 3).toFixed(1)} 73 ${(L + 2).toFixed(1)} 82 M${(R - 9).toFixed(1)} 68 Q${(R - 3).toFixed(1)} 73 ${(R - 2).toFixed(1)} 82" stroke="#fff" stroke-width="2.2" fill="none"/>
    <text x="50" y="96" text-anchor="middle" font-family="Geist, system-ui, sans-serif" font-weight="700" font-size="15" fill="#fff" stroke="#1c3896" stroke-width=".6">${num}</text>
    <g class="av-head">
      ${OPTS.style[p.style] === 'Long' ? `<path d="M27 58 Q25 40 32 32 L68 32 Q75 40 73 58Z" fill="${shade(p.hair, .25)}"/>` : ''}
      <circle cx="${50 - rx + 1}" cy="43" r="4.5" fill="${skin}"/><circle cx="${50 + rx - 1}" cy="43" r="4.5" fill="${skin}"/>
      <circle cx="${50 - rx + 1}" cy="43.5" r="2" fill="${sk2}"/><circle cx="${50 + rx - 1}" cy="43.5" r="2" fill="${sk2}"/>
      <ellipse cx="50" cy="40" rx="${rx}" ry="21" fill="${skin}"/>
      ${w > 0 ? `<path d="M43 59.6 Q50 62.4 57 59.6" stroke="${sk2}" stroke-width="1.4" fill="none" stroke-linecap="round"/>` : ''}
      ${beardPart(p.beard, p.hair, rx)}
      ${rx === 21 ? hairPart(p.style, p.hair) : `<g transform="translate(50 0) scale(${(rx / 21).toFixed(3)} 1) translate(-50 0)">${hairPart(p.style, p.hair)}</g>`}${headband}
      ${browsPart(p.brows, brow)}
      <g class="av-eyes">${eyesPart(p.eyes, ink)}</g>
      <ellipse cx="50" cy="46.6" rx="1.7" ry="1.1" fill="${sk2}"/>
      <ellipse cx="37" cy="49" rx="3.2" ry="2" fill="#e8846a" opacity=".35"/><ellipse cx="63" cy="49" rx="3.2" ry="2" fill="#e8846a" opacity=".35"/>
      ${mouthPart(p.mouth, ink)}
      ${glassesPart(p.glasses)}
    </g>${held}</g>`;
  const h = HEIGHT[p.height];
  return opts.stage && h !== 1 ? `<g transform="translate(50 104) scale(${h}) translate(-50 -104)">${body}</g>` : body;
}
