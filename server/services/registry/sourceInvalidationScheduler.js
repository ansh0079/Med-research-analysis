'use strict';

/**
 * Drains the source-invalidation queue and makes failure visible. The tick throws when an
 * event has dead-lettered or the oldest pending event is past the lag budget, so the cron
 * heartbeat records an error (admin page, Sentry) instead of a quiet 'ok'.
 */

const { processInvalidationQueue, getInvalidationStats, enqueueExistingRetractions } = require('./sourceInvalidationQueue');
const { withCronHeartbeat } = require('../cronHeartbeat');

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_STARTUP_DELAY_MS = 30 * 1000;
const DEFAULT_MAX_LAG_SECONDS = 15 * 60;

let intervalId = null;
let startupTimer = null;

async function runInvalidationTick(db, { limit = 25, maxLagSeconds = DEFAULT_MAX_LAG_SECONDS, now = new Date() } = {}) {
    await enqueueExistingRetractions(db).catch(() => null); // picks up cached retractions that never had an event
    const outcome = await processInvalidationQueue(db, { limit, now });
    const stats = await getInvalidationStats(db, { now });
    const problems = [];
    if (stats.failed > 0) problems.push(`${stats.failed} invalidation event(s) exhausted retries`);
    if (stats.oldestPendingAgeSeconds > maxLagSeconds) {
        problems.push(`oldest pending invalidation is ${stats.oldestPendingAgeSeconds}s old (budget ${maxLagSeconds}s)`);
    }
    return { outcome, stats, problems };
}

function scheduleSourceInvalidation(db, logger, { intervalMs = DEFAULT_INTERVAL_MS } = {}) {
    if (intervalId) return;
    const tick = withCronHeartbeat('source-invalidation', async () => {
        const { outcome, stats, problems } = await runInvalidationTick(db);
        if (outcome.due > 0 || problems.length) logger.info({ ...outcome, stats }, 'source invalidation tick');
        if (problems.length) throw new Error(problems.join('; '));
    }, { db, logger });
    intervalId = setInterval(tick, intervalMs);
    if (typeof intervalId.unref === 'function') intervalId.unref();
    startupTimer = setTimeout(tick, DEFAULT_STARTUP_DELAY_MS);
    if (typeof startupTimer.unref === 'function') startupTimer.unref();
    logger.info({ intervalMs }, 'Source invalidation scheduler started');
}

function stopSourceInvalidation() {
    if (intervalId) clearInterval(intervalId);
    if (startupTimer) clearTimeout(startupTimer);
    intervalId = null;
    startupTimer = null;
}

module.exports = { scheduleSourceInvalidation, stopSourceInvalidation, runInvalidationTick };
