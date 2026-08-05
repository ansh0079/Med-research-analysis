-- Learning ledger: attribution confidence + source event on decisions;
-- synopsis style memory; counterfactual shadow rankings for search.

ALTER TABLE personalization_decisions ADD COLUMN attribution_confidence REAL;
ALTER TABLE personalization_decisions ADD COLUMN source_event TEXT;

CREATE TABLE IF NOT EXISTS user_synopsis_style_memory (
    user_id TEXT NOT NULL,
    style_arm_id TEXT NOT NULL,
    preference_score REAL NOT NULL DEFAULT 0,
    updates INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, style_arm_id)
);

CREATE INDEX IF NOT EXISTS idx_synopsis_style_memory_user
    ON user_synopsis_style_memory(user_id, preference_score DESC);

CREATE TABLE IF NOT EXISTS search_counterfactual_rankings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    search_id INTEGER,
    user_id TEXT,
    served_arm_id TEXT NOT NULL,
    shadow_arm_id TEXT NOT NULL,
    served_uids_json TEXT NOT NULL DEFAULT '[]',
    shadow_uids_json TEXT NOT NULL DEFAULT '[]',
    propensity REAL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_counterfactual_search
    ON search_counterfactual_rankings(search_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_counterfactual_arms
    ON search_counterfactual_rankings(served_arm_id, shadow_arm_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_personalization_decisions_source
    ON personalization_decisions(source_event, created_at DESC);
