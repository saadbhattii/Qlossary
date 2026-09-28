import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { checkScore, nameProblem, topScores, addScore, activity, weekStart, dayBefore, hashIp, MAX_PER_WORD, RATE_PER_HOUR } from '../lib/leaderboard.js';
import { openLocalD1, toPlainPlaceholders } from '../tools/d1-local.mjs';
import { ROOT } from '../tools/tsv.mjs';
import * as boardFn from '../functions/api/leaderboard.js';
import * as scoresFn from '../functions/api/scores.js';
import * as activityFn from '../functions/api/activity.js';

const DAY = '2026-09-28';
const base = (over = {}) => Object.assign({ mode: 'run', name: 'Amir', pts: [100, 0, 250, 0, 0, 90, 0, 0, 0, 10], won: 4, day: DAY, cid: 'abcdef12-3456' }, over);

test('a normal finished game passes', () => {
  const r = checkScore(base(), DAY);
  assert.ok(r.value, r.error);
  assert.equal(r.value.score, 450);
  assert.equal(r.value.played, 10);
});

test('impossible or unfinished games are refused', () => {
  assert.match(checkScore(base({ pts: [MAX_PER_WORD + 1, 0, 0, 0, 0, 0, 0, 0, 0, 0] }), DAY).error, /more points/);
  assert.match(checkScore(base({ pts: [100, 100] }), DAY).error, /finished/);
  assert.match(checkScore(base({ won: 2 }), DAY).error, /add up/);
  assert.match(checkScore(base({ won: 11 }), DAY).error, /add up/);
  assert.match(checkScore(base({ pts: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], won: 0 }), DAY).error, /points/);
  assert.match(checkScore(base({ day: '2026-09-27' }), DAY).error, /different day/);
  assert.match(checkScore(base({ mode: 'weekly' }), DAY).error, /mode/);
  assert.match(checkScore(base({ pts: [1.5, 0, 0, 0, 0, 0, 0, 0, 0, 0], won: 1 }), DAY).error, /more points/);
  assert.match(checkScore(base({ cid: 'x' }), DAY).error, /browser/);
});

test('endless games end after three misses', () => {
  assert.ok(checkScore(base({ mode: 'endless', pts: [50, 0, 60, 0, 0], won: 2 }), DAY).value);
  assert.match(checkScore(base({ mode: 'endless', pts: [50, 0, 0, 0, 0], won: 1 }), DAY).error, /three|3/);
});

test('names are checked', () => {
  assert.equal(nameProblem('Amir K.'), '');
  assert.match(nameProblem(''), /Enter a name/);
  assert.match(nameProblem('a'.repeat(13)), /at most 12/);
  assert.match(nameProblem('<b>hi</b>'), /only letters/);
  assert.match(nameProblem('Nazi99'), /different name/);
});

test('the browser checks names the same way as the server', async () => {
  globalThis.window = {};
  globalThis.localStorage = { getItem: () => null, setItem: () => {} };
  const { worldNameProblem } = await import('../src/js/world.js');
  for (const n of ['Amir K.', '', 'a'.repeat(13), '<b>hi</b>', ' lead', 'x_y-z.1']) {
    assert.equal(worldNameProblem(n) === '', nameProblem(n) === '', 'disagree on ' + JSON.stringify(n));
  }
});

test('numbered placeholders become plain ones, for every Node version', () => {
  assert.deepEqual(toPlainPlaceholders('SELECT a FROM t WHERE x = ?1 AND y > ?2'),
    { sql: 'SELECT a FROM t WHERE x = ? AND y > ?', order: [0, 1] });
  assert.deepEqual(toPlainPlaceholders('SELECT ?2, ?1, ?2').order, [1, 0, 1]);
  assert.deepEqual(toPlainPlaceholders('SELECT 1').order, []);
});

test('scores are stored, ranked and limited, with real SQL', async () => {
  const db = await openLocalD1(':memory:', join(ROOT, 'migrations'));
  const v = n => checkScore(base({ name: 'P' + n, pts: [n, 0, 0, 0, 0, 0, 0, 0, 0, 0], won: 1, cid: 'client-' + n }), DAY).value;
  assert.equal((await addScore(db, v(300), 'ip1')).rank, 1);
  assert.equal((await addScore(db, v(500), 'ip1')).rank, 1);
  assert.equal((await addScore(db, v(400), 'ip1')).rank, 2);
  const top = await topScores(db, 'run', DAY);
  assert.deepEqual(top.map(e => e.score), [500, 400, 300]);
  assert.equal(top[0].name, 'P500');

  // one daily per browser per day
  const d = checkScore(base({ mode: 'daily', pts: [100, 0, 0, 0, 0], won: 1 }), DAY).value;
  assert.ok((await addScore(db, d, 'ip2')).rank);
  assert.equal((await addScore(db, d, 'ip2')).status, 409);
  assert.equal((await topScores(db, 'daily', DAY)).length, 1);
  assert.equal((await topScores(db, 'daily', '2026-09-29')).length, 0);

  // at most RATE_PER_HOUR per connection per hour
  for (let i = 0; i < RATE_PER_HOUR; i++) await addScore(db, v(10 + i), 'ip3');
  assert.equal((await addScore(db, v(99), 'ip3')).status, 429);
});

