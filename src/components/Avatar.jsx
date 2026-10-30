import { P } from '../lib/core.js';
import { figure } from '../lib/avatar.js';

// Cartoon players in the team jersey with their number, drawn from each player's look (see lib/avatar.js).
export { figure };

// A round avatar. Tapping one on Games, a game page or Stats opens that player's page.
export function Avatar({ id, num, look }) {
  const base = P(id);
  if (!base) return null;
  const p = { ...base, ...look, ...(num === undefined ? {} : { num }) };
  return <div className="av-wrap" data-av={p.id} dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 100 100" aria-hidden="true">${figure(p)}</svg>` }} />;
}
