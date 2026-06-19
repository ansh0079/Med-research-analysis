-- Beta invite codes for closed registration during the physician beta.
-- Each code can be single-use (max_uses=1) or multi-use (e.g. for cohorts).
CREATE TABLE IF NOT EXISTS beta_invites (
  id          TEXT PRIMARY KEY,
  code        TEXT UNIQUE NOT NULL,
  label       TEXT,                          -- human-readable note (e.g. "Cardiology cohort A")
  specialty   TEXT,                          -- optional specialty tag stored on user at signup
  max_uses    INTEGER NOT NULL DEFAULT 1,
  use_count   INTEGER NOT NULL DEFAULT 0,
  created_by  TEXT,                          -- admin user id
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT                           -- NULL = never expires
);

CREATE INDEX IF NOT EXISTS idx_beta_invites_code ON beta_invites(code);
