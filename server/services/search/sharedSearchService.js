'use strict';

// The user-independent half of a search, packaged so the HTTP route and the
// nightly pre-warm job build the same cache key and run the same pipeline. If
// the two derived their inputs separately, a warmed entry would silently never
// match a real search.

const { validateQuery } = require('../../utils/articles');
const { fetchSharedSearchEvidence } = require('./searchPipeline');
const { searchLocalArticleCache } = require('../localRetrievalService');
const { deriveSearchIntentProfile, routeSearchSources } = require('../searchQueryIntentService');
const {
    buildSharedSearchCacheKey,
    SHARED_SEARCH_RESULT_TTL_SECONDS,
    getCachedSearchResult,
    setCachedSearchResult,
    shareSearchComputation,
} = require('../searchResultCacheService');

// Same rule as routes/search/searchHelpers.clampLimit; kept local so this service does
// not depend on the route layer (which pulls in API-key and entitlement modules).
function clampLimit(val, def = 20, min = 1, max = 100) {
    const n = parseInt(String(val), 10);
    return Number.isNaN(n) ? def : Math.min(Math.max(n, min), max);
}

/**
 * Turns raw request-style inputs into everything that determines the shared result.
 * Returns { error } when the query is invalid.
 */
function deriveSharedSearchParams({
    db,
    query,
    sources = 'pubmed,openalex',
    explicitSources = true,
    limit = 20,
    specificity = 'moderate',
    vector,
    vectorAvailable: vectorAvailableOverride,
    parsedStudyTypes = [],
    parsedYearFilters = [],
}) {
    const validation = validateQuery(query);
    if (!validation.valid) return { error: validation.error };

    const validSpecificity = ['broad', 'moderate', 'strict'].includes(specificity) ? specificity : 'moderate';
    const requestedSourceList = String(sources).split(',').map((s) => s.trim()).filter(Boolean);
    const queryIntentProfile = deriveSearchIntentProfile(validation.sanitized, { specificity: validSpecificity });
    const sourceList = routeSearchSources(requestedSourceList, queryIntentProfile, { explicitSources });
    const safeLimit = clampLimit(limit);
    const vectorOptOut = vector === '0' || vector === 'false' || vector === false;
    const vectorAvailable = vectorAvailableOverride ?? Boolean(db?.isVectorSearchAvailable?.());
    const useVectorFusion = vectorAvailable && !vectorOptOut;

    const params = {
        query: validation.sanitized,
        sourceList,
        safeLimit,
        specificity: validSpecificity,
        vectorAvailable,
        useVectorFusion,
        parsedStudyTypes,
        parsedYearFilters,
        queryIntentProfile,
    };
    params.sharedCacheKey = buildSharedSearchCacheKey({
        query: params.query,
        sourceList,
        safeLimit,
        specificity: validSpecificity,
        vectorEnabled: useVectorFusion,
        parsedStudyTypes,
        parsedYearFilters,
        queryIntentProfile,
    });
    return params;
}

// PubMed and OpenAlex carry a search; a source outside this set only adds to it, and a
// source that is rate-limited or down reports zero results rather than a failure.
const CORE_SOURCES = ['pubmed', 'openalex'];

/**
 * How trustworthy a shared result is for long-lived storage.
 *   complete  - every requested source answered with results
 *   core_only - PubMed/OpenAlex are healthy but an optional source is missing
 *   degraded  - a core source failed or came back empty, or nothing was found
 *
 * A rate-limited source is recorded as { failed: false, resultCount: 0 }, not as a
 * failure, so an empty requested source has to be treated as missing too.
 */
function assessSharedResult(shared, requestedSources = []) {
    if (!shared || !Array.isArray(shared.articles) || shared.articles.length === 0) return 'degraded';
    const failures = shared.telemetry?.sourceFailures || {};
    if (Object.values(failures).some((f) => f && f.failed !== false)) return 'degraded';
    const fetches = shared.telemetry?.sourceFetches || {};
    const missing = (source) => {
        const info = fetches[source];
        return !info || info.failed === true || !(Number(info.resultCount) > 0);
    };
    const requested = requestedSources.map((s) => String(s).toLowerCase());
    if (requested.some((s) => CORE_SOURCES.includes(s) && missing(s))) return 'degraded';
    if (requested.some((s) => !CORE_SOURCES.includes(s) && missing(s))) return 'core_only';
    return 'complete';
}

/**
 * Reads the shared layer, computing and storing it on a miss.
 *   forceFresh: skip the read (used when refreshing deliberately)
 *   ttlFor: (shared, params) => seconds to keep a fresh result; 0 means do not store.
 *           Defaults to the normal shared TTL for everything, as the route wants.
 */
async function getOrComputeSharedSearch({
    db,
    cache,
    serverConfig,
    fetchImpl,
    params,
    log = null,
    forceFresh = false,
    ttlFor = () => SHARED_SEARCH_RESULT_TTL_SECONDS,
}) {
    let shared = forceFresh ? null : await getCachedSearchResult(cache, params.sharedCacheKey);
    if (shared) {
        return { shared, sharedCacheHit: true, vectorList: [], localRetrieval: { articles: [], used: false, available: Boolean(db?.searchCachedArticlesLocal) }, timings: {} };
    }

    const timings = {};
    let vectorList = [];
    if (params.useVectorFusion) {
        try {
            const started = Date.now();
            const { createVectorSearchService } = require('../vectorSearchService');
            const vs = createVectorSearchService({ db, serverConfig });
            const vr = await vs.searchVector({ query: params.query, limit: params.safeLimit });
            vectorList = Array.isArray(vr.articles) ? vr.articles : [];
            timings.vectorMs = Date.now() - started;
        } catch (err) {
            timings.vectorMs = 0;
            log?.warn?.({ err }, 'Vector fusion skipped');
        }
    }

    const localStarted = Date.now();
    const localRetrieval = await searchLocalArticleCache(db, { query: params.query, limit: params.safeLimit });
    vectorList = [...vectorList, ...localRetrieval.articles];
    timings.localRetrievalMs = Date.now() - localStarted;

    shared = await shareSearchComputation(params.sharedCacheKey, () => fetchSharedSearchEvidence({
        db,
        cache,
        serverConfig,
        fetchImpl,
        query: params.query,
        safeLimit: params.safeLimit,
        sourceList: params.sourceList,
        specificity: params.specificity,
        parsedStudyTypes: params.parsedStudyTypes,
        parsedYearFilters: params.parsedYearFilters,
        vectorList,
    }));
    const ttlSeconds = ttlFor(shared, params);
    if (ttlSeconds > 0) {
        await setCachedSearchResult(cache, params.sharedCacheKey, shared, ttlSeconds);
    }
    return { shared, sharedCacheHit: false, vectorList, localRetrieval, timings };
}

module.exports = { CORE_SOURCES, deriveSharedSearchParams, getOrComputeSharedSearch, assessSharedResult };
