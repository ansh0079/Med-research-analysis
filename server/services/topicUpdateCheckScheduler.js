'use strict';

const cron = require('node-cron');
const { withCronHeartbeat } = require('./cronHeartbeat');

let task = null;

/** Weekly: end a topic's monthly review early when a new guideline, new high-level evidence or a retraction appears. */
function scheduleTopicUpdateCheck(db, deps = {}, logger = console) {
    if (task) return task;
    // Sunday 04:30 UTC: quiet hours, after the nightly topic review at 03:30.
    const expression = process.env.TOPIC_UPDATE_CHECK_CRON || '30 4 * * 0';
    task = cron.schedule(expression, withCronHeartbeat('topic-update-check', async () => {
        const { isBackgroundAutomationPaused } = require('./backgroundAutomationService');
        if (await isBackgroundAutomationPaused(db)) {
            logger.info?.('Topic update check skipped: background automation paused');
            return;
        }
        const { runTopicUpdateCheck } = require('./search/topicUpdateCheckService');
        await runTopicUpdateCheck(db, { fetchImpl: deps.fetchImpl, serverConfig: deps.serverConfig, logger });
    }, { db, logger }), { timezone: 'UTC' });
    logger.info?.({ expression }, 'Topic update check scheduler started');
    return task;
}

function stopTopicUpdateCheck() {
    if (task) {
        task.stop();
        task = null;
    }
}

module.exports = { scheduleTopicUpdateCheck, stopTopicUpdateCheck };
