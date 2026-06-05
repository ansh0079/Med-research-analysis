const { rateLimit: createExpressRateLimit, ipKeyGenerator } = require('express-rate-limit');
const logger = require('../config/logger');
const client = require('prom-client');
const { createRedisClient } = require('../config/redisClient');

let rateLimitRedisClient = null;
let rateLimitStoreSeq = 0;
let metricsRegistry = null;
let rateLimitHitsCounter = null;
let rateLimitRejectionsCounter = null;

function initCounters() {
    if (!metricsRegistry || rateLimitHitsCounter) return;
    rateLimitHitsCounter = new client.Counter({
        name: 'rate_limit_hits_total',
        help: 'Number of requests that counted against a rate limit bucket',
        labelNames: ['route', 'type'],
        registers: [metricsRegistry],
    });
    rateLimitRejectionsCounter = new client.Counter({
        name: 'rate_limit_rejections_total',
        help: 'Number of requests rejected due to rate limiting',
        labelNames: ['route', 'type', 'status_code'],
        registers: [metricsRegistry],
    });
}

function setMetricsRegistry(registry) {
    metricsRegistry = registry;
    initCounters();
}

function recordHit(route, type) {
    initCounters();
    if (rateLimitHitsCounter) rateLimitHitsCounter.inc({ route, type });
}

function recordRejection(route, type, statusCode) {
    initCounters();
    if (rateLimitRejectionsCounter) rateLimitRejectionsCounter.inc({ route, type, status_code: String(statusCode) });
}

function getRateLimitRedisClient() {
    if (!process.env.REDIS_URL) return null;
    if (rateLimitRedisClient) return rateLimitRedisClient;
    rateLimitRedisClient = createRedisClient('rate-limit', {
        maxRetriesPerRequest: 2,
        enableReadyCheck: true,
    });
    logger.info('Redis-backed rate limiting enabled');
    return rateLimitRedisClient;
}

function getRateLimitStore() {
    if (!process.env.REDIS_URL) return undefined;
    try {
        const { RedisStore } = require('rate-limit-redis');
        const redisClient = getRateLimitRedisClient();
        if (!redisClient) return undefined;
        rateLimitStoreSeq += 1;
        return new RedisStore({
            prefix: `medresearch:ratelimit:${rateLimitStoreSeq}:`,
            sendCommand: (...args) => redisClient.call(...args),
        });
    } catch (error) {
        logger.warn({ err: error }, 'Redis rate-limit store unavailable, falling back to memory store');
        return undefined;
    }
}

if (!process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
    logger.warn('REDIS_URL is not set; rate limits are per-process and will not be shared across instances');
}

/**
 * Returns an Express middleware that enforces a rate limit.
 * In test mode uses the in-memory cache to avoid Redis dependency.
 */
function rateLimit(maxRequests, windowSeconds) {
    if (process.env.NODE_ENV === 'test') {
        const cache = require('../../cache');
        return async (req, res, next) => {
            const key = `${req.ip}:${req.path}`;
            const result = await cache.checkRateLimit(key, maxRequests, windowSeconds);

            res.setHeader('X-RateLimit-Limit', maxRequests);
            res.setHeader('X-RateLimit-Remaining', result.remaining);
            res.setHeader('X-RateLimit-Reset', result.resetTime);

            recordHit(req.path, 'ip');
            if (!result.allowed) {
                recordRejection(req.path, 'ip', 429);
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
                });
            }
            next();
        };
    }

    return createExpressRateLimit({
        windowMs: windowSeconds * 1000,
        limit: maxRequests,
        standardHeaders: false,
        legacyHeaders: true,
        store: getRateLimitStore(),
        handler: (req, res) => {
            recordHit(req.path, 'ip');
            recordRejection(req.path, 'ip', 429);
            res.status(429).json({
                error: 'Rate limit exceeded',
                retryAfter: req.rateLimit?.resetTime
                    ? Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000)
                    : windowSeconds,
            });
        },
    });
}

/**
 * Per-authenticated-user rate limiter for AI-heavy endpoints.
 * Falls back to IP-based limiting for unauthenticated requests.
 *
 * @param {number} maxRequests   - Max calls per window
 * @param {number} windowSeconds - Window size in seconds
 */
function userRateLimit(maxRequests, windowSeconds) {
    if (process.env.NODE_ENV === 'test') {
        return rateLimit(maxRequests, windowSeconds);
    }

    return createExpressRateLimit({
        windowMs: windowSeconds * 1000,
        limit: maxRequests,
        standardHeaders: false,
        legacyHeaders: true,
        store: getRateLimitStore(),
        keyGenerator: (req) => {
            // Prefer user ID so different IPs from the same account share quota
            const uid = req.user?.id || req.user?.sub;
            return uid ? `user:${uid}` : `ip:${ipKeyGenerator(req.ip)}`;
        },
        handler: (req, res) => {
            const type = req.user?.id || req.user?.sub ? 'user' : 'ip';
            recordHit(req.path, type);
            recordRejection(req.path, type, 429);
            res.status(429).json({
                error: 'AI rate limit exceeded — please wait before making another request',
                retryAfter: req.rateLimit?.resetTime
                    ? Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000)
                    : windowSeconds,
            });
        },
    });
}

function createSlowDown(windowSeconds, delayAfter, baseDelayMs) {
    try {
        const slowDown = require('express-slow-down');
        return slowDown({
            windowMs: windowSeconds * 1000,
            delayAfter,
            delayMs: (used) => {
                const extra = used - delayAfter;
                if (extra <= 0) return 0;
                return Math.min(extra * baseDelayMs, 2000);
            },
            store: getRateLimitStore(),
            keyGenerator: (req) => {
                const uid = req.user?.id || req.user?.sub;
                return uid ? `user:${uid}` : `ip:${ipKeyGenerator(req.ip)}`;
            },
        });
    } catch (_err) {
        logger.warn('express-slow-down not installed; skipping progressive delay middleware');
        return (req, res, next) => next();
    }
}

module.exports = { rateLimit, userRateLimit, setMetricsRegistry, createSlowDown };
