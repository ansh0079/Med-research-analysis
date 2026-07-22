'use strict';

const { safeJsonParse, toPgVectorLiteral } = require('../lib/helpers');
const { expandNormalizedTopicKeys, resolveCanonicalNormalized } = require('../../server/utils/topicSynonyms');
const { assessGuidelineQuality } = require('../../server/services/guidelineQualityService');
const { computeConceptHash } = require('../../server/utils/conceptHash');

module.exports = (Sup) => class extends Sup {
// Guideline Memory
// ==========================================

mapGuidelineRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        topic: row.topic,
        normalizedTopic: row.normalized_topic,
        sourceBody: row.source_body,
        sourceRegion: row.source_region || undefined,
        sourceYear: row.source_year === null || row.source_year === undefined ? undefined : Number(row.source_year),
        sourceUrl: row.source_url || undefined,
        sourceSpecialty: row.source_specialty || undefined,
        sourceDomain: row.source_domain || undefined,
        recommendationText: row.recommendation_text,
        recommendationStrength: row.recommendation_strength || undefined,
        recommendationCertainty: row.recommendation_certainty || undefined,
        population: row.population || undefined,
        intervention: row.intervention || undefined,
        cautions: row.cautions || undefined,
        status: row.status,
        reviewedBy: row.reviewed_by || undefined,
        reviewedAt: row.reviewed_at || undefined,
        supersededById: row.superseded_by_id === null || row.superseded_by_id === undefined ? undefined : Number(row.superseded_by_id),
        lastCheckedAt: row.last_checked_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        qualityAssessment: assessGuidelineQuality({
            sourceBody: row.source_body,
            sourceYear: row.source_year,
            sourceUrl: row.source_url,
            recommendationStrength: row.recommendation_strength,
            recommendationCertainty: row.recommendation_certainty,
            status: row.status,
            supersededById: row.superseded_by_id,
            lastCheckedAt: row.last_checked_at,
        }),
    };
}

