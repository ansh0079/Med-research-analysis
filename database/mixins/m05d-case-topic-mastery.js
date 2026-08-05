'use strict';

const { safeJsonParse } = require('../lib/helpers');

module.exports = (Sup) => class extends Sup {
// Case attempts & topic mastery
// ==========================================

async createCaseAttempt(attempt) {
    const result = await this.run(
        `INSERT INTO case_attempts (user_id, topic, normalized_topic, case_text, case_type, learning_mode, user_response, ai_feedback, score, seed_article_uids, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
            attempt.userId,
            attempt.topic,
            this.normalizeTopic(attempt.topic),
            attempt.caseText,
            attempt.caseType || 'analysis',
            attempt.learningMode || 'resident',
            attempt.userResponse ? JSON.stringify(attempt.userResponse) : null,
            attempt.aiFeedback ? JSON.stringify(attempt.aiFeedback) : null,
            attempt.score ?? null,
            JSON.stringify(attempt.seedArticleUids || []),
        ]
    );
    return { id: result.id, ...attempt };
}

async getCaseAttempts({ userId, topic = '', limit = 50, offset = 0 } = {}) {
    const normalized = topic ? this.normalizeTopic(topic) : '';
    const rows = await this.all(
        `SELECT * FROM case_attempts WHERE user_id = ? AND (? = '' OR normalized_topic = ?) ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [userId, normalized, normalized, limit, offset]
    );
    return rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        topic: r.topic,
        normalizedTopic: r.normalized_topic,
        caseText: r.case_text,
        caseType: r.case_type,
        learningMode: r.learning_mode,
        userResponse: safeJsonParse(r.user_response, null),
        aiFeedback: safeJsonParse(r.ai_feedback, null),
        score: r.score,
        seedArticleUids: safeJsonParse(r.seed_article_uids, []),
        createdAt: r.created_at,
    }));
}

// ==========================================
// Learning Agent — Topic Mastery
// ==========================================

async getUserTopicMastery(userId, topic) {
    const normalized = this.normalizeTopic(topic);
    const row = await this.get(`SELECT * FROM user_topic_mastery WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
    if (!row) return null;
    return {
        id: row.id,
        userId: row.user_id,
        topic: row.topic,
        normalizedTopic: row.normalized_topic,
        overallScore: row.overall_score,
        recallScore: row.recall_score,
        clinicalApplicationScore: row.clinical_application_score,
        trialInterpretationScore: row.trial_interpretation_score,
        guidelineScore: row.guideline_score,
        pitfallScore: row.pitfall_score,
        attemptsCount: row.attempts_count,
        correctCount: row.correct_count,
        lastAttemptAt: row.last_attempt_at,
        nextReviewAt: row.next_review_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

async listUserTopicMastery(userId, { limit = 50, offset = 0 } = {}) {
    const rows = await this.all(
        `SELECT * FROM user_topic_mastery WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
        [userId, limit, offset]
    );
    return rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        topic: r.topic,
        normalizedTopic: r.normalized_topic,
        overallScore: r.overall_score,
        recallScore: r.recall_score,
        clinicalApplicationScore: r.clinical_application_score,
        trialInterpretationScore: r.trial_interpretation_score,
        guidelineScore: r.guideline_score,
        pitfallScore: r.pitfall_score,
        attemptsCount: r.attempts_count,
        correctCount: r.correct_count,
        lastAttemptAt: r.last_attempt_at,
        nextReviewAt: r.next_review_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    }));
}

