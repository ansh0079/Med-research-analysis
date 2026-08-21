-- Phase 2 RL control plane: idempotent reward ledger + promote/hold/regress serving state.

CREATE TABLE IF NOT EXISTS bandit_reward_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_key TEXT NOT NULL UNIQUE,
    policy_type TEXT NOT NULL,
    arm_id TEXT NOT NULL,
    scope_key TEXT NOT NULL DEFAULT 'global',
    decision_id INTEGER,
    reward REAL NOT NULL,
    source TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bandit_reward_apps_decision
    ON bandit_reward_applications(decision_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bandit_reward_apps_policy
    ON bandit_reward_applications(policy_type, created_at DESC);

CREATE TABLE IF NOT EXISTS policy_serving_state (
    policy_type TEXT PRIMARY KEY,
    serving_arm_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'hold',
    last_eval_run_id INTEGER,
    last_reason TEXT,
    updated_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);
