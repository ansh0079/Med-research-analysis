-- ==========================================
-- Phase A: Learning Agent Data Layer
-- Stores per-user learning state: profiles, quiz attempts,
-- agent conversations, and topic mastery scores.
-- ==========================================

-- Per-user learning profile and goals
CREATE TABLE IF NOT EXISTS user_learning_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL UNIQUE,
    persona TEXT,
    goals TEXT DEFAULT '[]',
    weak_topics TEXT DEFAULT '[]',
    strong_topics TEXT DEFAULT '[]',
    preferred_difficulty TEXT DEFAULT 'mixed',
    daily_goal_minutes INTEGER DEFAULT 15,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_study_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_learning_profiles_user ON user_learning_profiles(user_id);

-- Individual quiz question answers
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    question_id TEXT NOT NULL,
    question_type TEXT NOT NULL,
    question_text TEXT NOT NULL,
    user_answer TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    is_correct INTEGER NOT NULL DEFAULT 0,
    time_ms INTEGER,
    confidence INTEGER,
    source_article_uid TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_topic ON quiz_attempts(user_id, normalized_topic);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_created ON quiz_attempts(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_topic ON quiz_attempts(normalized_topic);

-- Persistent agent conversation threads
CREATE TABLE IF NOT EXISTS agent_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    title TEXT,
    messages TEXT NOT NULL DEFAULT '[]',
    message_count INTEGER DEFAULT 0,
    last_message_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_conv_user ON agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conv_topic ON agent_conversations(normalized_topic);
CREATE INDEX IF NOT EXISTS idx_agent_conv_last_message ON agent_conversations(user_id, last_message_at);

-- Computed topic mastery per user
CREATE TABLE IF NOT EXISTS user_topic_mastery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    overall_score REAL DEFAULT 0,
    recall_score REAL DEFAULT 0,
    clinical_application_score REAL DEFAULT 0,
    trial_interpretation_score REAL DEFAULT 0,
    guideline_score REAL DEFAULT 0,
    pitfall_score REAL DEFAULT 0,
    attempts_count INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    last_attempt_at TEXT,
    next_review_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, normalized_topic)
);

CREATE INDEX IF NOT EXISTS idx_topic_mastery_user ON user_topic_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_topic_mastery_next_review ON user_topic_mastery(user_id, next_review_at);
