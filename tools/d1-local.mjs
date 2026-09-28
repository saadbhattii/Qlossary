// d1-local.mjs -- a small stand-in for Cloudflare D1, on Node's built-in
// SQLite (Node 22.5 or later). Used by the local preview and the tests, so the
// real SQL in lib/leaderboard.js runs locally with no Cloudflare account.
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

export async function openLocalD1(file, migrationsDir) {
  let sqlite;
  try { sqlite = await import('node:sqlite'); } catch (e) { return null; }
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new sqlite.DatabaseSync(file);
  for (const f of readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()) {
    db.exec(readFileSync(join(migrationsDir, f), 'utf8'));
  }
  const wrap = (sql, args) => {
    const stmt = db.prepare(sql);
    return {
      bind: (...a) => wrap(sql, a),
      first: async () => stmt.get(...args) || null,
      all: async () => ({ results: stmt.all(...args), success: true }),
      run: async () => { const r = stmt.run(...args); return { success: true, meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; },
    };
  };
  return { prepare: sql => wrap(sql, []), raw: db };
}
