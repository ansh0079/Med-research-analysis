'use strict';

/**
 * Dedicated worker process — cron schedulers + BullMQ job consumers.
 * Set APP_ROLE=worker. Web process uses APP_ROLE=web (default in production PM2).
 */

const { loadEnv, serverConfig } = require('../config');
loadEnv();

const logger = require('./config/logger');
const db = require('../database');
const cache = require('../cache');
const authSecurityStore = require('./services/authSecurityStore');
const { safeFetch } = require('./utils/fetch');
const { getEmbeddingOptions } = require('./services/embeddingOptions');
const { startSavedEmbeddingWorker, stopSavedEmbeddingWorker } = require('./saved-embedding-worker');
const { registerAllJobHandlers } = require('./services/jobHandlers');
const { startWorkers, stopWorkers } = require('./services/jobQueue');
const { scheduleDigests, stopDigests } = require('./services/digestService');
const { scheduleTopicRefresh, stopTopicRefresh } = require('./services/topicRefreshScheduler');
const { scheduleKnowledgeDrift, stopKnowledgeDrift } = require('./services/knowledgeDriftService');
const { scheduleClaimRegeneration, stopClaimRegeneration } = require('./services/claimRegenerationScheduler');
const { scheduleGuidelineWatchtower, stopGuidelineWatchtower } = require('./services/guidelineWatchtowerScheduler');
const { scheduleCurriculumSeed, stopCurriculumSeed } = require('./services/curriculumSeedScheduler');
const { scheduleCollectiveMemory, stopCollectiveMemory } = require('./services/collectiveMemoryScheduler');
const { scheduleLearnerProfileRollup, stopLearnerProfileRollup } = require('./services/learnerProfileRollupScheduler');

const PORT = process.env.WORKER_HEALTH_PORT || 3003;
let healthServer = null;

async function startWorker() {
    await db.connect();
    await db.runMigrations();
    await cache.connect();
    await authSecurityStore.init({ database: db, redisUrl: process.env.REDIS_URL });

    const embeddingKeys = getEmbeddingOptions(serverConfig);
    startSavedEmbeddingWorker(db, embeddingKeys);

    const jobDeps = {
        db,
        cache,
        serverConfig,
        fetchImpl: safeFetch,
        embeddingKeys,
        logger,
    };
    registerAllJobHandlers(jobDeps);
    startWorkers(jobDeps);

    const appUrl = process.env.APP_URL || `http://localhost:${serverConfig.ports.node}`;
    scheduleDigests(db, appUrl, serverConfig, safeFetch);
    scheduleTopicRefresh(db, serverConfig, safeFetch, logger);
    scheduleKnowledgeDrift(db, serverConfig, safeFetch, logger);
    scheduleClaimRegeneration(db, { serverConfig, fetchImpl: safeFetch, cache }, logger);
    scheduleGuidelineWatchtower(db, logger);
    scheduleCurriculumSeed(db, { serverConfig, fetchImpl: safeFetch, cache }, logger);
    scheduleCollectiveMemory(db, logger);
    scheduleLearnerProfileRollup(db, logger);

    const http = require('http');
    healthServer = http.createServer((req, res) => {
        if (req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', role: 'worker' }));
            return;
        }
        res.writeHead(404);
        res.end();
    });
    healthServer.listen(PORT, () => {
        logger.info({ port: PORT }, 'Worker process ready (schedulers + BullMQ)');
    });
}

async function shutdown(signal) {
    logger.info({ signal }, 'Worker shutting down');
    if (healthServer) {
        await new Promise((resolve) => healthServer.close(resolve));
    }
    stopSavedEmbeddingWorker();
    stopDigests();
    stopTopicRefresh();
    stopKnowledgeDrift();
    stopClaimRegeneration();
    stopGuidelineWatchtower();
    stopCurriculumSeed();
    stopCollectiveMemory();
    stopLearnerProfileRollup();
    await stopWorkers();
    await db.close();
    await db.closeVectorPool?.();
    await cache.close();
    await authSecurityStore.close();
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

if (require.main === module) {
    startWorker().catch((err) => {
        logger.fatal({ err }, 'Worker failed to start');
        process.exit(1);
    });
}

module.exports = { startWorker, shutdown };
