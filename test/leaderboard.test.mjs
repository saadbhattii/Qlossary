import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { checkScore, nameProblem, topScores, addScore, hashIp, MAX_PER_WORD, RATE_PER_HOUR } from '../lib/leaderboard.js';
import { openLocalD1, toPlainPlaceholders } from '../tools/d1-local.mjs';
import { ROOT } from '../tools/tsv.mjs';
import * as boardFn from '../functions/api/leaderboard.js';
import * as scoresFn from '../functions/api/scores.js';

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
  assert.deepEqual(await addScore(db, v(300), 'ip1'), { rank: 1 });
  assert.deepEqual(await addScore(db, v(500), 'ip1'), { rank: 1 });
  assert.deepEqual(await addScore(db, v(400), 'ip1'), { rank: 2 });
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
  assert.deepEqual(await res.json(), { rank: 1 });
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
