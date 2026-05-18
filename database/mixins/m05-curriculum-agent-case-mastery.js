'use strict';

const { safeJsonParse, toPgVectorLiteral } = require('../lib/helpers');
const { expandNormalizedTopicKeys, resolveCanonicalNormalized } = require('../../server/utils/topicSynonyms');

module.exports = (Sup) => class extends Sup {
// Curriculum & study-path progress
// ==========================================

async listCurricula() {
    const rows = await this.all(
        `SELECT id, slug, name, exam_stage_label, description, sort_order FROM curricula ORDER BY sort_order ASC, id ASC`
    );
    return rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        examStageLabel: r.exam_stage_label,
        description: r.description,
        sortOrder: r.sort_order,
    }));
}

async countCurriculumTopics(curriculumId) {
    const row = await this.get(
        `SELECT COUNT(*) AS c FROM curriculum_topics t
         JOIN curriculum_blocks b ON b.id = t.block_id WHERE b.curriculum_id = ?`,
        [curriculumId]
    );
    return row?.c != null ? Number(row.c) : 0;
}

async getCurriculumDetailBySlug(slug) {
    const cur = await this.get(`SELECT * FROM curricula WHERE slug = ?`, [slug]);
    if (!cur) return null;
    const blocks = await this.all(
        `SELECT id, curriculum_id, name, sort_order FROM curriculum_blocks WHERE curriculum_id = ? ORDER BY sort_order ASC, id ASC`,
        [cur.id]
    );
    const topicsByBlock = {};
    for (const b of blocks) {
        const topics = await this.all(
            `SELECT id, block_id, display_name, suggested_query, sort_order, prerequisites FROM curriculum_topics WHERE block_id = ? ORDER BY sort_order ASC, id ASC`,
            [b.id]
        );
        topicsByBlock[b.id] = topics.map((t) => ({
            id: t.id,
            blockId: t.block_id,
            displayName: t.display_name,
            suggestedQuery: t.suggested_query,
            sortOrder: t.sort_order,
            prerequisites: (() => { try { return JSON.parse(t.prerequisites || '[]'); } catch { return []; } })(),
        }));
    }
    return {
        id: cur.id,
        slug: cur.slug,
        name: cur.name,
        examStageLabel: cur.exam_stage_label,
        description: cur.description,
        sortOrder: cur.sort_order,
        blocks: blocks.map((b) => ({
            id: b.id,
            curriculumId: b.curriculum_id,
            name: b.name,
            sortOrder: b.sort_order,
            topics: topicsByBlock[b.id] || [],
        })),
    };
}

async getUserCurriculumProgressMap(userId, curriculumId) {
    const rows = await this.all(
        `SELECT p.curriculum_topic_id, p.status, p.quiz_attempts, p.correct_count, p.last_score_pct, p.updated_at
         FROM user_curriculum_progress p
         JOIN curriculum_topics t ON t.id = p.curriculum_topic_id
         JOIN curriculum_blocks b ON b.id = t.block_id
         WHERE p.user_id = ? AND b.curriculum_id = ?`,
        [userId, curriculumId]
    );
    const map = {};
    for (const r of rows) {
        map[Number(r.curriculum_topic_id)] = {
            status: r.status,
            quizAttempts: Number(r.quiz_attempts || 0),
            correctCount: Number(r.correct_count || 0),
            lastScorePct: r.last_score_pct != null ? Number(r.last_score_pct) : null,
            updatedAt: r.updated_at,
        };
    }
    return map;
}

async touchCurriculumTopicProgress(userId, curriculumTopicId, status = 'in_progress') {
    const now = new Date().toISOString();
    await this.run(
        `INSERT INTO user_curriculum_progress (user_id, curriculum_topic_id, status, quiz_attempts, correct_count, last_score_pct, updated_at)
         VALUES (?, ?, ?, 0, 0, NULL, ?)
         ON CONFLICT(user_id, curriculum_topic_id) DO UPDATE SET
         status = CASE WHEN user_curriculum_progress.status = 'confident' THEN user_curriculum_progress.status ELSE excluded.status END,
         updated_at = excluded.updated_at`,
        [userId, curriculumTopicId, status, now]
    );
}

