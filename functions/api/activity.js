// GET /api/activity[?me=<browser id>]
//   ->  { now, recent: [...], champion: { name, score, day } | null, playersToday }
import { activity, today, json } from '../../lib/leaderboard.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'The leaderboard database is not set up.' }, 503);
  const me = new URL(request.url).searchParams.get('me') || '';
  try {
    const data = await activity(env.DB, today(), /^[A-Za-z0-9-]{8,64}$/.test(me) ? me : '');
    return json(data, 200, { 'Cache-Control': 'public, max-age=30' });
  } catch (e) {
    return json({ error: 'Recent games could not be read.' }, 500);
  }
}
