'use strict';

const crypto = require('crypto');
const { getPromptVersion } = require('../../prompts/promptVersions');

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

function buildSynthesisCacheKey(topic, articles = [], promptVersion = null, personalization = {}) {
    const pv = promptVersion || getPromptVersion('synthesis');
    const p = normalizePersonalization(personalization);
    const uids = (articles || []).map((a) => String(a.uid || '').trim()).filter(Boolean).sort();
    const digest = stableHash({
        topic: String(topic || ''),
        uids,
        pv,
        userId: p.userId,
        trainingStage: p.trainingStage,
        previousQueries: p.previousQueries,
        sessionDepth: p.sessionDepth,
    }).slice(0, 40);
    return `synthesis:${digest}:pv:${pv}`;
}

function buildFullSynthesisJobKey(topic, articles = [], personalization = {}) {
    const p = normalizePersonalization(personalization);
    const uids = [...articles].map((a) => a.uid).filter(Boolean).slice(0, 15).sort();
    // pv for the same reason buildSynthesisCacheKey above carries it: without it
    // a prompt edit invalidates the cache but not the durable ai_generation_jobs
    // row, and the stored row is what getOrEnqueueFullSynthesis returns first.
    const pv = getPromptVersion('synthesis');
    return `synth:${stableHash({ topic: String(topic || ''), uids, ...p, pv }).slice(0, 40)}:pv:${pv}`;
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
