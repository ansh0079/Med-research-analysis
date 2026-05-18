-- ==========================================
-- Medical Research App — SQLite app schema (baseline snapshot)
-- Source: database/migrations/*.sql applied after this file on boot.
-- Regenerate: npm run db:schema:regen  |  Check: npm run db:schema:check
-- Vector DB: database/pgvector.schema.sql (separate Postgres instance)
-- ==========================================

-- ==========================================
-- Core Tables
-- ==========================================

-- Search history for users
CREATE TABLE IF NOT EXISTS searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    query TEXT NOT NULL,
    normalized_topic TEXT,
    sources TEXT, -- JSON array ["pubmed", "semantic"]
    filters TEXT, -- JSON object
    results_count INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    session_sequence_index INTEGER DEFAULT 0,
    previous_queries TEXT, -- JSON array of prior queries in session
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_searches_normalized_topic ON searches(normalized_topic, created_at);

-- Cached articles from external APIs
CREATE TABLE IF NOT EXISTS article_cache (
    id TEXT PRIMARY KEY, -- DOI or UID
    source TEXT NOT NULL, -- pubmed, semantic, openalex
    data TEXT NOT NULL, -- Full article JSON
    title TEXT,
    authors TEXT, -- JSON array
    abstract TEXT,
    publication_date TEXT,
    journal TEXT,
    citation_count INTEGER DEFAULT 0,
    fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME -- Cache expiry
);

-- User saved articles (session-based)
CREATE TABLE IF NOT EXISTS saved_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    article_id TEXT NOT NULL,
    article_data TEXT NOT NULL, -- Full article JSON
    notes TEXT,
    tags TEXT, -- JSON array
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, article_id)
);

-- ==========================================
-- User Authentication Tables (NEW)
-- ==========================================

-- Registered users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- Hashed password
    name TEXT,
    role TEXT DEFAULT 'user', -- user, admin, researcher
    preferences TEXT, -- JSON object
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- User saved articles (persistent across sessions)
CREATE TABLE IF NOT EXISTS user_saved_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    article_id TEXT NOT NULL,
    article_data TEXT NOT NULL, -- Full article JSON
    notes TEXT,
    tags TEXT, -- JSON array
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, article_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Search alerts (email notifications)
CREATE TABLE IF NOT EXISTS search_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    query TEXT NOT NULL,
    frequency TEXT DEFAULT 'weekly', -- daily, weekly, monthly
    sources TEXT, -- JSON array ["pubmed", "semantic"]
    email TEXT,
    active INTEGER DEFAULT 1,
    last_sent DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- AI analysis results cache
CREATE TABLE IF NOT EXISTS analysis_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id TEXT NOT NULL,
    analysis_type TEXT NOT NULL,
    model TEXT,
    result TEXT NOT NULL, -- JSON result
    tokens_used INTEGER,
    cost DECIMAL(10,6),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    UNIQUE(article_id, analysis_type, model)
);

-- Agentic topic memory: citation-grounded knowledge extracted from reviewed syntheses
CREATE TABLE IF NOT EXISTS topic_knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL UNIQUE,
    normalized_topic TEXT NOT NULL UNIQUE,
    knowledge TEXT NOT NULL,
    source_articles TEXT NOT NULL DEFAULT '[]',
    aliases_normalized TEXT NOT NULL DEFAULT '[]',
    canonical_normalized TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'ai_generated',
    confidence REAL NOT NULL DEFAULT 0.5,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_refreshed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Research sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_agent TEXT,
    ip_address TEXT,
    preferences TEXT, -- JSON object
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Collections/folders for saved articles
CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Usage analytics
CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL, -- search, analyze, save, export
    session_id TEXT,
    metadata TEXT, -- JSON object
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS annotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT,
    text TEXT NOT NULL,
    position TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    session_id TEXT,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- Guideline memory: structured clinical guideline extractions per topic
CREATE TABLE IF NOT EXISTS topic_guidelines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    source_body TEXT NOT NULL,
    source_region TEXT,
    source_year INTEGER,
    source_url TEXT,
    source_specialty TEXT,
    source_domain TEXT,
    recommendation_text TEXT NOT NULL,
    recommendation_strength TEXT,
    recommendation_certainty TEXT,
    population TEXT,
    intervention TEXT,
    cautions TEXT,
    status TEXT NOT NULL DEFAULT 'ai_extracted',
    reviewed_by TEXT,
    reviewed_at DATETIME,
    superseded_by_id INTEGER,
    last_checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_topic_guidelines_topic ON topic_guidelines(normalized_topic);
CREATE INDEX IF NOT EXISTS idx_topic_guidelines_status ON topic_guidelines(status);
CREATE INDEX IF NOT EXISTS idx_topic_guidelines_source ON topic_guidelines(source_body);
CREATE INDEX IF NOT EXISTS idx_topic_guidelines_checked ON topic_guidelines(last_checked_at);
CREATE INDEX IF NOT EXISTS idx_topic_guidelines_updated ON topic_guidelines(updated_at);

-- ==========================================
-- Indexes for Performance
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_searches_session ON searches(session_id);
CREATE INDEX IF NOT EXISTS idx_searches_query ON searches(query);
CREATE INDEX IF NOT EXISTS idx_searches_created ON searches(created_at);
CREATE INDEX IF NOT EXISTS idx_searches_session_sequence ON searches(session_id, session_sequence_index);

CREATE INDEX IF NOT EXISTS idx_article_cache_source ON article_cache(source);
CREATE INDEX IF NOT EXISTS idx_article_cache_expires ON article_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_article_cache_title ON article_cache(title);

CREATE INDEX IF NOT EXISTS idx_saved_articles_session ON saved_articles(session_id);

CREATE INDEX IF NOT EXISTS idx_analysis_cache_article ON analysis_cache(article_id);
CREATE INDEX IF NOT EXISTS idx_analysis_cache_expires ON analysis_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_topic_knowledge_normalized ON topic_knowledge(normalized_topic);
CREATE INDEX IF NOT EXISTS idx_topic_knowledge_updated ON topic_knowledge(updated_at);

CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics(created_at);

-- ==========================================
-- Phase A: Learning Agent Data Layer
-- ==========================================

CREATE TABLE IF NOT EXISTS curricula (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    exam_stage_label TEXT,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS curriculum_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    curriculum_id INTEGER NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_curriculum_blocks_curriculum ON curriculum_blocks(curriculum_id, sort_order);

CREATE TABLE IF NOT EXISTS curriculum_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_id INTEGER NOT NULL REFERENCES curriculum_blocks(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    suggested_query TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_curriculum_topics_block ON curriculum_topics(block_id, sort_order);

CREATE TABLE IF NOT EXISTS user_curriculum_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    curriculum_topic_id INTEGER NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'not_started',
    quiz_attempts INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    last_score_pct INTEGER,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, curriculum_topic_id)
);

CREATE INDEX IF NOT EXISTS idx_ucp_user ON user_curriculum_progress(user_id);

CREATE TABLE IF NOT EXISTS user_learning_profiles (
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

CREATE INDEX IF NOT EXISTS idx_learning_profiles_user ON user_learning_profiles(user_id);

CREATE TABLE IF NOT EXISTS quiz_attempts (
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
    study_run_id INTEGER REFERENCES study_runs(id) ON DELETE SET NULL,
    outline_node_id TEXT,
    claim_key TEXT,
    concept_hash TEXT,
    reasoning_tags TEXT DEFAULT '[]',
    reasoning_note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_topic ON quiz_attempts(user_id, normalized_topic);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_created ON quiz_attempts(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_topic ON quiz_attempts(normalized_topic);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_concept_hash ON quiz_attempts(user_id, concept_hash);

CREATE TABLE IF NOT EXISTS pdf_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_uid TEXT NOT NULL UNIQUE,
    sections TEXT NOT NULL,
    ordered_keys TEXT,
    tables TEXT,
    word_count INTEGER DEFAULT 0,
    url TEXT,
    source TEXT,
    numpages INTEGER DEFAULT 0,
    indexed_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pdf_sections_uid ON pdf_sections(article_uid);

CREATE TABLE IF NOT EXISTS ai_generation_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_key TEXT NOT NULL UNIQUE,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    topic TEXT,
    input_hash TEXT,
    input_payload TEXT,
    result_payload TEXT,
    error_message TEXT,
    provider TEXT,
    model TEXT,
    audit_payload TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    started_at TEXT,
    completed_at TEXT,
    expires_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_jobs_status ON ai_generation_jobs(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_ai_generation_jobs_type_topic ON ai_generation_jobs(job_type, topic);

CREATE TABLE IF NOT EXISTS teaching_objects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    object_key TEXT NOT NULL UNIQUE,
    object_type TEXT NOT NULL DEFAULT 'paper',
    article_uid TEXT,
    normalized_topic TEXT,
    topic TEXT,
    title TEXT,
    object_payload TEXT NOT NULL DEFAULT '{}',
    provider TEXT,
    model TEXT,
    confidence REAL NOT NULL DEFAULT 0.5,
    generated_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_teaching_objects_article ON teaching_objects(article_uid);
CREATE INDEX IF NOT EXISTS idx_teaching_objects_topic ON teaching_objects(normalized_topic, object_type);
CREATE INDEX IF NOT EXISTS idx_teaching_objects_updated ON teaching_objects(updated_at);

CREATE TABLE IF NOT EXISTS teaching_object_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    object_key TEXT NOT NULL,
    claim_key TEXT NOT NULL UNIQUE,
    ordinal INTEGER NOT NULL DEFAULT 0,
    claim_text TEXT NOT NULL,
    evidence_quote TEXT,
    source_path TEXT,
    article_uid TEXT,
    normalized_topic TEXT,
    concept_key TEXT,
    confidence REAL,
    verification_status TEXT NOT NULL DEFAULT 'unverified',
    verification_reason TEXT,
    verified_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_teaching_claims_object ON teaching_object_claims(object_key, ordinal);
CREATE INDEX IF NOT EXISTS idx_teaching_claims_topic ON teaching_object_claims(normalized_topic, updated_at);
CREATE INDEX IF NOT EXISTS idx_teaching_claims_article ON teaching_object_claims(article_uid);
CREATE INDEX IF NOT EXISTS idx_teaching_claims_verification ON teaching_object_claims(verification_status, normalized_topic);

CREATE TABLE IF NOT EXISTS ai_generation_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_key TEXT NOT NULL,
    claim_key TEXT NOT NULL,
    ordinal INTEGER NOT NULL DEFAULT 0,
    claim_text TEXT NOT NULL,
    source_ids_json TEXT,
    evidence_quote TEXT,
    confidence REAL,
    validation_status TEXT NOT NULL DEFAULT 'unvalidated',
    concept_key TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(job_key, claim_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_gen_claims_job ON ai_generation_claims(job_key, ordinal);

CREATE TABLE IF NOT EXISTS study_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    outline_id INTEGER,
    curriculum_topic_id INTEGER REFERENCES curriculum_topics(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active',
    progress TEXT NOT NULL DEFAULT '{}',
    node_coverage TEXT NOT NULL DEFAULT '{}',
    started_at TEXT DEFAULT (datetime('now')),
    last_active_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (outline_id) REFERENCES topic_knowledge(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_study_runs_user_status ON study_runs(user_id, status, last_active_at);
CREATE INDEX IF NOT EXISTS idx_study_runs_user_topic ON study_runs(user_id, normalized_topic, last_active_at);
CREATE INDEX IF NOT EXISTS idx_study_runs_outline ON study_runs(outline_id);
CREATE INDEX IF NOT EXISTS idx_study_runs_curriculum_topic ON study_runs(curriculum_topic_id);

CREATE TABLE IF NOT EXISTS agent_conversations (
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

CREATE INDEX IF NOT EXISTS idx_agent_conv_user ON agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conv_topic ON agent_conversations(normalized_topic);
CREATE INDEX IF NOT EXISTS idx_agent_conv_last_message ON agent_conversations(user_id, last_message_at);

CREATE TABLE IF NOT EXISTS user_topic_mastery (
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

CREATE INDEX IF NOT EXISTS idx_topic_mastery_user ON user_topic_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_topic_mastery_next_review ON user_topic_mastery(user_id, next_review_at);

CREATE TABLE IF NOT EXISTS user_topic_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    normalized_topic TEXT NOT NULL,
    display_topic TEXT,
    search_count INTEGER NOT NULL DEFAULT 0,
    last_search_at TEXT,
    top_article_uids TEXT NOT NULL DEFAULT '[]',
    saved_article_uids TEXT NOT NULL DEFAULT '[]',
    weak_outline_node_ids TEXT NOT NULL DEFAULT '[]',
    memory_score REAL NOT NULL DEFAULT 0,
    memory_tier TEXT NOT NULL DEFAULT 'sparse',
    promoted_proposal_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, normalized_topic)
);

CREATE INDEX IF NOT EXISTS idx_user_topic_memory_user ON user_topic_memory(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_topic_memory_norm ON user_topic_memory(normalized_topic);

CREATE TABLE IF NOT EXISTS proactive_evidence_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    normalized_topic TEXT NOT NULL,
    display_topic TEXT,
    alert_kind TEXT NOT NULL DEFAULT 'knowledge_drift',
    title TEXT NOT NULL,
    summary TEXT,
    payload_json TEXT,
    landmark_article_uid TEXT,
    read_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_proactive_evidence_alerts_user_created
    ON proactive_evidence_alerts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_proactive_evidence_alerts_user_topic
    ON proactive_evidence_alerts(user_id, normalized_topic);

-- ==========================================
-- Case Attempt Persistence
-- ==========================================

CREATE TABLE IF NOT EXISTS case_attempts (
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

CREATE INDEX IF NOT EXISTS idx_case_attempts_user_topic ON case_attempts(user_id, normalized_topic);
CREATE INDEX IF NOT EXISTS idx_case_attempts_user_created ON case_attempts(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_case_attempts_topic ON case_attempts(normalized_topic);

-- ==========================================
-- CPD / CME session logging
-- ==========================================

CREATE TABLE IF NOT EXISTS cpd_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    topic TEXT NOT NULL DEFAULT '',
    duration_minutes REAL NOT NULL DEFAULT 0,
    question_count INTEGER DEFAULT 0,
    accuracy_pct INTEGER DEFAULT NULL,
    notes TEXT DEFAULT '',
    source TEXT NOT NULL DEFAULT 'auto',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cpd_sessions_user ON cpd_sessions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_cpd_sessions_type ON cpd_sessions(user_id, activity_type);

CREATE TABLE IF NOT EXISTS portfolio_reflections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reflection_type TEXT NOT NULL DEFAULT 'CBD',
    source_type TEXT NOT NULL DEFAULT 'manual',
    topic TEXT NOT NULL DEFAULT '',
    normalized_topic TEXT NOT NULL DEFAULT '',
    what_happened TEXT NOT NULL DEFAULT '',
    what_i_learned TEXT NOT NULL DEFAULT '',
    what_i_will_change TEXT NOT NULL DEFAULT '',
    evidence_used TEXT NOT NULL DEFAULT '',
    supervisor_discussion TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    linked_cpd_session_id INTEGER REFERENCES cpd_sessions(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_portfolio_reflections_user ON portfolio_reflections(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_portfolio_reflections_topic ON portfolio_reflections(user_id, normalized_topic);

-- ==========================================
-- Search Learning & Feedback
-- ==========================================

CREATE TABLE IF NOT EXISTS user_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT,
    article_id TEXT NOT NULL,
    interaction_type TEXT NOT NULL DEFAULT 'view', -- view, click, save, dwell
    dwell_time_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_interactions_user ON user_interactions(user_id, article_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_interactions_session ON user_interactions(session_id, created_at);

CREATE TABLE IF NOT EXISTS search_result_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    search_id INTEGER REFERENCES searches(id) ON DELETE SET NULL,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT,
    article_uid TEXT NOT NULL,
    feedback_type TEXT NOT NULL, -- helpful, not_helpful
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_search_feedback_user_article ON search_result_feedback(user_id, article_uid);
CREATE INDEX IF NOT EXISTS idx_search_feedback_search ON search_result_feedback(search_id);
CREATE INDEX IF NOT EXISTS idx_search_feedback_session ON search_result_feedback(session_id, created_at);

-- Search result impressions: what was shown but not interacted with
CREATE TABLE IF NOT EXISTS search_result_impressions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    search_id INTEGER NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
    session_id TEXT,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    article_uid TEXT NOT NULL,
    position INTEGER NOT NULL,
    was_clicked INTEGER DEFAULT 0,
    was_saved INTEGER DEFAULT 0,
    dwell_time_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_impressions_search ON search_result_impressions(search_id, article_uid);
CREATE INDEX IF NOT EXISTS idx_impressions_session ON search_result_impressions(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_impressions_article ON search_result_impressions(article_uid, created_at);
CREATE INDEX IF NOT EXISTS idx_impressions_user ON search_result_impressions(user_id, created_at);

CREATE TABLE IF NOT EXISTS low_recall_searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    normalized_topic TEXT NOT NULL,
    display_query TEXT NOT NULL,
    result_count INTEGER NOT NULL DEFAULT 0,
    source_list TEXT NOT NULL DEFAULT '[]',
    expanded_aliases TEXT NOT NULL DEFAULT '[]',
    attempt_count INTEGER NOT NULL DEFAULT 1,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(normalized_topic, display_query)
);

CREATE INDEX IF NOT EXISTS idx_low_recall_topic_seen ON low_recall_searches(normalized_topic, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_low_recall_attempts ON low_recall_searches(attempt_count DESC, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS learning_scheduler_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_type TEXT NOT NULL DEFAULT 'topic_refresh',
    status TEXT NOT NULL DEFAULT 'running',
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME,
    candidates_count INTEGER NOT NULL DEFAULT 0,
    refreshed_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    details TEXT NOT NULL DEFAULT '{}',
    error TEXT
);

CREATE INDEX IF NOT EXISTS idx_learning_scheduler_runs_started
    ON learning_scheduler_runs(run_type, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_scheduler_runs_status
    ON learning_scheduler_runs(status, started_at DESC);
