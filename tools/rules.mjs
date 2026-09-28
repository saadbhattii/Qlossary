// rules.mjs -- what makes a term playable. Used by extract and build.
import { lettersOf, guessLetter } from '../src/js/normalize.js';

export const MAX_LEN = 44;
export const MIN_UNIQUE = 3;
export const MIN_LETTERS = 4;

// Characters allowed in a term. Anything that is not a letter is shown
// to the player from the start.
const ALLOWED = /^[\p{L}0-9 \-–'’\/.&+]+$/u;

// Returns '' if playable, otherwise the reason it is not.
export function problem(term) {
  if (!term || term !== term.trim()) return 'blank or padded';
  if (/\s{2}/.test(term)) return 'double space';
  if (!ALLOWED.test(term)) return 'symbols';
  if (/\bvs\b/i.test(term)) return 'comparison, not a term';
  if (term.length > MAX_LEN) return 'too long';
  for (const ch of term) {
    if (/\p{L}/u.test(ch) && !guessLetter(ch)) return 'letter outside A-Z after folding: ' + ch;
  }
  let n = 0;
  for (const ch of term) if (guessLetter(ch)) n++;
  if (n < MIN_LETTERS || lettersOf(term).size < MIN_UNIQUE) return 'too few letters';
  return '';
}
