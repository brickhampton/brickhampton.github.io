// The player page's backdrop: a small slice of the Home arena behind the player. A dim crowd and the gold rail,
// then the navy floor with the centre circle under the player's feet, all fading into the page at the edges.
// Drawn in the stage's units: the stage is 0-260 across and the player's feet are at (130, 226).
import { crowd } from './homeBg.js';

const X0 = -700, X1 = 1300, W = X1 - X0, FX = 130, FY = 226, TOP = 160;

export const COURT_VIEW = `${X0} 0 ${W} 320`;

export function playerCourt() {
  const rx = 92, ry = 24, ring = (k, o) => `<ellipse cx="${FX}" cy="${FY}" rx="${rx * k}" ry="${ry * k}" fill="none" stroke="#fff" stroke-opacity="${o}" stroke-width="1.6"/>`;
  const defs = `<linearGradient id="pc-floor" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#151a2a" stop-opacity="0"/><stop offset=".25" stop-color="#151a2a"/><stop offset="1" stop-color="#0c0e15"/></linearGradient>
    <linearGradient id="pc-haze" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#0b0c12" stop-opacity="0"/><stop offset=".35" stop-color="#0b0c12"/><stop offset="1" stop-color="#0b0c12" stop-opacity=".1"/></linearGradient>
    <linearGradient id="pc-wall" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#0b0c12" stop-opacity="0"/><stop offset=".4" stop-color="#0b0c12"/></linearGradient>
    <radialGradient id="pc-pool" cx="${FX}" cy="${FY}" r="190" gradientUnits="userSpaceOnUse" gradientTransform="translate(${FX} ${FY}) scale(1 .32) translate(-${FX} -${FY})"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".7" stop-color="#cfdcff" stop-opacity=".07"/><stop offset="1" stop-color="#cfdcff" stop-opacity="0"/></radialGradient>
    <radialGradient id="pc-fade" cx="${FX}" cy="150" r="620" gradientUnits="userSpaceOnUse" gradientTransform="translate(${FX} 150) scale(1 .5) translate(-${FX} -150)"><stop offset=".15" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <mask id="pc-mask" maskUnits="userSpaceOnUse" x="${X0}" y="0" width="${W}" height="320"><rect x="${X0}" y="0" width="${W}" height="320" fill="url(#pc-fade)"/></mask>`;
  const stands = `<rect x="${X0}" y="40" width="${W}" height="${TOP - 40}" fill="url(#pc-wall)"/>`
    + crowd({ x0: X0, x1: X1, yb: TOP - 12, rows: 5, gap: 11, size: 6, seed: 9 })
    + `<rect x="${X0}" y="${TOP - 10}" width="${W}" height="10" fill="#14224f"/><rect x="${X0}" y="${TOP - 10}" width="${W}" height="1.5" fill="#e9b949" opacity=".5"/>`
    + `<rect x="${X0}" y="40" width="${W}" height="${TOP - 40}" fill="url(#pc-haze)"/>`;
  const floor = `<rect x="${X0}" y="${TOP}" width="${W}" height="${320 - TOP}" fill="url(#pc-floor)"/>`
    + `<ellipse cx="${FX}" cy="${FY}" rx="${rx}" ry="${ry}" fill="#2f55d4" fill-opacity=".22"/>${ring(1, .22)}${ring(.3, .18)}`
    + `<path d="M${FX} ${TOP}V320" stroke="#fff" stroke-opacity=".18" stroke-width="1.6"/>`
    + `<ellipse cx="${FX}" cy="${FY}" rx="200" ry="64" fill="url(#pc-pool)"/>`;
  return `<defs>${defs}</defs><g mask="url(#pc-mask)">${stands}${floor}</g>`;
}
