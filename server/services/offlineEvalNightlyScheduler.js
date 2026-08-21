'use strict';

const cron = require('node-cron');
const { runNightlyOfflineEval } = require('./ops/offlineEvalNightlyService');
const { withCronHeartbeat } = require('./cronHeartbeat');

let task = null;

function scheduleOfflineEvalNightly(db, logger = console) {
    if (task) return task;
    if (String(process.env.OFFLINE_EVAL_CRON_DISABLED || 'false').toLowerCase() === 'true') {
        logger.info?.('Offline eval nightly scheduler disabled');
        return null;
    }
    const expression = process.env.OFFLINE_EVAL_CRON || '30 5 * * *';
    task = cron.schedule(expression, withCronHeartbeat('offline-eval-nightly', async () => {
        const result = await runNightlyOfflineEval(db, { days: 30 });
        logger.info?.({
            recommendation: result.recommendation,
            labelledCount: result.labelledCount,
            servingArmId: result.servingArmId,
            bestShadowArmId: result.bestShadowArmId,
        }, 'Offline eval nightly complete');
    }, { db, logger }), {
        timezone: process.env.TZ || 'UTC',
    });
    logger.info?.({ expression }, 'Offline eval nightly scheduler started');
    return task;
}

function stopOfflineEvalNightly() {
    if (task) {
        task.stop();
        task = null;
    }
}

module.exports = { scheduleOfflineEvalNightly, stopOfflineEvalNightly };
