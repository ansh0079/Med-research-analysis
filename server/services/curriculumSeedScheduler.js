'use strict';

const logger = require('../config/logger');
const { seedCurriculumTopic } = require('./curriculumSeedService');

const DEFAULT_STARTUP_DELAY_MS = 120_000;
const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 2;
const SETTINGS_KEY = 'curriculum_seed_scheduler';
const DEFAULT_GUARDRAILS = {
    enabled: true,
    maxTopicsPerDay: 10,
    maxSynopsesPerDay: 30,
    maxEstimatedCostUsdPerDay: 1,
    maxFailureRate: 0.5,
    minAttemptsBeforeFailurePause: 3,
    estimatedSynthesisCostUsd: 0.003,
    estimatedSynopsisCostUsd: 0.001,
};

let intervalId = null;
let startupTimer = null;
let running = false;

async function finishRun(db, run, payload) {
    if (!run?.id) return null;
    return db.finishLearningSchedulerRun(run.id, payload).catch((err) => {
        logger.warn({ err }, 'curriculum seed scheduler: finish run failed');
        return null;
    });
}

function normalizeGuardrails(value = {}) {
    const source = value && typeof value === 'object' ? value : {};
    return {
        ...DEFAULT_GUARDRAILS,
        ...source,
        enabled: (() => {
            if (typeof source.enabled === 'boolean') return source.enabled;
            if (source.enabled === 'false' || source.enabled === 0) return false;
            if (source.enabled === 'true' || source.enabled === 1) return true;
            return DEFAULT_GUARDRAILS.enabled;
        })(),
        maxTopicsPerDay: Math.max(Number(source.maxTopicsPerDay ?? DEFAULT_GUARDRAILS.maxTopicsPerDay) || DEFAULT_GUARDRAILS.maxTopicsPerDay, 0),
        maxSynopsesPerDay: Math.max(Number(source.maxSynopsesPerDay ?? DEFAULT_GUARDRAILS.maxSynopsesPerDay) || DEFAULT_GUARDRAILS.maxSynopsesPerDay, 0),
        maxEstimatedCostUsdPerDay: Math.max(Number(source.maxEstimatedCostUsdPerDay ?? DEFAULT_GUARDRAILS.maxEstimatedCostUsdPerDay) || DEFAULT_GUARDRAILS.maxEstimatedCostUsdPerDay, 0),
        maxFailureRate: Math.min(Math.max(Number(source.maxFailureRate ?? DEFAULT_GUARDRAILS.maxFailureRate) || DEFAULT_GUARDRAILS.maxFailureRate, 0), 1),
        minAttemptsBeforeFailurePause: Math.max(Number(source.minAttemptsBeforeFailurePause ?? DEFAULT_GUARDRAILS.minAttemptsBeforeFailurePause) || DEFAULT_GUARDRAILS.minAttemptsBeforeFailurePause, 1),
        estimatedSynthesisCostUsd: Math.max(Number(source.estimatedSynthesisCostUsd ?? DEFAULT_GUARDRAILS.estimatedSynthesisCostUsd) || DEFAULT_GUARDRAILS.estimatedSynthesisCostUsd, 0),
        estimatedSynopsisCostUsd: Math.max(Number(source.estimatedSynopsisCostUsd ?? DEFAULT_GUARDRAILS.estimatedSynopsisCostUsd) || DEFAULT_GUARDRAILS.estimatedSynopsisCostUsd, 0),
    };
}

async function getCurriculumSeedSchedulerSettings(db) {
    const stored = await db.getAdminRuntimeSetting(SETTINGS_KEY, DEFAULT_GUARDRAILS);
    return normalizeGuardrails(stored);
}

async function updateCurriculumSeedSchedulerSettings(db, patch = {}) {
    const current = await getCurriculumSeedSchedulerSettings(db);
    return db.setAdminRuntimeSetting(SETTINGS_KEY, normalizeGuardrails({ ...current, ...patch }));
}

function getToday() {
    return new Date().toISOString().slice(0, 10);
}

