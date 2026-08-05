'use strict';

const { computeMasteryFromSequence, classifyMasteryState } = require('../../server/services/knowledgeTracingService');

module.exports = (Sup) => class extends Sup {
// Teaching claim mastery & curator review
// ==========================================

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
};
