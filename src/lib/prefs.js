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
