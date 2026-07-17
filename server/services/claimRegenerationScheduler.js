'use strict';

const { processClaimRegenerationBatch } = require('./claimRegenerationService');
const { withCronHeartbeat } = require('./cronHeartbeat');

let intervalId = null;

function scheduleClaimRegeneration(db, deps = {}, logger, { intervalMs = 90_000, batchSize = 2 } = {}) {
    if (intervalId) return;
    const tick = withCronHeartbeat('claim-regeneration', async () => {
        const { isBackgroundAutomationPaused } = require('./backgroundAutomationService');
        if (await isBackgroundAutomationPaused(db)) return;
        const r = await processClaimRegenerationBatch(db, deps, { limit: batchSize });
        if (r.processed > 0) {
            logger.info({ processed: r.processed }, 'claim regeneration batch completed');
        }
    }, { db, logger });
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
