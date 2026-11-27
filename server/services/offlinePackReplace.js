'use strict';

/**
 * Safe replacement of existing mentor drafts and evidence-locked MCQ drafts by an offline-built pack.
 *
 *  - Every row that is changed is first copied into offline_pack_replacements (durable, in the database),
 *    so a replacement can always be undone with rollbackBatch().
 *  - A draft a clinician has decided on (review_decision) or a draft marked published is never replaced
 *    unless the caller says so explicitly.
 *  - The old MCQ drafts of the topic are retired (review_state 'needs_changes', note records the batch),
 *    never deleted, and only once the new batch has stored enough verified questions. The live topic MCQ
 *    object is then rebuilt from what is left, so learners stop seeing both generations.
 */

const crypto = require('crypto');

const normalizeTopic = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
const parse = (value, fallback) => {
    try { return typeof value === 'string' ? JSON.parse(value) : (value ?? fallback); } catch { return fallback; }
};

async function ensureReplacementTable(db) {
    await db.run(`CREATE TABLE IF NOT EXISTS offline_pack_replacements (
        id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL,
        topic_id TEXT NOT NULL,
        topic TEXT,
        replaced_at TEXT NOT NULL,
        mentor_drafts_json TEXT,
        mcq_drafts_json TEXT,
        retired_mcq_ids TEXT,
        rolled_back_at TEXT
    )`);
    await db.run('CREATE INDEX IF NOT EXISTS idx_offline_pack_replacements_batch ON offline_pack_replacements(batch_id, topic_id)');
}

/** All mentor drafts for a topic, matched by topic id or by name (drafts keyed to a stale id are still found). */
async function findMentorDrafts(db, topicId, topicName) {
    return db.all(
        'SELECT * FROM topic_mentor_drafts WHERE topic_id = ? OR lower(topic) = lower(?)',
        [String(topicId), String(topicName || '')],
    );
}

async function findMcqDrafts(db, topicId, topicName) {
    return db.all(
        'SELECT * FROM evidence_locked_mcq_drafts WHERE curriculum_topic_id = ? OR normalized_topic = ?',
        [String(topicId), normalizeTopic(topicName)],
    );
}

/**
 * Decide whether the existing drafts of a topic may be replaced.
 * @returns {{ok:boolean, reason?:string}}
 */
function replaceGuard(mentorRows, { allowPublished = false, allowReviewed = false } = {}) {
    for (const r of mentorRows) {
        if (r.review_decision && !allowReviewed) return { ok: false, reason: `draft already reviewed (${r.review_decision}); use --replace-reviewed` };
        if (r.status === 'published' && !allowPublished) return { ok: false, reason: 'draft is marked published; use --replace-published' };
    }
    return { ok: true };
}

