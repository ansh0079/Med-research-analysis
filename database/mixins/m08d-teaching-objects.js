'use strict';

const { safeJsonParse, toPgVectorLiteral } = require('../lib/helpers');
const { expandNormalizedTopicKeys, resolveCanonicalNormalized } = require('../../server/utils/topicSynonyms');
const { computeMasteryFromSequence, classifyMasteryState } = require('../../server/services/knowledgeTracingService');

module.exports = (Sup) => class extends Sup {
mapTeachingObjectRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        objectKey: row.object_key,
        objectType: row.object_type,
        articleUid: row.article_uid || null,
        normalizedTopic: row.normalized_topic || null,
        topic: row.topic || null,
        title: row.title || null,
        payload: safeJsonParse(row.object_payload || '{}', {}),
        provider: row.provider || null,
        model: row.model || null,
        confidence: Number(row.confidence || 0),
        generatedAt: row.generated_at || null,
        reviewState: row.review_state || 'unreviewed',
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || null,
    };
}

async upsertTeachingObject(object = {}) {
    if (!this.kysely) return null;
    const objectKey = String(object.objectKey || '').trim().slice(0, 240);
    if (!objectKey) return null;
    const now = new Date().toISOString();
    const topic = object.topic ? String(object.topic).trim().slice(0, 240) : null;
    const normalizedTopic = object.normalizedTopic || (topic ? this.normalizeTopic(topic) : null);
    const articleUid = object.articleUid ? String(object.articleUid).trim().slice(0, 240) : null;
    await this.run(
        `INSERT INTO teaching_objects (
            object_key, object_type, article_uid, normalized_topic, topic, title,
            object_payload, provider, model, confidence, review_state, generated_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(object_key) DO UPDATE SET
            object_type = excluded.object_type,
            article_uid = excluded.article_uid,
            normalized_topic = excluded.normalized_topic,
            topic = excluded.topic,
            title = excluded.title,
            object_payload = excluded.object_payload,
            provider = excluded.provider,
            model = excluded.model,
            confidence = excluded.confidence,
            review_state = CASE
                WHEN teaching_objects.review_state = 'human_reviewed'
                    AND (excluded.review_state IS NULL OR excluded.review_state != 'needs_revision')
                THEN teaching_objects.review_state
                ELSE excluded.review_state
            END,
            generated_at = excluded.generated_at,
            updated_at = excluded.updated_at`,
        [
            objectKey,
            String(object.objectType || 'paper').slice(0, 40),
            articleUid,
            normalizedTopic || null,
            topic,
            object.title ? String(object.title).slice(0, 500) : null,
            JSON.stringify(object.payload || {}),
            object.provider || null,
            object.model || null,
            Math.max(0, Math.min(1, Number(object.confidence || 0.5))),
            String(object.reviewState || object.payload?.reviewState || 'unreviewed').slice(0, 40),
            object.generatedAt || now,
            now,
            now,
        ]
    );
    await this.replaceTeachingObjectClaims({
        objectKey,
        articleUid,
        normalizedTopic: normalizedTopic || null,
        claims: object.payload?.claimAnchors || [],
    });
    return this.getTeachingObjectByKey(objectKey);
}

async getTeachingObjectByKey(objectKey) {
    const row = await this.get(`SELECT * FROM teaching_objects WHERE object_key = ?`, [String(objectKey || '').trim()]);
    return this.mapTeachingObjectRow(row);
}

async getTeachingObjectForArticle(articleUid) {
    const uid = String(articleUid || '').trim();
    if (!uid) return null;
    const row = await this.get(
        `SELECT * FROM teaching_objects
         WHERE article_uid = ? AND object_type = 'paper'
         ORDER BY updated_at DESC
         LIMIT 1`,
        [uid]
    );
    return this.mapTeachingObjectRow(row);
}

async listTeachingObjectsForTopic(topic, { limit = 20, objectType = '' } = {}) {
    const normalized = this.normalizeTopic(topic);
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100);
    const type = String(objectType || '').trim();
    const rows = await this.all(
        `SELECT * FROM teaching_objects
         WHERE (? = '' OR normalized_topic = ?)
           AND (? = '' OR object_type = ?)
         ORDER BY updated_at DESC
         LIMIT ?`,
        [normalized, normalized, type, type, safeLimit]
    );
    return rows.map((row) => this.mapTeachingObjectRow(row));
}

mapTeachingObjectClaimRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        objectKey: row.object_key,
        claimKey: row.claim_key,
        ordinal: Number(row.ordinal || 0),
        claimText: row.claim_text,
        evidenceQuote: row.evidence_quote || null,
        sourcePath: row.source_path || null,
        articleUid: row.article_uid || null,
        normalizedTopic: row.normalized_topic || null,
        conceptKey: row.concept_key || null,
        confidence: row.confidence == null ? null : Number(row.confidence),
        verificationStatus: row.verification_status || 'unverified',
        verificationReason: row.verification_reason || null,
        verifiedAt: row.verified_at || null,
        curatorMetadata: row.curator_metadata
            ? (() => { try { return JSON.parse(row.curator_metadata); } catch { return null; } })()
            : null,
        reviewState: row.review_state || 'unreviewed',
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || null,
    };
}

async replaceTeachingObjectClaims({ objectKey, articleUid = null, normalizedTopic = null, claims = [] } = {}) {
    if (!objectKey) return [];
    const now = new Date().toISOString();
    await this.withTransaction(async () => {
        await this.run(`DELETE FROM teaching_object_claims WHERE object_key = ?`, [objectKey]);
        let ordinal = 0;
        for (const claim of Array.isArray(claims) ? claims : []) {
            const claimKey = String(claim.claimKey || '').trim().slice(0, 80);
            const claimText = String(claim.claimText || '').trim().slice(0, 1400);
            if (!claimKey || !claimText) continue;
            await this.run(
                `INSERT INTO teaching_object_claims (
                    object_key, claim_key, ordinal, claim_text, evidence_quote, source_path,
                    article_uid, normalized_topic, concept_key, confidence, verification_status,
                    verification_reason, verified_at, review_state, created_at, updated_at
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(claim_key) DO UPDATE SET
                    object_key = excluded.object_key,
                    ordinal = excluded.ordinal,
                    claim_text = excluded.claim_text,
                    evidence_quote = excluded.evidence_quote,
                    source_path = excluded.source_path,
                    article_uid = excluded.article_uid,
                    normalized_topic = excluded.normalized_topic,
                    concept_key = excluded.concept_key,
                    confidence = excluded.confidence,
                    verification_status = excluded.verification_status,
                    verification_reason = excluded.verification_reason,
                    verified_at = excluded.verified_at,
                    review_state = excluded.review_state,
                    updated_at = excluded.updated_at`,
                [
                    objectKey,
                    claimKey,
                    Number(claim.ordinal ?? ordinal),
                    claimText,
                    claim.evidenceQuote ? String(claim.evidenceQuote).slice(0, 2000) : null,
                    claim.sourcePath ? String(claim.sourcePath).slice(0, 160) : null,
                    claim.articleUid || articleUid || null,
                    claim.topic ? this.normalizeTopic(claim.topic) : normalizedTopic,
                    claim.conceptKey ? String(claim.conceptKey).slice(0, 160) : null,
                    claim.confidence == null ? null : Math.max(0, Math.min(1, Number(claim.confidence))),
                    claim.verificationStatus ? String(claim.verificationStatus).slice(0, 80) : 'unverified',
                    claim.verificationReason ? String(claim.verificationReason).slice(0, 500) : null,
                    claim.verifiedAt ? String(claim.verifiedAt).slice(0, 40) : null,
                    String(claim.reviewState || 'unreviewed').slice(0, 40),
                    now,
                    now,
                ]
            );
            ordinal += 1;
        }
    });
    return this.listTeachingObjectClaimsByObjectKey(objectKey);
}

async listTeachingObjectClaimsByObjectKey(objectKey) {
    const rows = await this.all(
        `SELECT * FROM teaching_object_claims WHERE object_key = ? ORDER BY ordinal ASC, id ASC`,
        [String(objectKey || '').trim()]
    );
    return rows.map((row) => this.mapTeachingObjectClaimRow(row));
}

async getTeachingClaimByKey(claimKey) {
    const key = String(claimKey || '').trim();
    if (!key) return null;
    const row = await this.get(
        `SELECT c.*, o.topic, o.object_type, o.title AS object_title
         FROM teaching_object_claims c
         LEFT JOIN teaching_objects o ON o.object_key = c.object_key
         WHERE c.claim_key = ?
         LIMIT 1`,
        [key]
    );
    if (!row) return null;
    return {
        ...this.mapTeachingObjectClaimRow(row),
        topic: row.topic || row.normalized_topic || null,
        objectType: row.object_type || null,
        objectTitle: row.object_title || null,
    };
}

