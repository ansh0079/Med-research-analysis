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
            await db.close();
            await db.closeVectorPool?.();
            if (cache && typeof cache.close === 'function') await cache.close();
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
        await db.connect();
        logger.info('Connected to database');

        const migrationResult = await db.runMigrations();

        startSavedEmbeddingWorker(db, getEmbeddingOptions(serverConfig));
        if (migrationResult.migrated > 0) {
            logger.info({ count: migrationResult.migrated }, 'Applied database migrations');
        }

        await cache.connect();

        const cleaned = await db.cleanExpiredCache();
        logger.info({ cleaned }, 'Cleaned expired cache entries');

        scheduleDigests(db, process.env.APP_URL || `http://localhost:${PORT}`, serverConfig, safeFetch);
        scheduleTopicRefresh(db, serverConfig, safeFetch, logger);
        scheduleKnowledgeDrift(db, serverConfig, safeFetch, logger);
        scheduleClaimRegeneration(db, { serverConfig, fetchImpl: safeFetch, cache }, logger);
        scheduleGuidelineWatchtower(db, logger);
        scheduleCurriculumSeed(db, { serverConfig, fetchImpl: safeFetch, cache }, logger);
        scheduleCollectiveMemory(db, logger);

        server.listen(PORT, () => {
            logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'Medical Research API Server ready');
        });
    } catch (error) {
        logger.fatal({ err: error }, 'Failed to start server');
        process.exit(1);
    }
}

if (require.main === module) {
    startServer();
}

module.exports = { app, server, io, startServer };
