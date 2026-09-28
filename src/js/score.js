// score.js -- points for one word.

export const DIFF_NAMES = ['easy', 'medium', 'hard', 'expert'];
export const DIFF_MULT = [1, 1.5, 2, 3];
export const HINT_COST = { domain: 25, sub: 50, letter: 30 };
export const PER_LETTER = 10;
export const PER_SECOND = 2;
export const PER_WRONG = 10;

// Auto time limit in seconds for a term with n unique letters.
export function autoSeconds(n) { return Math.min(120, 40 + 3 * n); }

// r: { won, n (unique letters), diff, secsLeft (null if untimed), wrong, hints: {domain, sub, letter} }
// Returns { lines: [[label, value]], total, base, time, wrongCost, hintCost }.
export function scoreWord(r) {
  if (!r.won) return { lines: [['word missed', 0]], total: 0, base: 0, time: 0, wrongCost: 0, hintCost: 0 };
  const lines = [];
  const base = Math.round(r.n * PER_LETTER * DIFF_MULT[r.diff]);
  lines.push([r.n + ' letters x' + PER_LETTER + ' x' + DIFF_MULT[r.diff] + ' (' + DIFF_NAMES[r.diff] + ')', base]);
  const time = r.secsLeft != null ? r.secsLeft * PER_SECOND : 0;
  if (r.secsLeft != null) lines.push(['time bonus ' + r.secsLeft + 's x' + PER_SECOND, time]);
  const wrongCost = r.wrong * PER_WRONG;
  if (r.wrong) lines.push(['wrong ' + r.wrong + ' x' + PER_WRONG, -wrongCost]);
  const h = r.hints || {};
  const hintCost = (h.domain ? HINT_COST.domain : 0) + (h.sub ? HINT_COST.sub : 0) + (h.letter || 0) * HINT_COST.letter;
  if (h.domain) lines.push(['hint: topic', -HINT_COST.domain]);
  if (h.sub) lines.push(['hint: subtopic', -HINT_COST.sub]);
  if (h.letter) lines.push(['hint: letter x' + h.letter, -HINT_COST.letter * h.letter]);
  const total = Math.max(0, base + time - wrongCost - hintCost);
  return { lines, total, base, time, wrongCost, hintCost };
}
