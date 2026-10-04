'use strict';

const { questionHash } = require('./questionIndex/questionIndexService');

/**
 * Load the set of withdrawn overrides for fast filtering.
 * Returns { byHash: Set<string>, byId: Set<string>, byObjectIndex: Set<'object_key#index'> }.
 */
async function loadWithdrawnOverrides(db) {
    try {
        const rows = await db.all(
            `SELECT question_id, question_hash, object_key, question_index
             FROM mcq_review_overrides
             WHERE action = 'withdraw'`
        );
        const byHash = new Set();
        const byId = new Set();
        const byObjectIndex = new Set();
        for (const r of rows || []) {
            if (r?.question_hash) byHash.add(String(r.question_hash));
            if (r?.question_id) byId.add(String(r.question_id));
            if (r?.object_key != null && Number.isInteger(r?.question_index)) {
                byObjectIndex.add(`${r.object_key}#${r.question_index}`);
            }
        }
        return { byHash, byId, byObjectIndex };
    } catch {
        return { byHash: new Set(), byId: new Set(), byObjectIndex: new Set() };
    }
}

/**
 * Whether a stored MCQ object (the element from object_payload.mcqs[]) is withdrawn
 * by override. Hash-based to remain robust even if ids were missing in older rows.
 */
function isWithdrawnQuestion(question, withdrawn) {
    if (!question || !withdrawn) return false;
    try {
        const h = questionHash(question);
        return h && withdrawn.byHash.has(h);
    } catch {
        return false;
    }
}

module.exports = {
    loadWithdrawnOverrides,
    isWithdrawnQuestion,
};

