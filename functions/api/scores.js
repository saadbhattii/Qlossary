// POST /api/scores  { mode, name, pts, won, day, cid }  ->  { rank }
import { checkScore, addScore, hashIp, today, json } from '../../lib/leaderboard.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'The leaderboard database is not set up.' }, 503);
  const text = await request.text();
  if (text.length > 20000) return json({ error: 'The score is too large to send.' }, 413);
  let body;
  try { body = JSON.parse(text); } catch (e) { return json({ error: 'The score could not be read.' }, 400); }
  const day = today();
  const checked = checkScore(body, day);
  if (checked.error) return json({ error: checked.error }, 400);
  const ip = await hashIp(request.headers.get('CF-Connecting-IP') || 'unknown', day, env.IP_SALT || '');
  try {
    const res = await addScore(env.DB, checked.value, ip);
    if (res.error) return json({ error: res.error }, res.status);
    return json({ rank: res.rank });
  } catch (e) {
    return json({ error: 'The score could not be saved. Please try again later.' }, 500);
  }
}