async function backupTopic(db, { batchId, topicId, topic, mentorRows, mcqRows, now }) {
    const id = crypto.randomUUID();
    await db.run(
        `INSERT INTO offline_pack_replacements (id, batch_id, topic_id, topic, replaced_at, mentor_drafts_json, mcq_drafts_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, batchId, String(topicId), topic, now, JSON.stringify(mentorRows), JSON.stringify(mcqRows)],
    );
    return id;
}

/**
 * Retire the topic's earlier MCQ drafts (those not from the new batch). Approved drafts are kept unless asked.
 * @returns {number[]} ids retired
 */
async function retireOldMcqDrafts(db, { mcqRows, keepBatchId, now, retireApproved = false }) {
    const retired = [];
    for (const r of mcqRows) {
        if (r.batch_id === keepBatchId) continue;
        if (r.review_state === 'approved' && !retireApproved) continue;
        if (r.review_state === 'needs_changes' && /superseded/i.test(r.reviewer_notes || '')) continue;
        await db.run(
            `UPDATE evidence_locked_mcq_drafts
             SET review_state = 'needs_changes', reviewer_notes = ?, promoted_at = NULL, promoted_object_key = NULL, updated_at = ?
             WHERE id = ?`,
            [`Superseded by offline pack ${keepBatchId} on ${String(now).slice(0, 10)}`, now, r.id],
        );
        retired.push(r.id);
    }
    return retired;
}

async function setRetiredIds(db, replacementId, ids) {
    await db.run('UPDATE offline_pack_replacements SET retired_mcq_ids = ? WHERE id = ?', [JSON.stringify(ids), replacementId]);
}

/**
 * Undo a batch (optionally one topic): restore mentor draft rows and the earlier MCQ drafts exactly as they
 * were, send the batch's own MCQ drafts back (needs_changes), and rebuild the live MCQ object.
 */
async function rollbackBatch(db, { batchId, topicId = null, apply = false, now = new Date().toISOString(), promote = null }) {
    if (apply) await ensureReplacementTable(db);
    // A dry run must not create anything: if the table does not exist yet there is nothing to roll back.
    const rows = await db.all(
        `SELECT * FROM offline_pack_replacements WHERE batch_id = ? AND rolled_back_at IS NULL ${topicId ? 'AND topic_id = ?' : ''} ORDER BY replaced_at`,
        topicId ? [batchId, String(topicId)] : [batchId],
    ).catch(() => []);
    const out = { batchId, topics: [] };
    for (const rep of rows) {
        const mentor = parse(rep.mentor_drafts_json, []);
        const mcqs = parse(rep.mcq_drafts_json, []);
        const entry = { topic: rep.topic, topicId: rep.topic_id, mentorRestored: mentor.length, mcqRestored: mcqs.length };
        if (apply) {
            for (const m of mentor) {
                await db.run(
                    `UPDATE topic_mentor_drafts SET topic = ?, cluster = ?, status = ?, page_json = ?, evidence_json = ?, source_batch = ?,
                        review_decision = ?, reviewer_notes = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
                     WHERE topic_id = ?`,
                    [m.topic, m.cluster ?? null, m.status, m.page_json, m.evidence_json, m.source_batch ?? null,
                        m.review_decision ?? null, m.reviewer_notes ?? null, m.reviewed_by ?? null, m.reviewed_at ?? null, now, m.topic_id],
                );
            }
            for (const q of mcqs) {
                await db.run(
                    'UPDATE evidence_locked_mcq_drafts SET review_state = ?, reviewer_notes = ?, promoted_at = NULL, promoted_object_key = NULL, updated_at = ? WHERE id = ?',
                    [q.review_state, q.reviewer_notes ?? null, now, q.id],
                );
            }
            const mine = await db.all(
                'SELECT id FROM evidence_locked_mcq_drafts WHERE batch_id = ? AND (curriculum_topic_id = ? OR normalized_topic = ?)',
                [batchId, String(rep.topic_id), normalizeTopic(rep.topic)],
            );
            for (const q of mine) {
                await db.run(
                    `UPDATE evidence_locked_mcq_drafts SET review_state = 'needs_changes', reviewer_notes = ?, promoted_at = NULL,
                        promoted_object_key = NULL, updated_at = ? WHERE id = ?`,
                    [`Rolled back with offline pack ${batchId} on ${String(now).slice(0, 10)}`, now, q.id],
                );
            }
            entry.packMcqsSentBack = mine.length;
            if (typeof promote === 'function') entry.promotion = await promote({ normalizedTopic: normalizeTopic(rep.topic), now });
            await db.run('UPDATE offline_pack_replacements SET rolled_back_at = ? WHERE id = ?', [now, rep.id]);
        }
        out.topics.push(entry);
    }
    out.apply = apply;
    return out;
}

module.exports = {
    normalizeTopic, ensureReplacementTable, findMentorDrafts, findMcqDrafts, replaceGuard, backupTopic,
    retireOldMcqDrafts, setRetiredIds, rollbackBatch,
};