async mergeCurriculumTopicAttemptBatch(userId, curriculumTopicId, batchCorrect, batchTotal) {
    if (!curriculumTopicId || batchTotal <= 0) return;
    const row = await this.get(
        `SELECT quiz_attempts, correct_count, status FROM user_curriculum_progress WHERE user_id = ? AND curriculum_topic_id = ?`,
        [userId, curriculumTopicId]
    );
    const prevA = row ? Number(row.quiz_attempts || 0) : 0;
    const prevC = row ? Number(row.correct_count || 0) : 0;
    const newA = prevA + batchTotal;
    const newC = prevC + batchCorrect;
    const lastPct = Math.round((batchCorrect / batchTotal) * 100);
    let status = 'in_progress';
    if (newA >= 8 && newC / newA >= 0.75) status = 'confident';
    else if (newA >= 3 && lastPct >= 80) status = 'in_progress';

    const now = new Date().toISOString();
    await this.run(
        `INSERT INTO user_curriculum_progress (user_id, curriculum_topic_id, status, quiz_attempts, correct_count, last_score_pct, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, curriculum_topic_id) DO UPDATE SET
         status = excluded.status,
         quiz_attempts = excluded.quiz_attempts,
         correct_count = excluded.correct_count,
         last_score_pct = excluded.last_score_pct,
         updated_at = excluded.updated_at`,
        [userId, curriculumTopicId, status, newA, newC, lastPct, now]
    );
}

async getCurriculumExamSummaryForUser(userId, curriculumId) {
    const totalTopics = await this.countCurriculumTopics(curriculumId);
    if (totalTopics === 0) return { totalTopics: 0, topicsStarted: 0, confident: 0, pctTowardGoal: 0 };
    const row = await this.get(
        `SELECT
           COUNT(*) AS started,
           SUM(CASE WHEN p.status = 'confident' THEN 1 ELSE 0 END) AS confident
         FROM user_curriculum_progress p
         JOIN curriculum_topics t ON t.id = p.curriculum_topic_id
         JOIN curriculum_blocks b ON b.id = t.block_id
         WHERE p.user_id = ? AND b.curriculum_id = ?`,
        [userId, curriculumId]
    );
    const topicsStarted = Number(row?.started || 0);
    const confident = Number(row?.confident || 0);
    const pctTopicsTouched = Math.round((topicsStarted / totalTopics) * 100);
    return {
        totalTopics,
        topicsStarted,
        confident,
        pctTopicsTouched,
    };
}

async getStudyRun(id) {
    const row = await this.get(`SELECT * FROM study_runs WHERE id = ?`, [id]);
    return this.mapStudyRunRow(row);
}

async listStudyRuns(userId, { status = '', limit = 20, offset = 0 } = {}) {
    const rows = await this.all(
        `SELECT * FROM study_runs
         WHERE user_id = ? AND (? = '' OR status = ?)
         ORDER BY last_active_at DESC
         LIMIT ? OFFSET ?`,
        [userId, status, status, limit, offset]
    );
    return rows.map((r) => this.mapStudyRunRow(r));
}

async getActiveStudyRun(userId, topic = '') {
    const normalized = topic ? this.normalizeTopic(topic) : '';
    const row = await this.get(
        `SELECT * FROM study_runs
         WHERE user_id = ? AND status = 'active' AND (? = '' OR normalized_topic = ?)
         ORDER BY last_active_at DESC
         LIMIT 1`,
        [userId, normalized, normalized]
    );
    return this.mapStudyRunRow(row);
}

