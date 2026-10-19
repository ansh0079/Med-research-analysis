'use strict';

const DRAFT = 'draft_pending_clinician_review';
const NEEDS_EVIDENCE = 'needs_evidence';
const DECISIONS = ['approved', 'needs_changes', 'rejected'];
const DECISION_STATUS = { approved: 'approved', needs_changes: 'needs_changes', rejected: 'rejected' };

const parse = (value, fallback) => {
    try { return typeof value === 'string' ? JSON.parse(value) : (value ?? fallback); } catch { return fallback; }
};

/**
 * Insert or refresh drafts. A row a reviewer has already decided on is never overwritten.
 * @returns {{inserted:number, updated:number, skippedReviewed:number}}
 */
async function upsertDrafts(db, drafts, { sourceBatch = null, now = new Date().toISOString() } = {}) {
    const out = { inserted: 0, updated: 0, skippedReviewed: 0 };
    for (const d of drafts) {
        const topicId = String(d.topicId || '').trim();
        if (!topicId || !d.page) continue;
        const status = d.status === NEEDS_EVIDENCE ? NEEDS_EVIDENCE : DRAFT;
        const row = await db.get('SELECT topic_id, review_decision FROM topic_mentor_drafts WHERE topic_id = ?', [topicId]);
        if (row && row.review_decision) { out.skippedReviewed++; continue; }
        const page = JSON.stringify(d.page);
        const evidence = JSON.stringify(d.dbEvidence || {});
        if (row) {
            await db.run(
                'UPDATE topic_mentor_drafts SET topic = ?, cluster = ?, status = ?, page_json = ?, evidence_json = ?, source_batch = ?, updated_at = ? WHERE topic_id = ?',
                [d.topic, d.cluster || null, status, page, evidence, sourceBatch, now, topicId],
            );
            out.updated++;
        } else {
            await db.run(
                `INSERT INTO topic_mentor_drafts (topic_id, topic, cluster, status, page_json, evidence_json, source_batch, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [topicId, d.topic, d.cluster || null, status, page, evidence, sourceBatch, now, now],
            );
            out.inserted++;
        }
    }
    return out;
}

function mapRow(row, { full = false } = {}) {
    if (!row) return null;
    const page = parse(row.page_json, {});
    const base = {
        id: row.id,
        topicId: row.topic_id,
        topic: row.topic,
        cluster: row.cluster,
        status: row.status,
        sourceBatch: row.source_batch,
        teachingPoints: (page.teaching_points || []).length,
        sourceCount: (page.sources || []).length,
        reviewDecision: row.review_decision,
        reviewerNotes: row.reviewer_notes,
        reviewedBy: row.reviewed_by,
        reviewedAt: row.reviewed_at,
    };
    if (!full) return base;
    return { ...base, page, evidence: parse(row.evidence_json, {}) };
}

async function listDrafts(db, { status = '', search = '', limit = 50, offset = 0 } = {}) {
    const where = [];
    const params = [];
    if (status) { where.push('status = ?'); params.push(status); }
    if (search) { where.push('LOWER(topic) LIKE ?'); params.push(`%${String(search).toLowerCase()}%`); }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await db.all(
        `SELECT * FROM topic_mentor_drafts ${clause} ORDER BY topic ASC LIMIT ? OFFSET ?`,
        [...params, limit, offset],
    );
    const counts = await db.all('SELECT status, COUNT(*) AS n FROM topic_mentor_drafts GROUP BY status');
    return { items: rows.map((r) => mapRow(r)), counts: Object.fromEntries(counts.map((c) => [c.status, Number(c.n)])) };
}

async function getDraft(db, topicId) {
    const row = await db.get('SELECT * FROM topic_mentor_drafts WHERE topic_id = ?', [String(topicId)]);
    return mapRow(row, { full: true });
}

/** Record a reviewer decision. Approval does not publish the page; that is a separate step. */
async function reviewDraft(db, { topicId, decision, notes = '', userId = null, now = new Date().toISOString() }) {
    if (!DECISIONS.includes(decision)) throw new Error(`Invalid decision: ${decision}`);
    const row = await db.get('SELECT topic_id, status FROM topic_mentor_drafts WHERE topic_id = ?', [String(topicId)]);
    if (!row) throw new Error('Draft not found');
    if (decision === 'approved' && row.status === NEEDS_EVIDENCE) throw new Error('Invalid decision: a draft without evidence cannot be approved');
    await db.run(
        'UPDATE topic_mentor_drafts SET status = ?, review_decision = ?, reviewer_notes = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE topic_id = ?',
        [DECISION_STATUS[decision], decision, String(notes || '').slice(0, 4000), userId == null ? null : String(userId), now, now, String(topicId)],
    );
    return getDraft(db, topicId);
}

module.exports = { upsertDrafts, listDrafts, getDraft, reviewDraft, DRAFT, NEEDS_EVIDENCE, DECISIONS };
