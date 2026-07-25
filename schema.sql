-- D1 schema. Apply with:
--   npx wrangler d1 execute ols-votes --local  --file=./schema.sql
--   npx wrangler d1 execute ols-votes --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS votes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Opaque per-vote token. Attaching an ease answer requires presenting this,
  -- so nobody can set the ease on a stranger's ballot and skew the one statistic
  -- this app exists to produce.
  token        TEXT    NOT NULL UNIQUE,
  theme_id     TEXT    NOT NULL,
  list_id      TEXT    NOT NULL,
  candidate_id TEXT    NOT NULL,
  -- 1 = part of the synthetic starting electorate, 0 = a real person.
  -- Only used to report the split honestly on screen; tallies count both.
  is_seed      INTEGER NOT NULL DEFAULT 0,
  ease         INTEGER,  -- 1..5, NULL when skipped or not yet answered
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_votes_theme ON votes (theme_id);
CREATE INDEX IF NOT EXISTS idx_votes_tally ON votes (theme_id, list_id, candidate_id);

-- Abuse control. Stores a salted hash, never an IP.
CREATE TABLE IF NOT EXISTS vote_guards (
  ip_hash    TEXT    NOT NULL,
  theme_id   TEXT    NOT NULL,
  n          INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (ip_hash, theme_id)
);