function estimateTopicCost(settings, synopsisCount = 0) {
    return Number((settings.estimatedSynthesisCostUsd + (Number(synopsisCount || 0) * settings.estimatedSynopsisCostUsd)).toFixed(6));
}

function getGuardrailBlockReason(settings, usage) {
    if (!settings.enabled) return 'paused';
    if (usage.topicsAttempted >= settings.maxTopicsPerDay) return 'daily_topic_cap_reached';
    if (usage.synopsesGenerated >= settings.maxSynopsesPerDay) return 'daily_synopsis_cap_reached';
    if (usage.estimatedCostUsd >= settings.maxEstimatedCostUsdPerDay) return 'daily_cost_cap_reached';
    const failureRate = usage.topicsAttempted > 0 ? usage.topicsFailed / usage.topicsAttempted : 0;
    if (usage.topicsAttempted >= settings.minAttemptsBeforeFailurePause && failureRate >= settings.maxFailureRate) {
        return 'failure_rate_guardrail';
    }
    return null;
}

async function loadGuardrailState(db) {
    const settings = await getCurriculumSeedSchedulerSettings(db);
    const usage = await db.getCurriculumSeedUsageForDate(getToday());
    return { settings, usage, blockedReason: getGuardrailBlockReason(settings, usage) };
}

async function runCurriculumSeedBatch({
    db,
    serverConfig,
    fetchImpl,
    cache,
    log = logger,
    batchSize = DEFAULT_BATCH_SIZE,
    limits = {},
    seedStatuses = [],
    force = false,
} = {}) {
    if (!db) throw new Error('db is required');
    if (running) {
        log.info('curriculum seed scheduler: previous run still active');
        return { skipped: true, reason: 'already_running' };
    }

    running = true;
    const safeBatchSize = Math.min(Math.max(Number(batchSize) || DEFAULT_BATCH_SIZE, 1), 10);
    const { isBackgroundAutomationPaused } = require('./backgroundAutomationService');
    if (await isBackgroundAutomationPaused(db)) {
        running = false;
        return {
            skipped: true,
            reason: 'background_automation_paused',
            candidatesCount: 0,
            refreshedCount: 0,
            skippedCount: 0,
            errorCount: 0,
            details: { topics: [] },
        };
    }
    const guardrails = await loadGuardrailState(db);
    if (guardrails.blockedReason && !force) {
        running = false;
        return {
            skipped: true,
            reason: guardrails.blockedReason,
            candidatesCount: 0,
            refreshedCount: 0,
            skippedCount: 0,
            errorCount: 0,
            guardrails,
            details: { topics: [] },
        };
    }
    const run = await db.createLearningSchedulerRun({
        runType: 'curriculum_seed',
        details: { batchSize: safeBatchSize, guardrails },
    }).catch((err) => {
        log.warn({ err }, 'curriculum seed scheduler: create run failed');
        return null;
    });
    const details = { topics: [] };
    let refreshedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    try {
        const candidates = await db.listCurriculumSeedCandidates({ limit: safeBatchSize, seedStatuses });
        if (!candidates.length) {
            await finishRun(db, run, {
                status: 'completed',
                candidatesCount: 0,
                refreshedCount: 0,
                skippedCount: 0,
                errorCount: 0,
                details,
            });
            return { candidatesCount: 0, refreshedCount, skippedCount, errorCount, details };
        }

        for (const topic of candidates) {
            const currentUsage = await db.getCurriculumSeedUsageForDate(getToday());
            const blockReason = getGuardrailBlockReason(guardrails.settings, currentUsage);
            if (blockReason && !force) {
                skippedCount += 1;
                details.topics.push({
                    id: topic.id,
                    displayName: topic.displayName,
                    status: 'skipped_guardrail',
                    reason: blockReason,
                });
                break;
            }

            const topicDetail = {
                id: topic.id,
                displayName: topic.displayName,
                block: topic.block,
                priority: topic.priority,
                volatility: topic.volatility,
                priorSeedStatus: topic.seedStatus,
                status: 'pending',
            };
            try {
                await db.incrementCurriculumSeedUsage(getToday(), { topicsAttempted: 1 });
                const result = await seedCurriculumTopic({
                    db,
                    topicId: topic.id,
                    serverConfig,
                    fetchImpl,
                    cache,
                    provider: 'auto',
                    limits,
                    log,
                });
                topicDetail.status = result.warning ? 'skipped_low_recall' : 'seeded';
                topicDetail.articleCount = result.articleCount;
                topicDetail.selectedArticleCount = result.selectedArticleCount;
                topicDetail.synopsisCount = result.synopsisCount;
                topicDetail.claimCount = result.claimCount ?? result.topic?.claimCount ?? 0;
                topicDetail.synopsisFailures = result.synopsisFailures?.length || 0;
                topicDetail.estimatedCostUsd = estimateTopicCost(guardrails.settings, result.synopsisCount || 0);
                await db.incrementCurriculumSeedUsage(getToday(), {
                    topicsSeeded: result.warning ? 0 : 1,
                    synopsesGenerated: result.synopsisCount || 0,
                    estimatedCostUsd: topicDetail.estimatedCostUsd,
                });
                if (result.warning) skippedCount += 1;
                else refreshedCount += 1;
            } catch (err) {
                errorCount += 1;
                await db.incrementCurriculumSeedUsage(getToday(), { topicsFailed: 1 }).catch(() => null);
                topicDetail.status = 'error';
                topicDetail.error = err.message;
                log.warn({ err, topicId: topic.id, topic: topic.displayName }, 'curriculum seed scheduler: topic seed failed');
            }
            details.topics.push(topicDetail);
        }

        const status = errorCount > 0 ? 'completed_with_errors' : 'completed';
        await finishRun(db, run, {
            status,
            candidatesCount: candidates.length,
            refreshedCount,
            skippedCount,
            errorCount,
            details: { ...details, guardrails: await loadGuardrailState(db) },
        });
        return { candidatesCount: candidates.length, refreshedCount, skippedCount, errorCount, details, guardrails: await loadGuardrailState(db) };
    } catch (err) {
        await finishRun(db, run, {
            status: 'failed',
            candidatesCount: 0,
            refreshedCount,
            skippedCount,
            errorCount: errorCount + 1,
            details,
            error: err.message,
        });
        throw err;
    } finally {
        running = false;
    }
}

