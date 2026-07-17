// ==========================================
// Topic knowledge refresh scheduler
// Background job that finds topics with high bouquet signal activity but stale or
// absent topic_knowledge, then re-extracts knowledge seeded with validated UIDs.
// Also refreshes "Strong Memory" topics (high-confidence / human-reviewed) that
// have active community engagement but haven't been refreshed recently.
// Runs once at startup after a short delay, then every hour.
// ==========================================

const { extractAndUpsertTopicKnowledge } = require('./topicKnowledgeExtraction');
const { refineSeminalKnowledgeFromCommunity } = require('./communitySeminalRefinementService');
const logger = require('../config/logger');

const STARTUP_DELAY_MS = 45_000;
const INTERVAL_MS = 60 * 60 * 1000;
const STALE_TOPICS_PER_RUN = 5;
const STRONG_MEMORY_TOPICS_PER_RUN = 3;

let refreshTimer = null;
let startupTimer = null;

async function _finishRun(db, run, { status, candidatesCount, refreshedCount, skippedCount, errorCount, details }) {
    if (run?.id && typeof db.finishLearningSchedulerRun === 'function') {
        await db.finishLearningSchedulerRun(run.id, {
            status,
            candidatesCount,
            refreshedCount,
            skippedCount,
            errorCount,
            details,
        }).catch((err) => { logger?.warn?.({ err }, 'finishLearningSchedulerRun failed'); return null; });
    }
}

async function runStaleTopicRefresh({ db, serverConfig, fetchImpl, logger }) {
    if (typeof db.getStaleTopicsForRefresh !== 'function') return;

    const run = typeof db.createLearningSchedulerRun === 'function'
        ? await db.createLearningSchedulerRun({ runType: 'topic_refresh' }).catch((err) => { logger?.warn?.({ err }, 'createLearningSchedulerRun failed'); return null; })
        : null;
    const details = { topics: [] };
    let refreshedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    let stale;
    try {
        stale = await db.getStaleTopicsForRefresh({ minSignalCount: 3, maxAgeDays: 90, limit: STALE_TOPICS_PER_RUN });
    } catch (e) {
        logger?.warn?.({ err: e }, 'topicRefreshScheduler: failed to query stale topics');
        await _finishRun(db, run, { status: 'failed', candidatesCount: 0, refreshedCount: 0, skippedCount: 0, errorCount: 1, details });
        return;
    }

    if (!stale?.length) {
        await _finishRun(db, run, { status: 'completed', candidatesCount: 0, refreshedCount: 0, skippedCount: 0, errorCount: 0, details });
        return;
    }

    logger?.info?.({ count: stale.length }, 'topicRefreshScheduler: refreshing stale topics');

    for (const topic of stale) {
        const topicDetail = {
            normalizedTopic: topic.normalizedTopic,
            displayTopic: topic.displayTopic || topic.normalizedTopic,
            priorityScore: topic.priorityScore,
            confidenceDecay: topic.confidenceDecay,
            volatility: topic.volatility,
            status: 'pending',
        };

        try {
            const topSignals = typeof db.getTopBouquetArticlesForTopic === 'function'
                ? await db.getTopBouquetArticlesForTopic(topic.normalizedTopic, 8)
                : [];
            const clusterSignals = typeof db.getClusterBouquetArticlesForTopic === 'function'
                ? await db.getClusterBouquetArticlesForTopic(topic.normalizedTopic, {
                    topicLimit: 5,
                    articleLimit: 12,
                    minSharedArticles: 2,
                })
                : [];
            const bouquetUids = new Set(topSignals.map((s) => String(s.uid)));
            clusterSignals.forEach((s) => {
                if (s?.uid) bouquetUids.add(String(s.uid));
            });
            topicDetail.topSignalCount = topSignals.length;
            topicDetail.clusterSignalCount = clusterSignals.length;
            topicDetail.seedUidCount = bouquetUids.size;

            const intentDistribution = typeof db.getTopicIntentDistribution === 'function'
                ? await db.getTopicIntentDistribution(topic.normalizedTopic).catch((err) => { logger.warn({ err }, 'getTopicIntentDistribution failed'); return []; })
                : [];
            const dominantIntent = intentDistribution[0]?.intent || 'general';
            topicDetail.dominantIntent = dominantIntent;

            await extractAndUpsertTopicKnowledge({
                topic: topic.displayTopic || topic.normalizedTopic,
                serverConfig,
                db,
                fetchImpl,
                bouquetUids,
                intentDistribution,
            });

            refreshedCount += 1;
            topicDetail.status = 'refreshed';
            logger?.info?.({
                topic: topic.normalizedTopic,
                signals: topic.totalSignals,
                priorityScore: topic.priorityScore,
                confidenceDecay: topic.confidenceDecay,
                volatility: topic.volatility,
                clusterSignals: clusterSignals.length,
                dominantIntent,
            }, 'topicRefreshScheduler: refreshed');
        } catch (e) {
            if (e?.statusCode !== 409) {
                errorCount += 1;
                topicDetail.status = 'error';
                topicDetail.error = e?.message || String(e);
                logger?.warn?.({ err: e, topic: topic.normalizedTopic }, 'topicRefreshScheduler: topic refresh failed');
            } else {
                skippedCount += 1;
                topicDetail.status = 'skipped_protected';
            }
        }

        details.topics.push(topicDetail);
    }

    await _finishRun(db, run, {
        status: errorCount > 0 ? 'completed_with_errors' : 'completed',
        candidatesCount: stale.length,
        refreshedCount,
        skippedCount,
        errorCount,
        details,
    });
}

