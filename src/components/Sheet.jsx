import { useEffect, useRef } from 'react';
import { S, set } from '../lib/store.js';
import { sfx } from '../lib/sfx.js';

// A sheet over the page. openSheet takes any element; tapping outside the panel closes it.
export const openSheet = (node, opts = {}) => (sfx(S.sheet ? 'tap' : 'open'), set({ sheet: { node, wide: !!opts.wide, key: (S.sheet?.key || 0) + 1 } }));
// closeSheet(true) closes without its own sound, for when a bigger one (Save game, PIN accepted) is already playing.
export const closeSheet = quiet => S.sheet && (quiet !== true && sfx('close'), set({ sheet: null }));

export function SheetRoot() {
  const sh = S.sheet;
  const panel = useRef(null);
  useEffect(() => {
    if (!sh) return;
    const esc = e => { if (e.key === 'Escape') closeSheet(); };
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, [sh]);
  return (
    <div id="sheet-root">
      {sh && (
        <div className="sheet" onClick={e => { if (e.target === e.currentTarget) closeSheet(); }}>
          <div className={`panel${sh.wide ? ' wide' : ''}`} role="dialog" aria-modal="true" ref={panel} key={sh.key}>{sh.node}</div>
        </div>
      )}
    </div>
  );
}
