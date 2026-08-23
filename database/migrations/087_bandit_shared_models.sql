-- Phase 5.1: shared linear-value model cache for multi-instance bandit serving.
-- Deterministic hourly keys (bandit:linear:{policy}:{YYYY-MM-DDTHH}) so every
-- replica loads the same fitted weights.

CREATE TABLE IF NOT EXISTS bandit_shared_models (
    cache_key TEXT PRIMARY KEY,
    policy_type TEXT NOT NULL,
    model_json TEXT NOT NULL,
    fitted_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bandit_shared_models_expires
    ON bandit_shared_models(expires_at);

CREATE INDEX IF NOT EXISTS idx_bandit_shared_models_policy
    ON bandit_shared_models(policy_type, fitted_at DESC);
