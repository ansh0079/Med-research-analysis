'use strict';

// The monthly topic review. Every topic in the app is reviewed about once a month, a slice each night,
// rather than the same high-priority topics being re-fetched every day: ~700 topics over 30 nights is
// ~24 a night. A reviewed result is kept in the topic review store for the review period, so a topic is
// due again only when its review expires (or an update signal invalidates it early), and a topic
// someone searched recently is not fetched again until then.
//
// It runs only the user-independent stage (getOrComputeSharedSearch), so it writes nothing but stored
// results: no search log, bouquet signals, demand signals or follow-up AI jobs. Those would otherwise
// record fake demand and spend on content nobody opened.
//
// Politeness matters: the search sources throttle bursts, and a throttled result kept for a month would
// be worse than none. Runs are paced, stop after repeated failures, and never store a result whose core
// sources failed. A result missing only an optional source is kept for the short hot TTL only.

const { loadFlagshipConfig } = require('../flagshipTopicOps');
const { deriveSharedSearchParams, getOrComputeSharedSearch, assessSharedResult } = require('./sharedSearchService');
const { getCachedSearchResult, SHARED_SEARCH_RESULT_TTL_SECONDS } = require('../searchResultCacheService');
const { REVIEW_DAYS, REVIEW_TTL_SECONDS, getReviewedSearch } = require('./topicReviewStore');

// What the web client sends for an unmodified search (sources toggle defaults,
// 20 results, balanced focus, vector fusion on). A reviewed entry only helps
// searches whose key matches, so these are the values worth reviewing.
const DEFAULTS = {
    sources: 'pubmed,openalex',
    limit: 20,
    specificity: 'moderate',
    vector: '1',
};

const envNumber = (name, fallback) => {
    const n = Number(process.env[name]);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
};

/** Every topic in the app by default; SEARCH_PREWARM_PRIORITY=high narrows it to the high-priority ones. */
function selectPrewarmTopics(config, { priority = process.env.SEARCH_PREWARM_PRIORITY || 'all' } = {}) {
    const topics = Array.isArray(config?.topics) ? config.topics : [];
    return topics
        .filter((t) => t?.topic && (priority === 'all' || t.priority === priority))
        .map((t) => String(t.topic).trim());
}

/** Topics reviewed per night so the whole list is covered once per review period. */
function nightlyQuota(topicCount, reviewDays = REVIEW_DAYS) {
    return Math.max(1, Math.ceil(topicCount / Math.max(1, reviewDays)));
}

const isCapError = (err) => err?.name === 'LlmDailyCapExceededError' || err?.status === 429;

async function runSearchPrewarm(db, {
    cache,
    serverConfig,
    fetchImpl,
    logger = console,
    topics = null,
    limit = null,
    ttlSeconds = REVIEW_TTL_SECONDS,
    paceMs = envNumber('SEARCH_PREWARM_PACE_MS', 5000),
    maxConsecutiveFailures = 5,
    maxCapPctUsed = envNumber('SEARCH_PREWARM_MAX_CAP_PCT', 50),
    sources = process.env.SEARCH_PREWARM_SOURCES || DEFAULTS.sources,
    getSpendSnapshot = () => require('../ai/globalLlmSpendGuard').getSpendSnapshot(),
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
    const summary = { considered: 0, warmed: 0, warmedPartial: 0, alreadyCached: 0, skippedUnclean: 0, failed: 0, quota: 0, stoppedReason: null };
    const list = topics || selectPrewarmTopics(loadFlagshipConfig());
    const quota = limit ?? (envNumber('SEARCH_PREWARM_LIMIT', 0) || nightlyQuota(list.length));
    summary.quota = quota;

    try {
        const spend = await getSpendSnapshot();
        if (spend?.killSwitch || Number(spend?.pctUsed) >= maxCapPctUsed) {
            summary.stoppedReason = `spend_${spend?.killSwitch ? 'kill_switch' : `${spend.pctUsed}pct_of_cap`}`;
            logger.info?.({ summary, spend }, 'topic review skipped: not spending the remaining LLM budget on reviews');
            return summary;
        }
    } catch (err) {
        logger.warn?.({ err }, 'topic review: spend snapshot unavailable, continuing');
    }

    const seenKeys = new Set();
    let consecutiveFailures = 0;

    for (const topic of list) {
        if (summary.warmed + summary.warmedPartial >= quota) { summary.stoppedReason = 'quota'; break; }
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

        // Reviewed within the period (by this job or by someone's search): not due yet.
        if (await getReviewedSearch(db, params.sharedCacheKey) || await getCachedSearchResult(cache, params.sharedCacheKey)) {
            summary.alreadyCached += 1;
            continue;
        }

        try {
            let quality = 'degraded';
            await getOrComputeSharedSearch({
                db, cache, serverConfig, fetchImpl, params, log: logger, forceFresh: true,
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
            logger.warn?.({ err, topic }, 'topic review failed for topic');
            if (isCapError(err)) { summary.stoppedReason = 'spend_cap'; break; }
            if (consecutiveFailures >= maxConsecutiveFailures) { summary.stoppedReason = 'repeated_failures'; break; }
        }
        if (paceMs > 0) await sleep(paceMs);
    }

    logger.info?.({ summary }, 'topic review finished');
    return summary;
}

module.exports = { DEFAULTS, selectPrewarmTopics, nightlyQuota, runSearchPrewarm };
