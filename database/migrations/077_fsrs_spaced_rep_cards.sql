-- Replaces the SM-2 scheduler with FSRS (Free Spaced Repetition Scheduler).
-- FSRS models memory as stability + difficulty rather than a single easiness
-- factor, and derives the next interval from a retrievability target instead
-- of fixed interval-growth multipliers. interval_days/easiness/repetitions
-- are kept for backward-compatible reads during rollout; due_at/last_reviewed_at
-- remain the source of truth for scheduling either way.
ALTER TABLE spaced_rep_cards ADD COLUMN stability REAL NOT NULL DEFAULT 0;
ALTER TABLE spaced_rep_cards ADD COLUMN difficulty REAL NOT NULL DEFAULT 0;
ALTER TABLE spaced_rep_cards ADD COLUMN state TEXT NOT NULL DEFAULT 'new';
ALTER TABLE spaced_rep_cards ADD COLUMN lapses INTEGER NOT NULL DEFAULT 0;
