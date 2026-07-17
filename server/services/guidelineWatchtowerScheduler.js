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

module.exports = { scheduleGuidelineWatchtower, stopGuidelineWatchtower };
