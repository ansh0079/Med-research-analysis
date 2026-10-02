'use strict';

const crypto = require('crypto');
const { getPromptVersion } = require('../../prompts/promptVersions');
const { canonicalQueryForCache } = require('../../utils/topicKey');

function sharedEvidenceSet(topic, articles = [], promptVersion = null, limit = null) {
    const pv = promptVersion || getPromptVersion('synthesis');
    let uids = (articles || []).map((a) => String(a?.uid || '').trim()).filter(Boolean).sort();
    if (limit) uids = uids.slice(0, limit);
    return { topic: canonicalQueryForCache(topic), uids, pv };
}

function stableHash(value) {
    return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function normalizePersonalization({
    userId = null,
    trainingStage = null,
    previousQueries = [],
    sessionDepth = 0,
} = {}) {
    return {
        userId: userId || null,
        trainingStage: trainingStage || null,
        previousQueries: Array.isArray(previousQueries)
            ? previousQueries.map(String).filter(Boolean).slice(-5)
            : [],
        sessionDepth: Number.isFinite(Number(sessionDepth)) ? Number(sessionDepth) : 0,
    };
}

function buildSynthesisCacheKey(topic, articles = [], promptVersion = null) {
    const shared = sharedEvidenceSet(topic, articles, promptVersion);
    const digest = stableHash(shared).slice(0, 40);
    return `synthesis:${digest}:pv:${shared.pv}`;
}

function buildFullSynthesisJobKey(topic, articles = []) {
    // pv for the same reason buildSynthesisCacheKey above carries it: without it
    // a prompt edit invalidates the cache but not the durable ai_generation_jobs
    // row, and the stored row is what getOrEnqueueFullSynthesis returns first.
    // Who asked, and how far into a session they are, stays off this key.
    const shared = sharedEvidenceSet(topic, articles, null, 20);
    return `synth:${stableHash(shared).slice(0, 40)}:pv:${shared.pv}`;
}

function buildEnrichmentCacheKey(query, articles = [], personalization = {}) {
    const p = normalizePersonalization(personalization);
    return crypto
        .createHash('sha256')
        .update(JSON.stringify({
            q: String(query || ''),
            uids: (articles || []).slice(0, 8).map((a) => a.uid).filter(Boolean).sort(),
            ...p,
        }))
        .digest('hex')
        .slice(0, 32);
}

module.exports = {
    stableHash,
    normalizePersonalization,
    buildSynthesisCacheKey,
    buildFullSynthesisJobKey,
    buildEnrichmentCacheKey,
};
