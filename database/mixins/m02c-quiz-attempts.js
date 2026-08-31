'use strict';

const { safeJsonParse } = require('../lib/helpers');
const { computeConceptHash } = require('../../server/utils/conceptHash');

module.exports = (Sup) => class extends Sup {
// Quiz Attempts & Validation
// ==========================================

async createQuizAttempt(attempt) {
    const normalizedTopic = this.normalizeTopic(attempt.topic);
    const conceptHash = computeConceptHash({
        normalizedTopic,
        questionType: attempt.questionType,
        questionText: attempt.questionText,
        claimKey: attempt.claimKey,
    });
    const reasoningTags = Array.isArray(attempt.reasoningTags)
        ? attempt.reasoningTags.map((tag) => String(tag || '').trim()).filter(Boolean).slice(0, 8)
        : [];
    const promptVariant = String(attempt.promptVariant || '').trim().slice(0, 80) || null;
    // userId is null for an anonymous BETA_MODE session; sessionId is what makes the
    // row findable later so reconcileAnonymousQuizAttempts can attach it once the
    // visitor signs in. See migration 092.
    const result = await this.run(
        `INSERT INTO quiz_attempts (user_id, topic, normalized_topic, question_id, question_type, question_text, user_answer, correct_answer, is_correct, time_ms, confidence, source_article_uid, study_run_id, outline_node_id, concept_hash, claim_key, reasoning_tags, reasoning_note, prompt_variant, session_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
            attempt.userId || null,
            attempt.topic,
            normalizedTopic,
            attempt.questionId,
            attempt.questionType,
            attempt.questionText,
            attempt.userAnswer,
            attempt.correctAnswer,
            attempt.isCorrect ? 1 : 0,
            attempt.timeMs || null,
            attempt.confidence || null,
            attempt.sourceArticleUid || null,
            attempt.studyRunId || null,
            attempt.outlineNodeId || null,
            conceptHash,
            attempt.claimKey || null,
            JSON.stringify(reasoningTags),
            attempt.reasoningNote ? String(attempt.reasoningNote).slice(0, 500) : null,
            promptVariant,
            attempt.sessionId || null,
        ]
    );
    return { id: result.id, conceptHash, ...attempt };
}

/**
 * Attach a beta-anonymous session's quiz attempts to the account it just
 * became. Called once at registration or login when the request carries an
 * X-Session-Id that answered questions before the user signed in.
 */
async reconcileAnonymousQuizAttempts(sessionId, userId) {
    if (!sessionId || !userId) return 0;
    const result = await this.run(
        `UPDATE quiz_attempts SET user_id = ? WHERE session_id = ? AND user_id IS NULL`,
        [userId, sessionId]
    );
    return result.changes || result.rowCount || 0;
}

mapQuizAttemptRow(r) {
    return {
        id: r.id,
        userId: r.user_id,
        topic: r.topic,
        normalizedTopic: r.normalized_topic,
        questionId: r.question_id,
        questionType: r.question_type,
        questionText: r.question_text,
        userAnswer: r.user_answer,
        correctAnswer: r.correct_answer,
        isCorrect: r.is_correct === 1,
        timeMs: r.time_ms,
        confidence: r.confidence,
        sourceArticleUid: r.source_article_uid,
        studyRunId: r.study_run_id,
        outlineNodeId: r.outline_node_id,
        conceptHash: r.concept_hash || null,
        claimKey: r.claim_key || null,
        reasoningTags: safeJsonParse(r.reasoning_tags, []),
        reasoningNote: r.reasoning_note || null,
        promptVariant: r.prompt_variant || null,
        createdAt: r.created_at,
    };
}

async getQuizAttempts({ userId, topic = '', limit = 50, offset = 0 } = {}) {
    const normalized = topic ? this.normalizeTopic(topic) : '';
    const rows = await this.all(
        `SELECT * FROM quiz_attempts WHERE user_id = ? AND (? = '' OR normalized_topic = ?) ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [userId, normalized, normalized, limit, offset]
    );
    return rows.map((r) => this.mapQuizAttemptRow(r));
}

async getQuizAttemptsForClaimKey(userId, claimKey, { limit = 40 } = {}) {
    if (!userId || !claimKey) return [];
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 40, 1), 100);
    const rows = await this.all(
        `SELECT * FROM quiz_attempts WHERE user_id = ? AND claim_key = ? ORDER BY created_at DESC LIMIT ?`,
        [userId, String(claimKey), safeLimit]
    );
    return rows.map((r) => this.mapQuizAttemptRow(r));
}

