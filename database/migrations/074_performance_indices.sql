-- Performance indices for high-frequency query patterns
CREATE INDEX IF NOT EXISTS idx_case_sessions_user_status ON case_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_case_sessions_user_created ON case_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_attempts_user_topic ON case_attempts(user_id, normalized_topic);
CREATE INDEX IF NOT EXISTS idx_user_topic_mastery_user_topic ON user_topic_mastery(user_id, normalized_topic);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_topic ON agent_conversations(user_id, normalized_topic);
CREATE INDEX IF NOT EXISTS idx_topic_guidelines_normalized ON topic_guidelines(normalized_topic);
CREATE INDEX IF NOT EXISTS idx_topic_crosslinks_normalized ON topic_crosslinks(normalized_topic);
