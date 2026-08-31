-- Let anonymous (BETA_MODE session-only) quiz attempts persist.
--
-- quiz_attempts.user_id was NOT NULL, so an anonymous session's answers could
-- never be written as attempts -- only aggregate learning_events were kept,
-- and the endpoint reported mastery: 0 as if the profile had been scored.
-- session_id lets those attempts be reconciled onto the real account when the
-- user signs in (see db.reconcileAnonymousQuizAttempts).
--
-- This does not extend to spaced_rep_cards -- that table's user_id stays
-- NOT NULL. Scheduling review across days is not meaningful for a session
-- that may not persist past one sitting; FSRS activates once the same
-- questions are answered again as an authenticated user.
--
-- Note: SQLite does not support IF NOT EXISTS on ADD COLUMN, so this
-- migration is idempotent on PostgreSQL (prod) but must run exactly once on
-- SQLite (dev). ALTER COLUMN ... DROP NOT NULL is supported natively by both
-- SQLite 3.35+ and PostgreSQL -- verified directly against better-sqlite3
-- rather than assumed, since SQLite's ALTER TABLE support is limited and
-- version-dependent for other operations.

ALTER TABLE quiz_attempts ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE quiz_attempts ADD COLUMN session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_session_pending
    ON quiz_attempts (session_id) WHERE user_id IS NULL;
