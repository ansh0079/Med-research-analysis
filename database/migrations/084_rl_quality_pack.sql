-- RL quality pack: query repair cache, topic evidence memory, offline eval runs.

CREATE TABLE IF NOT EXISTS query_reformulation_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_query TEXT NOT NULL,
    normalized_query TEXT NOT NULL,
    strategy TEXT NOT NULL,
    reformulated_query TEXT NOT NULL,
    result_count INTEGER NOT NULL DEFAULT 0,
    engagement_score REAL NOT NULL DEFAULT 0,
    win_count INTEGER NOT NULL DEFAULT 0,
    trial_count INTEGER NOT NULL DEFAULT 0,
    last_result_count INTEGER,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(normalized_query, strategy)
);

CREATE INDEX IF NOT EXISTS idx_query_reformulation_norm
    ON query_reformulation_cache(normalized_query, engagement_score DESC);

CREATE TABLE IF NOT EXISTS topic_evidence_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    normalized_topic TEXT NOT NULL UNIQUE,
    topic TEXT NOT NULL,
    guidelines_json TEXT NOT NULL DEFAULT '[]',
    landmark_trials_json TEXT NOT NULL DEFAULT '[]',
    recent_reviews_json TEXT NOT NULL DEFAULT '[]',
    controversies_json TEXT NOT NULL DEFAULT '[]',
    safety_updates_json TEXT NOT NULL DEFAULT '[]',
    article_uids_json TEXT NOT NULL DEFAULT '[]',
    source TEXT NOT NULL DEFAULT 'search_blend',
    updated_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_topic_evidence_memory_updated
    ON topic_evidence_memory(updated_at DESC);

CREATE TABLE IF NOT EXISTS offline_eval_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    policy_type TEXT NOT NULL,
    days INTEGER NOT NULL,
    labelled_count INTEGER NOT NULL DEFAULT 0,
    propensity_coverage REAL,
    serving_arm_id TEXT,
    best_shadow_arm_id TEXT,
    serving_score REAL,
    best_shadow_score REAL,
    lift REAL,
    recommendation TEXT NOT NULL,
    reason TEXT,
    report_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_offline_eval_runs_created
    ON offline_eval_runs(created_at DESC);

CREATE TABLE IF NOT EXISTS delayed_reward_backfill_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    decision_id INTEGER NOT NULL,
    horizon_days INTEGER NOT NULL,
    previous_total REAL,
    new_total REAL,
    delta REAL,
    sources_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    UNIQUE(decision_id, horizon_days)
);
