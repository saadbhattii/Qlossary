// pick.js -- which terms are in play and which comes next.
import { seeded, hashStr, randInt } from './rng.js';

// s: settings. Returns the terms matching the player's filters.
export function candidates(data, s) {
  const on = new Set(s.domains);
  return data.terms.filter(t =>
    on.has(data.domains[t.d].id) &&
    (s.diff === 'any' || t.diff === +s.diff) &&
    (s.multi || t.words === 1) &&
    t.t.length <= s.maxLen);
}

// Choose one term. seen is a Set of keys already played.
// With balanced on (the default), a topic is chosen first, with a chance that
// grows with the square root of how many unseen terms it has left. Big topics
// come up more often than small ones, but not in proportion to their size, so
// Hardware (443 terms) does not take over and the smallest topics (about 25
// terms) do not flood the game. With balanced off, every unseen term is
// equally likely.
// Returns { term, reset } where reset means the pool was exhausted and refilled.
export function pickNext(cands, seen, rng, balanced) {
  let pool = cands.filter(t => !seen.has(t.key));
  let reset = false;
  if (!pool.length) {
    for (const t of cands) seen.delete(t.key);
    pool = cands.slice();
    reset = true;
  }
  if (!pool.length) return { term: null, reset };
  if (!balanced) return { term: pool[randInt(rng, pool.length)], reset };
  const byDom = new Map();
  for (const t of pool) {
    if (!byDom.has(t.d)) byDom.set(t.d, []);
    byDom.get(t.d).push(t);
  }
  const lists = [...byDom.values()];
  const weights = lists.map(l => Math.sqrt(l.length));
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  let i = 0;
  while (i < lists.length - 1 && r >= weights[i]) { r -= weights[i]; i++; }
  const list = lists[i];
  return { term: list[randInt(rng, list.length)], reset };
}

// The daily set: same five terms for everyone on a UTC date. Ignores settings;
// one term from each of five different topics.
export const DAILY_WORDS = 5;

export function dailyTerms(data, dateStr) {
  const rng = seeded(hashStr('qlossary-hangman:' + dateStr));
  const core = data.terms.slice().sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  const byDom = new Map();
  for (const t of core) {
    if (!byDom.has(t.d)) byDom.set(t.d, []);
    byDom.get(t.d).push(t);
  }
  const doms = [...byDom.keys()].sort((a, b) => a - b);
  const out = [];
  while (out.length < DAILY_WORDS && doms.length) {
    const d = doms.splice(randInt(rng, doms.length), 1)[0];
    const list = byDom.get(d);
    out.push(list[randInt(rng, list.length)]);
  }
  return out;
}

export function utcDate(ms) { return new Date(ms).toISOString().slice(0, 10); }