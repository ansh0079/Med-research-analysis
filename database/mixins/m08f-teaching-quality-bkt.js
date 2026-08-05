'use strict';

const { safeJsonParse } = require('../lib/helpers');
const { computeMasteryFromSequence } = require('../../server/services/knowledgeTracingService');

module.exports = (Sup) => class extends Sup {
// Teaching quality queues & BKT ability
// ==========================================

async getEvidenceJudgementProfile(userId, { topic = '', limit = 8 } = {}) {
    const uid = String(userId || '').trim();
    if (!uid) return { topic: topic || null, totalTaggedAttempts: 0, tags: [], topics: [], generatedAt: new Date().toISOString() };
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 8, 1), 20);
    const normalized = this.normalizeTopic(topic);
    const taggedRows = await this.all(
        `SELECT topic, normalized_topic, question_type, question_text, is_correct, reasoning_tags, reasoning_note, created_at
         FROM quiz_attempts
         WHERE user_id = ?
           AND (? = '' OR normalized_topic = ?)
           AND reasoning_tags IS NOT NULL
           AND reasoning_tags != '[]'
         ORDER BY created_at DESC
         LIMIT 500`,
        [uid, normalized, normalized]
    );
    const topicRows = await this.all(
        `SELECT
            COALESCE(normalized_topic, topic, 'general') AS topic,
            COUNT(*) AS attempts,
            SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct,
            MAX(created_at) AS last_attempt_at
         FROM quiz_attempts
         WHERE user_id = ?
           AND (? = '' OR normalized_topic = ?)
         GROUP BY COALESCE(normalized_topic, topic, 'general')
         ORDER BY attempts DESC
         LIMIT ?`,
        [uid, normalized, normalized, safeLimit]
    );
    const byTag = new Map();
    for (const row of taggedRows) {
        const tags = safeJsonParse(row.reasoning_tags, []);
        for (const tag of Array.isArray(tags) ? tags : []) {
            const key = String(tag || '').trim();
            if (!key) continue;
            const current = byTag.get(key) || {
                tag: key,
                count: 0,
                wrongCount: 0,
                lowConfidenceCorrectCount: 0,
                lastSeenAt: null,
                examples: [],
            };
            current.count += 1;
            if (row.is_correct === 0) current.wrongCount += 1;
            if (row.is_correct === 1 && key === 'low_confidence_correct') current.lowConfidenceCorrectCount += 1;
            if (!current.lastSeenAt || String(row.created_at || '') > current.lastSeenAt) current.lastSeenAt = row.created_at || null;
            if (current.examples.length < 3) {
                current.examples.push({
                    topic: row.topic || row.normalized_topic || null,
                    questionType: row.question_type || null,
                    questionText: String(row.question_text || '').slice(0, 240),
                    isCorrect: row.is_correct === 1,
                    reasoningNote: row.reasoning_note || null,
                    createdAt: row.created_at || null,
                });
            }
            byTag.set(key, current);
        }
    }
    const tags = [...byTag.values()]
        .sort((a, b) => (b.wrongCount - a.wrongCount) || (b.count - a.count) || String(b.lastSeenAt || '').localeCompare(String(a.lastSeenAt || '')))
        .slice(0, safeLimit);
    const topics = topicRows.map((row) => ({
        topic: row.topic,
        attempts: Number(row.attempts || 0),
        correct: Number(row.correct || 0),
        accuracy: row.attempts > 0 ? Math.round((Number(row.correct) / Number(row.attempts)) * 100) : 0,
        lastAttemptAt: row.last_attempt_at || null,
    }));
    return {
        topic: topic || null,
        totalTaggedAttempts: taggedRows.length,
        tags,
        topics,
        generatedAt: new Date().toISOString(),
    };
}

