// Sound effects, made on the spot with the Web Audio API: no audio files to download, so nothing lags.
// The "soft" set Geoff picked from the sound board preview. Phones and iPads only allow audio after a tap, so the
// audio engine starts on the first tap anywhere. The phone's silent switch mutes these sounds, which is on purpose.
// sfx(name, ms) plays a sound now, or ms from now (so it can land with an animation on court).
const KEY = 'bh-sound-v1';
let on = true;
try { on = localStorage.getItem(KEY) !== 'off'; } catch (e) { /* ignore */ }
export const soundOn = () => on;
export function setSound(v) {
  on = !!v;
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { /* ignore */ }
  if (out) out.gain.value = on ? VOL : 0;
}

const VOL = 0.7;
let ctx = null, out = null, nbuf = null;
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    out = ctx.createGain(); out.gain.value = on ? VOL : 0;
    const comp = ctx.createDynamicsCompressor();
    out.connect(comp); comp.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
// Start (or wake) the engine inside the first tap, as iOS requires.
if (typeof window !== 'undefined') {
  const wake = () => { if (on) audio(); };
  addEventListener('pointerdown', wake, { capture: true, passive: true });
  addEventListener('keydown', wake, { capture: true });
}

// One note: a quick attack, then an exponential fade, with an optional pitch slide and wobble.
function tone({ f, to, t = 0, d = 0.1, type = 'sine', v = 0.3, vib = 0 }) {
  const now = ctx.currentTime + t, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, now);
  if (to) o.frequency.exponentialRampToValueAtTime(to, now + d);
  if (vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 18; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(now); l.stop(now + d + 0.05); }
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(v, now + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, now + d);
  o.connect(g); g.connect(out);
  o.start(now); o.stop(now + d + 0.02);
}
// Filtered noise: swishes, whooshes, the crowd.
function noise({ t = 0, d = 0.2, f = 2000, to, q = 1, v = 0.3, kind = 'bandpass', swell = false }) {
  if (!nbuf) {
    nbuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const ch = nbuf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  }
  const now = ctx.currentTime + t, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = nbuf; fl.type = kind; fl.Q.value = q;
  fl.frequency.setValueAtTime(f, now);
  if (to) fl.frequency.exponentialRampToValueAtTime(to, now + d);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(v, now + (swell ? d * 0.35 : 0.008));
  g.gain.exponentialRampToValueAtTime(0.0001, now + d);
  s.connect(fl); fl.connect(g); g.connect(out);
  s.start(now, Math.random()); s.stop(now + d + 0.05);
}

const N = { G4: 392, A4: 440, Bb4: 466.16, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, E6: 1318.5 };
const arp = (notes, t = 0, step = 0.07, d = 0.14, v = 0.28) => notes.forEach((f, i) => tone({ f, t: t + i * step, d, v }));
const swish = (t = 0, v = 0.35) => noise({ t, d: 0.32, f: 7000, to: 1500, q: 0.8, v, swell: true });
const thud = (t = 0, v = 0.5) => { tone({ f: 150, to: 55, t, d: 0.14, v }); noise({ t, d: 0.05, f: 400, v: v * 0.4, kind: 'lowpass' }); };
const clank = (t = 0) => { [523, 741, 1109, 1567].forEach((f, i) => tone({ f, t, d: 0.28 - i * 0.04, type: 'triangle', v: 0.12 })); noise({ t, d: 0.06, f: 3000, v: 0.2 }); };
const crowd = (t = 0, d = 1.2, v = 0.18) => { noise({ t, d, f: 1100, q: 0.6, v, swell: true }); noise({ t: t + 0.05, d: d * 0.9, f: 2200, q: 1.2, v: v * 0.6, swell: true }); };

