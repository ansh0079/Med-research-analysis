-- The question-to-topic index.
--
-- ~12,400 stored quiz questions were generated from whatever guideline rows happened to be filed under a
-- topic, and many of those rows were misfiled (an RRT-timing topic held only VTE prophylaxis and joint
-- replacement guidance). A question records only a free-text guidelineRef, not which guideline row it
-- used, so provenance cannot be recovered. This index places each question by what it says instead:
--   aligned       recognisably about one topic, clearly ahead of the next, backed by a recommendation of it
--   unclear       about a topic, but the match is close or no guideline of that topic supports it
--   unassignable  not recognisably about any topic
-- and links aligned questions to the guideline recommendations and papers of the topic they belong to.
-- The stored questions themselves are not changed or moved; readers consult this index.
-- Ids are TEXT: curriculum topic ids are uuid on Postgres and integer on SQLite.
CREATE TABLE IF NOT EXISTS question_topic_index (
    object_key TEXT NOT NULL,
    question_index INTEGER NOT NULL,
    question_hash TEXT NOT NULL,
    object_type TEXT NOT NULL,
    original_topic TEXT,
    original_curriculum_topic_id TEXT,
    assigned_curriculum_topic_id TEXT,
    assigned_topic_name TEXT,
    -- The cluster of near-duplicate topics the assigned topic belongs to (the seed topic's id).
    assigned_cluster_id TEXT,
    topic_similarity REAL,
    runner_up_curriculum_topic_id TEXT,
    runner_up_similarity REAL,
    guideline_support REAL,
    category TEXT NOT NULL,
    reasons TEXT,
    evidence_guideline_ids TEXT,
    evidence_paper_uids TEXT,
    classifier_version TEXT NOT NULL,
    classified_at TEXT NOT NULL,
    PRIMARY KEY (object_key, question_index)
);

CREATE INDEX IF NOT EXISTS idx_qti_assigned ON question_topic_index (assigned_curriculum_topic_id, category);
CREATE INDEX IF NOT EXISTS idx_qti_cluster ON question_topic_index (assigned_cluster_id, category);
CREATE INDEX IF NOT EXISTS idx_qti_original ON question_topic_index (original_curriculum_topic_id);
CREATE INDEX IF NOT EXISTS idx_qti_hash ON question_topic_index (question_hash);

-- The same placement for guideline recommendations, which fixes the supply side: where a recommendation
-- is filed and where it belongs. The recommendations themselves are not changed.
CREATE TABLE IF NOT EXISTS guideline_topic_index (
    guideline_id TEXT PRIMARY KEY,
    original_topic TEXT,
    assigned_curriculum_topic_id TEXT,
    assigned_topic_name TEXT,
    assigned_cluster_id TEXT,
    topic_similarity REAL,
    runner_up_similarity REAL,
    category TEXT NOT NULL,
    classifier_version TEXT NOT NULL,
    classified_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gti_assigned ON guideline_topic_index (assigned_curriculum_topic_id, category);

-- Topics that are near-duplicates of each other ("Trigeminal neuralgia" and its drug-optimisation variant) are one
-- subject. Each topic's cluster is the id of the first topic in its group; readers use it to pool their questions.
CREATE TABLE IF NOT EXISTS topic_cluster_index (
    curriculum_topic_id TEXT PRIMARY KEY,
    cluster_id TEXT NOT NULL,
    classifier_version TEXT NOT NULL,
    classified_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tci_cluster ON topic_cluster_index (cluster_id);