async getAdminClaimObservability({ limit = 25 } = {}) {
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 25, 1), 80);
    const [
        byStatus,
        staleTopics,
        abstractOnly,
        unverified,
        failedJobs,
        highDemand,
    ] = await Promise.all([
        this.all(
            `SELECT verification_status AS status, COUNT(*) AS count
             FROM teaching_object_claims
             GROUP BY verification_status
             ORDER BY count DESC`
        ),
        this.all(
            `SELECT normalized_topic, normalized_topic AS topic,
                    COUNT(*) AS claim_count,
                    SUM(CASE WHEN verification_status = 'stale_needs_refresh' THEN 1 ELSE 0 END) AS stale_count,
                    MAX(updated_at) AS last_updated_at
             FROM teaching_object_claims
             WHERE verification_status IN ('stale_needs_refresh', 'agent_draft', 'abstract_only')
             GROUP BY normalized_topic
             ORDER BY stale_count DESC, claim_count DESC
             LIMIT ?`,
            [safeLimit]
        ),
        this.all(
            `SELECT claim_key, claim_text, normalized_topic, article_uid, verification_status, updated_at
             FROM teaching_object_claims
             WHERE verification_status = 'abstract_only'
             ORDER BY updated_at DESC
             LIMIT ?`,
            [safeLimit]
        ),
        this.all(
            `SELECT claim_key, claim_text, normalized_topic, article_uid, verification_status, updated_at
             FROM teaching_object_claims
             WHERE verification_status IN ('unverified', 'agent_draft', 'synthesis_inferred')
             ORDER BY updated_at DESC
             LIMIT ?`,
            [safeLimit]
        ),
        this.all(
            `SELECT job_key, job_type, status, error_message, updated_at
             FROM ai_generation_jobs
             WHERE status = 'failed'
             ORDER BY updated_at DESC
             LIMIT ?`,
            [Math.min(safeLimit, 30)]
        ).catch(() => []),
        this.all(
            `SELECT normalized_topic, normalized_topic AS topic,
                    COUNT(*) AS claim_count,
                    MAX(updated_at) AS last_updated_at
             FROM teaching_object_claims
             WHERE normalized_topic IS NOT NULL AND normalized_topic <> ''
             GROUP BY normalized_topic
             ORDER BY claim_count DESC
             LIMIT ?`,
            [safeLimit]
        ),
    ]);
    return {
        generatedAt: new Date().toISOString(),
        countsByStatus: byStatus.map((r) => ({
            status: r.status,
            count: Number(r.count || 0),
        })),
        staleTopics: staleTopics.map((r) => ({
            normalizedTopic: r.normalized_topic,
            topic: r.topic,
            claimCount: Number(r.claim_count || 0),
            staleCount: Number(r.stale_count || 0),
            lastUpdatedAt: r.last_updated_at || null,
        })),
        abstractOnlyClaims: abstractOnly.map((r) => this.mapTeachingObjectClaimRow(r)),
        unverifiedClaims: unverified.map((r) => this.mapTeachingObjectClaimRow(r)),
        failedGenerationJobs: failedJobs.map((r) => ({
            jobKey: r.job_key,
            jobType: r.job_type,
            status: r.status,
            errorMessage: r.error_message || null,
            updatedAt: r.updated_at || null,
        })),
        highDemandTopics: highDemand.map((r) => ({
            normalizedTopic: r.normalized_topic,
            topic: r.topic,
            claimCount: Number(r.claim_count || 0),
            lastUpdatedAt: r.last_updated_at || null,
        })),
    };
}

async getClinicalQualityQueueCounts(topic = '') {
    const normalized = topic ? this.normalizeTopic(topic) : '';
    const row = await this.get(
        `SELECT
            SUM(CASE
                WHEN json_extract(c.curator_metadata, '$.overclaimed') IN (1, 'true', '1')
                    OR (c.verification_status = 'stale_needs_refresh' AND c.verification_reason LIKE '%overclaimed%')
                THEN 1 ELSE 0 END) AS overclaimed,
            SUM(CASE WHEN c.verification_status = 'guideline_conflict' THEN 1 ELSE 0 END) AS guideline_conflicts,
            SUM(CASE WHEN c.verification_status = 'stale_needs_refresh' THEN 1 ELSE 0 END) AS stale,
            SUM(CASE WHEN c.verification_status = 'abstract_only' THEN 1 ELSE 0 END) AS abstract_only,
            SUM(CASE
                WHEN (c.confidence IS NULL OR c.confidence < 0.55)
                    AND c.verification_status IN ('agent_draft', 'synthesis_inferred', 'unverified', 'abstract_only')
                THEN 1 ELSE 0 END) AS low_confidence
         FROM teaching_object_claims c
         WHERE (? = '' OR c.normalized_topic = ?)`,
        [normalized, normalized]
    );
    return {
        overclaimed: Number(row?.overclaimed || 0),
        guideline_conflicts: Number(row?.guideline_conflicts || 0),
        stale: Number(row?.stale || 0),
        abstract_only: Number(row?.abstract_only || 0),
        low_confidence: Number(row?.low_confidence || 0),
    };
}

