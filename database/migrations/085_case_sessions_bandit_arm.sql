-- Adaptive case-difficulty selection is now Thompson-sampled (POLICY_CASE_DIFFICULTY
-- in personalizationBanditService.js) instead of a static score-threshold heuristic.
-- arm_id records which difficulty arm served this session so completion can feed a
-- reward back to the bandit.
ALTER TABLE case_sessions ADD COLUMN arm_id TEXT;
