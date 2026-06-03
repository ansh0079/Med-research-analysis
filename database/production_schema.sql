-- ==========================================
-- Medical Research App — PostgreSQL main app schema
-- Does NOT include pgvector articles_cache — see pgvector.schema.sql
-- Regenerate: npm run db:schema:regen  |  Check: npm run db:schema:check
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- Core Tables
-- ==========================================

CREATE TABLE IF NOT EXISTS searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL,
    query TEXT NOT NULL,
    sources TEXT, -- JSON array
    filters TEXT, -- JSON object
    results_count INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    session_sequence_index INTEGER DEFAULT 0,
    previous_queries TEXT, -- JSON array of prior queries in session
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT
);

CREATE TABLE IF NOT EXISTS article_cache (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    data TEXT NOT NULL,
    title TEXT,
    authors TEXT,
    abstract TEXT,
    publication_date TEXT,
    journal TEXT,
    citation_count INTEGER DEFAULT 0,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS saved_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL,
    article_id TEXT NOT NULL,
    article_data TEXT NOT NULL,
    notes TEXT,
    tags TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, article_id)
);

-- ==========================================
-- User Authentication Tables
-- ==========================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    preferences TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS user_saved_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    article_id TEXT NOT NULL,
    article_data TEXT NOT NULL,
    notes TEXT,
    tags TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, article_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS search_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    query TEXT NOT NULL,
    frequency TEXT DEFAULT 'weekly',
    sources TEXT,
    email TEXT,
    active INTEGER DEFAULT 1,
    last_sent TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analysis_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id TEXT NOT NULL,
    analysis_type TEXT NOT NULL,
    model TEXT,
    result TEXT NOT NULL,
    tokens_used INTEGER,
    cost DECIMAL(10,6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(article_id, analysis_type, model)
);

