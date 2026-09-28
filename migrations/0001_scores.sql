-- Worldwide leaderboard. Apply with:
--   npx wrangler d1 migrations apply qlossary --remote
CREATE TABLE IF NOT EXISTS scores (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  mode    TEXT    NOT NULL CHECK (mode IN ('run', 'endless', 'daily')),
  name    TEXT    NOT NULL,
  score   INTEGER NOT NULL,
  won     INTEGER NOT NULL,
  played  INTEGER NOT NULL,
  day     TEXT    NOT NULL,          -- UTC date, YYYY-MM-DD
  created INTEGER NOT NULL,          -- milliseconds since 1970
  cid     TEXT    NOT NULL,          -- random ID of the player's browser
  ip      TEXT    NOT NULL           -- daily-salted hash, never the address
);
CREATE INDEX IF NOT EXISTS idx_scores_mode_score ON scores (mode, score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_mode_day_score ON scores (mode, day, score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_ip_created ON scores (ip, created);
CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_daily_once ON scores (cid, day) WHERE mode = 'daily';
