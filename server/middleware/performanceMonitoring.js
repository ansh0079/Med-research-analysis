'use strict';

const logger = require('../config/logger');

/**
 * Performance Monitoring Middleware
 *
 * Tracks request performance and logs slow requests for optimization
 */

// Thresholds for performance warnings (milliseconds)
const THRESHOLDS = {
    SLOW_REQUEST: 3000,      // 3 seconds
    VERY_SLOW_REQUEST: 10000, // 10 seconds
    AI_OPERATION: 15000,     // 15 seconds for AI operations
    DATABASE_QUERY: 1000     // 1 second
};

/**
 * Request performance tracking middleware
 */
function performanceTracker(req, res, next) {
    const start = Date.now();
    const requestId = req.id || generateRequestId();

    req.requestId = requestId;
    req.startTime = start;

    // Track response
    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - start;
        const isAiRoute = req.path.includes('/api/ai/');
        const threshold = isAiRoute ? THRESHOLDS.AI_OPERATION : THRESHOLDS.SLOW_REQUEST;

        // Log performance metrics
        const logData = {
            requestId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            userId: req.user?.id,
            ip: req.ip,
            userAgent: req.get('user-agent')?.slice(0, 100)
        };

        if (duration > THRESHOLDS.VERY_SLOW_REQUEST) {
            logger.error({ ...logData, threshold: 'very_slow' }, 'Very slow request detected');
        } else if (duration > threshold) {
            logger.warn({ ...logData, threshold: 'slow' }, 'Slow request detected');
        } else if (process.env.LOG_ALL_REQUESTS === 'true') {
            logger.debug(logData, 'Request completed');
        }

        // Add performance headers
        res.setHeader('X-Response-Time', `${duration}ms`);
        res.setHeader('X-Request-ID', requestId);

        return originalSend.call(this, data);
    };

    next();
}

/**
 * Database query performance tracker
 */
function wrapDatabaseWithPerformanceTracking(db) {
    const originalRun = db.run.bind(db);
    const originalGet = db.get.bind(db);
    const originalAll = db.all.bind(db);

    db.run = async function(...args) {
        const start = Date.now();
        try {
            return await originalRun(...args);
        } finally {
            const duration = Date.now() - start;
            if (duration > THRESHOLDS.DATABASE_QUERY) {
                logger.warn({
                    query: String(args[0]).slice(0, 200),
                    duration,
                    operation: 'db.run'
                }, 'Slow database query');
            }
        }
    };

    db.get = async function(...args) {
        const start = Date.now();
        try {
            return await originalGet(...args);
        } finally {
            const duration = Date.now() - start;
            if (duration > THRESHOLDS.DATABASE_QUERY) {
                logger.warn({
                    query: String(args[0]).slice(0, 200),
                    duration,
                    operation: 'db.get'
                }, 'Slow database query');
            }
        }
    };

    db.all = async function(...args) {
        const start = Date.now();
        try {
            return await originalAll(...args);
        } finally {
            const duration = Date.now() - start;
            if (duration > THRESHOLDS.DATABASE_QUERY) {
                logger.warn({
                    query: String(args[0]).slice(0, 200),
                    duration,
                    operation: 'db.all'
                }, 'Slow database query');
            }
        }
    };

    return db;
}

/**
 * Memory usage monitoring
 */
function logMemoryUsage() {
    const usage = process.memoryUsage();
    const mb = (bytes) => Math.round(bytes / 1024 / 1024);

    logger.info({
        rss: `${mb(usage.rss)}MB`,
        heapTotal: `${mb(usage.heapTotal)}MB`,
        heapUsed: `${mb(usage.heapUsed)}MB`,
        external: `${mb(usage.external)}MB`
    }, 'Memory usage');

    // Warn if heap usage is over 80%
    const heapUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;
    if (heapUsagePercent > 80) {
        logger.warn({
            heapUsagePercent: Math.round(heapUsagePercent),
            heapUsed: `${mb(usage.heapUsed)}MB`,
            heapTotal: `${mb(usage.heapTotal)}MB`
        }, 'High memory usage detected');
    }
}

/**
 * Setup periodic memory monitoring
 */
function setupMemoryMonitoring(intervalMs = 60000) {
    setInterval(logMemoryUsage, intervalMs);
}

/**
 * Generates a unique request ID
 */
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Error tracking with context
 */
function errorTracker(err, req, res, next) {
    const duration = req.startTime ? Date.now() - req.startTime : 0;

    logger.error({
        error: {
            message: err.message,
            stack: err.stack,
            name: err.name
        },
        request: {
            id: req.requestId,
            method: req.method,
            path: req.path,
            duration,
            userId: req.user?.id,
            ip: req.ip
        }
    }, 'Request error');

    // Don't expose internal errors in production
    const isDev = process.env.NODE_ENV === 'development';
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        requestId: req.requestId,
        ...(isDev && { stack: err.stack })
    });
}

module.exports = {
    performanceTracker,
    wrapDatabaseWithPerformanceTracking,
    setupMemoryMonitoring,
    errorTracker,
    THRESHOLDS
};