CREATE TABLE IF NOT EXISTS ai_generation_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_jobs_status ON ai_generation_jobs(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_ai_generation_jobs_type_topic ON ai_generation_jobs(job_type, topic);

CREATE TABLE IF NOT EXISTS synthesis_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    normalized_topic TEXT NOT NULL,
    topic TEXT NOT NULL,
    consensus_text TEXT NOT NULL,
    evidence_grade TEXT NOT NULL DEFAULT 'MODERATE',
    key_finding_count INTEGER NOT NULL DEFAULT 0,
    article_count INTEGER NOT NULL DEFAULT 0,
    article_uids JSONB NOT NULL DEFAULT '[]',
    claim_fingerprint TEXT,
    claim_texts_json JSONB NOT NULL DEFAULT '[]',
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_synthesis_snapshots_topic
    ON synthesis_snapshots(normalized_topic, generated_at DESC);

CREATE TABLE IF NOT EXISTS teaching_objects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    object_key TEXT NOT NULL UNIQUE,
    object_type TEXT NOT NULL DEFAULT 'paper',
    article_uid TEXT,
    normalized_topic TEXT,
    topic TEXT,
    title TEXT,
    object_payload TEXT NOT NULL DEFAULT '{}',
    provider TEXT,
    model TEXT,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teaching_objects_article ON teaching_objects(article_uid);
CREATE INDEX IF NOT EXISTS idx_teaching_objects_topic ON teaching_objects(normalized_topic, object_type);
CREATE INDEX IF NOT EXISTS idx_teaching_objects_updated ON teaching_objects(updated_at);

CREATE TABLE IF NOT EXISTS teaching_object_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    object_key TEXT NOT NULL,
    claim_key TEXT NOT NULL UNIQUE,
    ordinal INTEGER NOT NULL DEFAULT 0,
    claim_text TEXT NOT NULL,
    evidence_quote TEXT,
    source_path TEXT,
    article_uid TEXT,
    normalized_topic TEXT,
    concept_key TEXT,
    confidence DOUBLE PRECISION,
    verification_status TEXT NOT NULL DEFAULT 'unverified',
    verification_reason TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teaching_claims_object ON teaching_object_claims(object_key, ordinal);
CREATE INDEX IF NOT EXISTS idx_teaching_claims_topic ON teaching_object_claims(normalized_topic, updated_at);
CREATE INDEX IF NOT EXISTS idx_teaching_claims_article ON teaching_object_claims(article_uid);
CREATE INDEX IF NOT EXISTS idx_teaching_claims_verification ON teaching_object_claims(verification_status, normalized_topic);

CREATE TABLE IF NOT EXISTS ai_generation_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_key TEXT NOT NULL,
    claim_key TEXT NOT NULL,
    ordinal INTEGER NOT NULL DEFAULT 0,
    claim_text TEXT NOT NULL,
    source_ids_json TEXT,
    evidence_quote TEXT,
    confidence DOUBLE PRECISION,
    validation_status TEXT NOT NULL DEFAULT 'unvalidated',
    concept_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_key, claim_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_gen_claims_job ON ai_generation_claims(job_key, ordinal);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_agent TEXT,
    ip_address TEXT,
    preferences TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    session_id TEXT,
    metadata TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS annotations (
    id SERIAL PRIMARY KEY,
    article_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT,
    text TEXT NOT NULL,
    position TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    session_id TEXT,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- Indexes
-- ==========================================

CREATE INDEX idx_searches_session ON searches(session_id);
CREATE INDEX idx_searches_query ON searches(query);
CREATE INDEX idx_searches_created ON searches(created_at);
CREATE INDEX idx_searches_session_sequence ON searches(session_id, session_sequence_index);

CREATE INDEX idx_article_cache_source ON article_cache(source);
CREATE INDEX idx_article_cache_expires ON article_cache(expires_at);
CREATE INDEX idx_article_cache_title ON article_cache(title);

CREATE INDEX idx_saved_articles_session ON saved_articles(session_id);

CREATE INDEX idx_analysis_cache_article ON analysis_cache(article_id);
CREATE INDEX idx_analysis_cache_expires ON analysis_cache(expires_at);

CREATE INDEX idx_analytics_type ON analytics(event_type);
CREATE INDEX idx_analytics_created ON analytics(created_at);
CREATE INDEX idx_analytics_event_created ON analytics(event_type, created_at);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- Sprint 2: Session Trajectory Memory + Implicit Negative Feedback
CREATE TABLE IF NOT EXISTS search_result_impressions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
    session_id TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    article_uid TEXT NOT NULL,
    position INTEGER NOT NULL,
    was_clicked INTEGER DEFAULT 0,
    was_saved INTEGER DEFAULT 0,
    dwell_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_impressions_search ON search_result_impressions(search_id, article_uid);
CREATE INDEX idx_impressions_session ON search_result_impressions(session_id, created_at);
CREATE INDEX idx_impressions_article ON search_result_impressions(article_uid, created_at);
CREATE INDEX idx_impressions_user ON search_result_impressions(user_id, created_at);

-- ==========================================
-- Missing Tables (converted from SQLite schema.sql)
-- ==========================================

CREATE TABLE IF NOT EXISTS topic_knowledge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic TEXT NOT NULL UNIQUE,
    normalized_topic TEXT NOT NULL UNIQUE,
    knowledge JSONB NOT NULL,
    source_articles JSONB NOT NULL DEFAULT '[]',
    aliases_normalized JSONB NOT NULL DEFAULT '[]',
    canonical_normalized TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'ai_generated',
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_refreshed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS topic_guidelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    reviewed_at TIMESTAMP WITH TIME ZONE,
    superseded_by_id UUID,
    last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS curricula (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    exam_stage_label TEXT,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS curriculum_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    curriculum_id UUID NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS curriculum_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_id UUID NOT NULL REFERENCES curriculum_blocks(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    suggested_query TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    priority TEXT NOT NULL DEFAULT 'medium',
    volatility TEXT NOT NULL DEFAULT 'moderate',
    seed_status TEXT NOT NULL DEFAULT 'not_seeded',
    last_seeded_at TIMESTAMP WITH TIME ZONE,
    last_synthesis_at TIMESTAMP WITH TIME ZONE,
    claim_count INTEGER NOT NULL DEFAULT 0,
    review_due_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS user_curriculum_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    curriculum_topic_id UUID NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'not_started',
    quiz_attempts INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    last_score_pct INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, curriculum_topic_id)
);

CREATE TABLE IF NOT EXISTS user_learning_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    persona TEXT,
    goals JSONB DEFAULT '[]',
    weak_topics JSONB DEFAULT '[]',
    strong_topics JSONB DEFAULT '[]',
    preferred_difficulty TEXT DEFAULT 'mixed',
    daily_goal_minutes INTEGER DEFAULT 15,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_study_date TEXT,
    training_stage TEXT DEFAULT 'finals',
    default_explanation_depth TEXT DEFAULT 'exam_focus',
    specialty_interest TEXT,
    study_goal TEXT,
    active_curriculum_id UUID REFERENCES curricula(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pdf_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_uid TEXT NOT NULL UNIQUE,
    sections JSONB NOT NULL,
    ordered_keys JSONB,
    tables JSONB,
    word_count INTEGER DEFAULT 0,
    url TEXT,
    source TEXT,
    numpages INTEGER DEFAULT 0,
    indexed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS study_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    outline_id UUID REFERENCES topic_knowledge(id) ON DELETE SET NULL,
    curriculum_topic_id UUID REFERENCES curriculum_topics(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active',
    progress JSONB NOT NULL DEFAULT '{}',
    node_coverage JSONB NOT NULL DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS quiz_validation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    generation_job_key TEXT,
    prompt_variant TEXT,
    validator_version INTEGER DEFAULT 1,
    status TEXT NOT NULL CHECK (status IN ('passed', 'rejected', 'needs_review')),
    rejection_reasons JSONB,
    reviewer_notes TEXT,
    source_provider TEXT,
    source_model TEXT,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qvr_question ON quiz_validation_results(question_id);
CREATE INDEX IF NOT EXISTS idx_qvr_topic ON quiz_validation_results(normalized_topic, status);
CREATE INDEX IF NOT EXISTS idx_qvr_job ON quiz_validation_results(generation_job_key);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
    study_run_id UUID REFERENCES study_runs(id) ON DELETE SET NULL,
    outline_node_id TEXT,
    claim_key TEXT,
    concept_hash TEXT,
    reasoning_tags JSONB DEFAULT '[]',
    reasoning_note TEXT,
    prompt_variant TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    title TEXT,
    messages JSONB NOT NULL DEFAULT '[]',
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_topic_mastery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    overall_score DOUBLE PRECISION DEFAULT 0,
    recall_score DOUBLE PRECISION DEFAULT 0,
    clinical_application_score DOUBLE PRECISION DEFAULT 0,
    trial_interpretation_score DOUBLE PRECISION DEFAULT 0,
    guideline_score DOUBLE PRECISION DEFAULT 0,
    pitfall_score DOUBLE PRECISION DEFAULT 0,
    attempts_count INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    next_review_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, normalized_topic)
);

CREATE TABLE IF NOT EXISTS user_topic_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    normalized_topic TEXT NOT NULL,
    display_topic TEXT,
    search_count INTEGER NOT NULL DEFAULT 0,
    last_search_at TIMESTAMP WITH TIME ZONE,
    top_article_uids JSONB NOT NULL DEFAULT '[]',
    saved_article_uids JSONB NOT NULL DEFAULT '[]',
    weak_outline_node_ids JSONB NOT NULL DEFAULT '[]',
    memory_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    memory_tier TEXT NOT NULL DEFAULT 'sparse',
    promoted_proposal_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, normalized_topic)
);