async listTeachingObjectClaimsForTopic(topic, { limit = 50 } = {}) {
    const normalized = this.normalizeTopic(topic);
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 200);
    const rows = await this.all(
        `SELECT * FROM teaching_object_claims
         WHERE (? = '' OR normalized_topic = ?)
         ORDER BY
            CASE verification_status
                WHEN 'human_reviewed' THEN 0
                WHEN 'source_verified' THEN 1
                WHEN 'guideline_supported' THEN 2
                WHEN 'abstract_only' THEN 3
                WHEN 'synthesis_inferred' THEN 4
                WHEN 'agent_draft' THEN 8
                ELSE 6
            END ASC,
            updated_at DESC,
            ordinal ASC
         LIMIT ?`,
        [normalized, normalized, safeLimit]
    );
    return rows.map((row) => this.mapTeachingObjectClaimRow(row));
}

async getUserClaimMastery(userId, topic, { limit = 80, gapDays = 90 } = {}) {
    const normalized = this.normalizeTopic(topic);
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 80, 1), 200);
    const gapCutoff = new Date(Date.now() - Math.min(Math.max(parseInt(String(gapDays), 10) || 90, 7), 365) * 24 * 60 * 60 * 1000).toISOString();
    const rows = await this.all(
        `SELECT
            c.*,
            COUNT(q.id) AS attempts,
            SUM(CASE WHEN q.is_correct = 1 THEN 1 ELSE 0 END) AS correct,
            MAX(q.created_at) AS last_attempt_at,
            COALESCE(MAX(gap.gap_signals), 0) AS gap_signals,
            MAX(gap.last_gap_at) AS last_gap_at
         FROM teaching_object_claims c
         LEFT JOIN quiz_attempts q ON q.claim_key = c.claim_key AND q.user_id = ?
         LEFT JOIN (
            SELECT claim_key, COUNT(*) AS gap_signals, MAX(occurred_at) AS last_gap_at
            FROM learning_events
            WHERE user_id = ? AND event_type = 'claim_gap'
              AND (? = '' OR normalized_topic = ?)
              AND occurred_at >= ?
            GROUP BY claim_key
         ) gap ON gap.claim_key = c.claim_key
         WHERE (? = '' OR c.normalized_topic = ?)
         GROUP BY c.id, c.object_key, c.claim_key, c.ordinal, c.claim_text,
                  c.evidence_quote, c.source_path, c.article_uid, c.normalized_topic,
                  c.concept_key, c.confidence, c.created_at, c.updated_at,
                  c.verification_status, c.verification_reason, c.verified_at, c.curator_metadata
         ORDER BY
            CASE WHEN COALESCE(gap.gap_signals, 0) > 0 THEN 0 ELSE 1 END ASC,
            CASE WHEN COUNT(q.id) = 0 THEN 0 ELSE 1 END ASC,
            CASE c.verification_status
                WHEN 'human_reviewed' THEN 0
                WHEN 'source_verified' THEN 1
                WHEN 'guideline_supported' THEN 2
                WHEN 'abstract_only' THEN 3
                WHEN 'synthesis_inferred' THEN 4
                WHEN 'agent_draft' THEN 8
                ELSE 6
            END ASC,
            (COUNT(q.id) - SUM(CASE WHEN q.is_correct = 1 THEN 1 ELSE 0 END)) DESC,
            c.updated_at DESC
         LIMIT ?`,
        [userId, userId, normalized, normalized, gapCutoff, normalized, normalized, safeLimit]
    );

    // BKT needs the chronological sequence of outcomes per claim, not just
    // aggregate counts, since order matters (see knowledgeTracingService.js).
    // One extra query for all attempted claims in this result page, then
    // group in JS rather than N+1 queries per claim.
    const claimKeysWithAttempts = rows.filter((r) => Number(r.attempts || 0) > 0).map((r) => r.claim_key);
    const sequenceByClaim = new Map();
    if (claimKeysWithAttempts.length > 0) {
        const placeholders = claimKeysWithAttempts.map(() => '?').join(',');
        const sequenceRows = await this.all(
            `SELECT claim_key, is_correct FROM quiz_attempts
             WHERE user_id = ? AND claim_key IN (${placeholders})
             ORDER BY claim_key, created_at ASC`,
            [userId, ...claimKeysWithAttempts]
        );
        for (const r of sequenceRows) {
            if (!sequenceByClaim.has(r.claim_key)) sequenceByClaim.set(r.claim_key, []);
            sequenceByClaim.get(r.claim_key).push(r.is_correct === 1 || r.is_correct === true);
        }
    }

    return rows.map((row) => {
        const attempts = Number(row.attempts || 0);
        const correct = Number(row.correct || 0);
        const gapSignals = Number(row.gap_signals || 0);
        const sequence = sequenceByClaim.get(row.claim_key) || [];
        const { masteryProbability } = computeMasteryFromSequence(sequence);
        // An explicit misconception detected in agent conversation is a direct
        // signal independent of quiz correctness — it overrides BKT's estimate
        // rather than waiting for enough wrong quiz answers to catch up to it.
        const masteryState = gapSignals > 0 ? 'weak' : classifyMasteryState(masteryProbability, attempts);
        return {
            ...this.mapTeachingObjectClaimRow(row),
            attempts,
            correct,
            accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : null,
            masteryProbability: attempts > 0 ? Math.round(masteryProbability * 100) / 100 : null,
            lastAttemptAt: row.last_attempt_at || null,
            claimGapSignals: gapSignals,
            lastClaimGapAt: row.last_gap_at || null,
            masteryState,
        };
    });
}

