// normalize.js -- letter folding and masking. Shared by the game and the tools.

// Letters NFD cannot split into base + accent.
const FOLD_EXTRA = { 'ø': 'o', 'Ø': 'O', 'ł': 'l', 'Ł': 'L', 'æ': 'ae', 'Æ': 'AE', 'ß': 'ss', 'đ': 'd', 'Đ': 'D' };

// Fold one character to plain ASCII (may return '' or 2 chars).
export function foldChar(ch) {
  if (FOLD_EXTRA[ch] !== undefined) return FOLD_EXTRA[ch];
  return ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Uppercase A-Z letter this character is guessed as, or '' if auto-revealed.
export function guessLetter(ch) {
  const f = foldChar(ch).toUpperCase();
  return f.length === 1 && f >= 'A' && f <= 'Z' ? f : '';
}

// Set of letters the player has to find.
export function lettersOf(term) {
  const s = new Set();
  for (const ch of term) { const g = guessLetter(ch); if (g) s.add(g); }
  return s;
}

// Masked display: array of words, each an array of shown characters ('_' when hidden).
export function mask(term, guessed) {
  return term.split(' ').filter(Boolean).map(w => {
    const out = [];
    for (const ch of w) {
      const g = guessLetter(ch);
      out.push(!g ? ch : guessed.has(g) ? ch.toUpperCase() : '_');
    }
    return out;
  });
}

// Dedupe key: folded, lowercase, punctuation to spaces.
export function termKey(term) {
  let s = '';
  for (const ch of term) s += foldChar(ch);
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
