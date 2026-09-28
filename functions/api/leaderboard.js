// GET /api/leaderboard?mode=run|endless|daily  ->  { mode, day, entries: [...] }
import { MODES, topScores, today, json } from '../../lib/leaderboard.js';

export async function onRequestGet({ request, env }) {
  const mode = new URL(request.url).searchParams.get('mode');
  if (!MODES.includes(mode)) return json({ error: 'Unknown game mode.' }, 400);
  if (!env.DB) return json({ error: 'The leaderboard database is not set up.' }, 503);
  const day = today();
  try {
    const entries = await topScores(env.DB, mode, day);
    return json({ mode, day: mode === 'daily' ? day : null, entries }, 200, { 'Cache-Control': 'public, max-age=30' });
  } catch (e) {
    return json({ error: 'The leaderboard could not be read.' }, 500);
  }
}
