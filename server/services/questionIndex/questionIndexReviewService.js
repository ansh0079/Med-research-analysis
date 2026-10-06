'use strict';

const REVIEW_STATES = new Set(['approved', 'needs_revision', 'retired', 'unreviewed']);

function parseJson(value, fallback) {
    if (value && typeof value === 'object') return value;
    try { return JSON.parse(value); } catch { return fallback; }
}

async function listQuestionReviewQueue(db, { category = 'unclear', reason = '', topic = '', limit = 40, offset = 0 } = {}) {
    const where = ['q.review_state = ?'];
    const params = ['unreviewed'];
    if (category) { where.push('q.category = ?'); params.push(category); }
    if (reason) { where.push('q.reasons LIKE ?'); params.push(`%${reason}%`); }
    if (topic) { where.push('(q.assigned_topic_name LIKE ? OR q.original_topic LIKE ?)'); params.push(`%${topic}%`, `%${topic}%`); }
    const rows = await db.all(
        `SELECT q.* FROM question_topic_index q WHERE ${where.join(' AND ')}
         ORDER BY CASE WHEN q.category = 'unassignable' THEN 2 WHEN q.evidence_support = 'none' THEN 1 ELSE 0 END,
                  q.topic_similarity DESC, q.guideline_support DESC, q.paper_support DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset],
    );
    const items = [];
    for (const row of rows) {
        const object = await db.get('SELECT object_payload FROM teaching_objects WHERE object_key = ?', [row.object_key]);
        const question = parseJson(object?.object_payload, {})?.mcqs?.[row.question_index] || null;
        items.push({
            ...row,
            reasons: parseJson(row.reasons, []),
            evidenceGuidelineIds: parseJson(row.evidence_guideline_ids, []),
            evidencePaperUids: parseJson(row.evidence_paper_uids, []),
            question,
        });
    }
    const counts = await db.all('SELECT category, review_state, COUNT(*) AS count FROM question_topic_index GROUP BY category, review_state', []);
    return { items, counts };
}

async function reviewQuestionAssignment(db, { objectKey, questionIndex, decision, assignedCurriculumTopicId, notes, userId }) {
    if (!REVIEW_STATES.has(decision) || decision === 'unreviewed') throw new Error('Invalid review decision');
    const current = await db.get('SELECT * FROM question_topic_index WHERE object_key = ? AND question_index = ?', [objectKey, questionIndex]);
    if (!current) throw new Error('Question assignment not found');
    let topicId = current.assigned_curriculum_topic_id;
    let topicName = current.assigned_topic_name;
    let clusterId = current.assigned_cluster_id;
    if (assignedCurriculumTopicId != null) {
        const topic = await db.get('SELECT id, display_name FROM curriculum_topics WHERE id = ?', [assignedCurriculumTopicId]);
        if (!topic) throw new Error('Curriculum topic not found');
        topicId = String(topic.id);
        topicName = topic.display_name;
        const cluster = await db.get('SELECT cluster_id FROM topic_cluster_index WHERE curriculum_topic_id = ?', [topicId]);
        clusterId = cluster?.cluster_id || topicId;
    }
    const category = decision === 'approved' ? 'aligned' : (decision === 'retired' ? 'unassignable' : current.category);
    const now = new Date().toISOString();
    await db.run(
        `UPDATE question_topic_index SET review_state = ?, reviewed_by = ?, reviewed_at = ?, review_notes = ?,
         assigned_curriculum_topic_id = ?, assigned_topic_name = ?, assigned_cluster_id = ?, category = ?
         WHERE object_key = ? AND question_index = ?`,
        [decision, userId || null, now, notes || null, topicId, topicName, clusterId, category, objectKey, questionIndex],
    );
    await db.run(
        `UPDATE question_work_queue SET status = ?, completed_at = ?, updated_at = ?
         WHERE object_key = ? AND question_index = ? AND cohort = 'topic_repair'`,
        [decision === 'approved' ? 'repaired' : decision, now, now, objectKey, questionIndex],
    ).catch(() => {});
    return db.get('SELECT * FROM question_topic_index WHERE object_key = ? AND question_index = ?', [objectKey, questionIndex]);
}

async function listGuidelineReviewQueue(db, { category = 'unclear', topic = '', limit = 40, offset = 0 } = {}) {
    const where = ['i.review_state = ?', 'i.category = ?'];
    const params = ['unreviewed', category];
    if (topic) { where.push('(i.assigned_topic_name LIKE ? OR i.original_topic LIKE ?)'); params.push(`%${topic}%`, `%${topic}%`); }
    return db.all(
        `SELECT i.*, g.source_body, g.source_year, g.recommendation_text FROM guideline_topic_index i
         JOIN topic_guidelines g ON CAST(g.id AS TEXT) = i.guideline_id
         WHERE ${where.join(' AND ')} ORDER BY i.topic_similarity DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset],
    );
}

async function reviewGuidelineAssignment(db, { guidelineId, decision, notes, userId }) {
    if (!REVIEW_STATES.has(decision) || decision === 'unreviewed') throw new Error('Invalid review decision');
    const current = await db.get('SELECT guideline_id FROM guideline_topic_index WHERE guideline_id = ?', [String(guidelineId)]);
    if (!current) throw new Error('Guideline assignment not found');
    const now = new Date().toISOString();
    await db.run(
        'UPDATE guideline_topic_index SET review_state = ?, reviewed_by = ?, reviewed_at = ?, review_notes = ? WHERE guideline_id = ?',
        [decision, userId || null, now, notes || null, String(guidelineId)],
    );
    return db.get('SELECT * FROM guideline_topic_index WHERE guideline_id = ?', [String(guidelineId)]);
}

async function listQuestionWorkQueue(db, { cohort = 'topic_repair', status = 'queued', topic = '', limit = 40, offset = 0 } = {}) {
    if (!new Set(['factual_review', 'topic_repair']).has(cohort)) throw new Error('Invalid question work cohort');
    const where = ['w.cohort = ?', 'w.status = ?'];
    const params = [cohort, status];
    if (topic) { where.push('w.topic LIKE ?'); params.push(`%${topic}%`); }
    const items = await db.all(
        `SELECT w.*, q.category, q.assigned_topic_name, q.topic_similarity, q.evidence_support,
                q.evidence_guideline_ids, q.evidence_paper_uids
         FROM question_work_queue w
         LEFT JOIN question_topic_index q ON q.object_key=w.object_key AND q.question_index=w.question_index
         WHERE ${where.join(' AND ')} ORDER BY w.topic,w.object_key,w.question_index LIMIT ? OFFSET ?`,
        [...params, limit, offset],
    );
    for (const item of items) {
        const object = await db.get('SELECT object_payload FROM teaching_objects WHERE object_key = ?', [item.object_key]);
        item.question = parseJson(object?.object_payload, {})?.mcqs?.[item.question_index] || null;
    }
    const counts = await db.all('SELECT cohort,status,COUNT(*) AS count FROM question_work_queue GROUP BY cohort,status ORDER BY cohort,status', []);
    return { items, counts };
}

module.exports = { listQuestionReviewQueue, reviewQuestionAssignment, listGuidelineReviewQueue, reviewGuidelineAssignment, listQuestionWorkQueue, REVIEW_STATES };
