'use strict';

const cron = require('node-cron');
const { withCronHeartbeat } = require('./cronHeartbeat');

let task = null;

function scheduleSearchPrewarm(db, deps = {}, logger = console) {
    if (task) return task;
    if (process.env.SEARCH_PREWARM_CRON_DISABLED === 'true') {
        logger.info?.('Search prewarm scheduler disabled');
        return null;
    }

    // 03:30 UTC: quiet hours, and after the 03:00-04:00 flagship jobs have settled.
    const expression = process.env.SEARCH_PREWARM_CRON || '30 3 * * *';
    task = cron.schedule(expression, withCronHeartbeat('search-prewarm', async () => {
        const { isBackgroundAutomationPaused } = require('./backgroundAutomationService');
        if (await isBackgroundAutomationPaused(db)) {
            logger.info?.('Search prewarm skipped: background automation paused');
            return;
        }
        const { runSearchPrewarm } = require('./search/searchPrewarmService');
        await runSearchPrewarm(db, {
            cache: deps.cache || null,
            serverConfig: deps.serverConfig,
            fetchImpl: deps.fetchImpl,
            logger,
        });
    }, { db, logger }), { timezone: 'UTC' });

    logger.info?.({ expression }, 'Search prewarm scheduler started');
    return task;
}

function stopSearchPrewarm() {
    if (task) {
        task.stop();
        task = null;
    }
}

module.exports = { scheduleSearchPrewarm, stopSearchPrewarm };
