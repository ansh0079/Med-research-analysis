'use strict';

const { runGuidelineWatchtowerBatch } = require('./guidelineWatchtowerService');

let intervalId = null;

function scheduleGuidelineWatchtower(db, logger, { intervalMs = 6 * 60 * 60 * 1000, topicLimit = 6 } = {}) {
    if (intervalId) return;
    const tick = async () => {
        const { isBackgroundAutomationPaused } = require('./backgroundAutomationService');
        if (await isBackgroundAutomationPaused(db)) return;
        runGuidelineWatchtowerBatch(db, { topicLimit })
            .then((r) => {
                if (r.scanned > 0) logger.info({ scanned: r.scanned }, 'Guideline watchtower scan completed');
            })
            .catch((err) => logger.warn({ err }, 'Guideline watchtower scan failed'));
    };
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