async listClinicalQualityReviewClaims({ queue = 'abstract_only', topic = '', limit = 40, offset = 0 } = {}) {
    const normalized = topic ? this.normalizeTopic(topic) : '';
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 40, 1), 100);
    const safeOffset = Math.max(parseInt(String(offset), 10) || 0, 0);
    const q = String(queue || 'abstract_only').trim();
    let whereExtra = '';
    if (q === 'overclaimed') {
        whereExtra = `AND (
            json_extract(c.curator_metadata, '$.overclaimed') IN (1, 'true', '1')
            OR (c.verification_status = 'stale_needs_refresh' AND c.verification_reason LIKE '%overclaimed%')
        )`;
    } else if (q === 'guideline_conflicts') {
        whereExtra = `AND c.verification_status = 'guideline_conflict'`;
    } else if (q === 'stale') {
        whereExtra = `AND c.verification_status = 'stale_needs_refresh'`;
    } else if (q === 'abstract_only') {
        whereExtra = `AND c.verification_status = 'abstract_only'`;
    } else if (q === 'low_confidence') {
        whereExtra = `AND (c.confidence IS NULL OR c.confidence < 0.55)
            AND c.verification_status IN ('agent_draft', 'synthesis_inferred', 'unverified', 'abstract_only')`;
    } else {
        throw new Error('Invalid quality queue');
    }
    const rows = await this.all(
        `SELECT
            c.*,
            o.object_type,
            o.topic,
            o.title AS object_title,
            COUNT(qz.id) AS quiz_attempts,
            SUM(CASE WHEN qz.is_correct = 1 THEN 1 ELSE 0 END) AS quiz_correct
         FROM teaching_object_claims c
         LEFT JOIN teaching_objects o ON o.object_key = c.object_key
         LEFT JOIN quiz_attempts qz ON qz.claim_key = c.claim_key
         WHERE (? = '' OR c.normalized_topic = ?)
         ${whereExtra}
         GROUP BY c.id, c.object_key, c.claim_key, c.ordinal, c.claim_text,
                  c.evidence_quote, c.source_path, c.article_uid, c.normalized_topic,
                  c.concept_key, c.confidence, c.created_at, c.updated_at,
                  c.verification_status, c.verification_reason, c.verified_at, c.curator_metadata,
                  o.object_type, o.topic, o.title
         ORDER BY c.updated_at DESC
         LIMIT ? OFFSET ?`,
        [normalized, normalized, safeLimit, safeOffset]
    );
    return rows.map((row) => ({
        ...this.mapTeachingObjectClaimRow(row),
        objectType: row.object_type || null,
        topic: row.topic || row.normalized_topic || null,
        objectTitle: row.object_title || null,
        quizAttempts: Number(row.quiz_attempts || 0),
        quizCorrect: Number(row.quiz_correct || 0),
        qualityQueue: q,
    }));
}

// Teaching object claims flagged as practice-changing or clinical bottom lines.
async listPracticeChangingTeachingObjects({ topic = '', limit = 20 } = {}) {
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 50);
    const normalized = this.normalizeTopic(topic);
    const rows = await this.all(
        `SELECT c.*, o.topic AS object_topic, o.title AS object_title, o.object_type
         FROM teaching_object_claims c
         LEFT JOIN teaching_objects o ON o.object_key = c.object_key
         WHERE (? = '' OR c.normalized_topic = ?)
           AND c.concept_key IN ('clinical_bottom_line', 'practice_changing', 'guideline_recommendation')
           AND c.verification_status NOT IN ('stale_needs_refresh', 'guideline_conflict')
         ORDER BY
            CASE c.verification_status
                WHEN 'guideline_supported' THEN 0
                WHEN 'human_reviewed' THEN 1
                WHEN 'source_verified' THEN 2
                ELSE 3
            END ASC,
            c.updated_at DESC
         LIMIT ?`,
        [normalized, normalized, safeLimit]
    );
    return rows.map((row) => {
        const claim = this.mapTeachingObjectClaimRow(row);
        const isGuideline = claim.conceptKey === 'guideline_recommendation';
        return {
            ...claim,
            title: row.object_title || claim.claimText || 'Practice-changing evidence',
            topic: row.object_topic || claim.normalizedTopic || null,
            classification: isGuideline ? 'guideline_recommendation' : 'practice_changing',
            rationale: claim.claimText || null,
            objectTopic: row.object_topic || null,
            objectTitle: row.object_title || null,
            objectType: row.object_type || null,
        };
    });
}

async getTopicBktAbility(userId, topic) {
    const normalized = this.normalizeTopic(topic);
    const rows = await this.all(
        `SELECT claim_key, is_correct FROM quiz_attempts
         WHERE user_id = ? AND normalized_topic = ?
         ORDER BY claim_key, created_at ASC`,
        [userId, normalized]
    );
    if (rows.length === 0) return null;
    const sequences = new Map();
    for (const r of rows) {
        if (!r.claim_key) continue;
        if (!sequences.has(r.claim_key)) sequences.set(r.claim_key, []);
        sequences.get(r.claim_key).push(r.is_correct === 1 || r.is_correct === true);
    }
    if (sequences.size === 0) return null;
    let sum = 0;
    for (const seq of sequences.values()) {
        const { masteryProbability } = computeMasteryFromSequence(seq);
        sum += masteryProbability;
    }
    return sum / sequences.size;
}
};
