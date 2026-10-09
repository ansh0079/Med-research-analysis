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
const { loadWithdrawnOverrides } = require('../mcqReviewOverrideService');

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
    // Clinical audit (migration 111): questions both AI reviewers flagged as serious, or a clinician retired,
    // are held out until a clinician has decided.
    const { loadAuditHolds } = require('../questionAudit/questionAuditService');
    for (const hash of await loadAuditHolds(db, unique)) {
        out.set(hash, { ...(out.get(hash) || { category: 'unclear' }), auditHold: true });
    }
    return out;
}

/**
 * Whether a question filed under a topic in `clusterId` should still be served there.
 * Indexed as belonging to another subject, or to none: no. Anything else: yes.
 */
function belongsHere(assignment, clusterId) {
    if (!assignment) return true;
    if (assignment.auditHold) return false;
    if (assignment.reviewState === 'retired') return false;
    if (assignment.category === 'unassignable') return false;
    if (assignment.category === 'aligned') return !clusterId || !assignment.clusterId || assignment.clusterId === clusterId;
    return true;
}

/** The aligned questions the index places on this topic's cluster, as { question, objectType, objectKey }. */
async function loadAlignedForCluster(db, clusterId, { limit = 60 } = {}) {
    if (!clusterId) return [];
    try {
        const withdrawn = await loadWithdrawnOverrides(db);
        const rows = await db.all(
            `SELECT * FROM question_topic_index
             WHERE assigned_cluster_id = ? AND category = 'aligned' LIMIT ?`,
            [clusterId, limit],
        );
        const byObject = new Map();
        for (const r of rows) {
            if (r.review_state === 'retired') continue;
            if (!byObject.has(r.object_key)) byObject.set(r.object_key, []);
            byObject.get(r.object_key).push(r);
        }
        const out = [];
        const candidateHashes = [];
        const candidates = [];
        for (const [objectKey, wanted] of byObject) {
            const object = await db.get("SELECT object_payload, review_state FROM teaching_objects WHERE object_key = ?", [objectKey]);
            if (!object || object.review_state === 'withdrawn') continue;
            let mcqs;
            try { mcqs = JSON.parse(object.object_payload || '{}').mcqs; } catch { continue; }
            if (!Array.isArray(mcqs)) continue;
            for (const r of wanted) {
                const q = mcqs[r.question_index];
                if (q?.question && questionHash(q)) {
                    // Object-index based block list (survives hash changes)
                    if (withdrawn.byObjectIndex.has(`${objectKey}#${r.question_index}`)) continue;
                    // Hide per-question withdrawals applied by the review workflow.
                    try {
                        const h = questionHash(q);
                        if (withdrawn.byHash.has(h)) continue;
                    } catch { /* ignore */ }
                    // Do not present a paper-only match as guideline-derived merely because the old batch was named guideline_mcq.
                    const objectType = r.evidence_support === 'paper' ? 'paper_mcq' : r.object_type;
                    const hash = questionHash(q);
                    candidateHashes.push(hash);
                    candidates.push({ question: q, objectType, objectKey, hash });
                }
            }
        }
        const { loadAuditHolds } = require('../questionAudit/questionAuditService');
        const held = await loadAuditHolds(db, candidateHashes);
        for (const candidate of candidates) {
            if (!held.has(candidate.hash)) out.push({ question: candidate.question, objectType: candidate.objectType, objectKey: candidate.objectKey });
        }
        return out;
    } catch {
        return [];
    }
}

/**
 * Unclear questions with a real second topic are listed under both.
 * The assigned cluster and the runner-up's cluster each receive the question.
 * Aligned questions stay on the one topic they already cleared.
 */
async function loadAlsoApplicableForCluster(db, clusterId, { limit = 40 } = {}) {
    if (!clusterId) return [];
    try {
        const withdrawn = await loadWithdrawnOverrides(db);
        const rows = await db.all(
            `SELECT q.*
             FROM question_topic_index q
             LEFT JOIN topic_cluster_index rc ON rc.curriculum_topic_id = q.runner_up_curriculum_topic_id
             WHERE q.category = 'unclear'
               AND q.runner_up_curriculum_topic_id IS NOT NULL
               AND TRIM(q.runner_up_curriculum_topic_id) != ''
               AND (q.assigned_cluster_id = ? OR rc.cluster_id = ?)
             LIMIT ?`,
            [clusterId, clusterId, limit],
        );
        const names = new Map();
        const ids = [...new Set(rows.map((r) => r.runner_up_curriculum_topic_id).filter(Boolean))];
        if (ids.length) {
            try {
                const named = await db.all(
                    `SELECT CAST(id AS TEXT) AS id, display_name FROM curriculum_topics WHERE CAST(id AS TEXT) IN (${ids.map(() => '?').join(',')})`,
                    ids,
                );
                for (const n of named) names.set(String(n.id), n.display_name);
            } catch { /* topic names are optional; the question still lists under both clusters */ }
        }
        const byObject = new Map();
        for (const r of rows) {
            if (r.review_state === 'retired') continue;
            if (!byObject.has(r.object_key)) byObject.set(r.object_key, []);
            byObject.get(r.object_key).push(r);
        }
        const out = [];
        const candidateHashes = [];
        const candidates = [];
        for (const [objectKey, wanted] of byObject) {
            const object = await db.get("SELECT object_payload, review_state FROM teaching_objects WHERE object_key = ?", [objectKey]);
            if (!object || object.review_state === 'withdrawn') continue;
            let mcqs;
            try { mcqs = JSON.parse(object.object_payload || '{}').mcqs; } catch { continue; }
            if (!Array.isArray(mcqs)) continue;
            for (const r of wanted) {
                const q = mcqs[r.question_index];
                if (!q?.question) continue;
                if (withdrawn.byObjectIndex.has(`${objectKey}#${r.question_index}`)) continue;
                let hash;
                try { hash = questionHash(q); } catch { continue; }
                if (!hash || withdrawn.byHash.has(hash)) continue;
                const runnerName = names.get(String(r.runner_up_curriculum_topic_id)) || null;
                const applicableTopics = [r.assigned_topic_name, runnerName].filter(Boolean);
                candidateHashes.push(hash);
                candidates.push({
                    question: q,
                    objectType: r.evidence_support === 'paper' ? 'paper_mcq' : r.object_type,
                    objectKey,
                    hash,
                    applicableTopics,
                });
            }
        }
        const { loadAuditHolds } = require('../questionAudit/questionAuditService');
        const held = await loadAuditHolds(db, candidateHashes);
        for (const candidate of candidates) {
            if (!held.has(candidate.hash)) {
                out.push({
                    question: candidate.question,
                    objectType: candidate.objectType,
                    objectKey: candidate.objectKey,
                    applicableTopics: candidate.applicableTopics,
                });
            }
        }
        return out;
    } catch {
        return [];
    }
}

module.exports = {
    servingEnabled,
    getTopicClusterId,
    loadAssignments,
    belongsHere,
    loadAlignedForCluster,
    loadAlsoApplicableForCluster,
    questionHash,
};
