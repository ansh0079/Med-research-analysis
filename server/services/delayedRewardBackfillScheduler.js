'use strict';

const cron = require('node-cron');
const { runDelayedRewardBackfill } = require('./learning/delayedRewardBackfillService');
const { withCronHeartbeat } = require('./cronHeartbeat');

let task = null;

function scheduleDelayedRewardBackfill(db, logger = console) {
    if (task) return task;
    if (String(process.env.DELAYED_REWARD_BACKFILL_CRON_DISABLED || 'false').toLowerCase() === 'true') {
        logger.info?.('Delayed reward backfill scheduler disabled');
        return null;
    }
    const expression = process.env.DELAYED_REWARD_BACKFILL_CRON || '15 4 * * *';
    task = cron.schedule(expression, withCronHeartbeat('delayed-reward-backfill', async () => {
        const result = await runDelayedRewardBackfill(db, { daysLookback: 14, limit: 300 });
        logger.info?.({ result }, 'Delayed reward backfill complete');
    }, { db, logger }), {
        timezone: process.env.TZ || 'UTC',
    });
    logger.info?.({ expression }, 'Delayed reward backfill scheduler started');
    return task;
}

function stopDelayedRewardBackfill() {
    if (task) {
        task.stop();
        task = null;
    }
}

module.exports = { scheduleDelayedRewardBackfill, stopDelayedRewardBackfill };
