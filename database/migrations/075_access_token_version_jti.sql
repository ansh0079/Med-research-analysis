-- Persist access-token invalidation state.
-- access_token_version lets security events invalidate all outstanding access JWTs.
-- token_jti lets the access-token denylist track explicit JWT IDs, not only full-token hashes.

ALTER TABLE users ADD COLUMN access_token_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE revoked_tokens ADD COLUMN token_jti TEXT;

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_jti ON revoked_tokens(token_jti);
