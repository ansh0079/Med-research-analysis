-- Reward lifecycle on personalization_decisions.
-- pending → partial (immediate only) → final (all expected channels applied)
-- superseded = replaced by a newer decision; reconcile must skip closed rows.

ALTER TABLE personalization_decisions ADD COLUMN reward_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE personalization_decisions ADD COLUMN reward_updated_at TEXT;

CREATE INDEX IF NOT EXISTS idx_personalization_decisions_reward_status
    ON personalization_decisions(reward_status, policy_type, created_at);

UPDATE personalization_decisions
   SET reward_status = 'final',
       reward_updated_at = reward_computed_at
 WHERE total_reward IS NOT NULL
   AND delayed_reward IS NOT NULL
   AND reward_status = 'pending';

UPDATE personalization_decisions
   SET reward_status = 'partial',
       reward_updated_at = reward_computed_at
 WHERE total_reward IS NOT NULL
   AND delayed_reward IS NULL
   AND reward_status = 'pending';
