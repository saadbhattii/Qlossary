import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guessLetter, lettersOf, mask, termKey } from '../src/js/normalize.js';
import { newRound, guess, revealLetter, canRevealLetter, frame, missing } from '../src/js/round.js';
import { scoreWord, autoSeconds } from '../src/js/score.js';
import { pickNext, dailyTerms } from '../src/js/pick.js';
import { seeded } from '../src/js/rng.js';
import { makeTimer } from '../src/js/timer.js';
import { parseData } from '../src/js/data.js';
import { difficulty } from '../tools/build.mjs';

test('accented letters fold to A-Z', () => {
  assert.equal(guessLetter('ö'), 'O');
  assert.equal(guessLetter('ø'), 'O');
  assert.equal(guessLetter('ł'), 'L');
  assert.equal(guessLetter('é'), 'E');
  assert.equal(guessLetter('-'), '');
  assert.equal(guessLetter('4'), '');
  assert.deepEqual([...lettersOf('Mølmer–Sørensen gate')].sort(), ['A', 'E', 'G', 'L', 'M', 'N', 'O', 'R', 'S', 'T']);
});

test('mask shows punctuation and digits, hides letters', () => {
  assert.deepEqual(mask('4K stage', new Set()), [['4', '_'], ['_', '_', '_', '_', '_']]);
  assert.deepEqual(mask('Zero-pi', new Set(['Z', 'I'])), [['Z', '_', '_', '_', '-', '_', 'I']]);
  assert.deepEqual(mask('Schrödinger', new Set(['O'])).join(''), '_,_,_,_,Ö,_,_,_,_,_,_');
});

test('termKey ignores case, accents and punctuation', () => {
  assert.equal(termKey('Mølmer–Sørensen gate'), termKey('molmer sorensen GATE'));
});

test('a round is won when every letter is found', () => {
  const r = newRound({ t: 'Ket vector' }, 6);
  for (const L of 'KETVCOR') guess(r, L);
  assert.ok(r.over && r.won);
});

test('a round is lost after the last life', () => {
  const r = newRound({ t: 'Qubit' }, 6);
  for (const L of 'ACDEFG') guess(r, L);
  assert.ok(r.over && !r.won);
  assert.equal(frame(r), 6);
  assert.equal(guess(r, 'Q'), '');
});

test('repeat guesses do nothing', () => {
  const r = newRound({ t: 'Qubit' }, 6);
  assert.equal(guess(r, 'X'), 'miss');
  assert.equal(guess(r, 'X'), '');
  assert.equal(r.wrong.length, 1);
});

test('gallows scales with more lives', () => {
  const r = newRound({ t: 'Qubit' }, 10);
  for (const L of 'ACDEF') guess(r, L);
  assert.equal(frame(r), 3);
});

test('letter hint never reveals the last missing letter', () => {
  const r = newRound({ t: 'Qubit' }, 6);
  const rng = seeded(1);
  while (canRevealLetter(r)) revealLetter(r, rng);
  assert.equal(missing(r).length, 1);
  assert.equal(r.hints.letter, 4);
  assert.ok(!r.over);
});

test('scoring matches the rules page', () => {
  const s = scoreWord({ won: true, n: 13, diff: 1, secsLeft: 31, wrong: 2, hints: { domain: true, sub: false, letter: 0 } });
  assert.equal(s.total, 195 + 62 - 20 - 25);
  assert.deepEqual([s.base, s.time, s.wrongCost, s.hintCost], [195, 62, 20, 25]);
  assert.equal(scoreWord({ won: false, n: 5, diff: 0, secsLeft: 0, wrong: 6, hints: {} }).total, 0);
  const floor = scoreWord({ won: true, n: 3, diff: 0, secsLeft: 0, wrong: 5, hints: { domain: true, sub: true, letter: 0 } });
  assert.equal(floor.total, 0);
  assert.equal(autoSeconds(5), 55);
  assert.equal(autoSeconds(40), 120);
});

test('difficulty is 0-3', () => {
  assert.equal(difficulty('Qubit'), 0);
  assert.equal(difficulty('Quantum approximate optimization algorithm'), 3);
});

const DATA = parseData([
  'a~A;b~B', 'sa~0;sb~1',
  'Alpha term|0|0|', 'Beta term|0|0|', 'Gamma term|0|0|', 'Delta term|1|0|AT',
].join('\n'));

test('pool never repeats until exhausted, then refills', () => {
  const seen = new Set();
  const rng = seeded(7);
  const got = [];
  for (let i = 0; i < 4; i++) { const { term, reset } = pickNext(DATA.terms, seen, rng, false); assert.ok(!reset); seen.add(term.key); got.push(term.t); }
  assert.equal(new Set(got).size, 4);
  const { reset } = pickNext(DATA.terms, seen, rng, false);
  assert.ok(reset);
});

test('balanced draw favours bigger topics, but only by the square root of their size', () => {
  // Sample list: topic A has 3 terms, topic B has 1. B's chance: 1 / (1 + sqrt 3) = 36.6%.
  const rng = seeded(3);
  let b = 0;
  for (let i = 0; i < 4000; i++) if (pickNext(DATA.terms, new Set(), rng, true).term.d === 1) b++;
  assert.ok(b > 1350 && b < 1580, 'topic B picked ' + b + ' of 4000, expected about 1464');
});

test('a 443-term topic comes up about 4 times as often as a 25-term one, not 18 times', () => {
  const big = Array.from({ length: 443 }, (_, i) => ({ key: 'h' + i, d: 0 }));
  const small = Array.from({ length: 25 }, (_, i) => ({ key: 's' + i, d: 1 }));
  const rng = seeded(11);
  let s = 0;
  for (let i = 0; i < 20000; i++) if (pickNext(big.concat(small), new Set(), rng, true).term.d === 1) s++;
  // sqrt(25) / (sqrt(25) + sqrt(443)) = 19.2%; equal shares would be 50%, shares by size 5.3%.
  assert.ok(s > 0.18 * 20000 && s < 0.205 * 20000, 'small topic picked ' + s + ' of 20000');
});

test('with balance off, every unseen term is equally likely', () => {
  const rng = seeded(5);
  let b = 0;
  for (let i = 0; i < 4000; i++) if (pickNext(DATA.terms, new Set(), rng, false).term.d === 1) b++;
  assert.ok(b > 880 && b < 1120, 'topic B (1 of 4 terms) picked ' + b + ' of 4000');
});

test('word list decodes topics, subtopics and aliases', () => {
  assert.equal(DATA.domains[1].name, 'B');
  assert.equal(DATA.terms[3].d, 1);
  assert.equal(DATA.terms[3].a, 'AT');
});

test('daily set is stable for a date and differs across dates', () => {
  const a = dailyTerms(DATA, '2026-09-28').map(t => t.t);
  assert.deepEqual(a, dailyTerms(DATA, '2026-09-28').map(t => t.t));
  assert.equal(a.length, 2); // only two domains in the sample
});

test('timer counts down against a deadline and fires once', async () => {
  let now = 0, ended = 0;
  const ticks = [];
  const t = makeTimer(2, s => ticks.push(s), () => ended++, () => now);
  t.start();
  now = 1000; t.tick();
  t.pause(); now = 5000; t.tick();
  assert.equal(t.secondsLeft(), 1);
  t.start(); now = 6100; t.tick(); t.tick();
  assert.equal(ended, 1);
  assert.deepEqual(ticks, [2, 1, 0]);
});
