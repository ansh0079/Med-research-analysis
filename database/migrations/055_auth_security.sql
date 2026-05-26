-- ==========================================
-- Migration 055: Auth security persistence
-- Token revocation denylist + login/reset rate limits (DB fallback when Redis unavailable)
-- ==========================================

CREATE TABLE IF NOT EXISTS revoked_tokens (
    token_hash TEXT PRIMARY KEY,
    revoked_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON revoked_tokens(expires_at);

CREATE TABLE IF NOT EXISTS auth_rate_limits (
    limit_key TEXT PRIMARY KEY,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    window_start DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_window ON auth_rate_limits(window_start);