/**
 * Refresh "Strong Memory" topics — high-confidence or human-reviewed topics that
 * have active community engagement but haven't been refreshed recently.
 *
 * Uses community-engaged article UIDs (clicks/saves/dwell) and the seminal
 * extraction prompt so the topic's landmark memory can evolve without waiting
 * for an explicit user-triggered synthesis.
 */
async function runStrongMemoryRefresh({ db, serverConfig, fetchImpl, logger }) {
    if (typeof db.getStrongMemoryTopicsForRefresh !== 'function') return;

    const run = typeof db.createLearningSchedulerRun === 'function'
        ? await db.createLearningSchedulerRun({ runType: 'strong_memory_refresh' }).catch((err) => { logger?.warn?.({ err }, 'createLearningSchedulerRun failed'); return null; })
        : null;
    const details = { topics: [] };
    let refreshedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    let candidates;
    try {
        candidates = await db.getStrongMemoryTopicsForRefresh({
            minEngagementScore: 5,
            minRefreshAgeDays: 14,
            limit: STRONG_MEMORY_TOPICS_PER_RUN,
        });
    } catch (e) {
        logger?.warn?.({ err: e }, 'topicRefreshScheduler: failed to query strong-memory topics');
        await _finishRun(db, run, { status: 'failed', candidatesCount: 0, refreshedCount: 0, skippedCount: 0, errorCount: 1, details });
        return;
    }

    if (!candidates?.length) {
        await _finishRun(db, run, { status: 'completed', candidatesCount: 0, refreshedCount: 0, skippedCount: 0, errorCount: 0, details });
        return;
    }

    logger?.info?.({ count: candidates.length }, 'topicRefreshScheduler: refreshing strong-memory topics');

    for (const topic of candidates) {
        const topicDetail = {
            normalizedTopic: topic.normalizedTopic,
            displayTopic: topic.displayTopic || topic.normalizedTopic,
            memoryTier: topic.memoryTier,
            confidence: topic.confidence,
            communityEngagementScore: topic.communityEngagementScore,
            totalDwellMs: topic.totalDwellMs,
            status: 'pending',
        };

        try {
            const communityArticles = typeof db.getCommunityEngagedArticlesForTopic === 'function'
                ? await db.getCommunityEngagedArticlesForTopic(topic.normalizedTopic, 12)
                : [];
            topicDetail.communitySeedCount = communityArticles.length;

            const intentDistribution = typeof db.getTopicIntentDistribution === 'function'
                ? await db.getTopicIntentDistribution(topic.normalizedTopic).catch((err) => { logger.warn({ err }, 'getTopicIntentDistribution failed'); return []; })
                : [];
            const dominantIntent = intentDistribution[0]?.intent || 'general';
            topicDetail.dominantIntent = dominantIntent;

            const refinement = await refineSeminalKnowledgeFromCommunity({
                topic: topic.displayTopic || topic.normalizedTopic,
                normalizedTopic: topic.normalizedTopic,
                serverConfig,
                db,
                fetchImpl,
                communityArticles,
            });
            topicDetail.selectedArticleCount = refinement.selectedArticleCount;
            topicDetail.refinementProvider = refinement.provider;

            refreshedCount += 1;
            topicDetail.status = 'refreshed';
            logger?.info?.({
                topic: topic.normalizedTopic,
                memoryTier: topic.memoryTier,
                engagementScore: topic.communityEngagementScore,
                dwellMs: topic.totalDwellMs,
                communitySeeds: communityArticles.length,
                dominantIntent,
            }, 'topicRefreshScheduler: strong-memory seminal memory refined');
        } catch (e) {
            if (e?.statusCode !== 409) {
                errorCount += 1;
                topicDetail.status = 'error';
                topicDetail.error = e?.message || String(e);
                logger?.warn?.({ err: e, topic: topic.normalizedTopic }, 'topicRefreshScheduler: strong-memory refresh failed');
            } else {
                skippedCount += 1;
                topicDetail.status = 'skipped_protected';
            }
        }

        details.topics.push(topicDetail);
    }

    await _finishRun(db, run, {
        status: errorCount > 0 ? 'completed_with_errors' : 'completed',
        candidatesCount: candidates.length,
        refreshedCount,
        skippedCount,
        errorCount,
        details,
    });
}

function scheduleTopicRefresh(db, serverConfig, fetchImpl, logger) {
    const { withCronHeartbeat } = require('./cronHeartbeat');
    const tick = withCronHeartbeat('topic-refresh', async () => {
        const { isBackgroundAutomationPaused } = require('./backgroundAutomationService');
        if (await isBackgroundAutomationPaused(db)) return;
        const errors = [];
        await runStaleTopicRefresh({ db, serverConfig, fetchImpl, logger }).catch((err) => { logger?.warn?.({ err }, 'runStaleTopicRefresh failed'); errors.push(err); });
        await runStrongMemoryRefresh({ db, serverConfig, fetchImpl, logger }).catch((err) => { logger?.warn?.({ err }, 'runStrongMemoryRefresh failed'); errors.push(err); });
        if (errors.length) throw errors[0];
    }, { db, logger });
    startupTimer = setTimeout(() => { void tick(); }, STARTUP_DELAY_MS);
    refreshTimer = setInterval(() => { void tick(); }, INTERVAL_MS);
}

function stopTopicRefresh() {
    if (startupTimer) { clearTimeout(startupTimer); startupTimer = null; }
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
}

module.exports = { scheduleTopicRefresh, stopTopicRefresh, runStaleTopicRefresh, runStrongMemoryRefresh };
