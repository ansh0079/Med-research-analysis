const cron = require('node-cron');
const { rollupAllLearnerProfiles } = require('./learnerProfileRollupService');

let task = null;

function scheduleLearnerProfileRollup(db, logger = console) {
    if (task) return task;
    if (process.env.LEARNER_PROFILE_ROLLUP_CRON_DISABLED === 'true') {
        logger.info?.('Learner profile rollup scheduler disabled');
        return null;
    }

    const expression = process.env.LEARNER_PROFILE_ROLLUP_CRON || '30 3 * * *';
    task = cron.schedule(expression, async () => {
        try {
            const days = Math.min(Math.max(parseInt(process.env.LEARNER_PROFILE_ROLLUP_DAYS || '30', 10) || 30, 7), 180);
            const result = await rollupAllLearnerProfiles(db, { days });
            logger.info?.({ result, days }, 'Learner profile rollup complete');
        } catch (err) {
            logger.error?.({ err }, 'Learner profile rollup failed');
        }
    }, {
        timezone: process.env.TZ || 'UTC',
    });

    logger.info?.({ expression, timezone: process.env.TZ || 'UTC' }, 'Learner profile rollup scheduler started');
    return task;
}

function stopLearnerProfileRollup() {
    if (task) {
        task.stop();
        task = null;
    }
}

module.exports = { scheduleLearnerProfileRollup, stopLearnerProfileRollup };
