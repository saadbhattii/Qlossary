// world.js -- the worldwide leaderboard. Nothing here runs during a game:
// the list is fetched when the Home or Scores screen opens (kept for 30
// seconds), and a score is sent only when the player presses "Add my score".
import { load, save } from './store.js';

const BOARD_CACHE_MS = 30000;
const boardCache = {};

// A random ID for this browser, so the daily challenge can be added once per day.
export function browserId() {
  let id = load('cid', null);
  if (typeof id !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(id)) {
    id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
      : 'x' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    save('cid', id);
  }
  return id;
}

// The same name rule the server applies (lib/leaderboard.js), checked here
// first so the player gets an answer without waiting.
export function worldNameProblem(name) {
  if (!name) return 'Enter a name to show on the leaderboard.';
  if (name.length > 12) return 'Use a name of at most 12 characters.';
  if (!/^[A-Za-z0-9][A-Za-z0-9 ._-]*$/.test(name)) return 'Use only letters, digits, spaces, dots, dashes and underscores, starting with a letter or digit.';
  return '';
}

async function readJson(res) {
  try { return await res.json(); } catch (e) { return {}; }
}

async function getJson(url, check) {
  let res;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch (e) {
    throw new Error('The worldwide leaderboard can\'t be reached right now.');
  }
  const body = await readJson(res);
  if (!res.ok || !check(body)) throw new Error(body.error || 'The worldwide leaderboard can\'t be reached right now.');
  return body;
}

// board: total, week, run, endless or daily. Returns { entries, day, since }.
// This browser's ID is sent so its own rows come back marked; nothing else is sent.
// Throws an Error with a message for the player.
export async function fetchBoard(board, fresh) {
  const hit = boardCache[board];
  if (!fresh && hit && Date.now() - hit.at < BOARD_CACHE_MS) return hit.data;
  const body = await getJson('/api/leaderboard?board=' + encodeURIComponent(board) + '&me=' + encodeURIComponent(browserId()) +
    (fresh ? '&t=' + Date.now() : ''), b => Array.isArray(b.entries));
  boardCache[board] = { at: Date.now(), data: body };
  return body;
}

// Recent games, yesterday's daily champion, players today.
export async function fetchActivity(fresh) {
  const hit = boardCache._activity;
  if (!fresh && hit && Date.now() - hit.at < BOARD_CACHE_MS) return hit.data;
  const body = await getJson('/api/activity?me=' + encodeURIComponent(browserId()) + (fresh ? '&t=' + Date.now() : ''),
    b => Array.isArray(b.recent));
  boardCache._activity = { at: Date.now(), data: body };
  return body;
}

// Returns { rank }. Throws an Error with a message for the player.
export async function submitScore(payload) {
  let res;
  try {
    res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    throw new Error('The score could not be sent. Check your connection and try again.');
  }
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'The score could not be added. Please try again later.');
  for (const k of Object.keys(boardCache)) delete boardCache[k];   // every list may have changed
  return body;
}