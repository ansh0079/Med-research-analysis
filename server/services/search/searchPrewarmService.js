'use strict';

// Fills the shared search layer for the high-priority flagship topics ahead of
// time so a clinician's first search on a common topic is a cache hit (~0.1s)
// rather than a ~5s fetch, rank and model rerank.
//
// It runs only the user-independent stage (getOrComputeSharedSearch), so it
// writes nothing but cache entries: no search log, bouquet signals, demand
// signals or follow-up jobs. Those would otherwise record fake demand.
//
// Politeness matters: the search sources throttle bursts, and a throttled
// result cached for days would be worse than no warming. Runs are paced,
// stop after repeated failures, and never store a result whose core sources failed.
// A result missing only Semantic Scholar (unauthenticated, often rate-limited) is kept
// for the normal short TTL, exactly as an ordinary search would be, not for days.

const { loadFlagshipConfig } = require('../flagshipTopicOps');
const { deriveSharedSearchParams, getOrComputeSharedSearch, assessSharedResult } = require('./sharedSearchService');
const { getCachedSearchResult, SHARED_SEARCH_RESULT_TTL_SECONDS } = require('../searchResultCacheService');

// What the web client sends for an unmodified search (sources toggle defaults,
// 20 results, balanced focus, vector fusion on). A warmed entry only helps
// searches whose key matches, so these are the values worth warming.
const DEFAULTS = {
    sources: 'pubmed,openalex,semantic',
    limit: 20,
    specificity: 'moderate',
    vector: '1',
};

const envNumber = (name, fallback) => {
    const n = Number(process.env[name]);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
};

function selectPrewarmTopics(config, { priority = process.env.SEARCH_PREWARM_PRIORITY || 'high' } = {}) {
    const topics = Array.isArray(config?.topics) ? config.topics : [];
    return topics
        .filter((t) => t?.topic && (priority === 'all' || t.priority === priority))
        .map((t) => String(t.topic).trim());
}

const isCapError = (err) => err?.name === 'LlmDailyCapExceededError' || err?.status === 429;

async function runSearchPrewarm(db, {
    cache,
    serverConfig,
    fetchImpl,
    logger = console,
    topics = null,
    limit = envNumber('SEARCH_PREWARM_LIMIT', 100),
    ttlSeconds = envNumber('SEARCH_PREWARM_TTL_HOURS', 72) * 3600,
    paceMs = envNumber('SEARCH_PREWARM_PACE_MS', 5000),
    maxConsecutiveFailures = 5,
    maxCapPctUsed = envNumber('SEARCH_PREWARM_MAX_CAP_PCT', 50),
    sources = process.env.SEARCH_PREWARM_SOURCES || DEFAULTS.sources,
    getSpendSnapshot = () => require('../ai/globalLlmSpendGuard').getSpendSnapshot(),
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
    const summary = { considered: 0, warmed: 0, warmedPartial: 0, alreadyCached: 0, skippedUnclean: 0, failed: 0, stoppedReason: null };
    const list = topics || selectPrewarmTopics(loadFlagshipConfig());

    try {
        const spend = await getSpendSnapshot();
        if (spend?.killSwitch || Number(spend?.pctUsed) >= maxCapPctUsed) {
            summary.stoppedReason = `spend_${spend?.killSwitch ? 'kill_switch' : `${spend.pctUsed}pct_of_cap`}`;
            logger.info?.({ summary, spend }, 'search prewarm skipped: not spending the remaining LLM budget on warming');
            return summary;
        }
    } catch (err) {
        logger.warn?.({ err }, 'search prewarm: spend snapshot unavailable, continuing');
    }

    const seenKeys = new Set();
    let consecutiveFailures = 0;

    for (const topic of list) {
        if (summary.warmed + summary.warmedPartial >= limit) { summary.stoppedReason = 'limit'; break; }
        summary.considered += 1;

        const params = deriveSharedSearchParams({
            db,
            query: topic,
            sources,
            explicitSources: true,
            limit: DEFAULTS.limit,
            specificity: DEFAULTS.specificity,
            vector: DEFAULTS.vector,
        });
        if (params.error || seenKeys.has(params.sharedCacheKey)) continue;
        seenKeys.add(params.sharedCacheKey);

        if (await getCachedSearchResult(cache, params.sharedCacheKey)) {
            summary.alreadyCached += 1;
            continue;
        }

        try {
            let quality = 'degraded';
            await getOrComputeSharedSearch({
                db, cache, serverConfig, fetchImpl, params, log: logger,
                ttlFor: (shared) => {
                    quality = assessSharedResult(shared, params.sourceList);
                    if (quality === 'complete') return ttlSeconds;
                    return quality === 'core_only' ? SHARED_SEARCH_RESULT_TTL_SECONDS : 0;
                },
            });
            if (quality !== 'degraded') {
                if (quality === 'complete') summary.warmed += 1; else summary.warmedPartial += 1;
                consecutiveFailures = 0;
            } else {
                // Failed sources or no articles: not stored. A run of these usually
                // means the sources are throttling us, so back off rather than push on.
                summary.skippedUnclean += 1;
                consecutiveFailures += 1;
                if (consecutiveFailures >= maxConsecutiveFailures) { summary.stoppedReason = 'degraded_sources'; break; }
            }
        } catch (err) {
            summary.failed += 1;
            consecutiveFailures += 1;
            logger.warn?.({ err, topic }, 'search prewarm failed for topic');
            if (isCapError(err)) { summary.stoppedReason = 'spend_cap'; break; }
            if (consecutiveFailures >= maxConsecutiveFailures) { summary.stoppedReason = 'repeated_failures'; break; }
        }
        if (paceMs > 0) await sleep(paceMs);
    }

    logger.info?.({ summary }, 'search prewarm finished');
    return summary;
}

module.exports = { DEFAULTS, selectPrewarmTopics, runSearchPrewarm };
