'use strict';

const logger = require('./logger');

function parseIntEnv(name, fallback) {
    const raw = Number(process.env[name]);
    return Number.isFinite(raw) && raw >= 0 ? raw : fallback;
}

function buildRedisOptions(overrides = {}) {
    const url = overrides.url || process.env.REDIS_URL || '';
    const connectTimeout = parseIntEnv('REDIS_CONNECT_TIMEOUT_MS', 10000);
    const commandTimeout = parseIntEnv('REDIS_COMMAND_TIMEOUT_MS', 5000);
    const maxRetriesPerRequest = Object.prototype.hasOwnProperty.call(overrides, 'maxRetriesPerRequest')
        ? overrides.maxRetriesPerRequest
        : parseIntEnv('REDIS_MAX_RETRIES_PER_REQUEST', 3);

    return {
        connectTimeout,
        commandTimeout,
        enableReadyCheck: overrides.enableReadyCheck ?? true,
        maxRetriesPerRequest,
        retryStrategy(times) {
            const maxDelay = parseIntEnv('REDIS_RETRY_MAX_DELAY_MS', 2000);
            return Math.min(times * 100, maxDelay);
        },
        reconnectOnError(err) {
            const message = String(err?.message || '');
            return /READONLY|ETIMEDOUT|ECONNRESET|ECONNREFUSED/i.test(message);
        },
        ...(url.startsWith('rediss://') ? { tls: {} } : {}),
        ...overrides,
        url: undefined,
    };
}

function createRedisClient(name, overrides = {}) {
    const url = overrides.url || process.env.REDIS_URL;
    if (!url) return null;

    const Redis = require('ioredis');
    const client = new Redis(url, buildRedisOptions(overrides));

    client.on('error', (err) => {
        logger.warn({ err, redisClient: name }, 'Redis client error');
    });
    client.on('connect', () => {
        logger.info({ redisClient: name }, 'Redis client connected');
    });
    client.on('end', () => {
        logger.warn({ redisClient: name }, 'Redis client disconnected');
    });

    return client;
}

module.exports = { buildRedisOptions, createRedisClient };
