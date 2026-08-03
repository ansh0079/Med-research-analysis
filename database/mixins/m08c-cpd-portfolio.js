'use strict';

const { safeJsonParse, toPgVectorLiteral } = require('../lib/helpers');
const { expandNormalizedTopicKeys, resolveCanonicalNormalized } = require('../../server/utils/topicSynonyms');

module.exports = (Sup) => class extends Sup {
// ==========================================
// CPD Sessions
// ==========================================

async createCpdSession(userId, { activityType, topic = '', durationMinutes = 0, questionCount = 0, accuracyPct = null, notes = '', source = 'auto' }) {
    const result = await this.run(
        `INSERT INTO cpd_sessions (user_id, activity_type, topic, duration_minutes, question_count, accuracy_pct, notes, source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [userId, activityType, String(topic || '').slice(0, 200), Number(durationMinutes) || 0,
         Number(questionCount) || 0, accuracyPct != null ? Number(accuracyPct) : null,
         String(notes || '').slice(0, 500), source]
    );
    return { id: result.lastID };
}

async listCpdSessions(userId, { limit = 50, offset = 0, startDate = '', endDate = '', activityType = '' } = {}) {
    let sql = `SELECT * FROM cpd_sessions WHERE user_id = ?`;
    const params = [userId];
    if (startDate) { sql += ` AND created_at >= ?`; params.push(startDate); }
    if (endDate)   { sql += ` AND created_at <= ?`; params.push(endDate + 'T23:59:59'); }
    if (activityType) { sql += ` AND activity_type = ?`; params.push(activityType); }
    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(Math.min(limit, 200), offset);
    const rows = await this.all(sql, params);
    return rows.map((r) => ({
        id: r.id,
        activityType: r.activity_type,
        topic: r.topic,
        durationMinutes: r.duration_minutes,
        questionCount: r.question_count,
        accuracyPct: r.accuracy_pct,
        notes: r.notes,
        source: r.source,
        createdAt: r.created_at,
    }));
}

async getCpdSummary(userId, { year = new Date().getFullYear() } = {}) {
    const start = `${year}-01-01`;
    const end   = `${year}-12-31T23:59:59`;
    const rows = await this.all(
        `SELECT activity_type,
                COUNT(*) AS session_count,
                SUM(duration_minutes) AS total_minutes,
                SUM(question_count) AS total_questions,
                AVG(CASE WHEN accuracy_pct IS NOT NULL THEN accuracy_pct END) AS avg_accuracy
         FROM cpd_sessions
         WHERE user_id = ? AND created_at >= ? AND created_at <= ?
         GROUP BY activity_type`,
        [userId, start, end]
    );
    const byType = {};
    let totalMinutes = 0;
    for (const r of rows) {
        byType[r.activity_type] = {
            sessions: Number(r.session_count),
            minutes: Math.round(Number(r.total_minutes) || 0),
            questions: Number(r.total_questions) || 0,
            avgAccuracy: r.avg_accuracy != null ? Math.round(Number(r.avg_accuracy)) : null,
        };
        totalMinutes += Number(r.total_minutes) || 0;
    }
    // Monthly breakdown for chart. Month is extracted by substring: both engines
    // store/render created_at starting 'YYYY-MM-…', so positions 6-7 are the month
    // regardless of dialect (strftime is SQLite-only; TO_CHAR needs a timestamp
    // column but this one is TEXT on Postgres). CAST covers either column type.
    const monthly = await this.all(
        `SELECT SUBSTR(CAST(created_at AS TEXT), 6, 2) AS month,
                SUM(duration_minutes) AS minutes,
                COUNT(*) AS sessions
         FROM cpd_sessions
         WHERE user_id = ? AND created_at >= ? AND created_at <= ?
         GROUP BY month ORDER BY month ASC`,
        [userId, start, end]
    );
    return {
        year,
        totalMinutes: Math.round(totalMinutes),
        totalHours: Math.round(totalMinutes / 60 * 10) / 10,
        byType,
        monthly: monthly.map((m) => ({
            month: Number(m.month),
            minutes: Math.round(Number(m.minutes) || 0),
            sessions: Number(m.sessions),
        })),
    };
}

mapPortfolioReflectionRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        userId: row.user_id,
        reflectionType: row.reflection_type,
        sourceType: row.source_type,
        topic: row.topic,
        normalizedTopic: row.normalized_topic,
        whatHappened: row.what_happened,
        whatILearned: row.what_i_learned,
        whatIWillChange: row.what_i_will_change,
        evidenceUsed: row.evidence_used,
        supervisorDiscussion: row.supervisor_discussion,
        status: row.status,
        linkedCpdSessionId: row.linked_cpd_session_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

async createPortfolioReflection(userId, data = {}) {
    const topic = String(data.topic || '').slice(0, 240);
    const now = new Date().toISOString();
    const result = await this.run(
        `INSERT INTO portfolio_reflections (
            user_id, reflection_type, source_type, topic, normalized_topic,
            what_happened, what_i_learned, what_i_will_change, evidence_used,
            supervisor_discussion, status, linked_cpd_session_id, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            userId,
            String(data.reflectionType || 'CBD').slice(0, 40),
            String(data.sourceType || 'manual').slice(0, 40),
            topic,
            this.normalizeTopic(topic),
            String(data.whatHappened || '').slice(0, 8000),
            String(data.whatILearned || '').slice(0, 8000),
            String(data.whatIWillChange || '').slice(0, 8000),
            String(data.evidenceUsed || '').slice(0, 12000),
            String(data.supervisorDiscussion || '').slice(0, 8000),
            String(data.status || 'draft').slice(0, 40),
            data.linkedCpdSessionId != null ? Number(data.linkedCpdSessionId) : null,
            now,
            now,
        ]
    );
    const reflectionId = result.lastID || result.id;
    const row = await this.get(`SELECT * FROM portfolio_reflections WHERE id = ? AND user_id = ?`, [reflectionId, userId]);
    return this.mapPortfolioReflectionRow(row);
}

async listPortfolioReflections(userId, { limit = 50, offset = 0, topic = '', status = '' } = {}) {
    let sql = `SELECT * FROM portfolio_reflections WHERE user_id = ?`;
    const params = [userId];
    const normalizedTopic = topic ? this.normalizeTopic(topic) : '';
    if (normalizedTopic) {
        sql += ` AND normalized_topic = ?`;
        params.push(normalizedTopic);
    }
    if (status) {
        sql += ` AND status = ?`;
        params.push(String(status));
    }
    sql += ` ORDER BY updated_at DESC, created_at DESC LIMIT ? OFFSET ?`;
    params.push(Math.min(Number(limit) || 50, 200), Math.max(Number(offset) || 0, 0));
    const rows = await this.all(sql, params);
    return rows.map((row) => this.mapPortfolioReflectionRow(row));
}

async updatePortfolioReflection(userId, id, patch = {}) {
    const existing = await this.get(`SELECT * FROM portfolio_reflections WHERE id = ? AND user_id = ?`, [id, userId]);
    if (!existing) return null;

    const fields = [];
    const values = [];
    const add = (column, value) => {
        if (value === undefined) return;
        fields.push(`${column} = ?`);
        values.push(value);
    };

    const nextTopic = patch.topic !== undefined ? String(patch.topic || '').slice(0, 240) : undefined;
    add('reflection_type', patch.reflectionType !== undefined ? String(patch.reflectionType || 'CBD').slice(0, 40) : undefined);
    add('source_type', patch.sourceType !== undefined ? String(patch.sourceType || 'manual').slice(0, 40) : undefined);
    add('topic', nextTopic);
    add('normalized_topic', nextTopic !== undefined ? this.normalizeTopic(nextTopic) : undefined);
    add('what_happened', patch.whatHappened !== undefined ? String(patch.whatHappened || '').slice(0, 8000) : undefined);
    add('what_i_learned', patch.whatILearned !== undefined ? String(patch.whatILearned || '').slice(0, 8000) : undefined);
    add('what_i_will_change', patch.whatIWillChange !== undefined ? String(patch.whatIWillChange || '').slice(0, 8000) : undefined);
    add('evidence_used', patch.evidenceUsed !== undefined ? String(patch.evidenceUsed || '').slice(0, 12000) : undefined);
    add('supervisor_discussion', patch.supervisorDiscussion !== undefined ? String(patch.supervisorDiscussion || '').slice(0, 8000) : undefined);
    add('status', patch.status !== undefined ? String(patch.status || 'draft').slice(0, 40) : undefined);
    add('linked_cpd_session_id', patch.linkedCpdSessionId !== undefined && patch.linkedCpdSessionId !== null ? Number(patch.linkedCpdSessionId) : patch.linkedCpdSessionId);

    if (fields.length === 0) return this.mapPortfolioReflectionRow(existing);
    fields.push(`updated_at = ?`);
    values.push(new Date().toISOString(), id, userId);

    await this.run(
        `UPDATE portfolio_reflections SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
        values
    );
    const row = await this.get(`SELECT * FROM portfolio_reflections WHERE id = ? AND user_id = ?`, [id, userId]);
    return this.mapPortfolioReflectionRow(row);
}
};
