const cron = require('node-cron');
const { aggregateCollectiveMemory } = require('./collectiveMemoryService');
const { withCronHeartbeat } = require('./cronHeartbeat');

let task = null;

function scheduleCollectiveMemory(db, logger = console) {
    if (task) return task;
    if (process.env.COLLECTIVE_MEMORY_CRON_DISABLED === 'true') {
        logger.info?.('Collective memory scheduler disabled');
        return null;
    }

    const expression = process.env.COLLECTIVE_MEMORY_CRON || '15 2 * * *';
    task = cron.schedule(expression, withCronHeartbeat('collective-memory', async () => {
        const result = await aggregateCollectiveMemory(db);
        logger.info?.({ result }, 'Collective memory aggregation complete');
    }, { db, logger }), {
        timezone: process.env.TZ || 'UTC',
    });

    logger.info?.({ expression, timezone: process.env.TZ || 'UTC' }, 'Collective memory scheduler started');
    return task;
}

function stopCollectiveMemory() {
    if (task) {
        task.stop();
        task = null;
    }
}

module.exports = { scheduleCollectiveMemory, stopCollectiveMemory };
