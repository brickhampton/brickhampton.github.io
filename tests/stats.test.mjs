// Checks the maths behind the stats: PER, true shooting, totals, Player of the game, badges, and the
// guard that stops a game being saved twice. Run with `npm test`. Every pull request and deploy runs these,
// so a broken formula is caught before it reaches the site.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { S } from '../src/lib/store.js';
import { calc, sumRows, perTxt, allGames, playerAgg, playerBadges, statPlayers } from '../src/lib/core.js';
import { playerOfGame } from '../src/lib/potg.js';
import { rec, startSetup, change, savedCopy, countsFor, clearRecording } from '../src/lib/record.js';
import { PLAYERS, GUESTS, HIST, BASE_SEASONS } from '../src/data/seed.js';

const KEYS = ['m2', 'a2', 'm3', 'a3', 'ftm', 'fta', 'reb', 'ast', 'stl', 'blk', 'to'];
const line = a => Object.fromEntries(KEYS.map((k, i) => [k, a[i]]));
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} should be ${b}`);

// The imported history, in the same shape the site loads from the database.
function useHistory() {
  Object.assign(S, {
    seasons: BASE_SEASONS, current: 'S26', subPages: false,
    roster: PLAYERS.map(p => ({ ...p })), subs: GUESTS.map(p => ({ ...p })),
    games: HIST.map(([season, no, date, opp, rows]) => ({
      id: `${season}-${no}`, season, no, date, opp, result: 'U', recorded: false, nums: {},
      rows: Object.fromEntries(Object.entries(rows).map(([id, a]) => [id, line(a)])),
    })),
  });
}

test('PER with total rebounds (older games): 0.75 a rebound', () => {
  // J. Yao, W24 Game 1: 2/10 twos, 4/6 threes, 11 REB, 7 STL, 1 BLK, 3 TO.
  const s = calc(line([2, 10, 4, 6, 0, 0, 11, 0, 7, 1, 3]));
  assert.equal(s.pts, 16);
  near(s.per, 16 + 0.75 * 11 + 1.5 * 7 + 1.5 * 1 - 8 - 2 - 3);
});

test('PER with offensive and defensive rebounds: 1 and 0.5', () => {
  const s = calc({ m2: 3, a2: 5, m3: 1, a3: 4, ftm: 2, fta: 3, oreb: 3, dreb: 5, ast: 4, stl: 2, blk: 1, to: 3 });
  assert.equal(s.pts, 11);
  assert.equal(s.reb, 8);
  near(s.per, 11 + 3 + 2.5 + 6 + 3 + 1.5 - 2 - 3 - 1 - 3);
});

test('True shooting: points / (2 × (FGA + 0.44 × FTA)), and none without attempts', () => {
  const s = calc(line([3, 5, 1, 4, 2, 3, 0, 0, 0, 0, 0]));
  near(s.tsa, 9 + 0.44 * 3);
  near(s.ts, 11 / (2 * (9 + 1.32)));
  assert.equal(calc(line([0, 0, 0, 0, 0, 0, 4, 1, 0, 0, 0])).ts, null);
});

test('Totals add up each game\'s own PER, even mixing old and new games', () => {
  const old = line([2, 10, 4, 6, 0, 0, 11, 0, 7, 1, 3]);
  const now = { m2: 3, a2: 5, m3: 1, a3: 4, ftm: 2, fta: 3, oreb: 3, dreb: 5, ast: 4, stl: 2, blk: 1, to: 3 };
  const t = sumRows([old, now]);
  near(t.per, calc(old).per + calc(now).per);
  assert.equal(t.pts, 27);
  assert.equal(t.reb, 19);
});

test('PER is shown with a + sign and one decimal', () => {
  assert.equal(perTxt(3.46, true), '+3.5');
  assert.equal(perTxt(-2), '−2');
  assert.equal(perTxt(0.04, true), '0.0');
});

test('Every imported game makes sense: made never above attempts, no negative stats', () => {
  useHistory();
  for (const g of S.games) for (const [id, c] of Object.entries(g.rows)) {
    const where = `${g.id} ${id}`;
    for (const k of KEYS) assert.ok(c[k] >= 0, `${where} ${k}`);
    assert.ok(c.m2 <= c.a2 && c.m3 <= c.a3 && c.ftm <= c.fta, `${where} made > attempts`);
    const s = calc(c);
    assert.ok(s.ts === null || s.ts <= 1.5, `${where} TS% ${s.ts}`);
  }
  assert.equal(S.games.length, 81);
  assert.equal(allGames().length, 77); // S24 Games 2, 4, 7 and 10 have no stats
});

test('Player of the game is one of the players in that game, and the clear standout wins', () => {
  useHistory();
  const games = allGames();
  for (const g of games) assert.ok(g.rows[playerOfGame(g, games).id], g.id);
  // A made-up game after the history where one player has a huge night.
  const big = { id: 'S26-99', season: 'S26', no: 99, date: '2026-11-01', opp: 'Test', nums: {},
    rows: { liu: line([1, 6, 0, 2, 0, 0, 2, 1, 0, 0, 2]), lim: line([12, 15, 2, 3, 2, 2, 10, 6, 3, 1, 0]), shan: line([2, 5, 0, 0, 0, 0, 6, 0, 0, 0, 1]) } };
  assert.equal(playerOfGame(big, [...games, big]).id, 'lim');
});

test('Team-best badges go to the starter who leads, ties broken by fewest other badges', () => {
  useHistory();
  const sg = allGames().filter(g => g.season === 'S26');
  const holders = statPlayers().filter(id => playerBadges(id).some(b => b.key === 'pts'));
  assert.ok(holders.length >= 1, 'someone has Bucket getter');
  const pg = id => playerAgg(sg, id)?.pg('pts') ?? -1;
  const top = Math.max(...statPlayers().filter(id => (playerAgg(sg, id)?.gp ?? 0) >= 3).map(pg));
  for (const id of holders) near(pg(id), top);
});

test('A game whose reply was lost is recognised as saved, so it is never saved twice', () => {
  useHistory();
  clearRecording();
  startSetup();
  change(r => {
    r.playing = ['lim', 'shan'];
    r.events.push({ pid: 'lim', a: '2M' }, { pid: 'lim', a: '3X' }, { pid: 'shan', a: 'OR' }, { pid: 'shan', a: 'TO' });
  });
  const { season, no, opp } = rec().game;
  assert.equal(season, 'S26');
  assert.equal(savedCopy(), null, 'not saved yet');
  // The database now has it, exactly as recorded.
  const rows = Object.fromEntries(['lim', 'shan'].map(id => [id, countsFor(id, rec().events)]));
  S.games = [...S.games, { id: `${season}-${no}`, season, no, opp, rows, nums: {} }];
  assert.equal(savedCopy(), `${season}-${no}`);
  // Someone else's game with the same number is not this one.
  S.games[S.games.length - 1] = { id: `${season}-${no}`, season, no, opp, rows: { ...rows, lim: { ...rows.lim, m2: 2, a2: 2 } }, nums: {} };
  assert.equal(savedCopy(), null);
  clearRecording();
});
