'use strict';

const { refreshGuidelineFullText } = require('./guideline/guidelineFullTextRefresh');
const { withCronHeartbeat } = require('./cronHeartbeat');

let intervalId = null;

/**
 * Periodically upgrade abstract-only guideline documents to full text.
 *
 * Runs rarely by design. Europe PMC rate-limits, and the remaining 422
 * abstract-only records are an external-content ceiling (no Europe PMC body for
 * most; 62 PMC endpoints consistently HTTP 500) that only changes as embargoes
 * lift or new rows are ingested. A slow bounded sweep revisits those rows
 * without treating them as application failures -- not a backfill that hammers
 * the API once and never runs again.
 */
function scheduleGuidelineFullText(db, logger, {
    intervalMs = Number(process.env.GUIDELINE_FULLTEXT_INTERVAL_MS) || 12 * 60 * 60 * 1000,
    limit = Number(process.env.GUIDELINE_FULLTEXT_BATCH_LIMIT) || 25,
} = {}) {
    if (intervalId) return;
    if (String(process.env.GUIDELINE_FULLTEXT_CRON_DISABLED || 'false').toLowerCase() === 'true') {
        logger.info('Guideline full-text scheduler disabled by GUIDELINE_FULLTEXT_CRON_DISABLED');
        return;
    }
    const tick = withCronHeartbeat('guideline-fulltext', async () => {
        const { isBackgroundAutomationPaused } = require('./backgroundAutomationService');
        if (await isBackgroundAutomationPaused(db)) return;
        const r = await refreshGuidelineFullText(db, { limit, log: logger });
        if (r.failed > 0) {
            logger.warn(r, 'Guideline full-text refresh had unexpected failures');
        } else if (r.upgraded > 0) {
            logger.info(r, 'Guideline full-text refresh completed');
        }
    }, { db, logger });
    intervalId = setInterval(tick, intervalMs);
    if (typeof intervalId.unref === 'function') intervalId.unref();
    // Offset from the other start-up sweeps so a cold boot does not fire every
    // scheduler at once.
    setTimeout(tick, 90_000);
    logger.info({ intervalMs, limit }, 'Guideline full-text scheduler started');
}

function stopGuidelineFullText() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

module.exports = { scheduleGuidelineFullText, stopGuidelineFullText };
