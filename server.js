// ==========================================
// HTTP server entry point
// ==========================================

const { loadEnv, serverConfig } = require('./config');
loadEnv();

const logger = require('./server/config/logger');
const db = require('./database');
const cache = require('./cache');
const { app, server, io } = require('./app');
const { startSavedEmbeddingWorker, stopSavedEmbeddingWorker } = require('./server/saved-embedding-worker');
const { getEmbeddingOptions } = require('./server/services/embeddingOptions');
const { scheduleDigests, stopDigests } = require('./server/services/digestService');
const { scheduleTopicRefresh, stopTopicRefresh } = require('./server/services/topicRefreshScheduler');
const { scheduleKnowledgeDrift, stopKnowledgeDrift } = require('./server/services/knowledgeDriftService');
const { scheduleClaimRegeneration, stopClaimRegeneration } = require('./server/services/claimRegenerationScheduler');
const { scheduleGuidelineWatchtower, stopGuidelineWatchtower } = require('./server/services/guidelineWatchtowerScheduler');
const { scheduleCurriculumSeed, stopCurriculumSeed } = require('./server/services/curriculumSeedScheduler');
const { scheduleCollectiveMemory, stopCollectiveMemory } = require('./server/services/collectiveMemoryScheduler');
const { scheduleLearnerProfileRollup, stopLearnerProfileRollup } = require('./server/services/learnerProfileRollupScheduler');
const authSecurityStore = require('./server/services/authSecurityStore');
const { safeFetch } = require('./server/utils/fetch');

const PORT = serverConfig.ports.node;

// ==========================================
// Graceful shutdown
// ==========================================

let isShuttingDown = false;

async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info({ signal }, 'Initiating graceful shutdown');

    io.close(() => logger.info('Socket.IO connections closed'));

    const SHUTDOWN_TIMEOUT = 15000;
    const shutdownTimer = setTimeout(() => {
        logger.error('Graceful shutdown timed out, forcing exit');
        process.exit(1);
    }, SHUTDOWN_TIMEOUT);

    server.close(async () => {
        clearTimeout(shutdownTimer);
        logger.info('HTTP server closed');
        try {
            stopSavedEmbeddingWorker();
            stopDigests();
            stopTopicRefresh();
            stopKnowledgeDrift();
            stopClaimRegeneration();
            stopGuidelineWatchtower();
            stopCurriculumSeed();
            stopCollectiveMemory();
            stopLearnerProfileRollup();
            const { stopWorkers } = require('./server/services/jobQueue');
            await stopWorkers();
            await db.close();
            await db.closeVectorPool?.();
            if (cache && typeof cache.close === 'function') await cache.close();
            await authSecurityStore.close();
            logger.info('Persistence and cache layers closed');
            process.exit(0);
        } catch (err) {
            logger.error({ err }, 'Error during shutdown');
            process.exit(1);
        }
    });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ==========================================
// Process error handling
// ==========================================

// Uncaught exceptions represent a fundamentally unknown state.
// Do NOT attempt graceful shutdown — log and crash fast to avoid corruption.
process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
});

// Unhandled rejections should be logged but not crash the process in production.
// Since Node 15+ the default is to warn; we preserve that behavior to avoid
// taking down the server over a single rejected promise in a background task.
process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason }, 'Unhandled promise rejection');
    // Attach a catch handler to the promise so Node does not escalate to fatal
    if (promise && typeof promise.catch === 'function') {
        promise.catch((err) => {
            logger.error({ err }, 'Unhandled rejection caught late');
        });
    }
});

// ==========================================
// Startup
// ==========================================

async function startServer() {
    try {
        const appRole = process.env.APP_ROLE || (process.env.NODE_ENV === 'production' ? 'web' : 'all');
        const runSchedulers = appRole === 'worker' || appRole === 'all';
        const runHttp = appRole === 'web' || appRole === 'all';

        await db.connect();
        logger.info('Connected to database');

        const { registerInteractionHandlers } = require('./server/services/userInteractionService');
        registerInteractionHandlers({ db, logger });

        const migrationResult = await db.runMigrations();

        if (runHttp) {
            startSavedEmbeddingWorker(db, getEmbeddingOptions(serverConfig));
        }
        if (migrationResult.migrated > 0) {
            logger.info({ count: migrationResult.migrated }, 'Applied database migrations');
        }

        await cache.connect();
        await authSecurityStore.init({ database: db, redisUrl: process.env.REDIS_URL });

        const jobDeps = {
            db,
            cache,
            serverConfig,
            fetchImpl: safeFetch,
            embeddingKeys: getEmbeddingOptions(serverConfig),
            logger,
        };
        const { registerAllJobHandlers } = require('./server/services/jobHandlers');
        registerAllJobHandlers(jobDeps);

        if ((appRole === 'worker' || appRole === 'all') && process.env.NODE_ENV !== 'test') {
            const { startWorkers } = require('./server/services/jobQueue');
            startWorkers(jobDeps);
        }

        const cleaned = await db.cleanExpiredCache();
        logger.info({ cleaned }, 'Cleaned expired cache entries');

        if (runSchedulers) {
            // Each scheduler gets a child logger pre-bound with its task name.
            // This means every log line emitted by that scheduler includes
            // { task: '...' }, making background logs trivially filterable in
            // any log aggregator (Datadog, Grafana, Loki, etc.).
            scheduleDigests(db, process.env.APP_URL || `http://localhost:${PORT}`, serverConfig, safeFetch,
                logger.child({ task: 'digest-scheduler' }));
            scheduleTopicRefresh(db, serverConfig, safeFetch,
                logger.child({ task: 'topic-refresh' }));
            scheduleKnowledgeDrift(db, serverConfig, safeFetch,
                logger.child({ task: 'knowledge-drift' }));
            scheduleClaimRegeneration(db, { serverConfig, fetchImpl: safeFetch, cache },
                logger.child({ task: 'claim-regeneration' }));
            scheduleGuidelineWatchtower(db,
                logger.child({ task: 'guideline-watchtower' }));
            scheduleCurriculumSeed(db, { serverConfig, fetchImpl: safeFetch, cache },
                logger.child({ task: 'curriculum-seed' }));
            scheduleCollectiveMemory(db,
                logger.child({ task: 'collective-memory' }));
            scheduleLearnerProfileRollup(db,
                logger.child({ task: 'learner-profile-rollup' }));
        }

        if (runHttp) {
            server.listen(PORT, () => {
                logger.info({ port: PORT, env: process.env.NODE_ENV || 'development', appRole }, 'Medical Research API Server ready');
            });
        } else {
            logger.info({ appRole }, 'Process started without HTTP listener');
        }
    } catch (error) {
        logger.fatal({ err: error }, 'Failed to start server');
        process.exit(1);
    }
}

if (require.main === module) {
    startServer();
}

module.exports = { app, server, io, startServer };
