-- ==========================================
-- Medical Research App — PostgreSQL main app schema
-- Does NOT include pgvector articles_cache — see pgvector.schema.sql
-- Regenerate: npm run db:schema:regen  |  Check: npm run db:schema:check
-- ==========================================

CREATE TABLE IF NOT EXISTS admin_runtime_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_conversations (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    title TEXT,
    messages TEXT NOT NULL DEFAULT '[]',
    message_count INTEGER DEFAULT 0,
    last_message_at TEXT,
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
, conversation_summary TEXT, learner_snapshot_json TEXT NOT NULL DEFAULT '{}', updated_at TEXT DEFAULT (CURRENT_TIMESTAMP));

CREATE TABLE IF NOT EXISTS ai_generation_claims (
    id SERIAL PRIMARY KEY,
    job_key TEXT NOT NULL,
    claim_key TEXT NOT NULL,
    ordinal INTEGER NOT NULL DEFAULT 0,
    claim_text TEXT NOT NULL,
    source_ids_json TEXT,
    evidence_quote TEXT,
    confidence REAL,
    validation_status TEXT NOT NULL DEFAULT 'unvalidated',
    concept_key TEXT,
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    UNIQUE(job_key, claim_key)
);

CREATE TABLE IF NOT EXISTS ai_generation_jobs (
    id SERIAL PRIMARY KEY,
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
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    started_at TEXT,
    completed_at TEXT,
    expires_at TEXT
);

CREATE TABLE IF NOT EXISTS ai_usage_monthly (
    id          SERIAL PRIMARY KEY,
    user_id     TEXT    NOT NULL,
    year_month  TEXT    NOT NULL,
    feature     TEXT    NOT NULL,
    count       INTEGER NOT NULL DEFAULT 0,
    updated_at  TEXT    NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    UNIQUE (user_id, year_month, feature)
);

CREATE TABLE IF NOT EXISTS analysis_cache (
    id SERIAL PRIMARY KEY,
    article_id TEXT NOT NULL,
    analysis_type TEXT NOT NULL,
    model TEXT,
    result TEXT NOT NULL, 
    tokens_used INTEGER,
    cost DECIMAL(10,6),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ,
    UNIQUE(article_id, analysis_type, model)
);

