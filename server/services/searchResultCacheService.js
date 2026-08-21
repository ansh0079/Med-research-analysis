'use strict';

const crypto = require('crypto');

const DEFAULT_SEARCH_RESULT_TTL_SECONDS = Number(process.env.SEARCH_RESULT_CACHE_TTL_SECONDS || 120) || 120;

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
        actor: userId ? `user:${userId}` : 'anon',
        previousQueries: normalizeArray(previousQueries).slice(-5),
        parsedStudyTypes: normalizeArray(parsedStudyTypes),
        parsedYearFilters: normalizeArray(parsedYearFilters),
        intent: queryIntentProfile?.primaryIntent || null,
        bouquetIntent: queryIntentProfile?.bouquetIntent || null,
        facets: normalizeArray(queryIntentProfile?.facets),
    })}`;
}

async function getCachedSearchResult(cache, key) {
    if (!cache || !key) return null;
    const getter = typeof cache.getAsync === 'function' ? cache.getAsync.bind(cache)
        : typeof cache.get === 'function' ? cache.get.bind(cache)
            : null;
    if (!getter) return null;
    return Promise.resolve(getter(key)).catch(() => null);
}

async function setCachedSearchResult(cache, key, value, ttlSeconds = DEFAULT_SEARCH_RESULT_TTL_SECONDS) {
    if (!cache || !key || !value) return false;
    const setter = typeof cache.setAsync === 'function' ? cache.setAsync.bind(cache)
        : typeof cache.set === 'function' ? cache.set.bind(cache)
            : null;
    if (!setter) return false;
    await Promise.resolve(setter(key, value, ttlSeconds)).catch(() => null);
    return true;
}

module.exports = {
    DEFAULT_SEARCH_RESULT_TTL_SECONDS,
    buildSearchResultCacheKey,
    getCachedSearchResult,
    setCachedSearchResult,
};