async listTeachingClaimsForReview({ topic = '', status = '', limit = 50, offset = 0 } = {}) {
    const normalized = topic ? this.normalizeTopic(topic) : '';
    const statuses = String(status || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);
    const safeOffset = Math.max(parseInt(String(offset), 10) || 0, 0);
    const statusClause = statuses.length
        ? `AND c.verification_status IN (${statuses.map(() => '?').join(', ')})`
        : '';
    const params = [normalized, normalized, ...statuses, safeLimit, safeOffset];
    const rows = await this.all(
        `SELECT
            c.*,
            o.object_type,
            o.topic,
            o.title AS object_title,
            COUNT(q.id) AS quiz_attempts,
            SUM(CASE WHEN q.is_correct = 1 THEN 1 ELSE 0 END) AS quiz_correct
         FROM teaching_object_claims c
         LEFT JOIN teaching_objects o ON o.object_key = c.object_key
         LEFT JOIN quiz_attempts q ON q.claim_key = c.claim_key
         WHERE (? = '' OR c.normalized_topic = ?)
         ${statusClause}
         GROUP BY c.id, c.object_key, c.claim_key, c.ordinal, c.claim_text,
                  c.evidence_quote, c.source_path, c.article_uid, c.normalized_topic,
                  c.concept_key, c.confidence, c.created_at, c.updated_at,
                  c.verification_status, c.verification_reason, c.verified_at, c.curator_metadata,
                  o.object_type, o.topic, o.title
         ORDER BY
            CASE c.verification_status
                WHEN 'agent_draft' THEN 0
                WHEN 'synthesis_inferred' THEN 1
                WHEN 'abstract_only' THEN 2
                WHEN 'unverified' THEN 3
                WHEN 'guideline_conflict' THEN 4
                WHEN 'stale_needs_refresh' THEN 5
                ELSE 8
            END ASC,
            quiz_attempts DESC,
            c.updated_at DESC
         LIMIT ? OFFSET ?`,
        params
    );
    return rows.map((row) => ({
        ...this.mapTeachingObjectClaimRow(row),
        objectType: row.object_type || null,
        topic: row.topic || row.normalized_topic || null,
        objectTitle: row.object_title || null,
        quizAttempts: Number(row.quiz_attempts || 0),
        quizCorrect: Number(row.quiz_correct || 0),
    }));
}

