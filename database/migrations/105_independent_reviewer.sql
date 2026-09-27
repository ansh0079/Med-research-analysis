-- Reviewer independence for the held-out measurement loop, persisted on the account.
--
-- Until now "who may label ranker output" lived only in the INDEPENDENT_RELEVANCE_REVIEWER_IDS
-- environment variable: granting or revoking a reviewer meant a redeploy, and the access token
-- could not carry the fact, so the review route classified from a property nothing populated.
-- This column makes independence trusted account data. It is signed into the access token at
-- login and re-read from this table whenever judgements are recorded or resolved, so a revoked
-- reviewer stops counting even while an older token is still valid.
-- Default 0 (not independent): everyone is a tuner until an admin explicitly grants independence.
ALTER TABLE users ADD COLUMN independent_reviewer INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_independent_reviewer ON users (independent_reviewer);