CREATE TABLE IF NOT EXISTS proactive_evidence_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    normalized_topic TEXT NOT NULL,
    display_topic TEXT,
    alert_kind TEXT NOT NULL DEFAULT 'knowledge_drift',
    title TEXT NOT NULL,
    summary TEXT,
    payload_json JSONB,
    landmark_article_uid TEXT,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS case_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    case_text TEXT NOT NULL,
    case_type TEXT DEFAULT 'analysis',
    learning_mode TEXT DEFAULT 'resident',
    user_response TEXT,
    ai_feedback TEXT,
    score INTEGER,
    seed_article_uids JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cpd_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    topic TEXT NOT NULL DEFAULT '',
    duration_minutes DOUBLE PRECISION NOT NULL DEFAULT 0,
    question_count INTEGER DEFAULT 0,
    accuracy_pct INTEGER DEFAULT NULL,
    notes TEXT DEFAULT '',
    source TEXT NOT NULL DEFAULT 'auto',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portfolio_reflections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
    linked_cpd_session_id UUID REFERENCES cpd_sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT,
    article_id TEXT NOT NULL,
    interaction_type TEXT NOT NULL DEFAULT 'view',
    dwell_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS search_result_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    search_id UUID REFERENCES searches(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT,
    article_uid TEXT NOT NULL,
    feedback_type TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS low_recall_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    normalized_topic TEXT NOT NULL,
    display_query TEXT NOT NULL,
    result_count INTEGER NOT NULL DEFAULT 0,
    source_list JSONB NOT NULL DEFAULT '[]',
    expanded_aliases JSONB NOT NULL DEFAULT '[]',
    attempt_count INTEGER NOT NULL DEFAULT 1,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(normalized_topic, display_query)
);

CREATE TABLE IF NOT EXISTS learning_scheduler_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_type TEXT NOT NULL DEFAULT 'topic_refresh',
    status TEXT NOT NULL DEFAULT 'running',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITH TIME ZONE,
    candidates_count INTEGER NOT NULL DEFAULT 0,
    refreshed_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    details JSONB NOT NULL DEFAULT '{}',
    error TEXT
);

