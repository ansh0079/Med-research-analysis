'use strict';

const crypto = require('crypto');
const logger = require('../config/logger');
const { createRedisClient } = require('../config/redisClient');

const REDIS_PREFIX = 'medsearch:auth:';
const REVOCATION_TTL_SEC = 7 * 24 * 60 * 60;

const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

const RESET_MAX_ATTEMPTS = 5;
const RESET_WINDOW_MS = 15 * 60 * 1000;

let redis = null;
let db = null;
let initPromise = null;

async function ensureReady() {
    if (redis || db) return;
    if (!initPromise) {
        initPromise = (async () => {
            try {
                const database = require('../../database');
                if (database && (database.kysely || database._bs || database.pool)) {
                    await init({ database, redisUrl: process.env.REDIS_URL });
                }
            } catch (err) {
                logger.warn({ err }, 'Auth security store lazy init failed');
            }
        })();
    }
    await initPromise;
}

function tokenHash(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function nowIso() {
    return new Date().toISOString();
}

async function init({ database, redisUrl } = {}) {
    db = database || null;
    if (redisUrl) {
        try {
            redis = createRedisClient('auth-security', {
                url: redisUrl,
                maxRetriesPerRequest: 3,
            });
            await redis.ping();
            logger.info('Auth security store: Redis enabled');
        } catch (err) {
            logger.warn({ err }, 'Auth security Redis unavailable; using database fallback');
            redis = null;
        }
    } else {
        logger.info('Auth security store: database fallback (REDIS_URL not set)');
    }
}

async function close() {
    if (redis) {
        await redis.quit().catch(() => {});
        redis = null;
    }
}

async function revokeToken(token) {
    await ensureReady();
    if (!token) return;
    const hash = tokenHash(token);
    const expiresAt = new Date(Date.now() + REVOCATION_TTL_SEC * 1000).toISOString();

    if (redis) {
        await redis.setex(`${REDIS_PREFIX}revoked:${hash}`, REVOCATION_TTL_SEC, '1');
        return;
    }
    if (db) {
        await db.run(
            `INSERT INTO revoked_tokens (token_hash, revoked_at, expires_at)
             VALUES (?, ?, ?)
             ON CONFLICT(token_hash) DO UPDATE SET
               revoked_at = excluded.revoked_at,
               expires_at = excluded.expires_at`,
            [hash, nowIso(), expiresAt]
        );
    }
}

async function isTokenRevoked(token) {
    await ensureReady();
    if (!token) return false;
    const hash = tokenHash(token);

    if (redis) {
        const value = await redis.get(`${REDIS_PREFIX}revoked:${hash}`);
        return value === '1';
    }
    if (db) {
        const row = await db.get(
            `SELECT 1 AS hit FROM revoked_tokens WHERE token_hash = ? AND expires_at > ?`,
            [hash, nowIso()]
        );
        return Boolean(row?.hit);
    }
    return false;
}

async function incrementRateLimit(kind, email, { windowMs }) {
    await ensureReady();
    const key = `${kind}:${String(email || '').toLowerCase()}`;
    const windowSec = Math.max(1, Math.ceil(windowMs / 1000));

    if (redis) {
        const redisKey = `${REDIS_PREFIX}rl:${key}`;
        const count = await redis.incr(redisKey);
        if (count === 1) {
            await redis.expire(redisKey, windowSec);
        }
        return count;
    }
    if (db) {
        const now = Date.now();
        const row = await db.get(
            `SELECT attempt_count, window_start FROM auth_rate_limits WHERE limit_key = ?`,
            [key]
        );
        const windowStartMs = row?.window_start ? Date.parse(row.window_start) : null;
        if (!row || !windowStartMs || now - windowStartMs > windowMs) {
            await db.run(
                `INSERT INTO auth_rate_limits (limit_key, attempt_count, window_start, updated_at)
                 VALUES (?, 1, ?, ?)
                 ON CONFLICT(limit_key) DO UPDATE SET
                   attempt_count = 1,
                   window_start = excluded.window_start,
                   updated_at = excluded.updated_at`,
                [key, nowIso(), nowIso()]
            );
            return 1;
        }
        const nextCount = Number(row.attempt_count || 0) + 1;
        await db.run(
            `UPDATE auth_rate_limits SET attempt_count = ?, updated_at = ? WHERE limit_key = ?`,
            [nextCount, nowIso(), key]
        );
        return nextCount;
    }
    return 1;
}

async function getRateLimitCount(kind, email, { windowMs }) {
    await ensureReady();
    const key = `${kind}:${String(email || '').toLowerCase()}`;

    if (redis) {
        const redisKey = `${REDIS_PREFIX}rl:${key}`;
        const raw = await redis.get(redisKey);
        return raw ? Number(raw) : 0;
    }
    if (db) {
        const row = await db.get(
            `SELECT attempt_count, window_start FROM auth_rate_limits WHERE limit_key = ?`,
            [key]
        );
        if (!row) return 0;
        const windowStartMs = Date.parse(row.window_start);
        if (!windowStartMs || Date.now() - windowStartMs > windowMs) {
            await db.run(`DELETE FROM auth_rate_limits WHERE limit_key = ?`, [key]);
            return 0;
        }
        return Number(row.attempt_count || 0);
    }
    return 0;
}

async function clearRateLimit(kind, email) {
    await ensureReady();
    const key = `${kind}:${String(email || '').toLowerCase()}`;
    if (redis) {
        await redis.del(`${REDIS_PREFIX}rl:${key}`);
        return;
    }
    if (db) {
        await db.run(`DELETE FROM auth_rate_limits WHERE limit_key = ?`, [key]);
    }
}

async function recordFailedLogin(email) {
    await incrementRateLimit('login', email, { windowMs: LOGIN_WINDOW_MS });
}

async function isLoginLocked(email) {
    const count = await getRateLimitCount('login', email, { windowMs: LOGIN_LOCKOUT_MS });
    return count >= LOGIN_MAX_ATTEMPTS;
}

async function clearLoginAttempts(email) {
    await clearRateLimit('login', email);
}

async function recordResetAttempt(email) {
    await incrementRateLimit('reset', email, { windowMs: RESET_WINDOW_MS });
}

async function isResetLimited(email) {
    const count = await getRateLimitCount('reset', email, { windowMs: RESET_WINDOW_MS });
    return count >= RESET_MAX_ATTEMPTS;
}

async function pruneExpiredRevokedTokens() {
    if (!db || redis) return 0;
    const result = await db.run(`DELETE FROM revoked_tokens WHERE expires_at <= ?`, [nowIso()]);
    return Number(result?.changes || 0);
}

if (process.env.NODE_ENV !== 'test') {
    setInterval(() => {
        pruneExpiredRevokedTokens().catch((err) => {
            logger.warn({ err }, 'revoked token prune failed');
        });
    }, 60 * 60 * 1000);
}

module.exports = {
    init,
    close,
    revokeToken,
    isTokenRevoked,
    recordFailedLogin,
    isLoginLocked,
    clearLoginAttempts,
    recordResetAttempt,
    isResetLimited,
    pruneExpiredRevokedTokens,
    LOGIN_MAX_ATTEMPTS,
    LOGIN_LOCKOUT_MS,
    RESET_MAX_ATTEMPTS,
    RESET_WINDOW_MS,
};
