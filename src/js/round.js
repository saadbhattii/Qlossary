// round.js -- state of one word being guessed.
import { lettersOf } from './normalize.js';

export function newRound(term, lives) {
  return {
    term, lives,
    letters: lettersOf(term.t),
    guessed: new Set(),
    wrong: [],
    hints: { domain: false, sub: false, letter: 0 },
    over: false, won: false,
  };
}

export function missing(r) {
  const out = [];
  for (const L of r.letters) if (!r.guessed.has(L)) out.push(L);
  return out;
}

// Returns 'hit', 'miss', or '' when the guess does nothing.
export function guess(r, L) {
  if (r.over || r.guessed.has(L)) return '';
  r.guessed.add(L);
  if (r.letters.has(L)) {
    if (!missing(r).length) { r.over = true; r.won = true; }
    return 'hit';
  }
  r.wrong.push(L);
  if (r.wrong.length >= r.lives) r.over = true;
  return 'miss';
}

// Letter hint: reveals one random missing letter, never the last one.
export function canRevealLetter(r) { return !r.over && missing(r).length > 1; }

export function revealLetter(r, rng) {
  if (!canRevealLetter(r)) return '';
  const m = missing(r);
  const L = m[Math.floor(rng() * m.length)];
  r.guessed.add(L);
  r.hints.letter++;
  return L;
}

export function timeOut(r) { r.over = true; r.won = false; }

// Gallows frame 0-6 for any number of lives.
export function frame(r) {
  if (r.wrong.length >= r.lives) return 6;
  return Math.floor(r.wrong.length * 6 / r.lives);
}