async createGuideline(guideline) {
    const now = new Date().toISOString();
    const normalized = this.normalizeTopic(guideline.topic);
    const result = await this.run(
        `INSERT INTO topic_guidelines (
            topic, normalized_topic, source_body, source_region, source_year,
            source_url, source_specialty, source_domain, recommendation_text,
            recommendation_strength, recommendation_certainty, population,
            intervention, cautions, status, last_checked_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            String(guideline.topic || '').trim().slice(0, 240),
            normalized,
            String(guideline.sourceBody || '').trim(),
            guideline.sourceRegion ? String(guideline.sourceRegion).trim() : null,
            guideline.sourceYear ? parseInt(guideline.sourceYear, 10) : null,
            guideline.sourceUrl ? String(guideline.sourceUrl).trim() : null,
            guideline.sourceSpecialty ? String(guideline.sourceSpecialty).trim() : null,
            guideline.sourceDomain ? String(guideline.sourceDomain).trim() : null,
            String(guideline.recommendationText || '').trim(),
            guideline.recommendationStrength ? String(guideline.recommendationStrength).trim() : null,
            guideline.recommendationCertainty ? String(guideline.recommendationCertainty).trim() : null,
            guideline.population ? String(guideline.population).trim() : null,
            guideline.intervention ? String(guideline.intervention).trim() : null,
            guideline.cautions ? String(guideline.cautions).trim() : null,
            guideline.status || 'ai_extracted',
            now, now, now,
        ]
    );
    return this.getGuidelineById(result.id);
}

async getGuidelineById(id) {
    const row = await this.get(`SELECT * FROM topic_guidelines WHERE id = ?`, [id]);
    return this.mapGuidelineRow(row);
}

async getGuidelinesByTopic(topic, { status = '', limit = 20 } = {}) {
    const normalized = this.normalizeTopic(topic);
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100);
    const statusFilter = String(status || '').trim();
    const staleThreshold = new Date(Date.now() - 365 * 86400000).toISOString();
    const keys = [...new Set([
        normalized,
        resolveCanonicalNormalized(String(topic || '').trim(), (s) => this.normalizeTopic(s)),
        ...expandNormalizedTopicKeys(normalized, (s) => this.normalizeTopic(s)),
    ].filter(Boolean))];
    if (!keys.length) return [];

    // Auto-flag stale guidelines on read (all synonym keys)
    const stalePlaceholders = keys.map(() => '?').join(', ');
    await this.run(
        `UPDATE topic_guidelines SET status = 'stale'
         WHERE normalized_topic IN (${stalePlaceholders})
           AND status IN ('ai_extracted', 'human_reviewed')
           AND last_checked_at < ?
           AND superseded_by_id IS NULL`,
        [...keys, staleThreshold]
    );

    const rows = await this.all(
        `SELECT * FROM topic_guidelines
         WHERE normalized_topic IN (${stalePlaceholders})
           AND (? = '' OR status = ?)
           AND superseded_by_id IS NULL
         ORDER BY source_year DESC, updated_at DESC
         LIMIT ?`,
        [...keys, statusFilter, statusFilter, safeLimit]
    );
    return rows.map((row) => this.mapGuidelineRow(row));
}

async listGuidelines({ query = '', status = '', sourceBody = '', limit = 50, offset = 0, onlyActive = false } = {}) {
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);
    const safeOffset = Math.max(parseInt(String(offset), 10) || 0, 0);
    const qRaw = String(query || '').trim();
    const qLower = qRaw.toLowerCase();
    const qPattern = qRaw ? `%${qLower}%` : '';
    const statusFilter = String(status || '').trim();
    const sourceFilter = String(sourceBody || '').trim();
    const activeOnly = onlyActive ? 1 : 0;

    const rows = await this.all(
        `SELECT * FROM topic_guidelines
         WHERE (length(?) = 0 OR lower(topic) LIKE ? OR lower(coalesce(recommendation_text, '')) LIKE ? OR lower(coalesce(source_body, '')) LIKE ?)
           AND (? = '' OR status = ?)
           AND (? = '' OR source_body = ?)
           AND (? != 1 OR superseded_by_id IS NULL)
         ORDER BY updated_at DESC
         LIMIT ? OFFSET ?`,
        [qLower, qPattern, qPattern, qPattern, statusFilter, statusFilter, sourceFilter, sourceFilter, activeOnly, safeLimit, safeOffset]
    );
    const countRow = await this.get(
        `SELECT COUNT(*) AS count FROM topic_guidelines
         WHERE (length(?) = 0 OR lower(topic) LIKE ? OR lower(coalesce(recommendation_text, '')) LIKE ? OR lower(coalesce(source_body, '')) LIKE ?)
           AND (? = '' OR status = ?)
           AND (? = '' OR source_body = ?)
           AND (? != 1 OR superseded_by_id IS NULL)`,
        [qLower, qPattern, qPattern, qPattern, statusFilter, statusFilter, sourceFilter, sourceFilter, activeOnly]
    );
    return {
        guidelines: rows.map((row) => this.mapGuidelineRow(row)),
        total: Number(countRow?.count || 0),
        limit: safeLimit,
        offset: safeOffset,
    };
}

async updateGuideline(id, patch) {
    const existing = await this.getGuidelineById(id);
    if (!existing) return null;
    const now = new Date().toISOString();

    const fields = [];
    const values = [];
    const add = (col, val) => { if (val !== undefined) { fields.push(`${col} = ?`); values.push(val); } };

    add('topic', patch.topic !== undefined ? String(patch.topic).trim().slice(0, 240) : undefined);
    add('normalized_topic', patch.topic !== undefined ? this.normalizeTopic(patch.topic) : undefined);
    add('source_body', patch.sourceBody !== undefined ? String(patch.sourceBody).trim() : undefined);
    add('source_region', patch.sourceRegion !== undefined ? (patch.sourceRegion ? String(patch.sourceRegion).trim() : null) : undefined);
    add('source_year', patch.sourceYear !== undefined ? (patch.sourceYear ? parseInt(patch.sourceYear, 10) : null) : undefined);
    add('source_url', patch.sourceUrl !== undefined ? (patch.sourceUrl ? String(patch.sourceUrl).trim() : null) : undefined);
    add('source_specialty', patch.sourceSpecialty !== undefined ? (patch.sourceSpecialty ? String(patch.sourceSpecialty).trim() : null) : undefined);
    add('source_domain', patch.sourceDomain !== undefined ? (patch.sourceDomain ? String(patch.sourceDomain).trim() : null) : undefined);
    add('recommendation_text', patch.recommendationText !== undefined ? String(patch.recommendationText).trim() : undefined);
    add('recommendation_strength', patch.recommendationStrength !== undefined ? (patch.recommendationStrength ? String(patch.recommendationStrength).trim() : null) : undefined);
    add('recommendation_certainty', patch.recommendationCertainty !== undefined ? (patch.recommendationCertainty ? String(patch.recommendationCertainty).trim() : null) : undefined);
    add('population', patch.population !== undefined ? (patch.population ? String(patch.population).trim() : null) : undefined);
    add('intervention', patch.intervention !== undefined ? (patch.intervention ? String(patch.intervention).trim() : null) : undefined);
    add('cautions', patch.cautions !== undefined ? (patch.cautions ? String(patch.cautions).trim() : null) : undefined);
    add('status', patch.status !== undefined ? String(patch.status).trim() : undefined);
    add('last_checked_at', patch.lastCheckedAt !== undefined ? patch.lastCheckedAt : now);
    add('updated_at', now);

    if (fields.length === 0) return existing;
    values.push(id);
    await this.run(`UPDATE topic_guidelines SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getGuidelineById(id);
}

async markGuidelineReviewed(id, reviewerId) {
    const now = new Date().toISOString();
    await this.run(
        `UPDATE topic_guidelines SET status = 'human_reviewed', reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`,
        [reviewerId || null, now, now, id]
    );
    return this.getGuidelineById(id);
}

async markGuidelineStale(id) {
    const now = new Date().toISOString();
    await this.run(
        `UPDATE topic_guidelines SET status = 'stale', updated_at = ? WHERE id = ?`,
        [now, id]
    );
    return this.getGuidelineById(id);
}

async markGuidelineSuperseded(id, supersededById) {
    const now = new Date().toISOString();
    await this.run(
        `UPDATE topic_guidelines SET status = 'superseded', superseded_by_id = ?, updated_at = ? WHERE id = ?`,
        [supersededById, now, id]
    );
    return this.getGuidelineById(id);
}

async deleteGuideline(id) {
    await this.run(`DELETE FROM topic_guidelines WHERE id = ?`, [id]);
    return { deleted: true };
}

// ==========================================
// Learning Agent — User Profiles
// ==========================================

async getLearningProfile(userId) {
    const row = await this.get(`SELECT * FROM user_learning_profiles WHERE user_id = ?`, [userId]);
    if (!row) return null;
    return {
        id: row.id,
        userId: row.user_id,
        persona: row.persona,
        goals: safeJsonParse(row.goals, []),
        weakTopics: safeJsonParse(row.weak_topics, []),
        strongTopics: safeJsonParse(row.strong_topics, []),
        preferredDifficulty: row.preferred_difficulty,
        effectiveDifficulty: row.effective_difficulty || row.preferred_difficulty || 'mixed',
        dailyGoalMinutes: row.daily_goal_minutes,
        currentStreak: row.current_streak,
        longestStreak: row.longest_streak,
        lastStudyDate: row.last_study_date,
        trainingStage: row.training_stage || undefined,
        defaultExplanationDepth: row.default_explanation_depth || undefined,
        specialtyInterest: row.specialty_interest || undefined,
        studyGoal: row.study_goal || undefined,
        activeCurriculumId: row.active_curriculum_id != null ? Number(row.active_curriculum_id) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

async upsertLearningProfile(userId, data) {
    const now = new Date().toISOString();
    const existing = await this.get(`SELECT id FROM user_learning_profiles WHERE user_id = ?`, [userId]);
    if (existing) {
        const fields = [];
        const values = [];
        const add = (col, val) => { if (val !== undefined) { fields.push(`${col} = ?`); values.push(val); } };
        add('persona', data.persona);
        add('goals', data.goals !== undefined ? JSON.stringify(data.goals) : undefined);
        add('weak_topics', data.weakTopics !== undefined ? JSON.stringify(data.weakTopics) : undefined);
        add('strong_topics', data.strongTopics !== undefined ? JSON.stringify(data.strongTopics) : undefined);
        add('preferred_difficulty', data.preferredDifficulty);
        add('daily_goal_minutes', data.dailyGoalMinutes);
        add('current_streak', data.currentStreak);
        add('longest_streak', data.longestStreak);
        add('last_study_date', data.lastStudyDate);
        add('training_stage', data.trainingStage);
        add('default_explanation_depth', data.defaultExplanationDepth);
        add('specialty_interest', data.specialtyInterest !== undefined ? (data.specialtyInterest ? String(data.specialtyInterest).trim().slice(0, 120) : null) : undefined);
        add('study_goal', data.studyGoal !== undefined ? (data.studyGoal ? String(data.studyGoal).trim().slice(0, 160) : null) : undefined);
        add('active_curriculum_id', data.activeCurriculumId);
        add('effective_difficulty', data.effectiveDifficulty);
        fields.push('updated_at = ?');
        values.push(now);
        values.push(existing.id);
        await this.run(`UPDATE user_learning_profiles SET ${fields.join(', ')} WHERE id = ?`, values);
        return this.getLearningProfile(userId);
    }
    await this.run(
        `INSERT INTO user_learning_profiles (user_id, persona, goals, weak_topics, strong_topics, preferred_difficulty, daily_goal_minutes, current_streak, longest_streak, last_study_date, training_stage, default_explanation_depth, specialty_interest, study_goal, active_curriculum_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            userId,
            data.persona || null,
            JSON.stringify(data.goals || []),
            JSON.stringify(data.weakTopics || []),
            JSON.stringify(data.strongTopics || []),
            data.preferredDifficulty || 'mixed',
            data.dailyGoalMinutes || 15,
            data.currentStreak || 0,
            data.longestStreak || 0,
            data.lastStudyDate || null,
            data.trainingStage || 'finals',
            data.defaultExplanationDepth || 'exam_focus',
            data.specialtyInterest ? String(data.specialtyInterest).trim().slice(0, 120) : null,
            data.studyGoal ? String(data.studyGoal).trim().slice(0, 160) : null,
            data.activeCurriculumId != null ? data.activeCurriculumId : null,
            now,
            now,
        ]
    );
    return this.getLearningProfile(userId);
}

// ==========================================
// Misconception tracking
// ==========================================

async upsertUserClaimMisconception(userId, {
    claimKey,
    wrongOptionText,
    correctOptionText,
    topic,
    misconceptionCategory = null,
}) {
    const normalizedTopic = this.normalizeTopic(topic);
    const existing = await this.get(
        `SELECT id, count, misconception_category FROM user_claim_misconceptions WHERE user_id = ? AND claim_key = ? AND wrong_option_text = ?`,
        [userId, claimKey, wrongOptionText]
    );
    const now = new Date().toISOString();
    if (existing) {
        const categoryUpdate = (!existing.misconception_category && misconceptionCategory)
            ? `, misconception_category = ?`
            : '';
        const params = categoryUpdate
            ? [now, misconceptionCategory, existing.id]
            : [now, existing.id];
        await this.run(
            `UPDATE user_claim_misconceptions SET count = count + 1, last_seen_at = ?${categoryUpdate} WHERE id = ?`,
            params
        );
        return {
            id: existing.id,
            count: existing.count + 1,
            misconceptionCategory: existing.misconception_category || misconceptionCategory || null,
        };
    }
    const result = await this.run(
        `INSERT INTO user_claim_misconceptions (user_id, claim_key, wrong_option_text, correct_option_text, topic, normalized_topic, misconception_category, count, last_seen_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, claimKey, wrongOptionText, correctOptionText || null, topic, normalizedTopic, misconceptionCategory || null, 1, now, now]
    );
    return { id: result.lastID, count: 1, misconceptionCategory: misconceptionCategory || null };
}

async getUserClaimMisconceptions(userId, topic, { limit = 3 } = {}) {
    const normalizedTopic = this.normalizeTopic(topic);
    const rows = await this.all(
        `SELECT claim_key, wrong_option_text, correct_option_text, topic, misconception_category, count, last_seen_at
         FROM user_claim_misconceptions
         WHERE user_id = ? AND normalized_topic = ?
         ORDER BY count DESC, last_seen_at DESC
         LIMIT ?`,
        [userId, normalizedTopic, Math.max(1, Math.min(limit, 20))]
    );
    return rows.map((r) => ({
        claimKey: r.claim_key,
        wrongOptionText: r.wrong_option_text,
        correctOptionText: r.correct_option_text,
        topic: r.topic,
        misconceptionCategory: r.misconception_category || null,
        count: r.count,
        lastSeenAt: r.last_seen_at,
    }));
}

async recordTopicMasterySnapshot(userId, {
    topic,
    overallScore,
    sessionScore = null,
    snapshotReason = 'quiz_session',
} = {}) {
    const normalizedTopic = this.normalizeTopic(topic);
    const now = new Date().toISOString();
    const result = await this.run(
        `INSERT INTO user_topic_mastery_snapshots (user_id, topic, normalized_topic, overall_score, session_score, snapshot_reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            userId,
            topic,
            normalizedTopic,
            Math.max(0, Math.min(100, Number(overallScore) || 0)),
            sessionScore == null ? null : Math.max(0, Math.min(100, Number(sessionScore))),
            snapshotReason || 'quiz_session',
            now,
        ]
    );
    return { id: result.lastID, createdAt: now };
}

async listTopicMasterySnapshots(userId, topic, { limit = 30, days = 14 } = {}) {
    const normalizedTopic = this.normalizeTopic(topic);
    const safeLimit = Math.max(1, Math.min(Number(limit) || 30, 60));
    const safeDays = Math.max(1, Math.min(Number(days) || 14, 365));
    const cutoff = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString();
    const rows = await this.all(
        `SELECT overall_score, session_score, snapshot_reason, created_at
         FROM user_topic_mastery_snapshots
         WHERE user_id = ? AND normalized_topic = ? AND created_at >= ?
         ORDER BY created_at ASC
         LIMIT ?`,
        [userId, normalizedTopic, cutoff, safeLimit]
    );
    return rows.map((r) => ({
        overallScore: r.overall_score,
        sessionScore: r.session_score,
        snapshotReason: r.snapshot_reason,
        createdAt: r.created_at,
    }));
}

async updateEffectiveDifficulty(userId, effectiveDifficulty) {
    if (!['easy', 'medium', 'hard', 'mixed'].includes(effectiveDifficulty)) return null;
    await this.run(
        `UPDATE user_learning_profiles SET effective_difficulty = ?, updated_at = ? WHERE user_id = ?`,
        [effectiveDifficulty, new Date().toISOString(), userId]
    );
    return this.getLearningProfile(userId);
}

// ==========================================
// Learning Agent — Quiz Attempts
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
    const result = await this.run(
        `INSERT INTO quiz_attempts (user_id, topic, normalized_topic, question_id, question_type, question_text, user_answer, correct_answer, is_correct, time_ms, confidence, source_article_uid, study_run_id, outline_node_id, concept_hash, claim_key, reasoning_tags, reasoning_note, prompt_variant, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
            attempt.userId,
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
        ]
    );
    return { id: result.id, conceptHash, ...attempt };
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

// ==========================================
// Adaptive topic memory (search + quiz weak nodes)
// ==========================================

_mergeWeightedUids(existingArr, uidList) {
    const map = new Map();
    for (const e of existingArr || []) {
        if (e && e.uid) {
            map.set(String(e.uid), { uid: String(e.uid), w: Number(e.w || 1), at: e.at || null });
        }
    }
    const now = new Date().toISOString();
    for (const uid of uidList || []) {
        if (!uid) continue;
        const key = String(uid);
        const cur = map.get(key);
        if (cur) {
            cur.w += 1;
            cur.at = now;
        } else {
            map.set(key, { uid: key, w: 1, at: now });
        }
    }
    return [...map.values()].sort((a, b) => b.w - a.w).slice(0, 24);
}

_memoryTierFromScore(score) {
    const s = Number(score) || 0;
    if (s < 0.28) return 'sparse';
    if (s < 0.62) return 'building';
    return 'strong';
}

_computeTopicMemoryScores(row, masteryRow) {
    const searchCount = Number(row.search_count || 0);
    const top = safeJsonParse(row.top_article_uids, []);
    const saved = safeJsonParse(row.saved_article_uids, []);
    const weak = safeJsonParse(row.weak_outline_node_ids, []);
    const masteryOverall = masteryRow ? Number(masteryRow.overall_score || 0) : 0;
    const attempts = masteryRow ? Number(masteryRow.attempts_count || 0) : 0;
    const memoryScore = Math.min(
        1,
        0.18 * Math.min(1, searchCount / 10) +
            0.22 * Math.min(1, top.length / 6) +
            0.12 * Math.min(1, saved.length / 8) +
            0.2 * Math.min(1, attempts / 24) +
            0.18 * Math.min(1, masteryOverall / 100) +
            0.1 * Math.min(1, weak.length / 8)
    );
    return { memoryScore, memoryTier: this._memoryTierFromScore(memoryScore) };
}

mapUserTopicMemoryRow(row) {
    if (!row) return null;
    const top = safeJsonParse(row.top_article_uids, []);
    const saved = safeJsonParse(row.saved_article_uids, []);
    const excluded = safeJsonParse(row.excluded_article_uids, []);
    const weakOutlineNodeIds = safeJsonParse(row.weak_outline_node_ids, []);
    return {
        userId: row.user_id,
        normalizedTopic: row.normalized_topic,
        displayTopic: row.display_topic,
        searchCount: Number(row.search_count || 0),
        lastSearchAt: row.last_search_at,
        topArticles: top,
        savedArticles: saved,
        excludedArticles: excluded,
        weakOutlineNodeIds,
        memoryScore: Number(row.memory_score || 0),
        memoryTier: row.memory_tier || 'sparse',
        topPaperCount: top.length,
        savedPaperCount: saved.length,
        excludedPaperCount: excluded.length,
        promotedProposalAt: row.promoted_proposal_at || null,
        updatedAt: row.updated_at,
    };
}

async getUserTopicMemory(userId, topicOrNormalized) {
    if (!this.kysely || !userId || !topicOrNormalized) return null;
    const normalized = this.normalizeTopic(topicOrNormalized);
    if (!normalized) return null;
    const row = await this.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
    if (!row) {
        return {
            userId,
            normalizedTopic: normalized,
            displayTopic: String(topicOrNormalized || '').trim().slice(0, 240),
            searchCount: 0,
            lastSearchAt: null,
            topArticles: [],
            savedArticles: [],
            weakOutlineNodeIds: [],
            memoryScore: 0,
            memoryTier: 'sparse',
            topPaperCount: 0,
            savedPaperCount: 0,
            promotedProposalAt: null,
            updatedAt: null,
        };
    }
    return this.mapUserTopicMemoryRow(row);
}

async listUserTopicMemory(userId, { limit = 50, offset = 0 } = {}) {
    if (!this.kysely || !userId) return [];
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);
    const safeOffset = Math.max(parseInt(String(offset), 10) || 0, 0);
    const rows = await this.all(
        `SELECT * FROM user_topic_memory WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
        [userId, safeLimit, safeOffset]
    );
    return rows.map((r) => this.mapUserTopicMemoryRow(r));
}

async _finalizeUserTopicMemory(userId, normalized) {
    if (!userId || !normalized) return null;
    const row = await this.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
    if (!row) return null;
    const masteryRow = await this.get(`SELECT overall_score, attempts_count FROM user_topic_mastery WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
    const { memoryScore, memoryTier } = this._computeTopicMemoryScores(row, masteryRow);
    await this.run(`UPDATE user_topic_memory SET memory_score = ?, memory_tier = ?, updated_at = ? WHERE user_id = ? AND normalized_topic = ?`, [
        memoryScore,
        memoryTier,
        new Date().toISOString(),
        userId,
        normalized,
    ]);
    const refreshed = await this.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
    await this.maybePromoteAdaptiveTopicProposal(userId, refreshed).catch(() => null);
    return this.mapUserTopicMemoryRow(refreshed);
}

async maybePromoteAdaptiveTopicProposal(userId, row) {
    if (!row || !this.kysely || typeof this.createTopicKnowledgeProposal !== 'function') return null;
    if (row.memory_tier !== 'strong') return null;
    if (row.promoted_proposal_at) return null;
    if (Number(row.search_count || 0) < 5) return null;
    const top = safeJsonParse(row.top_article_uids, []);
    if (top.length < 3) return null;
    const displayTopic = String(row.display_topic || row.normalized_topic || '').trim().slice(0, 240);
    if (!displayTopic) return null;
    const pending = await this.listTopicKnowledgeProposals({ topic: displayTopic, status: 'pending_review', limit: 5 });
    if (pending.total > 0) return null;
    const existingTk = await this.getTopicKnowledge(displayTopic).catch(() => null);
    if (existingTk && existingTk.status === 'human_reviewed') return null;

    const sourceArticles = top.slice(0, 8).map((t, i) => ({
        uid: t.uid,
        title: `Tracked evidence ${i + 1}`,
        sourceIndex: i + 1,
    }));
    const knowledge = {
        teachingPoints: top.slice(0, 5).map((t, i) => ({
            claim: `Repeated learner focus on tracked source ${i + 1} (${String(t.uid).slice(0, 18)}…).`,
            sourceIndices: [i + 1],
        })),
        mentorMessage: `Adaptive memory draft from ${row.search_count} searches and ${top.length} tracked papers — curator review required.`,
    };
    const prop = await this.createTopicKnowledgeProposal(displayTopic, {
        knowledge,
        sourceArticles,
        reason: `adaptive_topic_memory:auto user=${userId}`,
        confidence: Math.min(0.75, 0.42 + Number(row.memory_score || 0) * 0.35),
        createdBy: userId,
    });
    if (prop) {
        await this.run(`UPDATE user_topic_memory SET promoted_proposal_at = ? WHERE user_id = ? AND normalized_topic = ?`, [
            new Date().toISOString(),
            userId,
            row.normalized_topic,
        ]);
    }
    return prop;
}

async recordUserTopicSearchSignal(userId, displayQuery, articleUidList = []) {
    if (!this.kysely || !userId || !displayQuery) return null;
    const normalized = this.normalizeTopic(displayQuery);
    if (!normalized) return null;
    const now = new Date().toISOString();
    const row = await this.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
    const mergedTop = this._mergeWeightedUids(row ? safeJsonParse(row.top_article_uids, []) : [], articleUidList);
    const searchCount = row ? Number(row.search_count || 0) + 1 : 1;
    const display_topic = String(displayQuery).trim().slice(0, 240);
    const savedJson = row ? row.saved_article_uids || '[]' : '[]';
    const weakJson = row ? row.weak_outline_node_ids || '[]' : '[]';
    const created = row ? row.created_at : now;

    await this.run(
        `INSERT INTO user_topic_memory (user_id, normalized_topic, display_topic, search_count, last_search_at, top_article_uids, saved_article_uids, weak_outline_node_ids, memory_score, memory_tier, promoted_proposal_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'sparse', NULL, ?, ?)
         ON CONFLICT(user_id, normalized_topic) DO UPDATE SET
           search_count = excluded.search_count,
           last_search_at = excluded.last_search_at,
           display_topic = excluded.display_topic,
           top_article_uids = excluded.top_article_uids,
           updated_at = excluded.updated_at`,
        [userId, normalized, display_topic, searchCount, now, JSON.stringify(mergedTop), savedJson, weakJson, created, now]
    );
    return this._finalizeUserTopicMemory(userId, normalized);
}

async recordUserTopicSavedArticleSignal(userId, displayTopic, articleUid) {
    if (!this.kysely || !userId || !displayTopic || !articleUid) return null;
    const normalized = this.normalizeTopic(displayTopic);
    if (!normalized) return null;
    const now = new Date().toISOString();
    const row = await this.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
    const mergedSaved = this._mergeWeightedUids(row ? safeJsonParse(row.saved_article_uids, []) : [], [articleUid]);
    const display_topic = String(displayTopic).trim().slice(0, 240);
    const topJson = row ? row.top_article_uids || '[]' : '[]';
    const weakJson = row ? row.weak_outline_node_ids || '[]' : '[]';
    const searchCount = row ? Number(row.search_count || 0) : 0;
    const created = row ? row.created_at : now;

    await this.run(
        `INSERT INTO user_topic_memory (user_id, normalized_topic, display_topic, search_count, last_search_at, top_article_uids, saved_article_uids, weak_outline_node_ids, memory_score, memory_tier, promoted_proposal_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?, 0, 'sparse', NULL, ?, ?)
         ON CONFLICT(user_id, normalized_topic) DO UPDATE SET
           saved_article_uids = excluded.saved_article_uids,
           display_topic = CASE WHEN LENGTH(excluded.display_topic) > LENGTH(COALESCE(user_topic_memory.display_topic, '')) THEN excluded.display_topic ELSE user_topic_memory.display_topic END,
           updated_at = excluded.updated_at`,
        [userId, normalized, display_topic, searchCount, topJson, JSON.stringify(mergedSaved), weakJson, created, now]
    );
    return this._finalizeUserTopicMemory(userId, normalized);
}

async recordUserTopicNegativeArticleSignal(userId, displayTopic, articleUid) {
    if (!this.kysely || !userId || !displayTopic || !articleUid) return null;
    const normalized = this.normalizeTopic(displayTopic);
    if (!normalized) return null;
    const uid = String(articleUid).trim();
    if (!uid) return null;
    const now = new Date().toISOString();
    const row = await this.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
    const existingTop = row ? safeJsonParse(row.top_article_uids, []) : [];
    const existingSaved = row ? safeJsonParse(row.saved_article_uids, []) : [];
    const existingExcluded = row ? safeJsonParse(row.excluded_article_uids, []) : [];
    const weakJson = row ? row.weak_outline_node_ids || '[]' : '[]';
    const searchCount = row ? Number(row.search_count || 0) : 0;
    const created = row ? row.created_at : now;
    const display_topic = String(displayTopic).trim().slice(0, 240);

    const top = existingTop
        .map((entry) => {
            const entryUid = String(typeof entry === 'string' ? entry : entry?.uid || '');
            if (entryUid !== uid) return entry;
            const nextWeight = Math.max(0, Number(entry?.w || entry?.weight || 1) - 2);
            return nextWeight > 0 ? { ...entry, uid: entryUid, w: nextWeight, at: now } : null;
        })
        .filter(Boolean);
    const saved = existingSaved.filter((entry) => String(typeof entry === 'string' ? entry : entry?.uid || '') !== uid);
    const excludedMap = new Map();
    for (const entry of existingExcluded) {
        const entryUid = String(typeof entry === 'string' ? entry : entry?.uid || '');
        if (!entryUid) continue;
        excludedMap.set(entryUid, {
            uid: entryUid,
            w: Number(entry?.w || entry?.weight || 1),
            at: entry?.at || null,
        });
    }
    const current = excludedMap.get(uid) || { uid, w: 0, at: null };
    current.w += 1;
    current.at = now;
    excludedMap.set(uid, current);
    const excluded = [...excludedMap.values()].sort((a, b) => b.w - a.w).slice(0, 50);

    await this.run(
        `INSERT INTO user_topic_memory (user_id, normalized_topic, display_topic, search_count, last_search_at, top_article_uids, saved_article_uids, excluded_article_uids, weak_outline_node_ids, memory_score, memory_tier, promoted_proposal_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, 0, 'sparse', NULL, ?, ?)
         ON CONFLICT(user_id, normalized_topic) DO UPDATE SET
           top_article_uids = excluded.top_article_uids,
           saved_article_uids = excluded.saved_article_uids,
           excluded_article_uids = excluded.excluded_article_uids,
           display_topic = CASE WHEN LENGTH(excluded.display_topic) > LENGTH(COALESCE(user_topic_memory.display_topic, '')) THEN excluded.display_topic ELSE user_topic_memory.display_topic END,
           updated_at = excluded.updated_at`,
        [userId, normalized, display_topic, searchCount, JSON.stringify(top), JSON.stringify(saved), JSON.stringify(excluded), weakJson, created, now]
    );
    return this._finalizeUserTopicMemory(userId, normalized);
}

async mergeUserTopicWeakOutlineNodes(userId, topicDisplay, attempts = []) {
    if (!this.kysely || !userId || !topicDisplay) return null;
    const normalized = this.normalizeTopic(topicDisplay);
    if (!normalized) return null;
    const weakIds = attempts.filter((a) => a && !a.isCorrect && a.outlineNodeId).map((a) => String(a.outlineNodeId));
    if (weakIds.length === 0) {
        const exists = await this.get(`SELECT 1 AS x FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
        if (exists) return this._finalizeUserTopicMemory(userId, normalized);
        return null;
    }

    const row = await this.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
    const existing = new Set(row ? safeJsonParse(row.weak_outline_node_ids, []) : []);
    for (const id of weakIds) existing.add(id);
    const arr = [...existing].slice(-28);
    const now = new Date().toISOString();

    if (!row) {
        await this.run(
            `INSERT INTO user_topic_memory (user_id, normalized_topic, display_topic, search_count, last_search_at, top_article_uids, saved_article_uids, weak_outline_node_ids, memory_score, memory_tier, promoted_proposal_at, created_at, updated_at)
             VALUES (?, ?, ?, 0, NULL, '[]', '[]', ?, 0, 'sparse', NULL, ?, ?)`,
            [userId, normalized, String(topicDisplay).trim().slice(0, 240), JSON.stringify(arr), now, now]
        );
    } else {
        await this.run(`UPDATE user_topic_memory SET weak_outline_node_ids = ?, updated_at = ? WHERE user_id = ? AND normalized_topic = ?`, [
            JSON.stringify(arr),
            now,
            userId,
            normalized,
        ]);
    }
    return this._finalizeUserTopicMemory(userId, normalized);
}

async listStrongMemoryUserTopicsForDrift({ limit = 80 } = {}) {
    if (!this.kysely) return [];
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 80, 1), 200);
    return this.all(
        `SELECT user_id, normalized_topic, display_topic, top_article_uids, saved_article_uids, updated_at
         FROM user_topic_memory
         WHERE memory_tier = 'strong'
         ORDER BY updated_at DESC
         LIMIT ?`,
        [safeLimit]
    );
}

async hasRecentProactiveEvidenceAlertForArticle(userId, normalizedTopic, landmarkArticleUid, withinDays = 90) {
    if (!this.kysely || !userId || !normalizedTopic || !landmarkArticleUid) return false;
    const cutoff = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000).toISOString();
    const row = await this.get(
        `SELECT 1 AS x FROM proactive_evidence_alerts
         WHERE user_id = ? AND normalized_topic = ? AND landmark_article_uid = ? AND created_at > ?
         LIMIT 1`,
        [userId, normalizedTopic, landmarkArticleUid, cutoff]
    );
    return Boolean(row);
}

async insertProactiveEvidenceAlert({
    userId,
    normalizedTopic,
    displayTopic = null,
    title,
    summary = null,
    payload = null,
    landmarkArticleUid = null,
    alertKind = 'knowledge_drift',
} = {}) {
    if (!this.kysely || !userId || !normalizedTopic || !title) return null;
    const now = new Date().toISOString();
    const payloadJson = payload && typeof payload === 'object' ? JSON.stringify(payload) : null;
    const result = await this.run(
        `INSERT INTO proactive_evidence_alerts (
            user_id, normalized_topic, display_topic, alert_kind, title, summary, payload_json, landmark_article_uid, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            userId,
            normalizedTopic,
            displayTopic ? String(displayTopic).slice(0, 240) : null,
            String(alertKind || 'knowledge_drift').slice(0, 64),
            String(title).slice(0, 500),
            summary ? String(summary).slice(0, 4000) : null,
            payloadJson,
            landmarkArticleUid ? String(landmarkArticleUid).slice(0, 256) : null,
            now,
        ]
    );
    const insertId = result.lastID || result.id;
    const row = insertId
        ? await this.get('SELECT * FROM proactive_evidence_alerts WHERE id = ?', [insertId])
        : await this.get(
              'SELECT * FROM proactive_evidence_alerts WHERE user_id = ? ORDER BY id DESC LIMIT 1',
              [userId]
          );
    return row ? this.mapProactiveEvidenceAlertRow(row) : null;
}

mapProactiveEvidenceAlertRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        userId: row.user_id,
        normalizedTopic: row.normalized_topic,
        displayTopic: row.display_topic || null,
        alertKind: row.alert_kind || 'knowledge_drift',
        title: row.title,
        summary: row.summary || null,
        payload: safeJsonParse(row.payload_json, null),
        landmarkArticleUid: row.landmark_article_uid || null,
        readAt: row.read_at || null,
        createdAt: row.created_at,
    };
}

async listProactiveEvidenceAlertsForUser(userId, { limit = 40, unreadOnly = false, normalizedTopic = '' } = {}) {
    if (!this.kysely || !userId) return [];
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 40, 1), 100);
    const nt = normalizedTopic ? this.normalizeTopic(normalizedTopic) : '';
    const clauses = ['user_id = ?'];
    const params = [userId];
    if (unreadOnly) clauses.push('read_at IS NULL');
    if (nt) {
        clauses.push('normalized_topic = ?');
        params.push(nt);
    }
    params.push(safeLimit);
    const rows = await this.all(
        `SELECT * FROM proactive_evidence_alerts
         WHERE ${clauses.join(' AND ')}
         ORDER BY created_at DESC
         LIMIT ?`,
        params
    );
    return rows.map((r) => this.mapProactiveEvidenceAlertRow(r)).filter(Boolean);
}

async markProactiveEvidenceAlertRead(alertId, userId) {
    if (!this.kysely || !alertId || !userId) return null;
    const now = new Date().toISOString();
    await this.run(
        `UPDATE proactive_evidence_alerts SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL`,
        [now, Number(alertId), userId]
    );
    const row = await this.get('SELECT * FROM proactive_evidence_alerts WHERE id = ? AND user_id = ?', [
        Number(alertId),
        userId,
    ]);
    return row ? this.mapProactiveEvidenceAlertRow(row) : null;
}

// ------------------------------------------
// Inferred misconception tags (Phase 3)
// ------------------------------------------

async updateUserTopicMemoryMisconceptions(userId, topic, inferredMisconceptions) {
    if (!this.kysely || !userId || !topic) return null;
    const normalized = this.normalizeTopic(topic);
    const json = Array.isArray(inferredMisconceptions)
        ? JSON.stringify(inferredMisconceptions.slice(0, 20))
        : '[]';
    const now = new Date().toISOString();
    await this.run(
        `UPDATE user_topic_memory SET inferred_misconceptions = ?, updated_at = ? WHERE user_id = ? AND normalized_topic = ?`,
        [json, now, userId, normalized]
    );
    return this.getUserTopicMemory(userId, topic);
}

async getUserTopicMemoryMisconceptions(userId, topic) {
    if (!this.kysely || !userId || !topic) return [];
    const normalized = this.normalizeTopic(topic);
    const row = await this.get(
        `SELECT inferred_misconceptions FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`,
        [userId, normalized]
    );
    if (!row || !row.inferred_misconceptions) return [];
    try {
        const parsed = JSON.parse(row.inferred_misconceptions);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

async listUserTopicMemoryWithMisconceptions(userId, { limit = 20 } = {}) {
    if (!this.kysely || !userId) return [];
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100);
    const rows = await this.all(
        `SELECT normalized_topic, display_topic, inferred_misconceptions, memory_tier, updated_at
         FROM user_topic_memory
         WHERE user_id = ? AND inferred_misconceptions IS NOT NULL AND inferred_misconceptions != '[]'
         ORDER BY updated_at DESC
         LIMIT ?`,
        [userId, safeLimit]
    );
    return rows.map((r) => ({
        normalizedTopic: r.normalized_topic,
        displayTopic: r.display_topic || r.normalized_topic,
        memoryTier: r.memory_tier || 'sparse',
        misconceptions: safeJsonParse(r.inferred_misconceptions, []),
        updatedAt: r.updated_at,
    }));
}

// ==========================================
};