async upsertUserTopicMastery(userId, topic, scores) {
    const now = new Date().toISOString();
    const normalized = this.normalizeTopic(topic);
    await this.run(
        `INSERT INTO user_topic_mastery
            (user_id, topic, normalized_topic, overall_score, recall_score, clinical_application_score,
             trial_interpretation_score, guideline_score, pitfall_score, attempts_count, correct_count,
             last_attempt_at, next_review_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id, normalized_topic) DO UPDATE SET
            overall_score = excluded.overall_score,
            recall_score = excluded.recall_score,
            clinical_application_score = excluded.clinical_application_score,
            trial_interpretation_score = excluded.trial_interpretation_score,
            guideline_score = excluded.guideline_score,
            pitfall_score = excluded.pitfall_score,
            attempts_count = excluded.attempts_count,
            correct_count = excluded.correct_count,
            last_attempt_at = excluded.last_attempt_at,
            next_review_at = excluded.next_review_at,
            updated_at = excluded.updated_at`,
        [
            userId, topic, normalized,
            scores.overallScore ?? 0, scores.recallScore ?? 0, scores.clinicalApplicationScore ?? 0,
            scores.trialInterpretationScore ?? 0, scores.guidelineScore ?? 0, scores.pitfallScore ?? 0,
            scores.attemptsCount ?? 0, scores.correctCount ?? 0,
            scores.lastAttemptAt || now, scores.nextReviewAt || now, now, now,
        ]
    );
    return this.getUserTopicMastery(userId, topic);
}

/**
 * Anonymous cohort stats for a topic: peer stage average, foundation-doctor reference, global avg, percentile.
 */
async getMasteryCohortBenchmark(userId, topic) {
    const normalized = this.normalizeTopic(topic);
    const mine = await this.getUserTopicMastery(userId, topic);
    if (!mine) return null;
    const profile = await this.getLearningProfile(userId);
    const stage = profile?.trainingStage || 'finals';

    const peerRows = await this.all(
        `SELECT m.overall_score AS s FROM user_topic_mastery m
         INNER JOIN user_learning_profiles p ON p.user_id = m.user_id
         WHERE m.normalized_topic = ? AND COALESCE(p.training_stage, 'finals') = ? AND m.attempts_count >= 1 AND m.user_id != ?`,
        [normalized, stage, userId]
    ).catch(() => []);

    const peerRankRows = await this.all(
        `SELECT m.overall_score AS s FROM user_topic_mastery m
         INNER JOIN user_learning_profiles p ON p.user_id = m.user_id
         WHERE m.normalized_topic = ? AND COALESCE(p.training_stage, 'finals') = ? AND m.attempts_count >= 1`,
        [normalized, stage]
    ).catch(() => []);

    const seniorRows = await this.all(
        `SELECT m.overall_score AS s FROM user_topic_mastery m
         INNER JOIN user_learning_profiles p ON p.user_id = m.user_id
         WHERE m.normalized_topic = ? AND COALESCE(p.training_stage, 'finals') = 'foundation_doctor' AND m.attempts_count >= 1 AND m.user_id != ?`,
        [normalized, userId]
    ).catch(() => []);

    const globalRow = await this.get(
        `SELECT AVG(overall_score) AS avg, COUNT(*) AS n FROM user_topic_mastery
         WHERE normalized_topic = ? AND attempts_count >= 1 AND user_id != ?`,
        [normalized, userId]
    ).catch(() => null);

    const avg = (rows) => {
        if (!rows.length) return null;
        const sum = rows.reduce((a, r) => a + Number(r.s), 0);
        return Math.round(sum / rows.length);
    };

    const peerScores = peerRankRows.map((r) => Number(r.s)).sort((a, b) => a - b);
    let percentileAmongPeers = null;
    if (peerScores.length >= 3) {
        const below = peerScores.filter((s) => s < mine.overallScore).length;
        percentileAmongPeers = Math.round((below / peerScores.length) * 100);
    }

    return {
        normalizedTopic: normalized,
        myScore: mine.overallScore,
        peerStage: stage,
        peerAvg: avg(peerRows),
        peerSampleSize: peerRows.length,
        foundationDoctorAvg: avg(seniorRows),
        foundationDoctorSampleSize: seniorRows.length,
        globalAvg: globalRow?.avg != null ? Math.round(Number(globalRow.avg)) : null,
        globalSampleSize: globalRow?.n != null ? Number(globalRow.n) : 0,
        percentileAmongPeers,
    };
}
};
