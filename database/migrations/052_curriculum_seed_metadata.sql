-- Metadata for curated curriculum seeding and refresh scheduling.
ALTER TABLE curriculum_topics ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE curriculum_topics ADD COLUMN volatility TEXT NOT NULL DEFAULT 'moderate';
ALTER TABLE curriculum_topics ADD COLUMN seed_status TEXT NOT NULL DEFAULT 'not_seeded';
ALTER TABLE curriculum_topics ADD COLUMN last_seeded_at TEXT;
ALTER TABLE curriculum_topics ADD COLUMN last_synthesis_at TEXT;
ALTER TABLE curriculum_topics ADD COLUMN claim_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE curriculum_topics ADD COLUMN review_due_at TEXT;

CREATE INDEX IF NOT EXISTS idx_curriculum_topics_seed_status
  ON curriculum_topics(seed_status, priority, volatility);
