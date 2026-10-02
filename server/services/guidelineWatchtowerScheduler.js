'use strict';

const { runGuidelineWatchtowerBatch } = require('./guidelineWatchtowerService');
const { withCronHeartbeat } = require('./cronHeartbeat');

let intervalId = null;

function scheduleGuidelineWatchtower(db, logger, { intervalMs = 6 * 60 * 60 * 1000, topicLimit = 6 } = {}) {
    if (intervalId) return;
    const tick = withCronHeartbeat('guideline-watchtower', async () => {
        const { isBackgroundAutomationPaused } = require('./backgroundAutomationService');
        if (await isBackgroundAutomationPaused(db)) return;
        const r = await runGuidelineWatchtowerBatch(db, { topicLimit });
        if (r.scanned > 0) logger.info({ scanned: r.scanned }, 'Guideline watchtower scan completed');
    }, { db, logger });
    intervalId = setInterval(tick, intervalMs);
    if (typeof intervalId.unref === 'function') intervalId.unref();
    setTimeout(tick, 45_000);
    logger.info({ intervalMs, topicLimit }, 'Guideline watchtower scheduler started');
}

function stopGuidelineWatchtower() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

// The watchtower itself stays paused: it proposes content changes. Marking a
// guideline stale is maintenance and has to run while that proposer is off.
let staleFlagIntervalId = null;

function scheduleGuidelineStaleFlag(db, logger, { intervalMs = 24 * 60 * 60 * 1000 } = {}) {
    if (staleFlagIntervalId) return;
    const tick = withCronHeartbeat('guideline-stale-flag', async () => {
        if (typeof db.flagStaleGuidelines !== 'function') return;
        await db.flagStaleGuidelines();
        logger.info('Guideline stale rows flagged');
    }, { db, logger });
    staleFlagIntervalId = setInterval(tick, intervalMs);
    if (typeof staleFlagIntervalId.unref === 'function') staleFlagIntervalId.unref();
    setTimeout(tick, 90_000);
    logger.info({ intervalMs }, 'Guideline stale-flag scheduler started');
}

function stopGuidelineStaleFlag() {
    if (staleFlagIntervalId) {
        clearInterval(staleFlagIntervalId);
        staleFlagIntervalId = null;
    }
}

module.exports = {
    scheduleGuidelineWatchtower,
    stopGuidelineWatchtower,
    scheduleGuidelineStaleFlag,
    stopGuidelineStaleFlag,
};
