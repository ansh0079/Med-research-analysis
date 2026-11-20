-- Rollback Migration 126: Drop agent self-improvement tables.

DROP INDEX IF EXISTS idx_agent_explanation_issues_user;
DROP TABLE IF EXISTS agent_explanation_issues;

DROP INDEX IF EXISTS idx_agent_unhelpful_patterns_user;
DROP TABLE IF EXISTS agent_unhelpful_patterns;

DROP INDEX IF EXISTS idx_agent_helpful_patterns_user;
DROP TABLE IF EXISTS agent_helpful_patterns;

DROP INDEX IF EXISTS idx_agent_mistakes_user_topic;
DROP TABLE IF EXISTS agent_mistakes;
