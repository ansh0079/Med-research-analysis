-- ==========================================
-- Add foreign keys to learning tables
-- SQLite requires table recreation to add FK constraints
-- ==========================================

PRAGMA foreign_keys = OFF;

-- user_learning_profiles
ALTER TABLE user_learning_profiles RENAME TO _old_user_learning_profiles;
ALTER TABLE _old_user_learning_profiles ADD COLUMN training_stage TEXT DEFAULT 'finals';
ALTER TABLE _old_user_learning_profiles ADD COLUMN default_explanation_depth TEXT DEFAULT 'exam_focus';
ALTER TABLE _old_user_learning_profiles ADD COLUMN active_curriculum_id INTEGER;
CREATE TABLE user_learning_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    persona TEXT,
    goals TEXT DEFAULT '[]',
    weak_topics TEXT DEFAULT '[]',
    strong_topics TEXT DEFAULT '[]',
    preferred_difficulty TEXT DEFAULT 'mixed',
    daily_goal_minutes INTEGER DEFAULT 15,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_study_date TEXT,
    training_stage TEXT DEFAULT 'finals',
    default_explanation_depth TEXT DEFAULT 'exam_focus',
    active_curriculum_id INTEGER REFERENCES curricula(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO user_learning_profiles (
    id,
    user_id,
    persona,
    goals,
    weak_topics,
    strong_topics,
    preferred_difficulty,
    daily_goal_minutes,
    current_streak,
    longest_streak,
    last_study_date,
    training_stage,
    default_explanation_depth,
    active_curriculum_id,
    created_at,
    updated_at
)
SELECT
    id,
    user_id,
    persona,
    goals,
    weak_topics,
    strong_topics,
    preferred_difficulty,
    daily_goal_minutes,
    current_streak,
    longest_streak,
    last_study_date,
    training_stage,
    default_explanation_depth,
    active_curriculum_id,
    created_at,
    updated_at
FROM _old_user_learning_profiles;
DROP TABLE _old_user_learning_profiles;
CREATE INDEX idx_learning_profiles_user ON user_learning_profiles(user_id);

-- quiz_attempts
ALTER TABLE quiz_attempts RENAME TO _old_quiz_attempts;
CREATE TABLE quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
    study_run_id INTEGER,
    outline_node_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO quiz_attempts (
    id,
    user_id,
    topic,
    normalized_topic,
    question_id,
    question_type,
    question_text,
    user_answer,
    correct_answer,
    is_correct,
    time_ms,
    confidence,
    source_article_uid,
    study_run_id,
    outline_node_id,
    created_at
)
SELECT
    id,
    user_id,
    topic,
    normalized_topic,
    question_id,
    question_type,
    question_text,
    user_answer,
    correct_answer,
    is_correct,
    time_ms,
    confidence,
    source_article_uid,
    NULL,
    NULL,
    created_at
FROM _old_quiz_attempts;
DROP TABLE _old_quiz_attempts;
CREATE INDEX idx_quiz_attempts_user_topic ON quiz_attempts(user_id, normalized_topic);
CREATE INDEX idx_quiz_attempts_user_created ON quiz_attempts(user_id, created_at);
CREATE INDEX idx_quiz_attempts_topic ON quiz_attempts(normalized_topic);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_study_run ON quiz_attempts(study_run_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_outline_node ON quiz_attempts(user_id, outline_node_id);

-- agent_conversations
ALTER TABLE agent_conversations RENAME TO _old_agent_conversations;
CREATE TABLE agent_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    title TEXT,
    messages TEXT NOT NULL DEFAULT '[]',
    message_count INTEGER DEFAULT 0,
    last_message_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO agent_conversations SELECT * FROM _old_agent_conversations;
DROP TABLE _old_agent_conversations;
CREATE INDEX idx_agent_conv_user ON agent_conversations(user_id);
CREATE INDEX idx_agent_conv_topic ON agent_conversations(normalized_topic);
CREATE INDEX idx_agent_conv_last_message ON agent_conversations(user_id, last_message_at);

-- user_topic_mastery
ALTER TABLE user_topic_mastery RENAME TO _old_user_topic_mastery;
CREATE TABLE user_topic_mastery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
INSERT INTO user_topic_mastery SELECT * FROM _old_user_topic_mastery;
DROP TABLE _old_user_topic_mastery;
CREATE INDEX idx_topic_mastery_user ON user_topic_mastery(user_id);
CREATE INDEX idx_topic_mastery_next_review ON user_topic_mastery(user_id, next_review_at);

-- case_attempts
ALTER TABLE case_attempts RENAME TO _old_case_attempts;
CREATE TABLE case_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    case_text TEXT NOT NULL,
    case_type TEXT DEFAULT 'analysis',
    learning_mode TEXT DEFAULT 'resident',
    user_response TEXT,
    ai_feedback TEXT,
    score INTEGER,
    seed_article_uids TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO case_attempts SELECT * FROM _old_case_attempts;
DROP TABLE _old_case_attempts;
CREATE INDEX idx_case_attempts_user_topic ON case_attempts(user_id, normalized_topic);
CREATE INDEX idx_case_attempts_user_created ON case_attempts(user_id, created_at);
CREATE INDEX idx_case_attempts_topic ON case_attempts(normalized_topic);

PRAGMA foreign_keys = ON;
