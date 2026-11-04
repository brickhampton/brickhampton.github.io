// Display choices for this device only, kept in the browser like the sound setting.
const KEY = 'bh-reb-split-v1';
let split = false;
try { split = localStorage.getItem(KEY) === 'on'; } catch (e) { /* ignore */ }
// Box scores show OREB and DREB instead of REB, for games that recorded them.
export const rebSplit = () => split;
export function setRebSplit(v) {
  split = !!v;
  try { localStorage.setItem(KEY, split ? 'on' : 'off'); } catch (e) { /* ignore */ }
}

// Shooting stats on the Stats table and player tiles: compact (made-attempts with the % underneath)
// or detailed (separate made, attempts and % columns). Compact by default.
const SHOT_KEY = 'bh-shot-detail-v1';
let detail = false;
try { detail = localStorage.getItem(SHOT_KEY) === 'on'; } catch (e) { /* ignore */ }
export const shotDetail = () => detail;
export function setShotDetail(v) {
  detail = !!v;
  try { localStorage.setItem(SHOT_KEY, detail ? 'on' : 'off'); } catch (e) { /* ignore */ }
}
