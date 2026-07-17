'use strict';

const cron = require('node-cron');
const { reconcileImpressionRewards } = require('./personalizationBanditService');
const { withCronHeartbeat } = require('./cronHeartbeat');

let task = null;

function schedulePersonalizationBandit(db, logger = console) {
    if (task) return task;
    if (String(process.env.PERSONALIZATION_BANDIT_CRON_DISABLED || 'false').toLowerCase() === 'true') {
        logger.info?.('Personalization bandit scheduler disabled');
        return null;
    }

    const expression = process.env.PERSONALIZATION_BANDIT_CRON || '45 3 * * *';
    task = cron.schedule(expression, withCronHeartbeat('personalization-bandit', async () => {
        const result = await reconcileImpressionRewards(db, { days: 14 });
        logger.info?.({ result }, 'Personalization bandit reconciliation complete');
    }, { db, logger }), {
        timezone: process.env.TZ || 'UTC',
    });

    logger.info?.({ expression, timezone: process.env.TZ || 'UTC' }, 'Personalization bandit scheduler started');
    return task;
}

function stopPersonalizationBandit() {
    if (task) {
        task.stop();
        task = null;
    }
}

module.exports = { schedulePersonalizationBandit, stopPersonalizationBandit };