CREATE TABLE IF NOT EXISTS analytics (
    id SERIAL PRIMARY KEY,
    event_type TEXT NOT NULL, 
    session_id TEXT,
    metadata TEXT, 
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS annotations (
    id SERIAL PRIMARY KEY,
    article_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT,
    text TEXT NOT NULL,
    position TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    scopes TEXT NOT NULL DEFAULT 'read',
    last_used_at TEXT,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    revoked_at TEXT
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
    fetched_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ 
, quality_data TEXT, retraction_data TEXT, quality_score INTEGER DEFAULT 0, is_retracted INTEGER DEFAULT 0);

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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_rate_limits (
    limit_key TEXT PRIMARY KEY,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    window_start TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS billing_audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    session_id TEXT,
    action TEXT NOT NULL,
    external_ref TEXT,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS case_attempts (
    id SERIAL PRIMARY KEY,
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
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS case_evidence_briefs (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL DEFAULT '',
    clinical_question TEXT NOT NULL,
    brief_json TEXT NOT NULL DEFAULT '{}',
    articles_json TEXT NOT NULL DEFAULT '[]',
    related_claims_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS claim_contradiction_searches (
    id SERIAL PRIMARY KEY,
    claim_key TEXT NOT NULL,
    normalized_topic TEXT,
    search_query TEXT NOT NULL,
    results_json TEXT,
    result_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS claim_regeneration_queue (
    id SERIAL PRIMARY KEY,
    claim_key TEXT NOT NULL,
    article_uid TEXT,
    normalized_topic TEXT,
    trigger_reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
);

CREATE TABLE IF NOT EXISTS claim_status_history (
    id SERIAL PRIMARY KEY,
    claim_key TEXT NOT NULL,
    normalized_topic TEXT,
    from_status TEXT,
    to_status TEXT NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS collab_activities (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    user_id TEXT,
    user_name TEXT,
    collection_id TEXT,
    article_id TEXT,
    comment_id TEXT,
    metadata TEXT DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collab_annotations (
    id TEXT PRIMARY KEY,
    article_id TEXT NOT NULL,
    collection_id TEXT,
    user_id TEXT NOT NULL,
    user_name TEXT,
    type TEXT NOT NULL,
    range_data TEXT NOT NULL,
    text TEXT NOT NULL,
    note TEXT,
    color TEXT,
    is_private INTEGER DEFAULT 0,
    tags TEXT DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collab_collection_articles (
    id SERIAL PRIMARY KEY,
    collection_id TEXT NOT NULL,
    article_id TEXT NOT NULL,
    article_data TEXT DEFAULT '{}',
    added_by TEXT NOT NULL,
    added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    UNIQUE(collection_id, article_id),
    FOREIGN KEY (collection_id) REFERENCES collab_collections(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collab_collection_collaborators (
    id SERIAL PRIMARY KEY,
    collection_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT,
    email TEXT,
    permission TEXT DEFAULT 'read',
    added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    added_by TEXT,
    UNIQUE(collection_id, user_id),
    FOREIGN KEY (collection_id) REFERENCES collab_collections(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collab_collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_id TEXT NOT NULL,
    owner_name TEXT,
    is_public INTEGER DEFAULT 0,
    tags TEXT DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collab_comment_reactions (
    id SERIAL PRIMARY KEY,
    comment_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    user_id TEXT NOT NULL,
    UNIQUE(comment_id, emoji, user_id),
    FOREIGN KEY (comment_id) REFERENCES collab_comments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collab_comments (
    id TEXT PRIMARY KEY,
    article_id TEXT NOT NULL,
    collection_id TEXT,
    annotation_id TEXT,
    user_id TEXT NOT NULL,
    user_name TEXT,
    content TEXT NOT NULL,
    parent_id TEXT,
    is_resolved INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collab_invitations (
    id TEXT PRIMARY KEY,
    collection_id TEXT NOT NULL,
    collection_name TEXT,
    invited_by TEXT NOT NULL,
    invited_by_name TEXT,
    invitee_email TEXT NOT NULL,
    permission TEXT DEFAULT 'read',
    message TEXT,
    status TEXT DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (collection_id) REFERENCES collab_collections(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collab_notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT,
    title TEXT,
    body TEXT,
    is_read INTEGER DEFAULT 0,
    related_collection_id TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cpd_sessions (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    topic TEXT NOT NULL DEFAULT '',
    duration_minutes REAL NOT NULL DEFAULT 0,
    question_count INTEGER DEFAULT 0,
    accuracy_pct INTEGER DEFAULT NULL,
    notes TEXT DEFAULT '',
    source TEXT NOT NULL DEFAULT 'auto',
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS curricula (
    id SERIAL PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    exam_stage_label TEXT,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS curriculum_blocks (
    id SERIAL PRIMARY KEY,
    curriculum_id INTEGER NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS curriculum_seed_usage_daily (
    date TEXT PRIMARY KEY,
    topics_attempted INTEGER NOT NULL DEFAULT 0,
    topics_seeded INTEGER NOT NULL DEFAULT 0,
    topics_failed INTEGER NOT NULL DEFAULT 0,
    synopses_generated INTEGER NOT NULL DEFAULT 0,
    estimated_cost_usd REAL NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS curriculum_topics (
    id SERIAL PRIMARY KEY,
    block_id INTEGER NOT NULL REFERENCES curriculum_blocks(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    suggested_query TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    priority TEXT NOT NULL DEFAULT 'medium',
    volatility TEXT NOT NULL DEFAULT 'moderate',
    seed_status TEXT NOT NULL DEFAULT 'not_seeded',
    last_seeded_at TEXT,
    last_synthesis_at TEXT,
    claim_count INTEGER NOT NULL DEFAULT 0,
    review_due_at TEXT
, prerequisites TEXT NOT NULL DEFAULT '[]');

CREATE TABLE IF NOT EXISTS guideline_watch_events (
    id SERIAL PRIMARY KEY,
    normalized_topic TEXT,
    claim_key TEXT,
    guideline_id INTEGER,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    payload_json TEXT,
    created_at TEXT NOT NULL,
    acknowledged_at TEXT
);

CREATE TABLE IF NOT EXISTS learning_events (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    event_type TEXT NOT NULL,
    topic TEXT,
    normalized_topic TEXT,
    claim_key TEXT,
    source_type TEXT,
    source_id TEXT,
    payload_json TEXT,
    occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learning_round_items (
    id SERIAL PRIMARY KEY,
    round_id INTEGER NOT NULL,
    item_type TEXT NOT NULL,
    claim_key TEXT,
    question_text TEXT NOT NULL,
    options_json TEXT,
    correct_answer TEXT,
    explanation TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (round_id) REFERENCES learning_rounds(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_rounds (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    item_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    completed_at TEXT
);

CREATE TABLE IF NOT EXISTS learning_scheduler_runs (
    id SERIAL PRIMARY KEY,
    run_type TEXT NOT NULL DEFAULT 'topic_refresh',
    status TEXT NOT NULL DEFAULT 'running',
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMPTZ,
    candidates_count INTEGER NOT NULL DEFAULT 0,
    refreshed_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    details TEXT NOT NULL DEFAULT '{}',
    error TEXT
);

CREATE TABLE IF NOT EXISTS llm_usage_log (
    id SERIAL PRIMARY KEY,
    operation TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    normalized_topic TEXT,
    user_id INTEGER,
    prompt_chars INTEGER DEFAULT 0,
    response_chars INTEGER DEFAULT 0,
    estimated_input_tokens INTEGER DEFAULT 0,
    estimated_output_tokens INTEGER DEFAULT 0,
    estimated_cost_usd REAL DEFAULT 0,
    success INTEGER NOT NULL DEFAULT 1,
    error_message TEXT,
    duration_ms INTEGER,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS low_recall_searches (
    id SERIAL PRIMARY KEY,
    normalized_topic TEXT NOT NULL,
    display_query TEXT NOT NULL,
    result_count INTEGER NOT NULL DEFAULT 0,
    source_list TEXT NOT NULL DEFAULT '[]',
    expanded_aliases TEXT NOT NULL DEFAULT '[]',
    attempt_count INTEGER NOT NULL DEFAULT 1,
    last_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(normalized_topic, display_query)
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pdf_sections (
    id SERIAL PRIMARY KEY,
    article_uid TEXT NOT NULL UNIQUE,
    sections TEXT NOT NULL,
    ordered_keys TEXT,
    tables TEXT,
    word_count INTEGER DEFAULT 0,
    url TEXT,
    source TEXT,
    numpages INTEGER DEFAULT 0,
    indexed_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS pico_extractions (
    id SERIAL PRIMARY KEY,
    article_id TEXT NOT NULL UNIQUE,
    extraction TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    confidence REAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portfolio_reflections (
    id SERIAL PRIMARY KEY,
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
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS proactive_evidence_alerts (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    normalized_topic TEXT NOT NULL,
    display_topic TEXT,
    alert_kind TEXT NOT NULL DEFAULT 'knowledge_drift',
    title TEXT NOT NULL,
    summary TEXT,
    payload_json TEXT,
    landmark_article_uid TEXT,
    read_at TEXT,
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id SERIAL PRIMARY KEY,
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
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
, concept_hash TEXT, claim_key TEXT, reasoning_tags TEXT DEFAULT '[]', reasoning_note TEXT, prompt_variant TEXT);

CREATE TABLE IF NOT EXISTS quiz_validation_results (
    id SERIAL PRIMARY KEY,
    question_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    generation_job_key TEXT,
    prompt_variant TEXT,
    validator_version INTEGER DEFAULT 1,
    status TEXT NOT NULL CHECK (status IN ('passed', 'rejected', 'needs_review')),
    rejection_reasons TEXT,
    reviewer_notes TEXT,
    source_provider TEXT,
    source_model TEXT,
    validated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS review_articles (
    id SERIAL PRIMARY KEY,
    review_id TEXT NOT NULL,
    article_id TEXT NOT NULL,
    article_data TEXT NOT NULL,
    screening_status TEXT NOT NULL DEFAULT 'pending',
    exclusion_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, screening_phase TEXT DEFAULT 'title_abstract', fulltext_screening_status TEXT, duplicate_of_article_id TEXT, exclusion_reason_code TEXT, risk_of_bias_tool TEXT, risk_of_bias_json TEXT, grade_summary_of_findings_json TEXT,
    UNIQUE(review_id, article_id)
);

CREATE TABLE IF NOT EXISTS review_projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    question TEXT NOT NULL,
    criteria TEXT,
    owner_type TEXT NOT NULL DEFAULT 'session',
    owner_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS revoked_tokens (
    token_hash TEXT PRIMARY KEY,
    revoked_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_articles (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    article_id TEXT NOT NULL,
    article_data TEXT NOT NULL, 
    notes TEXT,
    tags TEXT, 
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, article_id)
);

CREATE TABLE IF NOT EXISTS search_alerts (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    query TEXT NOT NULL,
    frequency TEXT DEFAULT 'weekly', 
    sources TEXT, 
    email TEXT,
    active INTEGER DEFAULT 1,
    last_sent TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, unsubscribe_token TEXT, digest_enabled INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS search_result_feedback (
    id SERIAL PRIMARY KEY,
    search_id INTEGER REFERENCES searches(id) ON DELETE SET NULL,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT,
    article_uid TEXT NOT NULL,
    feedback_type TEXT NOT NULL, 
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS search_result_impressions (
    id SERIAL PRIMARY KEY,
    search_id INTEGER NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
    session_id TEXT,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    article_uid TEXT NOT NULL,
    position INTEGER NOT NULL,
    was_clicked INTEGER DEFAULT 0,
    was_saved INTEGER DEFAULT 0,
    dwell_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS search_usage_daily (
    id          SERIAL PRIMARY KEY,
    user_id     TEXT    NOT NULL,
    date        TEXT    NOT NULL,   
    count       INTEGER NOT NULL DEFAULT 0,
    updated_at  TEXT    NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS searches (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    query TEXT NOT NULL,
    normalized_topic TEXT,
    sources TEXT, 
    filters TEXT, 
    results_count INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    session_sequence_index INTEGER DEFAULT 0,
    previous_queries TEXT, 
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_agent TEXT,
    ip_address TEXT,
    preferences TEXT, 
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS spaced_rep_cards (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    outline_node_id TEXT NOT NULL,
    outline_label TEXT,
    interval_days REAL NOT NULL DEFAULT 1,
    easiness REAL NOT NULL DEFAULT 2.5,
    repetitions INTEGER NOT NULL DEFAULT 0,
    due_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    last_reviewed_at TEXT,
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    UNIQUE(user_id, normalized_topic, outline_node_id)
);

CREATE TABLE IF NOT EXISTS study_runs (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    outline_id INTEGER,
    curriculum_topic_id INTEGER REFERENCES curriculum_topics(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active',
    progress TEXT NOT NULL DEFAULT '{}',
    node_coverage TEXT NOT NULL DEFAULT '{}',
    started_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    last_active_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    completed_at TEXT,
    FOREIGN KEY (outline_id) REFERENCES topic_knowledge(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS synthesis_snapshots (
    id SERIAL PRIMARY KEY,
    normalized_topic TEXT NOT NULL,
    topic TEXT NOT NULL,
    consensus_text TEXT NOT NULL,
    evidence_grade TEXT NOT NULL DEFAULT 'MODERATE',
    key_finding_count INTEGER NOT NULL DEFAULT 0,
    article_count INTEGER NOT NULL DEFAULT 0,
    article_uids TEXT NOT NULL DEFAULT '[]',
    claim_fingerprint TEXT,
    claim_texts_json TEXT NOT NULL DEFAULT '[]',
    generated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS teaching_object_claims (
    id SERIAL PRIMARY KEY,
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
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
, curator_metadata TEXT);

CREATE TABLE IF NOT EXISTS teaching_objects (
    id SERIAL PRIMARY KEY,
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
    generated_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS team_collection_articles (
    id SERIAL PRIMARY KEY,
    collection_id TEXT NOT NULL,
    article_id TEXT NOT NULL,
    article_data TEXT NOT NULL,
    added_by TEXT NOT NULL,
    added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    UNIQUE(collection_id, article_id),
    FOREIGN KEY (collection_id) REFERENCES team_collections(id) ON DELETE CASCADE,
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS team_collections (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS team_invitations (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, accepted_at TIMESTAMPTZ,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    team_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS team_saved_articles (
    id SERIAL PRIMARY KEY,
    team_id TEXT NOT NULL,
    article_id TEXT NOT NULL,
    article_data TEXT NOT NULL,
    saved_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, article_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (saved_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id TEXT NOT NULL,
    plan TEXT DEFAULT 'free',
    member_limit INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS topic_bouquet_signals (
    id SERIAL PRIMARY KEY,
    normalized_topic TEXT NOT NULL,
    display_topic TEXT,
    article_uid TEXT NOT NULL,
    archetype TEXT,
    composite_score REAL DEFAULT 0,
    signal_count INTEGER DEFAULT 1,
    last_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(normalized_topic, article_uid)
);

CREATE TABLE IF NOT EXISTS topic_crosslinks (
    id SERIAL PRIMARY KEY,
    topic_a TEXT NOT NULL,
    normalized_topic_a TEXT NOT NULL,
    topic_b TEXT NOT NULL,
    normalized_topic_b TEXT NOT NULL,
    link_type TEXT NOT NULL CHECK(link_type IN ('shared_paper','ai_inferred')),
    shared_evidence TEXT,
    strength REAL DEFAULT 0.5,
    ai_rationale TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(normalized_topic_a, normalized_topic_b, link_type)
);

CREATE TABLE IF NOT EXISTS topic_demand_signals (
    id SERIAL PRIMARY KEY,
    normalized_topic TEXT NOT NULL,
    display_topic TEXT,
    intent TEXT NOT NULL DEFAULT 'general',
    search_count INTEGER DEFAULT 1,
    last_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(normalized_topic, intent)
);

CREATE TABLE IF NOT EXISTS topic_guidelines (
    id SERIAL PRIMARY KEY,
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
    reviewed_at TIMESTAMPTZ,
    superseded_by_id INTEGER,
    last_checked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS topic_knowledge (
    id SERIAL PRIMARY KEY,
    topic TEXT NOT NULL UNIQUE,
    normalized_topic TEXT NOT NULL UNIQUE,
    knowledge TEXT NOT NULL,
    source_articles TEXT NOT NULL DEFAULT '[]',
    aliases_normalized TEXT NOT NULL DEFAULT '[]',
    canonical_normalized TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'ai_generated',
    confidence REAL NOT NULL DEFAULT 0.5,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_refreshed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS topic_knowledge_proposals (
    id SERIAL PRIMARY KEY,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    knowledge TEXT NOT NULL,
    source_articles TEXT NOT NULL DEFAULT '[]',
    proposed_status TEXT NOT NULL DEFAULT 'ai_generated',
    confidence REAL NOT NULL DEFAULT 0.5,
    reason TEXT,
    created_by TEXT,
    status TEXT NOT NULL DEFAULT 'pending_review',
    reviewed_by TEXT,
    reviewed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS user_claim_misconceptions (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    claim_key TEXT NOT NULL,
    wrong_option_text TEXT NOT NULL,
    correct_option_text TEXT,
    topic TEXT NOT NULL,
    normalized_topic TEXT,
    count INTEGER NOT NULL DEFAULT 1,
    last_seen_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
, misconception_category TEXT);

CREATE TABLE IF NOT EXISTS user_curriculum_progress (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    curriculum_topic_id INTEGER NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'not_started',
    quiz_attempts INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    last_score_pct INTEGER,
    updated_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    UNIQUE(user_id, curriculum_topic_id)
);

CREATE TABLE IF NOT EXISTS user_interactions (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT,
    article_id TEXT NOT NULL,
    interaction_type TEXT NOT NULL DEFAULT 'view', 
    dwell_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_learning_profiles (
    id SERIAL PRIMARY KEY,
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
    specialty_interest TEXT,
    study_goal TEXT,
    active_curriculum_id INTEGER REFERENCES curricula(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
, effective_difficulty TEXT DEFAULT 'mixed');

CREATE TABLE IF NOT EXISTS user_saved_articles (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    article_id TEXT NOT NULL,
    article_data TEXT NOT NULL, 
    notes TEXT,
    tags TEXT, 
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, article_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_topic_mastery (
    id SERIAL PRIMARY KEY,
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
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    UNIQUE(user_id, normalized_topic)
);

CREATE TABLE IF NOT EXISTS user_topic_mastery_snapshots (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    normalized_topic TEXT,
    overall_score INTEGER NOT NULL,
    session_score INTEGER,
    snapshot_reason TEXT,
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS user_topic_memory (
    id SERIAL PRIMARY KEY,
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
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    UNIQUE(user_id, normalized_topic)
);

CREATE TABLE IF NOT EXISTS user_topic_reviews (
    user_id TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    last_reviewed_at TEXT NOT NULL,
    PRIMARY KEY (user_id, normalized_topic)
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, 
    name TEXT,
    role TEXT DEFAULT 'user', 
    preferences TEXT, 
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMPTZ
, email_verified INTEGER DEFAULT 0, email_verification_token TEXT, email_verification_expires TIMESTAMPTZ, updated_at TIMESTAMPTZ, stripe_customer_id TEXT, stripe_subscription_id TEXT, subscription_status TEXT DEFAULT 'free', subscription_plan TEXT DEFAULT 'free', subscription_current_period_end TEXT, subscription_cancel_at_period_end INTEGER DEFAULT 0, trial_started_at TEXT, trial_ends_at TEXT, has_used_trial INTEGER NOT NULL DEFAULT 0);

CREATE INDEX IF NOT EXISTS idx_agent_conv_last_message ON agent_conversations(user_id, last_message_at);

CREATE INDEX IF NOT EXISTS idx_agent_conv_topic ON agent_conversations(normalized_topic);

CREATE INDEX IF NOT EXISTS idx_agent_conv_user ON agent_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_gen_claims_job ON ai_generation_claims(job_key, ordinal);

CREATE INDEX IF NOT EXISTS idx_ai_generation_jobs_status ON ai_generation_jobs(status, updated_at);

CREATE INDEX IF NOT EXISTS idx_ai_generation_jobs_type_topic ON ai_generation_jobs(job_type, topic);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_month
    ON ai_usage_monthly (user_id, year_month);

CREATE INDEX IF NOT EXISTS idx_analysis_cache_article ON analysis_cache(article_id);

CREATE INDEX IF NOT EXISTS idx_analysis_cache_expires ON analysis_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics(created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_event_created ON analytics(event_type, created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics(event_type);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys (key_hash);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys (user_id);

CREATE INDEX IF NOT EXISTS idx_article_cache_expires ON article_cache(expires_at);

-- Idempotent ADD COLUMN: article_cache's own CREATE TABLE above already declares these,
-- but that statement is a no-op against a database where article_cache was created before
-- these columns existed (see migration 002_quality_retraction.sql). Without this, the
-- indexes below fail with "column does not exist" on every boot on such a database.
ALTER TABLE article_cache ADD COLUMN IF NOT EXISTS quality_data TEXT;
ALTER TABLE article_cache ADD COLUMN IF NOT EXISTS retraction_data TEXT;
ALTER TABLE article_cache ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0;
ALTER TABLE article_cache ADD COLUMN IF NOT EXISTS is_retracted INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_article_cache_quality ON article_cache(quality_score);

CREATE INDEX IF NOT EXISTS idx_article_cache_retracted ON article_cache(is_retracted) WHERE is_retracted = 1;

CREATE INDEX IF NOT EXISTS idx_article_cache_source ON article_cache(source);

CREATE INDEX IF NOT EXISTS idx_article_cache_title ON article_cache(title);

CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_window ON auth_rate_limits(window_start);

CREATE INDEX IF NOT EXISTS idx_billing_audit_action ON billing_audit_log(action);

CREATE INDEX IF NOT EXISTS idx_billing_audit_created ON billing_audit_log(created_at);

CREATE INDEX IF NOT EXISTS idx_billing_audit_user ON billing_audit_log(user_id);

CREATE INDEX IF NOT EXISTS idx_bouquet_signals_last_seen ON topic_bouquet_signals(last_seen_at);

CREATE INDEX IF NOT EXISTS idx_bouquet_signals_topic_count ON topic_bouquet_signals(normalized_topic, signal_count DESC);

CREATE INDEX IF NOT EXISTS idx_case_attempts_topic ON case_attempts(normalized_topic);

CREATE INDEX IF NOT EXISTS idx_case_attempts_user_created ON case_attempts(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_case_attempts_user_topic ON case_attempts(user_id, normalized_topic);

CREATE INDEX IF NOT EXISTS idx_case_evidence_briefs_user ON case_evidence_briefs(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_claim_history_claim ON claim_status_history(claim_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_claim_history_topic_time ON claim_status_history(normalized_topic, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_claim_regen_claim ON claim_regeneration_queue(claim_key, status);

CREATE INDEX IF NOT EXISTS idx_claim_regen_status ON claim_regeneration_queue(status, created_at);

CREATE INDEX IF NOT EXISTS idx_collab_activities_collection ON collab_activities(collection_id);

CREATE INDEX IF NOT EXISTS idx_collab_annotations_article ON collab_annotations(article_id);

CREATE INDEX IF NOT EXISTS idx_collab_annotations_user ON collab_annotations(user_id);

CREATE INDEX IF NOT EXISTS idx_collab_articles_collection ON collab_collection_articles(collection_id);

CREATE INDEX IF NOT EXISTS idx_collab_collaborators_collection ON collab_collection_collaborators(collection_id);

CREATE INDEX IF NOT EXISTS idx_collab_collaborators_user ON collab_collection_collaborators(user_id);

CREATE INDEX IF NOT EXISTS idx_collab_collections_owner ON collab_collections(owner_id);

CREATE INDEX IF NOT EXISTS idx_collab_comments_article ON collab_comments(article_id);

CREATE INDEX IF NOT EXISTS idx_collab_comments_parent ON collab_comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_collab_invitations_email ON collab_invitations(invitee_email);

CREATE INDEX IF NOT EXISTS idx_collab_notifications_user ON collab_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_contradiction_claim ON claim_contradiction_searches(claim_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cpd_sessions_type ON cpd_sessions(user_id, activity_type);

CREATE INDEX IF NOT EXISTS idx_cpd_sessions_user ON cpd_sessions(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_crosslinks_topic_a ON topic_crosslinks(normalized_topic_a);

CREATE INDEX IF NOT EXISTS idx_crosslinks_topic_b ON topic_crosslinks(normalized_topic_b);

CREATE INDEX IF NOT EXISTS idx_curriculum_blocks_curriculum ON curriculum_blocks(curriculum_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_curriculum_seed_usage_daily_updated
    ON curriculum_seed_usage_daily(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_curriculum_topics_block ON curriculum_topics(block_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_curriculum_topics_seed_status ON curriculum_topics(seed_status, priority, volatility);

CREATE INDEX IF NOT EXISTS idx_demand_signals_recent ON topic_demand_signals(last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_demand_signals_topic ON topic_demand_signals(normalized_topic, search_count DESC);

CREATE INDEX IF NOT EXISTS idx_guideline_watch_topic ON guideline_watch_events(normalized_topic, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_impressions_article ON search_result_impressions(article_uid, created_at);

CREATE INDEX IF NOT EXISTS idx_impressions_search ON search_result_impressions(search_id, article_uid);

CREATE INDEX IF NOT EXISTS idx_impressions_session ON search_result_impressions(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_impressions_user ON search_result_impressions(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_learning_events_claim
    ON learning_events(claim_key, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_events_topic_type
    ON learning_events(normalized_topic, event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_events_user_time
    ON learning_events(user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_profiles_user ON user_learning_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_learning_rounds_user ON learning_rounds(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_scheduler_runs_started
    ON learning_scheduler_runs(run_type, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_scheduler_runs_status
    ON learning_scheduler_runs(status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_usage_created ON llm_usage_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_usage_operation ON llm_usage_log(operation, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_usage_topic ON llm_usage_log(normalized_topic, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_low_recall_attempts ON low_recall_searches(attempt_count DESC, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_low_recall_topic_seen ON low_recall_searches(normalized_topic, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_mastery_snapshots_user_topic_time
    ON user_topic_mastery_snapshots(user_id, normalized_topic, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_pdf_sections_uid ON pdf_sections(article_uid);

CREATE INDEX IF NOT EXISTS idx_pico_extractions_article ON pico_extractions(article_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_reflections_topic ON portfolio_reflections(user_id, normalized_topic);

CREATE INDEX IF NOT EXISTS idx_portfolio_reflections_user ON portfolio_reflections(user_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_proactive_evidence_alerts_user_created
    ON proactive_evidence_alerts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_proactive_evidence_alerts_user_topic
    ON proactive_evidence_alerts(user_id, normalized_topic);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_concept_hash ON quiz_attempts(user_id, concept_hash);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_outline_node ON quiz_attempts(user_id, outline_node_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_prompt_variant
ON quiz_attempts(prompt_variant, created_at);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_study_run ON quiz_attempts(study_run_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_topic ON quiz_attempts(normalized_topic);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_created ON quiz_attempts(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_topic ON quiz_attempts(user_id, normalized_topic);

CREATE INDEX IF NOT EXISTS idx_qvr_job ON quiz_validation_results(generation_job_key);

CREATE INDEX IF NOT EXISTS idx_qvr_prompt_variant ON quiz_validation_results(prompt_variant, status);

CREATE INDEX IF NOT EXISTS idx_qvr_provider_model ON quiz_validation_results(source_provider, source_model, status);

CREATE INDEX IF NOT EXISTS idx_qvr_question ON quiz_validation_results(question_id);

CREATE INDEX IF NOT EXISTS idx_qvr_topic ON quiz_validation_results(normalized_topic, status);

CREATE INDEX IF NOT EXISTS idx_review_articles_review ON review_articles(review_id);

CREATE INDEX IF NOT EXISTS idx_review_articles_status ON review_articles(screening_status);

CREATE INDEX IF NOT EXISTS idx_review_projects_owner ON review_projects(owner_type, owner_id);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON revoked_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_saved_articles_session ON saved_articles(session_id);

CREATE INDEX IF NOT EXISTS idx_search_alerts_active ON search_alerts(active, frequency, last_sent);

CREATE INDEX IF NOT EXISTS idx_search_feedback_search ON search_result_feedback(search_id);

CREATE INDEX IF NOT EXISTS idx_search_feedback_session ON search_result_feedback(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_search_feedback_user_article ON search_result_feedback(user_id, article_uid);

CREATE INDEX IF NOT EXISTS idx_search_usage_user_date
    ON search_usage_daily (user_id, date);

CREATE INDEX IF NOT EXISTS idx_searches_created ON searches(created_at);

-- Idempotent ADD COLUMN: see migration 031_search_normalized_topic.sql — same
-- already-existing-table gap as article_cache above.
ALTER TABLE searches ADD COLUMN IF NOT EXISTS normalized_topic TEXT;

CREATE INDEX IF NOT EXISTS idx_searches_normalized_topic ON searches(normalized_topic, created_at);

CREATE INDEX IF NOT EXISTS idx_searches_query ON searches(query);

CREATE INDEX IF NOT EXISTS idx_searches_session ON searches(session_id);

CREATE INDEX IF NOT EXISTS idx_searches_session_sequence ON searches(session_id, session_sequence_index);

CREATE INDEX IF NOT EXISTS idx_src_user_due ON spaced_rep_cards(user_id, due_at);

CREATE INDEX IF NOT EXISTS idx_src_user_topic ON spaced_rep_cards(user_id, normalized_topic);

CREATE INDEX IF NOT EXISTS idx_study_runs_curriculum_topic ON study_runs(curriculum_topic_id);

CREATE INDEX IF NOT EXISTS idx_study_runs_outline ON study_runs(outline_id);

CREATE INDEX IF NOT EXISTS idx_study_runs_user_status ON study_runs(user_id, status, last_active_at);

CREATE INDEX IF NOT EXISTS idx_study_runs_user_topic ON study_runs(user_id, normalized_topic, last_active_at);

CREATE INDEX IF NOT EXISTS idx_synthesis_snapshots_topic
    ON synthesis_snapshots(normalized_topic, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_teaching_claims_article ON teaching_object_claims(article_uid);

CREATE INDEX IF NOT EXISTS idx_teaching_claims_object ON teaching_object_claims(object_key, ordinal);

CREATE INDEX IF NOT EXISTS idx_teaching_claims_topic ON teaching_object_claims(normalized_topic, updated_at);

CREATE INDEX IF NOT EXISTS idx_teaching_claims_verification ON teaching_object_claims(verification_status, normalized_topic);

CREATE INDEX IF NOT EXISTS idx_teaching_objects_article ON teaching_objects(article_uid);

CREATE INDEX IF NOT EXISTS idx_teaching_objects_topic ON teaching_objects(normalized_topic, object_type);

CREATE INDEX IF NOT EXISTS idx_teaching_objects_updated ON teaching_objects(updated_at);

CREATE INDEX IF NOT EXISTS idx_team_collections_team ON team_collections(team_id);

CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);

CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

CREATE INDEX IF NOT EXISTS idx_team_saved_articles_article_id
    ON team_saved_articles(article_id);

CREATE INDEX IF NOT EXISTS idx_team_saved_articles_team_id
    ON team_saved_articles(team_id);

CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);

CREATE INDEX IF NOT EXISTS idx_topic_guidelines_checked ON topic_guidelines(last_checked_at);

CREATE INDEX IF NOT EXISTS idx_topic_guidelines_source ON topic_guidelines(source_body);

CREATE INDEX IF NOT EXISTS idx_topic_guidelines_status ON topic_guidelines(status);

CREATE INDEX IF NOT EXISTS idx_topic_guidelines_topic ON topic_guidelines(normalized_topic);

CREATE INDEX IF NOT EXISTS idx_topic_guidelines_updated ON topic_guidelines(updated_at);

CREATE INDEX IF NOT EXISTS idx_topic_knowledge_normalized ON topic_knowledge(normalized_topic);

CREATE INDEX IF NOT EXISTS idx_topic_knowledge_proposals_status
    ON topic_knowledge_proposals (status, created_at);

CREATE INDEX IF NOT EXISTS idx_topic_knowledge_proposals_topic
    ON topic_knowledge_proposals (normalized_topic, status, created_at);

CREATE INDEX IF NOT EXISTS idx_topic_knowledge_updated ON topic_knowledge(updated_at);

CREATE INDEX IF NOT EXISTS idx_topic_mastery_next_review ON user_topic_mastery(user_id, next_review_at);

CREATE INDEX IF NOT EXISTS idx_topic_mastery_user ON user_topic_mastery(user_id);

CREATE INDEX IF NOT EXISTS idx_ucp_topic ON user_curriculum_progress(curriculum_topic_id);

CREATE INDEX IF NOT EXISTS idx_ucp_user ON user_curriculum_progress(user_id);

CREATE UNIQUE INDEX idx_user_claim_misconception
    ON user_claim_misconceptions(user_id, claim_key, wrong_option_text);

CREATE INDEX IF NOT EXISTS idx_user_claim_misconceptions_claim
    ON user_claim_misconceptions(claim_key, count DESC);

CREATE INDEX IF NOT EXISTS idx_user_claim_misconceptions_user_topic
    ON user_claim_misconceptions(user_id, normalized_topic, count DESC);

CREATE INDEX IF NOT EXISTS idx_user_interactions_session ON user_interactions(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_user_interactions_user ON user_interactions(user_id, article_id, created_at);

CREATE INDEX IF NOT EXISTS idx_user_topic_memory_norm ON user_topic_memory(normalized_topic);

CREATE INDEX IF NOT EXISTS idx_user_topic_memory_user ON user_topic_memory(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

CREATE INDEX IF NOT EXISTS idx_users_trial_ends ON users(trial_ends_at) WHERE trial_ends_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(email_verification_token);
