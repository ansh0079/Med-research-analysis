// ==========================================
// HTTP server entry point
// ==========================================

const { loadEnv, serverConfig } = require('./config');
loadEnv();
require('./server/config/otel').startOpenTelemetry();

const logger = require('./server/config/logger');
const db = require('./database');
const cache = require('./cache');
const { app, server, io } = require('./app');
const { startSavedEmbeddingWorker, stopSavedEmbeddingWorker } = require('./server/saved-embedding-worker');
const { getEmbeddingOptions } = require('./server/services/embeddingOptions');
const { buildSchedulerRegistry, startAllSchedulers, stopAllSchedulers } = require('./server/services/schedulerRegistry');
const authSecurityStore = require('./server/services/authSecurityStore');
const { safeFetch } = require('./server/utils/fetch');

const PORT = serverConfig.ports.node;

// ==========================================
// Graceful shutdown
// ==========================================

let isShuttingDown = false;
let schedulerRegistryRef = null;

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
            stopAllSchedulers(schedulerRegistryRef || []);
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

        if (runSchedulers) {
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
            const registry = buildSchedulerRegistry({
                db,
                serverConfig,
                fetchImpl: safeFetch,
                cache,
                appUrl: process.env.APP_URL || `http://localhost:${PORT}`,
            });
            startAllSchedulers(registry);
            // Stash for graceful shutdown — see gracefulShutdown below.
            schedulerRegistryRef = registry;
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
