-- Migration 126: Agent Self-Improvement tables for tracking user corrections,
-- helpful/unhelpful conversation patterns, and explanation clarification issues.

CREATE TABLE IF NOT EXISTS agent_mistakes (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    incorrect_claim TEXT NOT NULL,
    user_correction TEXT NOT NULL,
    thread_id TEXT,
    learned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_occurred_at TEXT,
    occurrence_count INTEGER NOT NULL DEFAULT 1,
    UNIQUE(user_id, topic, incorrect_claim)
);

CREATE INDEX IF NOT EXISTS idx_agent_mistakes_user_topic
    ON agent_mistakes(user_id, normalized_topic);

CREATE TABLE IF NOT EXISTS agent_helpful_patterns (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    thread_id TEXT,
    message_count INTEGER NOT NULL DEFAULT 0,
    conversation_summary TEXT,
    recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_helpful_patterns_user
    ON agent_helpful_patterns(user_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS agent_unhelpful_patterns (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    thread_id TEXT,
    prompt_context TEXT,
    unhelpful_response TEXT,
    reason TEXT,
    recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_unhelpful_patterns_user
    ON agent_unhelpful_patterns(user_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS agent_explanation_issues (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    thread_id TEXT,
    clarification_count INTEGER NOT NULL DEFAULT 0,
    conversation_summary TEXT,
    recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_explanation_issues_user
    ON agent_explanation_issues(user_id, recorded_at DESC);
