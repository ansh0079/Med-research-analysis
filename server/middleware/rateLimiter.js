const { rateLimit: createExpressRateLimit } = require('express-rate-limit');
const logger = require('../config/logger');

let rateLimitStore;

if (process.env.REDIS_URL) {
    try {
        const { RedisStore } = require('rate-limit-redis');
        const Redis = require('ioredis');
        const redisClient = new Redis(process.env.REDIS_URL);
        rateLimitStore = new RedisStore({
            sendCommand: (...args) => redisClient.call(...args),
        });
        logger.info('Redis-backed rate limiting enabled');
    } catch (error) {
        logger.warn({ err: error }, 'Redis rate-limit store unavailable, falling back to memory store');
    }
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

            if (!result.allowed) {
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
        store: rateLimitStore,
        handler: (req, res) => {
            res.status(429).json({
                error: 'Rate limit exceeded',
                retryAfter: req.rateLimit?.resetTime
                    ? Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000)
                    : windowSeconds,
            });
        },
    });
}

module.exports = { rateLimit };
