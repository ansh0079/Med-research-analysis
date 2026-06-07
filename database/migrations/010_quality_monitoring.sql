-- Quality Monitoring and Agent Self-Improvement Schema
-- Adds tables for tracking component quality, agent mistakes, and self-improvement

-- Audit log for high-stakes operations
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    changes_json TEXT,
    metadata_json TEXT,
    severity TEXT DEFAULT 'info',
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_severity ON audit_log(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- Agent mistakes tracked from user corrections
CREATE TABLE IF NOT EXISTS agent_mistakes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    incorrect_claim TEXT NOT NULL,
    user_correction TEXT NOT NULL,
    thread_id TEXT,
    learned_at TEXT NOT NULL,
    last_occurred_at TEXT,
    occurrence_count INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, topic, incorrect_claim)
);

CREATE INDEX IF NOT EXISTS idx_agent_mistakes_user_topic ON agent_mistakes(user_id, normalized_topic);
CREATE INDEX IF NOT EXISTS idx_agent_mistakes_occurrence ON agent_mistakes(occurrence_count DESC);

-- Helpful conversation patterns
CREATE TABLE IF NOT EXISTS agent_helpful_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    message_count INTEGER,
    conversation_summary TEXT,
    recorded_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_helpful_user ON agent_helpful_patterns(user_id, recorded_at DESC);

-- Unhelpful conversation patterns
CREATE TABLE IF NOT EXISTS agent_unhelpful_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    prompt_context TEXT,
    unhelpful_response TEXT,
    reason TEXT,
    recorded_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_unhelpful_user ON agent_unhelpful_patterns(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_unhelpful_reason ON agent_unhelpful_patterns(reason);

-- Explanation clarity issues (multiple clarification requests)
CREATE TABLE IF NOT EXISTS agent_explanation_issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    clarification_count INTEGER,
    conversation_summary TEXT,
    recorded_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_explanation_user ON agent_explanation_issues(user_id, recorded_at DESC);

-- Case scenarios for interactive learning
CREATE TABLE IF NOT EXISTS case_scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    topic TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    vignette TEXT NOT NULL,
    decision_tree TEXT NOT NULL,
    outcomes TEXT NOT NULL,
    current_node TEXT NOT NULL,
    choices_made TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT,
    completed_at TEXT,
    provider TEXT,
    model TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_case_scenarios_user ON case_scenarios(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_scenarios_topic ON case_scenarios(topic);
CREATE INDEX IF NOT EXISTS idx_case_scenarios_completed ON case_scenarios(completed_at);

-- Case attempts for mastery tracking
CREATE TABLE IF NOT EXISTS case_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    case_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    score_percentage INTEGER NOT NULL,
    appropriate_choices INTEGER NOT NULL,
    total_choices INTEGER NOT NULL,
    outcome_type TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (case_id) REFERENCES case_scenarios(case_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_case_attempts_user_topic ON case_attempts(user_id, normalized_topic);
CREATE INDEX IF NOT EXISTS idx_case_attempts_score ON case_attempts(score_percentage DESC);

-- Component quality metrics (aggregated daily)
CREATE TABLE IF NOT EXISTS component_quality_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    component_name TEXT NOT NULL,
    metric_date TEXT NOT NULL,
    total_operations INTEGER DEFAULT 0,
    successful_operations INTEGER DEFAULT 0,
    failed_operations INTEGER DEFAULT 0,
    average_confidence REAL,
    average_response_time_ms INTEGER,
    cache_hit_rate REAL,
    user_feedback_positive INTEGER DEFAULT 0,
    user_feedback_negative INTEGER DEFAULT 0,
    recorded_at TEXT NOT NULL,
    UNIQUE(component_name, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_component_quality_name_date ON component_quality_metrics(component_name, metric_date DESC);

-- Synthesis quality tracking
CREATE TABLE IF NOT EXISTS synthesis_quality_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    synthesis_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    fulltext_coverage_ratio REAL,
    citation_relevance_score REAL,
    has_irrelevant_citations BOOLEAN,
    retraction_count INTEGER DEFAULT 0,
    source_count INTEGER,
    confidence_score REAL,
    generated_at TEXT NOT NULL,
    provider TEXT,
    model TEXT
);

CREATE INDEX IF NOT EXISTS idx_synthesis_quality_topic ON synthesis_quality_log(topic, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_synthesis_quality_score ON synthesis_quality_log(confidence_score DESC);

-- MCQ quality tracking
CREATE TABLE IF NOT EXISTS mcq_quality_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mcq_batch_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    total_generated INTEGER,
    total_validated INTEGER,
    rejection_rate REAL,
    diversity_type_score REAL,
    diversity_difficulty_score REAL,
    average_confidence REAL,
    generated_at TEXT NOT NULL,
    provider TEXT,
    model TEXT
);

CREATE INDEX IF NOT EXISTS idx_mcq_quality_topic ON mcq_quality_log(topic, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcq_quality_rejection ON mcq_quality_log(rejection_rate DESC);

-- Search quality tracking
CREATE TABLE IF NOT EXISTS search_quality_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    result_count INTEGER,
    mesh_expansion_count INTEGER,
    used_reformulation BOOLEAN,
    average_ebm_score REAL,
    cache_hit BOOLEAN,
    response_time_ms INTEGER,
    searched_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_search_quality_query ON search_quality_log(searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_quality_ebm ON search_quality_log(average_ebm_score DESC);
