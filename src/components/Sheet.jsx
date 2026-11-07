import { useEffect, useRef, useState } from 'react';
import { S, set } from '../lib/store.js';
import { sfx } from '../lib/sfx.js';

// A sheet over the page. openSheet takes any element; tapping outside the panel closes it.
export const openSheet = (node, opts = {}) => (sfx(S.sheet ? 'tap' : 'open'), set({ sheet: { node, wide: !!opts.wide, cls: opts.cls || '', key: (S.sheet?.key || 0) + 1 } }));
// closeSheet(true) closes without its own sound, for when a bigger one (Save game, PIN accepted) is already playing.
export const closeSheet = quiet => S.sheet && (quiet !== true && sfx('close'), set({ sheet: null }));

export const errText = e => e.locked ? 'Admin mode locked itself. Unlock it again to make changes.' : e.message;

// A sheet's Save button: runs the change, closes on success, shows the problem otherwise.
export function useSave() {
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const run = async (fn, after) => { setBusy(true); setErr(''); try { const r = await fn(); closeSheet(); after?.(r); } catch (e) { setErr(errText(e)); setBusy(false); } };
  return { err, setErr, busy, run };
}

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
          <div className={`panel${sh.wide ? ' wide' : ''}${sh.cls ? ' ' + sh.cls : ''}`} role="dialog" aria-modal="true" ref={panel} key={sh.key}>{sh.node}</div>
        </div>
      )}
    </div>
  );
}
