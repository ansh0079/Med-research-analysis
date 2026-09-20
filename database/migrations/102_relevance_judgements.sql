-- Clinician relevance judgements: the input side of the measurement loop.
--
-- Ranking changes have been unmeasurable because no labelled held-out set exists. This table is
-- where a reviewer's verdict on "does this result answer this question" is recorded, one row per
-- (query, article, reviewer), so that two reviewers can disagree visibly and a third can adjudicate.
-- A scenario graduates into a held-out fixture only from adjudicated rows; nothing here is read by
-- the release gate directly.

CREATE TABLE IF NOT EXISTS relevance_judgements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Normalised query text is the join key: the same question asked twice is one scenario.
    query_key TEXT NOT NULL,
    query_text TEXT NOT NULL,
    scenario_id TEXT,
    intended_sense TEXT,
    article_uid TEXT NOT NULL,
    article_title TEXT,
    -- on_topic | adjacent | off_topic. Three levels, because "adjacent" is the judgement that
    -- distinguishes a ranking bug from a corpus gap, and a binary label hides it.
    label TEXT NOT NULL CHECK (label IN ('on_topic', 'adjacent', 'off_topic')),
    reason TEXT,
    reviewer_id TEXT NOT NULL,
    -- A reviewer who tuned the ranker cannot label its output; recorded so the claim is auditable.
    reviewer_role TEXT NOT NULL DEFAULT 'clinician',
    -- Where the candidate came from: a live search (with its id) or the labelling worksheet.
    search_id TEXT,
    served_rank INTEGER,
    lane TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- One verdict per reviewer per candidate; a changed mind updates the row rather than adding a vote.
CREATE UNIQUE INDEX IF NOT EXISTS idx_relevance_judgements_unique
    ON relevance_judgements (query_key, article_uid, reviewer_id);
CREATE INDEX IF NOT EXISTS idx_relevance_judgements_query ON relevance_judgements (query_key);
CREATE INDEX IF NOT EXISTS idx_relevance_judgements_reviewer ON relevance_judgements (reviewer_id, created_at);

-- Adjudication of a disagreement between reviewers. Separate from the votes so the disagreement
-- itself is never overwritten: inter-rater agreement has to stay computable after the fact.
CREATE TABLE IF NOT EXISTS relevance_adjudications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_key TEXT NOT NULL,
    article_uid TEXT NOT NULL,
    final_label TEXT NOT NULL CHECK (final_label IN ('on_topic', 'adjacent', 'off_topic')),
    rationale TEXT,
    adjudicator_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_relevance_adjudications_unique
    ON relevance_adjudications (query_key, article_uid);
