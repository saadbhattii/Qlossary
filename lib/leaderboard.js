// leaderboard.js -- rules and queries for the worldwide leaderboard.
// Used by the Cloudflare Pages Functions in functions/api/ and by the tests.
//
// Scores are worked out in the player's browser, so a determined person can
// send a fake score that passes these checks. The checks stop mistakes and
// casual tampering; see the README for how to delete a bad entry.

export const MODES = ['run', 'endless', 'daily'];
export const WORDS = { run: 10, daily: 5 };      // words in a finished game
export const ENDLESS_MISSES = 3;                  // endless ends at this many misses
export const MAX_ENDLESS_WORDS = 1000;
// Most points one word can earn: 26 different letters x 10 x 3 (expert),
// plus 120 seconds left x 2.
export const MAX_PER_WORD = 26 * 10 * 3 + 120 * 2;
export const TOP_N = 20;
export const RATE_PER_HOUR = 20;
export const NAME_MAX = 12;

// Names: 1 to 12 letters, digits, spaces, dots, dashes or underscores.
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 ._-]*$/;
// Names that are refused. Matched against the name with everything but letters removed.
const BLOCKED = ['fuck', 'shit', 'cunt', 'nigg', 'fag', 'bitch', 'whore', 'slut', 'rape', 'nazi', 'hitler',
  'porn', 'dick', 'cock', 'pussy', 'asshole', 'bastard', 'retard', 'admin', 'moderator'];

export function today(now = Date.now()) { return new Date(now).toISOString().slice(0, 10); }

export function cleanName(raw) {
  return typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '';
}

// '' if the name is acceptable, otherwise a sentence saying what to change.
export function nameProblem(name) {
  if (!name) return 'Enter a name to show on the leaderboard.';
  if (name.length > NAME_MAX) return 'Use a name of at most ' + NAME_MAX + ' characters.';
  if (!NAME_RE.test(name)) return 'Use only letters, digits, spaces, dots, dashes and underscores, starting with a letter or digit.';
  const letters = name.toLowerCase().replace(/[^a-z]/g, '');
  if (BLOCKED.some(b => letters.includes(b))) return 'Please choose a different name.';
  return '';
}

const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;

// Check a submitted score. Returns { value } or { error }.
// body: { mode, name, pts: [points per word], won, day, cid }
export function checkScore(body, day) {
  if (!body || typeof body !== 'object') return { error: 'The score could not be read.' };
  const mode = body.mode;
  if (!MODES.includes(mode)) return { error: 'Unknown game mode.' };
  const name = cleanName(body.name);
  const np = nameProblem(name);
  if (np) return { error: np };
  if (typeof body.cid !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(body.cid)) return { error: 'Missing browser ID.' };
  if (body.day !== day) return { error: 'This score is from a different day and can no longer be added.' };
  const pts = body.pts;
  if (!Array.isArray(pts) || !pts.length || pts.length > MAX_ENDLESS_WORDS) return { error: 'The list of words is missing.' };
  if (!pts.every(p => isInt(p, 0, MAX_PER_WORD))) return { error: 'A word has more points than the game allows.' };
  const played = pts.length;
  if (WORDS[mode] && played !== WORDS[mode]) return { error: 'Only finished games can be added.' };
  const score = pts.reduce((a, b) => a + b, 0);
  if (score < 1) return { error: 'Only games with points can be added.' };
  const won = body.won;
  if (!isInt(won, 0, played)) return { error: 'The number of words solved does not add up.' };
  if (pts.filter(p => p > 0).length > won) return { error: 'The number of words solved does not add up.' };
  if (mode === 'endless' && played - won > ENDLESS_MISSES) return { error: 'An endless game ends after ' + ENDLESS_MISSES + ' missed words.' };
  return { value: { mode, name, score, won, played, day, cid: body.cid } };
}

// ---------- boards ----------
//
// total   every point a player has ever added, all game types together
// week    the same, counting only games since Monday (UTC)
// run, endless, daily   single games, highest first (daily: today only)
//
// A player is the same name from the same browser (cid), so nobody can add
// to someone else's total by typing their name.
export const BOARDS = ['total', 'week', 'run', 'endless', 'daily'];
export const RECENT_N = 5;

