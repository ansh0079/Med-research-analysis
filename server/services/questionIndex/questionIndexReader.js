'use strict';

// How the quiz reads the question-to-topic index (migration 109). The stored questions are never moved;
// the index says where each one belongs, and readers apply it:
//   - a topic's quiz drops questions the index places on a different subject, and gains the aligned
//     questions the index places on this one, wherever they were filed;
//   - questions that are not recognisably about any topic are held out;
//   - unclear and unindexed questions are left exactly where they were.
//
// Off unless QUESTION_INDEX_SERVING=on, and every function degrades to "no change" when the index is
// empty or unreadable, so serving can never fail because of it.

const { questionHash } = require('./questionIndexService');

const CHUNK = 400;

function servingEnabled(env = process.env) {
    return String(env.QUESTION_INDEX_SERVING || '').toLowerCase() === 'on';
}

function chunks(list, size = CHUNK) {
    const out = [];
    for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
    return out;
}

/** The cluster of near-duplicate topics this topic belongs to, or null when it was not indexed. */
async function getTopicClusterId(db, curriculumTopicId) {
    if (curriculumTopicId == null) return null;
    try {
        const row = await db.get('SELECT cluster_id FROM topic_cluster_index WHERE curriculum_topic_id = ?', [String(curriculumTopicId)]);
        return row?.cluster_id || null;
    } catch {
        return null;
    }
}

/** hash -> { category, clusterId, topicId, topicName } for the questions that have been indexed. */
async function loadAssignments(db, hashes) {
    const out = new Map();
    const unique = [...new Set(hashes.filter(Boolean))];
    try {
        for (const part of chunks(unique)) {
            const rows = await db.all(
                `SELECT *
                 FROM question_topic_index WHERE question_hash IN (${part.map(() => '?').join(',')})`,
                part,
            );
            for (const row of rows) {
                // The same wording in two batches has one assignment; keep an aligned one if either is.
                const existing = out.get(row.question_hash);
                if (existing && existing.category === 'aligned' && row.category !== 'aligned') continue;
                out.set(row.question_hash, {
                    category: row.category,
                    reviewState: row.review_state,
                    evidenceSupport: row.evidence_support,
                    clusterId: row.assigned_cluster_id,
                    topicId: row.assigned_curriculum_topic_id,
                    topicName: row.assigned_topic_name,
                });
            }
        }
    } catch {
        return new Map();
    }
    return out;
}

/**
 * Whether a question filed under a topic in `clusterId` should still be served there.
 * Indexed as belonging to another subject, or to none: no. Anything else: yes.
 */
function belongsHere(assignment, clusterId) {
    if (!assignment) return true;
    if (assignment.reviewState === 'retired') return false;
    if (assignment.category === 'unassignable') return false;
    if (assignment.category === 'aligned') return !clusterId || !assignment.clusterId || assignment.clusterId === clusterId;
    return true;
}

/** The aligned questions the index places on this topic's cluster, as { question, objectType, objectKey }. */
async function loadAlignedForCluster(db, clusterId, { limit = 60 } = {}) {
    if (!clusterId) return [];
    try {
        const rows = await db.all(
            `SELECT * FROM question_topic_index
             WHERE (
                (assigned_cluster_id = ? AND category = 'aligned')
                OR
                (category = 'dual_linked' AND (assigned_cluster_id = ? OR secondary_cluster_id = ?))
             )
             LIMIT ?`,
            [clusterId, clusterId, clusterId, limit],
        );
        const byObject = new Map();
        for (const r of rows) {
            if (r.review_state === 'retired') continue;
            if (!byObject.has(r.object_key)) byObject.set(r.object_key, []);
            byObject.get(r.object_key).push(r);
        }
        const out = [];
        for (const [objectKey, wanted] of byObject) {
            const object = await db.get("SELECT object_payload, review_state FROM teaching_objects WHERE object_key = ?", [objectKey]);
            if (!object || object.review_state === 'withdrawn') continue;
            let mcqs;
            try { mcqs = JSON.parse(object.object_payload || '{}').mcqs; } catch { continue; }
            if (!Array.isArray(mcqs)) continue;
            for (const r of wanted) {
                const q = mcqs[r.question_index];
                if (q?.question && questionHash(q)) {
                    // Do not present a paper-only match as guideline-derived merely because the old batch was named guideline_mcq.
                    const objectType = r.evidence_support === 'paper' ? 'paper_mcq' : r.object_type;
                    out.push({ question: q, objectType, objectKey });
                }
            }
        }
        return out;
    } catch {
        return [];
    }
}

/** Only the dual-linked questions for this cluster, as { question, objectType, objectKey }. */
async function loadDualLinkedForCluster(db, clusterId, { limit = 120 } = {}) {
    if (!clusterId) return [];
    try {
        const rows = await db.all(
            `SELECT * FROM question_topic_index
             WHERE category = 'dual_linked' AND (assigned_cluster_id = ? OR secondary_cluster_id = ?)
             LIMIT ?`,
            [clusterId, clusterId, limit],
        );
        const byObject = new Map();
        for (const r of rows) {
            if (r.review_state === 'retired') continue;
            if (!byObject.has(r.object_key)) byObject.set(r.object_key, []);
            byObject.get(r.object_key).push(r);
        }
        const out = [];
        for (const [objectKey, wanted] of byObject) {
            const object = await db.get("SELECT object_payload, review_state FROM teaching_objects WHERE object_key = ?", [objectKey]);
            if (!object || object.review_state === 'withdrawn') continue;
            let mcqs;
            try { mcqs = JSON.parse(object.object_payload || '{}').mcqs; } catch { continue; }
            if (!Array.isArray(mcqs)) continue;
            for (const r of wanted) {
                const q = mcqs[r.question_index];
                if (q?.question && questionHash(q)) {
                    const objectType = r.evidence_support === 'paper' ? 'paper_mcq' : r.object_type;
                    out.push({ question: q, objectType, objectKey });
                }
            }
        }
        return out;
    } catch {
        return [];
    }
}

module.exports = { servingEnabled, getTopicClusterId, loadAssignments, belongsHere, loadAlignedForCluster, loadDualLinkedForCluster, questionHash };