const SOUNDS = {
  // Buttons and screens: short and quiet, like a click.
  tap: () => tone({ f: 1900, d: 0.03, v: 0.12 }),
  select: () => tone({ f: 880, to: 1320, d: 0.06, v: 0.14 }),
  open: () => tone({ f: 500, to: 900, d: 0.09, v: 0.12 }),
  close: () => tone({ f: 900, to: 500, d: 0.09, v: 0.12 }),
  undo: () => { tone({ f: N.E5, d: 0.06, v: 0.14 }); tone({ f: N.C5, t: 0.06, d: 0.09, v: 0.14 }); },
  save: () => { arp([N.C5, N.E5, N.G5], 0, 0.08, 0.12, 0.2); tone({ f: N.C6, t: 0.24, d: 0.35, v: 0.22 }); },
  pinOk: () => { tone({ f: N.G5, d: 0.07, v: 0.16 }); tone({ f: N.C6, t: 0.07, d: 0.14, v: 0.16 }); },
  pinBad: () => { tone({ f: 140, d: 0.12, v: 0.25, type: 'square' }); tone({ f: 120, t: 0.15, d: 0.18, v: 0.25, type: 'square' }); },
  // Avatars
  // A camera shutter: a quick double click.
  shutter: () => { noise({ d: 0.03, f: 3500, q: 1.5, v: 0.3 }); noise({ t: 0.07, d: 0.04, f: 2500, q: 1.5, v: 0.25 }); },
  boing: () => tone({ f: 220, to: 660, d: 0.22, v: 0.3, vib: 25 }),
  blip: () => { tone({ f: N.B5, d: 0.07, v: 0.2 }); tone({ f: N.E6, t: 0.07, d: 0.16, v: 0.2 }); },
  trick: () => arp([N.C5, N.D5, N.E5, N.G5, N.C6, N.E6], 0, 0.045, 0.09, 0.18),
  dribble: () => thud(),
  cheer: () => crowd(0, 1.6, 0.22),
  trophy: () => { arp([N.G4, N.C5, N.E5, N.G5], 0, 0.11, 0.16, 0.22); tone({ f: N.C6, t: 0.44, d: 0.5, v: 0.22, vib: 6 }); },
  // Pieces of the recording sounds, each played when its moment comes in the court animation.
  swish: () => swish(),
  swishSoft: () => swish(0, 0.28),
  made2: () => arp([N.E5, N.G5], 0, 0.07, 0.12, 0.2),
  made3: () => { arp([N.C5, N.E5, N.G5, N.C6], 0, 0.065, 0.16, 0.22); crowd(0.06, 1.3, 0.14); },
  madeFt: () => tone({ f: N.G5, d: 0.14, v: 0.16 }),
  clank: () => clank(),
  floor: () => thud(0, 0.3),
  hop: () => tone({ f: 300, to: 620, d: 0.12, v: 0.2 }),
  grab: () => { thud(0, 0.4); tone({ f: N.A5, t: 0.08, d: 0.08, v: 0.15 }); },
  pass: () => noise({ d: 0.18, f: 900, to: 4000, q: 2, v: 0.25 }),
  assist: () => { tone({ f: N.C6, d: 0.07, v: 0.16 }); tone({ f: N.E6, t: 0.06, d: 0.12, v: 0.16 }); },
  steal: () => { tone({ f: 400, to: 1800, d: 0.12, v: 0.22 }); noise({ d: 0.1, f: 2500, to: 6000, q: 2, v: 0.18 }); tone({ f: N.G5, t: 0.13, d: 0.1, v: 0.16 }); },
  block: () => { noise({ d: 0.12, f: 1200, q: 0.7, v: 0.55 }); tone({ f: 180, to: 60, d: 0.22, v: 0.4 }); crowd(0.08, 0.9, 0.12); },
  turnover: () => { tone({ f: N.Bb4, d: 0.18, v: 0.2, type: 'triangle' }); tone({ f: N.A4, t: 0.2, d: 0.18, v: 0.2, type: 'triangle' }); tone({ f: 415.3, to: 370, t: 0.4, d: 0.45, v: 0.2, type: 'triangle', vib: 9 }); },
  roll: () => thud(0, 0.25),
};

export function sfx(name, ms = 0) {
  if (!on || !SOUNDS[name]) return;
  const go = () => { if (on && audio()) { try { SOUNDS[name](); } catch (e) { /* ignore */ } } };
  if (ms > 0) setTimeout(go, ms); else go();
}
