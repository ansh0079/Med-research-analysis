-- Programmatic API access keys (hashed at rest)

CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    scopes TEXT NOT NULL DEFAULT 'read',
    last_used_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys (user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys (key_hash);
