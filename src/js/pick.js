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

// Choose one term. seen is a Set of keys already played. If balanced, pick a
// domain first so that large domains (hardware) do not dominate.
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
  const doms = [...byDom.keys()];
  const list = byDom.get(doms[randInt(rng, doms.length)]);
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
