// d1-local.mjs -- a small stand-in for Cloudflare D1, on Node's built-in
// SQLite (Node 22.5 or later). Used by the local preview and the tests, so the
// real SQL in lib/leaderboard.js runs locally with no Cloudflare account.
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

// D1 accepts numbered placeholders (?1, ?2, ...). Some Node versions' SQLite
// module treats those as named parameters and refuses values given as a plain
// list ("column index out of range"). So each ?N becomes a plain ?, and the
// values are passed in the order the placeholders appear. A number used twice
// simply gets its value twice.
export function toPlainPlaceholders(sql) {
  const order = [];
  const plain = sql.replace(/\?(\d+)/g, (_, n) => { order.push(Number(n) - 1); return '?'; });
  return { sql: plain, order };
}

export async function openLocalD1(file, migrationsDir) {
  let sqlite;
  try { sqlite = await import('node:sqlite'); } catch (e) { return null; }
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new sqlite.DatabaseSync(file);
  for (const f of readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()) {
    db.exec(readFileSync(join(migrationsDir, f), 'utf8'));
  }
  const wrap = (sql, args) => {
    const { sql: plain, order } = toPlainPlaceholders(sql);
    const stmt = db.prepare(plain);
    const values = () => (order.length ? order.map(i => args[i]) : args);
    return {
      bind: (...a) => wrap(sql, a),
      first: async () => stmt.get(...values()) || null,
      all: async () => ({ results: stmt.all(...values()), success: true }),
      run: async () => {
        const r = stmt.run(...values());
        return { success: true, meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } };
      },
    };
  };
  return { prepare: sql => wrap(sql, []), raw: db };
}
