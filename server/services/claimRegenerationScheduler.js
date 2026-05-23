'use strict';

const { processClaimRegenerationBatch } = require('./claimRegenerationService');

let intervalId = null;

function scheduleClaimRegeneration(db, deps = {}, logger, { intervalMs = 90_000, batchSize = 2 } = {}) {
    if (intervalId) return;
    const tick = async () => {
        const { isBackgroundAutomationPaused } = require('./backgroundAutomationService');
        if (await isBackgroundAutomationPaused(db)) return;
        processClaimRegenerationBatch(db, deps, { limit: batchSize })
            .then((r) => {
                if (r.processed > 0) {
                    logger.info({ processed: r.processed }, 'claim regeneration batch completed');
                }
            })
            .catch((err) => logger.warn({ err }, 'claim regeneration scheduler tick failed'));
    };
    intervalId = setInterval(tick, intervalMs);
    if (typeof intervalId.unref === 'function') intervalId.unref();
    logger.info({ intervalMs, batchSize }, 'Claim regeneration scheduler started');
}

function stopClaimRegeneration() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

module.exports = { scheduleClaimRegeneration, stopClaimRegeneration };
