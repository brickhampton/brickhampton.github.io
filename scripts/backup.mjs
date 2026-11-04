// Nightly backup: reads every public table with the read-only key and writes
//   <dir>/data.json    the data, readable
//   <dir>/restore.sql  paste into the Supabase SQL editor to put the data back exactly as it was
// Usage: node scripts/backup.mjs <dir>
// Run by .github/workflows/backup.yml. Needs nothing secret: the key is the website's public one.
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';

const API = process.env.BH_API || 'https://iwwmtturlbxebaiagscc.supabase.co/rest/v1';
const KEY = process.env.BH_KEY || 'sb_publishable_RVq88Qby-XtccIL-JUwWUw_w5OiMjzC';

// Table, then the columns to sort by, so the same data always makes the same file.
const TABLES = [
  ['seasons', 'code'],
  ['players', 'id'],
  ['season_opponents', 'season,name'],
  ['games', 'id'],
  ['lines', 'game_id,player_id'],
  ['site', 'key'],
];
const PAGE = 500;

async function read(table, order) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${API}/${table}?select=*&order=${order}`, {
      headers: { apikey: KEY, Range: `${from}-${from + PAGE - 1}`, 'Range-Unit': 'items' },
    });
    if (!res.ok && res.status !== 416) throw new Error(`Reading ${table} failed: ${res.status} ${await res.text()}`);
    const page = res.status === 416 ? [] : await res.json();
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

const dir = process.argv[2];
if (!dir) { console.error('Pass the folder to write to: node scripts/backup.mjs backups/2026-11-04'); process.exit(1); }

const data = {};
for (const [t, order] of TABLES) data[t] = await read(t, order);
if (!data.games.length || !data.lines.length || !data.players.length) throw new Error('The database answered with no games, lines or players. Not saving an empty backup.');

const taken = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const json = JSON.stringify(data, null, 1);
// The data goes inside a dollar-quoted string; pick a tag that can't appear in it.
const flat = JSON.stringify(data);
let tag; do tag = 'bk' + randomBytes(6).toString('hex'); while (flat.includes(tag));
const count = t => `${data[t].length} ${t.replace('_', ' ')}`;

const sql = `-- Brickhampton Stats backup taken ${taken}
-- ${count('games')}, ${count('lines')}, ${count('players')}, ${count('seasons')}.
--
-- To restore: Supabase dashboard > SQL Editor > New query, paste this whole file, then Run.
-- It replaces all team data with this backup. The data from just before is saved in
-- Change history first, so Admin > Undo puts it back if this was the wrong day.
-- The Admin PIN is not touched.

do $restore$
declare
  snap jsonb := $${tag}$${flat}$${tag}$;
begin
  perform private.log('Restored the backup from ${taken.slice(0, 10)}');
  perform private.restore(snap);
  delete from public.site where true;
  insert into public.site select * from jsonb_populate_recordset(null::public.site, snap->'site');
end $restore$;

select (select count(*) from public.games) as games, (select count(*) from public.lines) as lines,
       (select count(*) from public.players) as players;
`;

mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'data.json'), json + '\n');
writeFileSync(join(dir, 'restore.sql'), sql);
console.log(`Backed up ${TABLES.map(([t]) => count(t)).join(', ')} to ${dir}`);
