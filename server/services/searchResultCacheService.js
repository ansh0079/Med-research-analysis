'use strict';

const crypto = require('crypto');
const { canonicalQueryForCache } = require('../utils/topicKey');

// Source calls are already cached for 30 minutes. Keep the fully ranked,
// actor-specific response long enough to avoid repeating ranking and enrichment
// during a normal study session while preserving a shorter freshness window.
const DEFAULT_SEARCH_RESULT_TTL_SECONDS = Number(process.env.SEARCH_RESULT_CACHE_TTL_SECONDS || 900) || 900;
const pending = new Map();

async function shareSearchComputation(key, compute) {
    if (!pending.has(key)) {
        const task = Promise.resolve().then(compute);
        pending.set(key, task);
        task.finally(() => pending.delete(key)).catch(() => {});
    }
    // Callers annotate results later; never share mutable response objects.
    return structuredClone(await pending.get(key));
}

function stableHash(value) {
    return crypto.createHash('sha1').update(JSON.stringify(value)).digest('hex').slice(0, 24);
}

function normalizeArray(value) {
    return (Array.isArray(value) ? value : [])
        .map((item) => String(item || '').trim())
        .filter(Boolean);
}

function buildSearchResultCacheKey({
    query,
    sourceList = [],
    safeLimit,
    specificity = 'moderate',
    vectorEnabled = false,
    userId = null,
    sessionId = null,
    previousQueries = [],
    parsedStudyTypes = [],
    parsedYearFilters = [],
    queryIntentProfile = null,
} = {}) {
    return `search:result:${stableHash({
        query: String(query || '').trim().toLowerCase(),
        sourceList: normalizeArray(sourceList),
        safeLimit: Number(safeLimit) || 20,
        specificity,
        vectorEnabled: Boolean(vectorEnabled),
        actor: userId ? `user:${userId}` : `session:${sessionId || 'anon'}`,
        rankerMode: process.env.SEARCH_SHADOW_RANKER_MODE || 'shadow',
        version: 2,
        previousQueries: normalizeArray(previousQueries).slice(-5),
        parsedStudyTypes: normalizeArray(parsedStudyTypes),
        parsedYearFilters: normalizeArray(parsedYearFilters),
        intent: queryIntentProfile?.primaryIntent || null,
        bouquetIntent: queryIntentProfile?.bouquetIntent || null,
        facets: normalizeArray(queryIntentProfile?.facets),
    })}`;
}

// The shared stage (fetch, filter, bouquet + model rerank) does not depend on who
// searched, so it is keyed without user, session or trajectory and reused across
// everyone. Evidence for a query moves on the scale of days, not minutes.
const SHARED_SEARCH_RESULT_TTL_SECONDS = Number(process.env.SEARCH_SHARED_CACHE_TTL_SECONDS || 6 * 3600) || 6 * 3600;

function buildSharedSearchCacheKey({
    query,
    sourceList = [],
    safeLimit,
    specificity = 'moderate',
    vectorEnabled = false,
    parsedStudyTypes = [],
    parsedYearFilters = [],
    queryIntentProfile = null,
} = {}) {
    return `search:shared:${stableHash({
        query: canonicalQueryForCache(query),
        sourceList: normalizeArray(sourceList).sort(),
        safeLimit: Number(safeLimit) || 20,
        specificity,
        vectorEnabled: Boolean(vectorEnabled),
        rankerMode: process.env.SEARCH_SHADOW_RANKER_MODE || 'shadow',
        version: 2,
        parsedStudyTypes: normalizeArray(parsedStudyTypes).sort(),
        parsedYearFilters: normalizeArray(parsedYearFilters).sort(),
        intent: queryIntentProfile?.primaryIntent || null,
        bouquetIntent: queryIntentProfile?.bouquetIntent || null,
        facets: normalizeArray(queryIntentProfile?.facets).sort(),
    })}`;
}

async function getCachedSearchResult(cache, key) {
    if (!cache || !key) return null;
    const getter = typeof cache.getAsync === 'function' ? cache.getAsync.bind(cache)
        : typeof cache.get === 'function' ? cache.get.bind(cache)
            : null;
    if (!getter) return null;
    return Promise.resolve().then(() => getter(key)).then((value) => value ? structuredClone(value) : null).catch(() => null);
}

async function setCachedSearchResult(cache, key, value, ttlSeconds = DEFAULT_SEARCH_RESULT_TTL_SECONDS) {
    if (!cache || !key || !value) return false;
    const setter = typeof cache.setAsync === 'function' ? cache.setAsync.bind(cache)
        : typeof cache.set === 'function' ? cache.set.bind(cache)
            : null;
    if (!setter) return false;
    try {
        await setter(key, structuredClone(value), ttlSeconds);
        return true;
    } catch {
        return false;
    }
}

module.exports = {
    shareSearchComputation,
    DEFAULT_SEARCH_RESULT_TTL_SECONDS,
    SHARED_SEARCH_RESULT_TTL_SECONDS,
    buildSearchResultCacheKey,
    buildSharedSearchCacheKey,
    getCachedSearchResult,
    setCachedSearchResult,
};