async updateStudyRun(id, patch = {}) {
    const existing = await this.getStudyRun(id);
    if (!existing) return null;
    const fields = [];
    const values = [];
    const add = (col, val) => {
        if (val !== undefined) {
            fields.push(`${col} = ?`);
            values.push(val);
        }
    };
    add('status', patch.status);
    add('progress', patch.progress !== undefined ? JSON.stringify(patch.progress || {}) : undefined);
    add('node_coverage', patch.nodeCoverage !== undefined ? JSON.stringify(patch.nodeCoverage || {}) : undefined);
    add('completed_at', patch.completedAt);
    add('last_active_at', new Date().toISOString());
    values.push(id);
    await this.run(`UPDATE study_runs SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getStudyRun(id);
}

// ==========================================
// Learning Agent — Agent Conversations
// ==========================================

async createAgentConversation(userId, topic, title) {
    const now = new Date().toISOString();
    const normalized = this.normalizeTopic(topic);
    const result = await this.run(
        `INSERT INTO agent_conversations (user_id, topic, normalized_topic, title, messages, message_count, last_message_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, topic, normalized, title || topic, '[]', 0, now, now]
    );
    return this.getAgentConversation(result.id);
}

async getAgentConversation(id) {
    const row = await this.get(`SELECT * FROM agent_conversations WHERE id = ?`, [id]);
    if (!row) return null;
    return {
        id: row.id,
        userId: row.user_id,
        topic: row.topic,
        normalizedTopic: row.normalized_topic,
        title: row.title,
        messages: safeJsonParse(row.messages, []),
        messageCount: row.message_count,
        lastMessageAt: row.last_message_at,
        createdAt: row.created_at,
    };
}

async listAgentConversations(userId, { topic = '', limit = 20, offset = 0 } = {}) {
    const normalized = topic ? this.normalizeTopic(topic) : '';
    const rows = await this.all(
        `SELECT id, user_id, topic, normalized_topic, title, message_count, last_message_at, created_at
         FROM agent_conversations WHERE user_id = ? AND (? = '' OR normalized_topic = ?)
         ORDER BY last_message_at DESC LIMIT ? OFFSET ?`,
        [userId, normalized, normalized, limit, offset]
    );
    return rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        topic: r.topic,
        normalizedTopic: r.normalized_topic,
        title: r.title,
        messageCount: r.message_count,
        lastMessageAt: r.last_message_at,
        createdAt: r.created_at,
    }));
}

async appendAgentMessages(conversationId, newMessages) {
    const conv = await this.getAgentConversation(conversationId);
    if (!conv) return null;
    const messages = [...conv.messages, ...newMessages];
    const now = new Date().toISOString();
    await this.run(
        `UPDATE agent_conversations SET messages = ?, message_count = ?, last_message_at = ?, updated_at = ? WHERE id = ?`,
        [JSON.stringify(messages), messages.length, now, now, conversationId]
    );
    return this.getAgentConversation(conversationId);
}

async deleteAgentConversation(id) {
    await this.run(`DELETE FROM agent_conversations WHERE id = ?`, [id]);
    return { deleted: true };
}

// ==========================================
// Learning Agent — Case Attempts
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
    const existing = await this.get(`SELECT id FROM user_topic_mastery WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
    if (existing) {
        await this.run(
            `UPDATE user_topic_mastery SET
                overall_score = ?, recall_score = ?, clinical_application_score = ?, trial_interpretation_score = ?,
                guideline_score = ?, pitfall_score = ?, attempts_count = ?, correct_count = ?,
                last_attempt_at = ?, next_review_at = ?, updated_at = ?
             WHERE id = ?`,
            [
                scores.overallScore ?? 0, scores.recallScore ?? 0, scores.clinicalApplicationScore ?? 0,
                scores.trialInterpretationScore ?? 0, scores.guidelineScore ?? 0, scores.pitfallScore ?? 0,
                scores.attemptsCount ?? 0, scores.correctCount ?? 0,
                scores.lastAttemptAt || now, scores.nextReviewAt || now, now, existing.id,
            ]
        );
        return this.getUserTopicMastery(userId, topic);
    }
    await this.run(
        `INSERT INTO user_topic_mastery (user_id, topic, normalized_topic, overall_score, recall_score, clinical_application_score, trial_interpretation_score, guideline_score, pitfall_score, attempts_count, correct_count, last_attempt_at, next_review_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