// Monday of the week that contains day (YYYY-MM-DD, UTC).
export function weekStart(day) {
  const d = new Date(day + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export function dayBefore(day) {
  const d = new Date(day + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// The crown: the player (same name from the same browser) at the top of the
// all-time total. Every row of theirs, on every list, comes back with
// crown: true, so the page can put a crown before the name. The browser ID
// itself is never returned.
const TOTAL_SQL = 'SELECT name, cid, SUM(score) AS score, COUNT(*) AS games, MAX(created) AS last FROM scores GROUP BY name, cid ORDER BY score DESC, last ASC LIMIT ?1';

export async function crownHolder(db) {
  const r = await db.prepare(TOTAL_SQL).bind(1).first();
  return r ? { name: r.name, cid: r.cid } : null;
}

function crowned(row, king, out) {
  if (king && row.cid === king.cid && row.name === king.name) out.crown = true;
  return out;
}

// me: the asking browser's ID, used only to mark its own rows; never returned.
export async function topScores(db, board, day, me = '') {
  if (board === 'total' || board === 'week') {
    const week = board === 'week';
    const stmt = week
      ? db.prepare('SELECT name, cid, SUM(score) AS score, COUNT(*) AS games, MAX(created) AS last FROM scores WHERE day >= ?1 GROUP BY name, cid ORDER BY score DESC, last ASC LIMIT ?2').bind(weekStart(day), TOP_N)
      : db.prepare(TOTAL_SQL).bind(TOP_N);
    const rows = (await stmt.all()).results || [];
    const king = week ? await crownHolder(db) : rows[0] || null;
    return rows.map((r, i) => crowned(r, king, { rank: i + 1, name: r.name, score: r.score, games: r.games, you: !!me && r.cid === me }));
  }
  const stmt = board === 'daily'
    ? db.prepare('SELECT name, cid, score, won, played, day FROM scores WHERE mode = ?1 AND day = ?2 ORDER BY score DESC, created ASC LIMIT ?3').bind(board, day, TOP_N)
    : db.prepare('SELECT name, cid, score, won, played, day FROM scores WHERE mode = ?1 ORDER BY score DESC, created ASC LIMIT ?2').bind(board, TOP_N);
  const res = await stmt.all();
  const king = await crownHolder(db);
  return (res.results || []).map((r, i) => crowned(r, king, { rank: i + 1, name: r.name, score: r.score, won: r.won, played: r.played, day: r.day, you: !!me && r.cid === me }));
}

// What happened lately: the last few scores, yesterday's daily winner, and how
// many players added a score today.
export async function activity(db, day, me = '', now = Date.now()) {
  const recent = await db.prepare('SELECT name, cid, mode, score, created FROM scores ORDER BY created DESC LIMIT ?1').bind(RECENT_N).all();
  const champ = await db.prepare("SELECT name, cid, score FROM scores WHERE mode = 'daily' AND day = ?1 ORDER BY score DESC, created ASC LIMIT 1")
    .bind(dayBefore(day)).first();
  const count = await db.prepare('SELECT COUNT(*) AS n FROM (SELECT DISTINCT name, cid FROM scores WHERE day = ?1)').bind(day).first();
  const king = await crownHolder(db);
  return {
    now,
    recent: (recent.results || []).map(r => crowned(r, king, { name: r.name, mode: r.mode, score: r.score, created: r.created, you: !!me && r.cid === me })),
    champion: champ ? crowned(champ, king, { name: champ.name, score: champ.score, day: dayBefore(day) }) : null,
    playersToday: count ? count.n : 0,
  };
}

// Store a checked score. Returns { rank, personalBest, total } or { error, status }.
//   rank          where this game stands on its own list (10-word, endless, daily)
//   personalBest  true when it beats this player's earlier best in that game type
//   total         { points, games, rank, next } on the all-time total, where next
//                 is { name, gap } for the player just above, or null at the top
export async function addScore(db, v, ip, now = Date.now()) {
  const hourAgo = now - 3600 * 1000;
  const recent = await db.prepare('SELECT COUNT(*) AS n FROM scores WHERE ip = ?1 AND created > ?2').bind(ip, hourAgo).first();
  if (recent && recent.n >= RATE_PER_HOUR) return { error: 'Too many scores from this connection. Try again in an hour.', status: 429 };
  if (v.mode === 'daily') {
    const dup = await db.prepare("SELECT 1 AS x FROM scores WHERE mode = 'daily' AND day = ?1 AND cid = ?2").bind(v.day, v.cid).first();
    if (dup) return { error: 'This browser has already added a score for today\'s daily challenge.', status: 409 };
  }
  const before = await db.prepare('SELECT MAX(score) AS best FROM scores WHERE mode = ?1 AND name = ?2 AND cid = ?3')
    .bind(v.mode, v.name, v.cid).first();
  const prevBest = before && before.best != null ? before.best : null;

  await db.prepare('INSERT INTO scores (mode, name, score, won, played, day, created, cid, ip) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)')
    .bind(v.mode, v.name, v.score, v.won, v.played, v.day, now, v.cid, ip).run();

  const above = v.mode === 'daily'
    ? await db.prepare("SELECT COUNT(*) AS n FROM scores WHERE mode = 'daily' AND day = ?1 AND score > ?2").bind(v.day, v.score).first()
    : await db.prepare('SELECT COUNT(*) AS n FROM scores WHERE mode = ?1 AND score > ?2').bind(v.mode, v.score).first();

  const mine = await db.prepare('SELECT SUM(score) AS points, COUNT(*) AS games FROM scores WHERE name = ?1 AND cid = ?2')
    .bind(v.name, v.cid).first();
  const points = mine.points;
  const higher = await db.prepare('SELECT COUNT(*) AS n FROM (SELECT SUM(score) AS s FROM scores GROUP BY name, cid) WHERE s > ?1')
    .bind(points).first();
  const next = await db.prepare('SELECT name, SUM(score) AS s FROM scores GROUP BY name, cid HAVING s > ?1 ORDER BY s ASC, MAX(created) ASC LIMIT 1')
    .bind(points).first();

  return {
    rank: (above ? above.n : 0) + 1,
    personalBest: prevBest != null && v.score > prevBest,
    total: {
      points, games: mine.games,
      rank: (higher ? higher.n : 0) + 1,
      next: next ? { name: next.name, gap: next.s - points } : null,
    },
  };
}

// The IP address is never stored; only a hash that changes every day.
export async function hashIp(ip, day, salt = '') {
  const data = new TextEncoder().encode(ip + '|' + day + '|' + salt);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, extra),
  });
}
