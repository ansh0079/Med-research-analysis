'use strict';

const { safeJsonParse } = require('../lib/helpers');

module.exports = (Sup) => class extends Sup {
// Learning Profiles
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
};
