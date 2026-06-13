'use strict';

const { safeJsonParse } = require('../lib/helpers');

module.exports = (Sup) => class extends Sup {

mapCaseSessionRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        userId: row.user_id,
        topic: row.topic,
        normalizedTopic: row.normalized_topic,
        learningMode: row.learning_mode,
        difficulty: row.difficulty,
        caseData: safeJsonParse(row.case_data, null),
        targetedWeaknesses: safeJsonParse(row.targeted_weaknesses, []),
        status: row.status,
        currentStep: row.current_step,
        responses: safeJsonParse(row.responses, []),
        totalScore: row.total_score,
        createdAt: row.created_at,
        completedAt: row.completed_at,
    };
}

async createCaseSession({ userId, topic, learningMode, difficulty, caseData, targetedWeaknesses }) {
    const normalized = this.normalizeTopic(topic);
    const id = require('crypto').randomUUID();
    await this.run(
        `INSERT INTO case_sessions (id, user_id, topic, normalized_topic, learning_mode, difficulty, case_data, targeted_weaknesses, status, current_step, responses)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'in_progress', 0, '[]')`,
        [id, userId, topic, normalized, learningMode || 'student', difficulty || 'medium',
         JSON.stringify(caseData), JSON.stringify(targetedWeaknesses || [])]
    );
    return this.getCaseSession(id);
}

async getCaseSession(id) {
    const row = await this.get(`SELECT * FROM case_sessions WHERE id = ?`, [id]);
    return this.mapCaseSessionRow(row);
}

async getCaseSessionsForUser(userId, { status = '', limit = 20, offset = 0 } = {}) {
    const params = [userId];
    let where = 'user_id = ?';
    if (status) { where += ' AND status = ?'; params.push(status); }
    params.push(limit, offset);
    const rows = await this.all(
        `SELECT * FROM case_sessions WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        params
    );
    return rows.map(r => this.mapCaseSessionRow(r));
}

async submitCaseStepResponse(sessionId, stepIndex, response) {
    const session = await this.getCaseSession(sessionId);
    if (!session) return null;
    const responses = session.responses || [];
    responses[stepIndex] = response;
    const nextStep = stepIndex + 1;
    const totalSteps = session.caseData?.steps?.length || 0;
    const isComplete = nextStep >= totalSteps;
    await this.run(
        `UPDATE case_sessions SET responses = ?, current_step = ?, status = ?, completed_at = ? WHERE id = ?`,
        [JSON.stringify(responses), nextStep, isComplete ? 'completed' : 'in_progress',
         isComplete ? new Date().toISOString() : null, sessionId]
    );
    return this.getCaseSession(sessionId);
}

async scoreCaseSession(sessionId, totalScore) {
    await this.run(
        `UPDATE case_sessions SET total_score = ?, status = 'completed', completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP) WHERE id = ?`,
        [totalScore, sessionId]
    );
    return this.getCaseSession(sessionId);
}

async getWeakTopicsForCases(userId, { limit = 5 } = {}) {
    const rows = await this.all(
        `SELECT m.topic, m.normalized_topic, m.overall_score, m.recall_score,
                m.clinical_application_score, m.guideline_score, m.pitfall_score,
                m.attempts_count, m.last_attempt_at,
                t.display_name, t.specialty
         FROM user_topic_mastery m
         LEFT JOIN curriculum_topics t ON t.display_name = m.topic
         WHERE m.user_id = ? AND m.attempts_count >= 3 AND m.overall_score < 70
         ORDER BY m.overall_score ASC, m.attempts_count DESC
         LIMIT ?`,
        [userId, limit]
    );
    return rows.map(r => ({
        topic: r.topic,
        normalizedTopic: r.normalized_topic,
        overallScore: r.overall_score,
        recallScore: r.recall_score,
        clinicalApplicationScore: r.clinical_application_score,
        guidelineScore: r.guideline_score,
        pitfallScore: r.pitfall_score,
        attemptsCount: r.attempts_count,
        lastAttemptAt: r.last_attempt_at,
        displayName: r.display_name,
        specialty: r.specialty,
    }));
}

async getRecentCaseTopics(userId, { days = 7, limit = 10 } = {}) {
    const rows = await this.all(
        `SELECT normalized_topic, MAX(created_at) as latest FROM case_sessions
         WHERE user_id = ? AND created_at > CURRENT_TIMESTAMP - INTERVAL '${days} days'
         GROUP BY normalized_topic
         ORDER BY latest DESC LIMIT ?`,
        [userId, limit]
    );
    return rows.map(r => r.normalized_topic);
}

};
