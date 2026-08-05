'use strict';



module.exports = (Sup) => class extends Sup {
// Curriculum progress & study runs
// ==========================================

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
};
