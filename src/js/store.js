// store.js -- everything the game remembers, kept in this browser only.
// Every read and write is guarded: storage can be full, blocked or wiped.

const P = 'qh.';
export const KEYS = ['settings', 'scores', 'stats', 'missed', 'seen', 'daily'];
export const TOP = 20;
export const MISSED_MAX = 100;

export function load(name, fallback) {
  try {
    const v = localStorage.getItem(P + name);
    return v == null ? fallback : JSON.parse(v);
  } catch (e) { return fallback; }
}

export function save(name, value) {
  try { localStorage.setItem(P + name, JSON.stringify(value)); return true; } catch (e) { return false; }
}

export function emptyStats() {
  return { words: 0, won: 0, bestStreak: 0, solveMs: 0, sessions: 0, dom: {} };
}

export function emptyScores() { return { run: [], endless: [], daily: [] }; }

// Insert a score, keep the top 20. Returns its 1-based rank, or 0 if it missed the list.
export function addScore(scores, mode, entry) {
  const list = scores[mode] || (scores[mode] = []);
  list.push(entry);
  list.sort((a, b) => b.s - a.s || (a.d < b.d ? -1 : 1));
  const rank = list.indexOf(entry) + 1;
  list.length = Math.min(list.length, TOP);
  return rank <= TOP ? rank : 0;
}

export function addMissed(missed, item) {
  const i = missed.findIndex(m => m.t === item.t);
  if (i >= 0) missed.splice(i, 1);
  missed.unshift(item);
  missed.length = Math.min(missed.length, MISSED_MAX);
}

export function exportAll() {
  const out = { app: 'qlossary', v: 1 };
  for (const k of KEYS) out[k] = load(k, null);
  return JSON.stringify(out);
}

// Returns '' on success or a message saying what is wrong with the text.
export function importAll(text) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { return 'That is not valid JSON. Paste the full text from Export.'; }
  // Exports made before the rename say 'qlossary-hangman'; both are accepted.
  if (!obj || (obj.app !== 'qlossary' && obj.app !== 'qlossary-hangman')) return 'That text was not exported from Qlossary.';
  for (const k of KEYS) if (obj[k] != null && !save(k, obj[k])) return 'This browser refused to save the data.';
  return '';
}

export function clearAll() {
  for (const k of KEYS) { try { localStorage.removeItem(P + k); } catch (e) { /* ignore */ } }
}
