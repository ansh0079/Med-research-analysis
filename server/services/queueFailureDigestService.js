'use strict';

const cron = require('node-cron');
const logger = require('../config/logger');
const { getRecurringFailedJobs } = require('./jobQueue');
const { updateRecurringFailureMetrics } = require('./observabilityMetrics');

let scheduledJob = null;

function formatQueueFailureDigest(items = []) {
    if (!items.length) {
        return 'No recurring BullMQ failures were found in the retained failed-job window.';
    }
    return items.map((item) => (
        `${item.queue}/${item.jobName}: ${item.count} failures; latest=${item.latestFailedAt || 'unknown'}; reason=${item.failedReason || 'unknown'}; samples=${item.sampleJobIds.join(',')}`
    )).join('\n');
}

async function runQueueFailureDigest({ log = logger } = {}) {
    const recurringFailures = await getRecurringFailedJobs({ limitPerQueue: 200, minCount: 2 });
    updateRecurringFailureMetrics(recurringFailures);
    if (recurringFailures.length > 0) {
        log.warn({
            recurringFailureCount: recurringFailures.length,
            recurringFailures: recurringFailures.slice(0, 20),
        }, 'Recurring BullMQ failures detected');
    } else {
        log.info('Queue failure digest clean');
    }
    return {
        generatedAt: new Date().toISOString(),
        recurringFailures,
        text: formatQueueFailureDigest(recurringFailures),
    };
}

function scheduleQueueFailureDigest(log = logger) {
    if (scheduledJob) scheduledJob.stop();
    scheduledJob = cron.schedule('0 8 * * 1', () => {
        runQueueFailureDigest({ log }).catch((err) => {
            log.warn({ err }, 'Queue failure digest failed');
        });
    }, {
        scheduled: true,
        timezone: process.env.TZ || 'UTC',
    });
    log.info('Queue failure digest scheduler active (weekly Monday 08:00 UTC)');
}

function stopQueueFailureDigest() {
    if (scheduledJob) {
        scheduledJob.stop();
        scheduledJob = null;
    }
}

module.exports = {
    formatQueueFailureDigest,
    runQueueFailureDigest,
    scheduleQueueFailureDigest,
    stopQueueFailureDigest,
};
