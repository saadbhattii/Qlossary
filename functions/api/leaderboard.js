// GET /api/leaderboard?board=total|week|run|endless|daily[&me=<browser id>]
//   ->  { board, day, since, entries: [...] }
// mode= is accepted in place of board= for pages built before the totals.
// me only marks the asking browser's own rows ("you": true); it is never returned.
import { BOARDS, topScores, weekStart, today, json } from '../../lib/leaderboard.js';

export async function onRequestGet({ request, env }) {
  const q = new URL(request.url).searchParams;
  const board = q.get('board') || q.get('mode');
  if (!BOARDS.includes(board)) return json({ error: 'Unknown leaderboard.' }, 400);
  if (!env.DB) return json({ error: 'The leaderboard database is not set up.' }, 503);
  const me = /^[A-Za-z0-9-]{8,64}$/.test(q.get('me') || '') ? q.get('me') : '';
  const day = today();
  try {
    const entries = await topScores(env.DB, board, day, me);
    return json({ board, mode: board, day: board === 'daily' ? day : null, since: board === 'week' ? weekStart(day) : null, entries },
      200, { 'Cache-Control': 'public, max-age=30' });
  } catch (e) {
    return json({ error: 'The leaderboard could not be read.' }, 500);
  }
}
