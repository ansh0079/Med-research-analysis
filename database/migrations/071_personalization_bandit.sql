-- Contextual bandits: arm state, decision log, search→quiz reward attribution

CREATE TABLE IF NOT EXISTS personalization_arm_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    policy_type TEXT NOT NULL,
    arm_id TEXT NOT NULL,
    scope_key TEXT NOT NULL DEFAULT 'global',
    alpha REAL NOT NULL DEFAULT 1.0,
    beta REAL NOT NULL DEFAULT 1.0,
    pulls INTEGER NOT NULL DEFAULT 0,
    total_reward REAL NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(policy_type, arm_id, scope_key)
);

CREATE TABLE IF NOT EXISTS personalization_decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    policy_type TEXT NOT NULL,
    arm_id TEXT NOT NULL,
    search_id INTEGER,
    topic TEXT,
    normalized_topic TEXT,
    article_uid TEXT,
    context_json TEXT,
    immediate_reward REAL,
    delayed_reward REAL,
    total_reward REAL,
    reward_computed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS search_learning_outcomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    search_id INTEGER,
    impression_id INTEGER,
    article_uid TEXT NOT NULL,
    claim_key TEXT,
    topic TEXT,
    normalized_topic TEXT,
    quiz_attempt_id INTEGER,
    first_attempt_correct INTEGER NOT NULL DEFAULT 0,
    reward REAL NOT NULL,
    bandit_arm_id TEXT,
    attributed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_personalization_arm_policy
    ON personalization_arm_state(policy_type, scope_key);

CREATE INDEX IF NOT EXISTS idx_personalization_decisions_user
    ON personalization_decisions(user_id, policy_type, created_at);

CREATE INDEX IF NOT EXISTS idx_personalization_decisions_search
    ON personalization_decisions(search_id, article_uid);

CREATE INDEX IF NOT EXISTS idx_search_learning_outcomes_user
    ON search_learning_outcomes(user_id, normalized_topic, attributed_at);

CREATE INDEX IF NOT EXISTS idx_search_learning_outcomes_article
    ON search_learning_outcomes(article_uid, claim_key);