// The 17 real entries of 28 September 2026.
const REAL = [
  [1, 'daily', 'silly-qubit', 709, '6c16'], [2, 'run', 'silly-qubit', 1119, '6c16'], [3, 'run', 'ratatata', 599, '493a'],
  [4, 'run', 'transmon', 1211, '6c16'], [5, 'run', 'shor', 388, '493a'], [6, 'run', 'iLoveQuantum', 1841, 'ff6c'],
  [7, 'run', 'KP', 1791, '9486'], [8, 'run', 'QUOPS', 2451, 'bfee'], [9, 'run', 'QUOPS', 1880, 'bfee'],
  [10, 'run', 'JP', 1545, '97bb'], [11, 'daily', 'JP', 1388, '97bb'], [12, 'run', 'Cane', 1905, 'c938'], [13, 'run', 'Cane', 2346, 'c938'],
  [14, 'run', 'clausia', 1653, 'c4a8'], [15, 'run', 'clausia', 1976, 'c4a8'], [16, 'run', 'clausia', 1702, 'c4a8'], [17, 'run', 'clausia', 1944, 'c4a8'],
];
async function realDb(day = DAY) {
  const db = await openLocalD1(':memory:', join(ROOT, 'migrations'));
  const ins = db.raw.prepare('INSERT INTO scores (id, mode, name, score, won, played, day, created, cid, ip) VALUES (?, ?, ?, ?, 5, 10, ?, ?, ?, ?)');
  for (const [id, mode, name, score, cid] of REAL) ins.run(id, mode, name, score, day, id * 1000, cid + '-browser', 'ip');
  return db;
}

test('weeks start on Monday, UTC', () => {
  assert.equal(weekStart('2026-09-28'), '2026-09-28'); // a Monday
  assert.equal(weekStart('2026-10-04'), '2026-09-28'); // the Sunday after
  assert.equal(weekStart('2026-10-05'), '2026-10-05');
  assert.equal(dayBefore('2026-10-01'), '2026-09-30');
});

test('the all-time total adds every game of a player, across game types', async () => {
  const db = await realDb();
  const total = await topScores(db, 'total', DAY);
  assert.deepEqual(total.slice(0, 5).map(e => [e.name, e.score, e.games]), [
    ['clausia', 7275, 4], ['QUOPS', 4331, 2], ['Cane', 4251, 2], ['JP', 2933, 2], ['iLoveQuantum', 1841, 1]]);
  // silly-qubit's daily and 10-word games count together; same-browser names stay separate.
  assert.ok(total.some(e => e.name === 'silly-qubit' && e.score === 1828));
  assert.ok(total.some(e => e.name === 'transmon' && e.score === 1211));
  // Per-game lists are unchanged: every submission, highest first.
  assert.deepEqual((await topScores(db, 'run', DAY)).slice(0, 4).map(e => e.name + ' ' + e.score),
    ['QUOPS 2451', 'Cane 2346', 'clausia 1976', 'clausia 1944']);
});

test('this week only counts games since Monday', async () => {
  const db = await realDb('2026-09-21'); // all 17 entries a week earlier
  db.raw.prepare("INSERT INTO scores (mode, name, score, won, played, day, created, cid, ip) VALUES ('run', 'KP', 900, 3, 10, ?, 99000, '9486-browser', 'ip')").run(DAY);
  const week = await topScores(db, 'week', DAY);
  assert.deepEqual(week.map(e => [e.name, e.score]), [['KP', 900]]);
  assert.equal((await topScores(db, 'total', DAY))[0].name, 'clausia');
});

test('a browser sees its own rows marked, and no browser IDs are returned', async () => {
  const db = await realDb();
  const total = await topScores(db, 'total', DAY, 'c4a8-browser');
  assert.deepEqual(total.filter(e => e.you).map(e => e.name), ['clausia']);
  assert.ok(total.every(e => !('cid' in e)));
  const runs = await topScores(db, 'run', DAY, '6c16-browser');
  assert.deepEqual(runs.filter(e => e.you).map(e => e.name).sort(), ['silly-qubit', 'transmon']);
  const act = await activity(db, DAY, 'c4a8-browser');
  assert.ok(act.recent.every(e => !('cid' in e)));
});

