'use strict';

/**
 * Per-search evidence snapshot so synopsis, MCQs and cases can replay the
 * exact eligible set (Plan 2 §14.2). Not a clinical writer: audit/eval only.
 */

const crypto = require('crypto');

function snapshotEnabled(env = process.env) {
    return String(env.SEARCH_EVIDENCE_SNAPSHOTS || 'on').toLowerCase() !== 'off';
}

function articleUid(article) {
    return String(article?.uid || article?.pmid || '').trim();
}

async function persistSearchEvidenceSnapshot(db, {
    query,
    queryRepresentation = {},
    articles = [],
    userId = null,
    sessionId = null,
} = {}) {
    if (!snapshotEnabled() || !db || typeof db.run !== 'function') return null;
    const uids = (Array.isArray(articles) ? articles : []).map(articleUid).filter(Boolean).slice(0, 40);
    const routes = {};
    for (const article of Array.isArray(articles) ? articles : []) {
        const uid = articleUid(article);
        if (!uid) continue;
        routes[uid] = {
            route: article._eligibilityRoute || null,
            lane: article._evidenceLane || null,
            evidenceRank: article._evidenceRank || null,
        };
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    try {
        await db.run(
            `INSERT INTO search_evidence_snapshots
                (id, query_text, query_representation, article_uids, eligibility_routes,
                 user_id, session_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                String(query || '').slice(0, 500),
                JSON.stringify(queryRepresentation || {}),
                JSON.stringify(uids),
                JSON.stringify(routes),
                userId ? String(userId) : null,
                sessionId ? String(sessionId) : null,
                now,
            ]
        );
        return { id, articleCount: uids.length };
    } catch {
        return null;
    }
}

module.exports = {
    snapshotEnabled,
    persistSearchEvidenceSnapshot,
};