async getRepeatedMisconceptions(userId, { limit = 10, minAttempts = 2 } = {}) {
    const rows = await this.all(
        `SELECT concept_hash, question_type, question_text, normalized_topic,
                COUNT(*) AS total_attempts,
                SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) AS wrong_count
         FROM quiz_attempts
         WHERE user_id = ? AND concept_hash IS NOT NULL
         GROUP BY concept_hash
         HAVING total_attempts >= ? AND wrong_count > 0
         ORDER BY wrong_count DESC, total_attempts DESC
         LIMIT ?`,
        [userId, minAttempts, limit]
    );
    return rows.map((r) => ({
        conceptHash: r.concept_hash,
        questionType: r.question_type,
        questionText: r.question_text,
        topic: r.normalized_topic,
        totalAttempts: Number(r.total_attempts),
        wrongCount: Number(r.wrong_count),
        errorRate: Number(r.wrong_count) / Number(r.total_attempts),
    }));
}

/**
 * Bulk empirical p-value (fraction correct) lookup by concept_hash, for
 * adaptiveItemSelectionService — lets a cached MCQ pool be ordered by real
 * measured difficulty instead of storage order once enough attempts exist.
 * @param {string} normalizedTopic
 * @param {string[]} conceptHashes
 * @returns {Promise<Map<string, number>>} conceptHash -> pValue (0-1)
 */
async getConceptHashPValues(normalizedTopic, conceptHashes) {
    const hashes = [...new Set((conceptHashes || []).filter(Boolean))];
    if (hashes.length === 0) return new Map();
    const placeholders = hashes.map(() => '?').join(',');
    const rows = await this.all(
        `SELECT concept_hash, COUNT(*) AS total, SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct
         FROM quiz_attempts
         WHERE normalized_topic = ? AND concept_hash IN (${placeholders})
         GROUP BY concept_hash
         HAVING total >= 3`,
        [normalizedTopic, ...hashes]
    );
    return new Map(rows.map((r) => [r.concept_hash, {
        pValue: Number(r.correct) / Number(r.total),
        sampleSize: Number(r.total),
    }]));
}

async getQuizAttemptStats(userId, topic) {
    const normalized = this.normalizeTopic(topic);
    const rows = await this.all(
        `SELECT question_type, is_correct, created_at FROM quiz_attempts WHERE user_id = ? AND normalized_topic = ? ORDER BY created_at DESC`,
        [userId, normalized]
    );
    return rows;
}

// ==========================================
// Quiz Validation Results
// ==========================================

async recordQuizValidationResult(result) {
    await this.run(
        `INSERT INTO quiz_validation_results (
            question_id, topic, normalized_topic, generation_job_key, prompt_variant,
            status, rejection_reasons, reviewer_notes, source_provider, source_model
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            String(result.questionId || '').slice(0, 120),
            String(result.topic || '').slice(0, 240),
            this.normalizeTopic(result.topic || ''),
            result.jobKey ? String(result.jobKey).slice(0, 160) : null,
            result.promptVariant ? String(result.promptVariant).slice(0, 80) : null,
            result.status,
            JSON.stringify(Array.isArray(result.reasons) ? result.reasons.slice(0, 10) : []),
            result.reviewerNotes ? String(result.reviewerNotes).slice(0, 500) : null,
            result.provider ? String(result.provider).slice(0, 40) : null,
            result.model ? String(result.model).slice(0, 80) : null,
        ]
    );
}

async getQuizValidationStats({ topic, provider, model, days = 30 } = {}) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    let where = 'WHERE validated_at >= ?';
    const params = [since];
    if (topic) {
        where += ' AND normalized_topic = ?';
        params.push(this.normalizeTopic(topic));
    }
    if (provider) {
        where += ' AND source_provider = ?';
        params.push(String(provider));
    }
    if (model) {
        where += ' AND source_model = ?';
        params.push(String(model));
    }
    const rows = await this.all(
        `SELECT
            status,
            COUNT(*) as count,
            source_provider,
            source_model,
            prompt_variant
         FROM quiz_validation_results
         ${where}
         GROUP BY status, source_provider, source_model, prompt_variant
         ORDER BY count DESC`,
        params
    );
    return rows.map((r) => ({
        status: r.status,
        count: Number(r.count),
        provider: r.source_provider,
        model: r.source_model,
        promptVariant: r.prompt_variant,
    }));
}
};