test('recent games, yesterday\'s daily champion and players today', async () => {
  const db = await realDb();
  db.raw.prepare("INSERT INTO scores (mode, name, score, won, played, day, created, cid, ip) VALUES ('daily', 'Ada', 1500, 5, 5, '2026-09-27', 500, 'ada-browser', 'ip')").run();
  db.raw.prepare("INSERT INTO scores (mode, name, score, won, played, day, created, cid, ip) VALUES ('daily', 'Bob', 900, 3, 5, '2026-09-27', 600, 'bob-browser', 'ip')").run();
  const a = await activity(db, DAY, 'c4a8-browser', 20000);
  assert.deepEqual(a.recent.map(r => r.name + ' ' + r.score), ['clausia 1944', 'clausia 1702', 'clausia 1976', 'clausia 1653', 'Cane 2346']);
  assert.ok(a.recent[0].you);
  assert.deepEqual(a.champion, { name: 'Ada', score: 1500, day: '2026-09-27' });
  assert.equal(a.playersToday, 10); // 10 name-and-browser pairs on 28 September
  assert.equal(a.now, 20000);
});

test('after adding a score: total, rank, the player just above, personal best', async () => {
  const db = await realDb();
  const game = (name, cid, pts, mode = 'run') => checkScore(base({ name, cid, pts, won: pts.filter(p => p > 0).length, mode }), DAY).value;
  // KP (1,791) plays again: total 2,791, and Cane is next above.
  let r = await addScore(db, game('KP', '9486-browser', [500, 500, 0, 0, 0, 0, 0, 0, 0, 0]), 'ipk');
  assert.deepEqual(r.total, { points: 2791, games: 2, rank: 5, next: { name: 'JP', gap: 142 } });
  assert.equal(r.personalBest, false);
  // A better game than before is a personal best.
  r = await addScore(db, game('KP', '9486-browser', [1000, 900, 0, 0, 0, 0, 0, 0, 0, 0]), 'ipk');
  assert.equal(r.personalBest, true);
  assert.equal(r.total.points, 4691);
  assert.deepEqual(r.total.next, { name: 'clausia', gap: 7275 - 4691 });
  // A first game in a type is not called a personal best.
  r = await addScore(db, game('KP', '9486-browser', [100, 0, 0, 0, 0], 'daily'), 'ipk');
  assert.equal(r.personalBest, false);
  // The leader has nobody above.
  r = await addScore(db, game('clausia', 'c4a8-browser', [10, 0, 0, 0, 0, 0, 0, 0, 0, 0]), 'ipc');
  assert.deepEqual(r.total, { points: 7285, games: 5, rank: 1, next: null });
});

test('the activity and leaderboard functions answer correctly', async () => {
  const DB = await realDb(new Date().toISOString().slice(0, 10));
  const env = { DB };
  let res = await activityFn.onRequestGet({ env, request: new Request('http://x/api/activity?me=c4a8-browser') });
  assert.equal(res.status, 200);
  const a = await res.json();
  assert.equal(a.recent.length, 5);
  assert.ok(a.recent[0].you);
  res = await boardFn.onRequestGet({ env, request: new Request('http://x/api/leaderboard?board=total&me=c4a8-browser') });
  const t = await res.json();
  assert.equal(t.entries[0].name, 'clausia');
  assert.ok(t.entries[0].you);
  // The older mode= form still works, for pages built before the totals.
  res = await boardFn.onRequestGet({ env, request: new Request('http://x/api/leaderboard?mode=run') });
  assert.equal(res.status, 200);
  res = await activityFn.onRequestGet({ env: {}, request: new Request('http://x/api/activity') });
  assert.equal(res.status, 503);
});

test('IP addresses are hashed, and the hash changes daily', async () => {
  const a = await hashIp('1.2.3.4', DAY), b = await hashIp('1.2.3.4', '2026-09-29');
  assert.equal(a.length, 32);
  assert.notEqual(a, b);
  assert.ok(!a.includes('1.2.3.4'));
});

test('the Pages Functions answer correctly', async () => {
  const DB = await openLocalD1(':memory:', join(ROOT, 'migrations'));
  const env = { DB };
  const today = new Date().toISOString().slice(0, 10);
  const post = body => scoresFn.onRequestPost({ env, request: new Request('http://x/api/scores', {
    method: 'POST', body: JSON.stringify(body), headers: { 'CF-Connecting-IP': '9.9.9.9' } }) });

  let res = await post(base({ day: today }));
  assert.equal(res.status, 200);
  const sent = await res.json();
  assert.equal(sent.rank, 1);
  assert.deepEqual(sent.total, { points: 450, games: 1, rank: 1, next: null });
  res = await post(base({ day: today, pts: [5] }));
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /finished/);

  res = await boardFn.onRequestGet({ env, request: new Request('http://x/api/leaderboard?mode=run') });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).entries[0].name, 'Amir');
  res = await boardFn.onRequestGet({ env, request: new Request('http://x/api/leaderboard?mode=nope') });
  assert.equal(res.status, 400);
  res = await boardFn.onRequestGet({ env: {}, request: new Request('http://x/api/leaderboard?mode=run') });
  assert.equal(res.status, 503);
});