function scheduleCurriculumSeed(db, deps = {}, log = logger, {
    startupDelayMs = DEFAULT_STARTUP_DELAY_MS,
    intervalMs = DEFAULT_INTERVAL_MS,
    batchSize = DEFAULT_BATCH_SIZE,
    limits = { searchLimit: 24, synthesisArticles: 8, synopsisArticles: 3 },
} = {}) {
    if (intervalId || startupTimer) return;
    const tick = () => {
        runCurriculumSeedBatch({
            db,
            serverConfig: deps.serverConfig,
            fetchImpl: deps.fetchImpl,
            cache: deps.cache,
            log,
            batchSize,
            limits,
        }).catch((err) => log.warn({ err }, 'curriculum seed scheduler tick failed'));
    };

    startupTimer = setTimeout(tick, startupDelayMs);
    intervalId = setInterval(tick, intervalMs);
    if (typeof startupTimer.unref === 'function') startupTimer.unref();
    if (typeof intervalId.unref === 'function') intervalId.unref();
    log.info({ startupDelayMs, intervalMs, batchSize }, 'Curriculum seed scheduler started');
}

function stopCurriculumSeed() {
    if (startupTimer) {
        clearTimeout(startupTimer);
        startupTimer = null;
    }
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

module.exports = {
    runCurriculumSeedBatch,
    scheduleCurriculumSeed,
    stopCurriculumSeed,
    getCurriculumSeedSchedulerSettings,
    updateCurriculumSeedSchedulerSettings,
    loadGuardrailState,
    DEFAULT_GUARDRAILS,
};
