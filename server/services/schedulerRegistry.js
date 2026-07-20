'use strict';

/**
 * Central registry of background schedulers so that `server.js` (the web
 * process) and `server/worker.js` (the dedicated worker) start and stop the
 * same set of schedulers from a single source of truth.
 *
 * Previously each file declared its own start list and its own stop list,
 * which had already drifted: the worker was missing `scheduleQueueFailureDigest`
 * and `scheduleLearningQualityEval`, and adding a new scheduler required editing
 * two files in three places (imports + start + stop).
 *
 * Each entry registers a `schedule` function and a `stop` function. The
 * registry calls them with a consistent child logger carrying `task: <name>`.
 */

const logger = require('../config/logger');

const {
    scheduleDigests, stopDigests,
} = require('./digestService');
const {
    scheduleTopicRefresh, stopTopicRefresh,
} = require('./topicRefreshScheduler');
const {
    scheduleKnowledgeDrift, stopKnowledgeDrift,
} = require('./knowledgeDriftService');
const {
    scheduleClaimRegeneration, stopClaimRegeneration,
} = require('./claimRegenerationScheduler');
const {
    scheduleGuidelineWatchtower, stopGuidelineWatchtower,
} = require('./guidelineWatchtowerScheduler');
const {
    scheduleCurriculumSeed, stopCurriculumSeed,
} = require('./curriculumSeedScheduler');
const {
    scheduleCollectiveMemory, stopCollectiveMemory,
} = require('./collectiveMemoryScheduler');
const {
    scheduleLearnerProfileRollup, stopLearnerProfileRollup,
} = require('./learnerProfileRollupScheduler');
const {
    schedulePersonalizationBandit, stopPersonalizationBandit,
} = require('./personalizationBanditScheduler');
const {
    scheduleQueueFailureDigest, stopQueueFailureDigest,
} = require('./queueFailureDigestService');
const {
    scheduleLearningQualityEval, stopLearningQualityEval,
} = require('./learningQualityEvalScheduler');
const {
    scheduleFlagshipEnrich, stopFlagshipEnrich,
} = require('./flagshipEnrichScheduler');
const {
    scheduleZombieSweep, stopZombieSweep,
} = require('./zombieJobSweeper');

/**
 * @typedef {Object} SchedulerEntry
 * @property {string} task  - stable task name used for the child logger
 * @property {function} start
 * @property {function} stop
 */

/**
 * Build the canonical scheduler list. Each scheduler receives a child logger
 * pre-bound with its task name so log aggregators can filter by scheduler.
 *
 * @param {object} deps
 * @param {object} deps.db
 * @param {object} deps.serverConfig
 * @param {function} deps.fetchImpl
 * @param {object} deps.cache
 * @param {string} [deps.appUrl]
 * @param {object} [deps.parentLogger] - override the default logger if desired
 * @returns {SchedulerEntry[]}
 */
function buildSchedulerRegistry({ db, serverConfig, fetchImpl, cache, appUrl, parentLogger = logger }) {
    const baseLogger = parentLogger;
    return [
        {
            task: 'digest-scheduler',
            start: () => scheduleDigests(db, appUrl || '', serverConfig, fetchImpl, baseLogger.child({ task: 'digest-scheduler' })),
            stop: () => stopDigests(),
        },
        {
            task: 'topic-refresh',
            start: () => scheduleTopicRefresh(db, serverConfig, fetchImpl, baseLogger.child({ task: 'topic-refresh' })),
            stop: () => stopTopicRefresh(),
        },
        {
            task: 'knowledge-drift',
            start: () => scheduleKnowledgeDrift(db, serverConfig, fetchImpl, baseLogger.child({ task: 'knowledge-drift' })),
            stop: () => stopKnowledgeDrift(),
        },
        {
            task: 'claim-regeneration',
            start: () => scheduleClaimRegeneration(db, { serverConfig, fetchImpl, cache }, baseLogger.child({ task: 'claim-regeneration' })),
            stop: () => stopClaimRegeneration(),
        },
        {
            task: 'guideline-watchtower',
            start: () => scheduleGuidelineWatchtower(db, baseLogger.child({ task: 'guideline-watchtower' })),
            stop: () => stopGuidelineWatchtower(),
        },
        {
            task: 'curriculum-seed',
            start: () => scheduleCurriculumSeed(db, { serverConfig, fetchImpl, cache }, baseLogger.child({ task: 'curriculum-seed' })),
            stop: () => stopCurriculumSeed(),
        },
        {
            task: 'collective-memory',
            start: () => scheduleCollectiveMemory(db, baseLogger.child({ task: 'collective-memory' })),
            stop: () => stopCollectiveMemory(),
        },
        {
            task: 'learner-profile-rollup',
            start: () => scheduleLearnerProfileRollup(db, baseLogger.child({ task: 'learner-profile-rollup' })),
            stop: () => stopLearnerProfileRollup(),
        },
        {
            task: 'personalization-bandit',
            start: () => schedulePersonalizationBandit(db, baseLogger.child({ task: 'personalization-bandit' })),
            stop: () => stopPersonalizationBandit(),
        },
        {
            task: 'queue-failure-digest',
            start: () => scheduleQueueFailureDigest(baseLogger.child({ task: 'queue-failure-digest' })),
            stop: () => stopQueueFailureDigest(),
        },
        {
            task: 'learning-quality-eval',
            start: () => scheduleLearningQualityEval(baseLogger.child({ task: 'learning-quality-eval' })),
            stop: () => stopLearningQualityEval(),
        },
        {
            task: 'flagship-enrich',
            start: () => scheduleFlagshipEnrich(db, { cache }, baseLogger.child({ task: 'flagship-enrich' })),
            stop: () => stopFlagshipEnrich(),
        },
        {
            task: 'zombie-job-sweep',
            start: () => scheduleZombieSweep(db, baseLogger.child({ task: 'zombie-job-sweep' })),
            stop: () => stopZombieSweep(),
        },
    ];
}

/**
 * Start all registered schedulers.
 * @param {SchedulerEntry[]} registry
 */
function startAllSchedulers(registry) {
    for (const entry of registry) {
        try {
            entry.start();
        } catch (err) {
            logger.error({ err, task: entry.task }, 'Failed to start scheduler');
        }
    }
}

/**
 * Stop all registered schedulers. Logs but does not rethrow individual stop
 * failures so one failing stop does not prevent the rest from running.
 * @param {SchedulerEntry[]} registry
 */
function stopAllSchedulers(registry) {
    for (const entry of registry) {
        try {
            entry.stop();
        } catch (err) {
            logger.error({ err, task: entry.task }, 'Failed to stop scheduler');
        }
    }
}

module.exports = {
    buildSchedulerRegistry,
    startAllSchedulers,
    stopAllSchedulers,
};
