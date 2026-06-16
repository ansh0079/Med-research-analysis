DROP INDEX IF EXISTS idx_revoked_tokens_jti;
ALTER TABLE revoked_tokens DROP COLUMN token_jti;
ALTER TABLE users DROP COLUMN access_token_version;
