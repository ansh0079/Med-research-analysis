-- Lightweight fingerprint of each synthesis generation per topic.
-- Used to detect when evidence has shifted since the last time a user
-- saw a synthesis for this topic (staleness alerting).
CREATE TABLE IF NOT EXISTS synthesis_snapshots (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  normalized_topic TEXT    NOT NULL,
  topic            TEXT    NOT NULL,
  consensus_text   TEXT    NOT NULL,
  evidence_grade   TEXT    NOT NULL DEFAULT 'MODERATE',
  key_finding_count INTEGER NOT NULL DEFAULT 0,
  article_count    INTEGER NOT NULL DEFAULT 0,
  article_uids     TEXT    NOT NULL DEFAULT '[]',
  claim_fingerprint TEXT,
  claim_texts_json TEXT    NOT NULL DEFAULT '[]',
  generated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_synthesis_snapshots_topic
  ON synthesis_snapshots(normalized_topic, generated_at DESC);
