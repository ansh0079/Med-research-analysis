-- Human-review queue for trial-vs-guideline conflicts detected during synthesis.
CREATE TABLE IF NOT EXISTS trial_guideline_conflict_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    normalized_topic TEXT NOT NULL,
    job_key TEXT,
    conflict_hash TEXT NOT NULL,
    conflict_level TEXT NOT NULL DEFAULT 'nuanced',
    trial_index INTEGER NOT NULL,
    guideline_index INTEGER NOT NULL,
    trial_claim TEXT NOT NULL,
    guideline_claim TEXT NOT NULL,
    population_gap TEXT,
    clinical_nuance TEXT,
    recommendation TEXT,
    detection_method TEXT NOT NULL DEFAULT 'llm',
    status TEXT NOT NULL DEFAULT 'ai_detected',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE (normalized_topic, conflict_hash)
);

CREATE INDEX IF NOT EXISTS idx_tgcr_topic_status ON trial_guideline_conflict_reviews(normalized_topic, status);