async updateTeachingClaimVerification(claimKey, { verificationStatus, verificationReason = '', claimText = null, reviewerId = null, forceTransition = false } = {}) {
    const key = String(claimKey || '').trim();
    const status = String(verificationStatus || '').trim();
    if (!key || !status) return null;
    const allowed = new Set([
        'source_verified',
        'full_text_available',
        'abstract_only',
        'synthesis_inferred',
        'agent_draft',
        'guideline_supported',
        'guideline_uncertain',
        'guideline_conflict',
        'stale_needs_refresh',
        'human_reviewed',
        'unverified',
    ]);
    if (!allowed.has(status)) {
        throw new Error('Invalid verification status');
    }
    const existing = await this.get(`SELECT verification_status, normalized_topic FROM teaching_object_claims WHERE claim_key = ?`, [key]);
    const priorStatus = existing?.verification_status || null;
    if (priorStatus !== status) {
        const { assertTransitionAllowed } = require('../../server/services/claimLifecycleService');
        assertTransitionAllowed(priorStatus, status, { force: Boolean(forceTransition) });
    }
    const now = new Date().toISOString();
    const fields = ['verification_status = ?', 'verification_reason = ?', 'verified_at = ?', 'updated_at = ?'];
    const values = [
        status,
        String(verificationReason || '').slice(0, 500) || null,
        ['human_reviewed', 'guideline_supported', 'guideline_conflict'].includes(status) ? now : null,
        now,
    ];
    if (status === 'human_reviewed') {
        fields.push('review_state = ?');
        values.push('human_reviewed');
    }
    if (claimText != null) {
        const text = String(claimText || '').trim().slice(0, 1400);
        if (text) {
            fields.push('claim_text = ?');
            values.push(text);
        }
    }
    values.push(key);
    await this.withTransaction(async () => {
        await this.run(`UPDATE teaching_object_claims SET ${fields.join(', ')} WHERE claim_key = ?`, values);
        if (priorStatus !== status && typeof this.logClaimStatusChange === 'function') {
            await this.logClaimStatusChange(key, {
                fromStatus: priorStatus,
                toStatus: status,
                normalizedTopic: existing?.normalized_topic || null,
                reason: verificationReason || null,
            }).catch(() => {});
        }
    });
    if (status === 'stale_needs_refresh' && typeof this.enqueueClaimRegeneration === 'function') {
        const rowForRegen = await this.get(
            `SELECT article_uid, normalized_topic FROM teaching_object_claims WHERE claim_key = ?`,
            [key]
        );
        await this.enqueueClaimRegeneration({
            claimKey: key,
            articleUid: rowForRegen?.article_uid || null,
            topic: rowForRegen?.normalized_topic || null,
            triggerReason: 'stale_evidence',
        }).catch(() => {});
    }
    await this.logEvent?.('teaching_claim_verification_updated', null, {
        claimKey: key,
        verificationStatus: status,
        reviewerId,
    }).catch(() => {});
    const row = await this.get(`SELECT * FROM teaching_object_claims WHERE claim_key = ?`, [key]);
    return this.mapTeachingObjectClaimRow(row);
}

async getTeachingObjectStats({ limit = 10 } = {}) {
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 10, 1), 50);
    const [total, byType, recent, topicRows, claimCount] = await Promise.all([
        this.get(`SELECT COUNT(*) AS count FROM teaching_objects`),
        this.all(`SELECT object_type, COUNT(*) AS count FROM teaching_objects GROUP BY object_type ORDER BY count DESC`),
        this.all(
            `SELECT object_key, object_type, topic, title, updated_at
             FROM teaching_objects
             ORDER BY updated_at DESC
             LIMIT ?`,
            [safeLimit]
        ),
        this.all(
            `SELECT normalized_topic, COALESCE(MAX(topic), normalized_topic) AS topic, COUNT(*) AS count, MAX(updated_at) AS last_updated_at
             FROM teaching_objects
             WHERE normalized_topic IS NOT NULL AND normalized_topic <> ''
             GROUP BY normalized_topic
             ORDER BY count DESC, last_updated_at DESC
             LIMIT ?`,
            [safeLimit]
        ),
        this.get(`SELECT COUNT(*) AS count FROM teaching_object_claims`),
    ]);
    return {
        total: Number(total?.count || 0),
        claimCount: Number(claimCount?.count || 0),
        byType: byType.map((row) => ({ objectType: row.object_type, count: Number(row.count || 0) })),
        recent: recent.map((row) => ({
            objectKey: row.object_key,
            objectType: row.object_type,
            topic: row.topic || null,
            title: row.title || null,
            updatedAt: row.updated_at || null,
        })),
        topTopics: topicRows.map((row) => ({
            normalizedTopic: row.normalized_topic,
            topic: row.topic,
            count: Number(row.count || 0),
            lastUpdatedAt: row.last_updated_at || null,
        })),
    };
}

// Evidence-judgement failure patterns inferred from quiz attempts.
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