CREATE TABLE IF NOT EXISTS admin_runtime_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS curriculum_seed_usage_daily (
    date TEXT PRIMARY KEY,
    topics_attempted INTEGER NOT NULL DEFAULT 0,
    topics_seeded INTEGER NOT NULL DEFAULT 0,
    topics_failed INTEGER NOT NULL DEFAULT 0,
    synopses_generated INTEGER NOT NULL DEFAULT 0,
    estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- Indexes for missing tables
-- ==========================================

CREATE INDEX idx_topic_knowledge_normalized ON topic_knowledge(normalized_topic);
CREATE INDEX idx_topic_knowledge_updated ON topic_knowledge(updated_at);

CREATE INDEX idx_topic_guidelines_topic ON topic_guidelines(normalized_topic);
CREATE INDEX idx_topic_guidelines_status ON topic_guidelines(status);
CREATE INDEX idx_topic_guidelines_source ON topic_guidelines(source_body);
CREATE INDEX idx_topic_guidelines_checked ON topic_guidelines(last_checked_at);
CREATE INDEX idx_topic_guidelines_updated ON topic_guidelines(updated_at);

CREATE INDEX idx_curriculum_blocks_curriculum ON curriculum_blocks(curriculum_id, sort_order);

CREATE INDEX idx_curriculum_topics_block ON curriculum_topics(block_id, sort_order);
CREATE INDEX idx_curriculum_topics_seed_status ON curriculum_topics(seed_status, priority, volatility);
CREATE INDEX idx_curriculum_seed_usage_daily_updated ON curriculum_seed_usage_daily(updated_at DESC);

CREATE INDEX idx_ucp_user ON user_curriculum_progress(user_id);

CREATE INDEX idx_learning_profiles_user ON user_learning_profiles(user_id);

CREATE INDEX idx_quiz_attempts_user_topic ON quiz_attempts(user_id, normalized_topic);
CREATE INDEX idx_quiz_attempts_user_created ON quiz_attempts(user_id, created_at);
CREATE INDEX idx_quiz_attempts_topic ON quiz_attempts(normalized_topic);
CREATE INDEX idx_quiz_attempts_concept_hash ON quiz_attempts(user_id, concept_hash);

CREATE INDEX idx_pdf_sections_uid ON pdf_sections(article_uid);

CREATE INDEX idx_study_runs_user_status ON study_runs(user_id, status, last_active_at);
CREATE INDEX idx_study_runs_user_topic ON study_runs(user_id, normalized_topic, last_active_at);
CREATE INDEX idx_study_runs_outline ON study_runs(outline_id);
CREATE INDEX idx_study_runs_curriculum_topic ON study_runs(curriculum_topic_id);

CREATE INDEX idx_agent_conv_user ON agent_conversations(user_id);
CREATE INDEX idx_agent_conv_topic ON agent_conversations(normalized_topic);
CREATE INDEX idx_agent_conv_last_message ON agent_conversations(user_id, last_message_at);

CREATE INDEX idx_topic_mastery_user ON user_topic_mastery(user_id);
CREATE INDEX idx_topic_mastery_next_review ON user_topic_mastery(user_id, next_review_at);

CREATE INDEX idx_user_topic_memory_user ON user_topic_memory(user_id, updated_at DESC);
CREATE INDEX idx_user_topic_memory_norm ON user_topic_memory(normalized_topic);

CREATE INDEX idx_proactive_evidence_alerts_user_created ON proactive_evidence_alerts(user_id, created_at DESC);
CREATE INDEX idx_proactive_evidence_alerts_user_topic ON proactive_evidence_alerts(user_id, normalized_topic);

CREATE INDEX idx_case_attempts_user_topic ON case_attempts(user_id, normalized_topic);
CREATE INDEX idx_case_attempts_user_created ON case_attempts(user_id, created_at);
CREATE INDEX idx_case_attempts_topic ON case_attempts(normalized_topic);

CREATE INDEX idx_cpd_sessions_user ON cpd_sessions(user_id, created_at);
CREATE INDEX idx_cpd_sessions_type ON cpd_sessions(user_id, activity_type);

CREATE INDEX idx_portfolio_reflections_user ON portfolio_reflections(user_id, updated_at);
CREATE INDEX idx_portfolio_reflections_topic ON portfolio_reflections(user_id, normalized_topic);

CREATE INDEX idx_user_interactions_user ON user_interactions(user_id, article_id, created_at);
CREATE INDEX idx_user_interactions_session ON user_interactions(session_id, created_at);

CREATE INDEX idx_search_feedback_user_article ON search_result_feedback(user_id, article_uid);
CREATE INDEX idx_search_feedback_search ON search_result_feedback(search_id);
CREATE INDEX idx_search_feedback_session ON search_result_feedback(session_id, created_at);

CREATE INDEX idx_low_recall_topic_seen ON low_recall_searches(normalized_topic, last_seen_at DESC);
CREATE INDEX idx_low_recall_attempts ON low_recall_searches(attempt_count DESC, last_seen_at DESC);

CREATE INDEX idx_learning_scheduler_runs_started ON learning_scheduler_runs(run_type, started_at DESC);
CREATE INDEX idx_learning_scheduler_runs_status ON learning_scheduler_runs(status, started_at DESC);
