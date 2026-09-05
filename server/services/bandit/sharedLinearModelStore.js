'use strict';

/**
 * Shared linear-value model cache (Phase 5.1).
 *
 * Instances load/save the same hourly key so arm selection is consistent
 * across a multi-instance deploy. Preference order: injected Redis → DB →
 * in-process memory (single-instance fallback).
 */

const logger = require('../../config/logger');

const DEFAULT_TTL_SECONDS = Number(process.env.BANDIT_LINEAR_SHARED_TTL_SECONDS || 2 * 60 * 60) || 7200;

function hourlyModelKey(policyType = 'search_ranking', at = new Date()) {
    const hour = at instanceof Date ? at : new Date(at);
    const safe = Number.isNaN(hour.getTime()) ? new Date() : hour;
    return `bandit:linear:${policyType}:${safe.toISOString().slice(0, 13)}`;
}

function serializeModel(model) {
    if (!model || typeof model !== 'object') return null;
    return JSON.stringify({
        ok: Boolean(model.ok),
        n: model.n ?? null,
        lambda: model.lambda ?? null,
        rmse: model.rmse ?? null,
        weights: model.weights ?? null,
        armIds: model.armIds ?? null,
        featureDim: model.featureDim ?? null,
        fittedAt: model.fittedAt || new Date().toISOString(),
        reason: model.reason || null,
    });
}

function deserializeModel(raw) {
    if (!raw) return null;
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed;
    } catch {
        return null;
    }
}

function createMemoryBackend(seedMap = null) {
    const map = seedMap instanceof Map ? seedMap : new Map();
    return {
        async get(key) {
            return map.has(key) ? map.get(key) : null;
        },
        async set(key, value) {
            map.set(key, value);
            return true;
        },
        _map: map,
    };
}

const processMemory = createMemoryBackend();

function wrapRedis(redis) {
    if (!redis || typeof redis.get !== 'function' || typeof redis.set !== 'function') return null;
    return {
        async get(key) {
            const raw = await redis.get(key);
            return raw || null;
        },
        async set(key, value, ttlSeconds) {
            const ttl = Math.max(1, Math.round(Number(ttlSeconds) || DEFAULT_TTL_SECONDS));
            await redis.set(key, value, 'EX', ttl);
            return true;
        },
    };
}

function wrapDb(db) {
    if (!db?.get || !db?.run) return null;
    return {
        async get(key) {
            const row = await db.get(
                `SELECT model_json FROM bandit_shared_models
                 WHERE cache_key = ? AND expires_at > ?`,
                [key, new Date().toISOString()]
            ).catch(() => null);
            return row?.model_json || null;
        },
        async set(key, value, ttlSeconds, meta = {}) {
            const now = new Date();
            const expires = new Date(now.getTime() + Math.max(60, Number(ttlSeconds) || DEFAULT_TTL_SECONDS) * 1000)
                .toISOString();
            const existing = await db.get(
                `SELECT cache_key FROM bandit_shared_models WHERE cache_key = ?`,
                [key]
            ).catch(() => null);
            if (existing) {
                await db.run(
                    `UPDATE bandit_shared_models
                     SET model_json = ?, policy_type = ?, fitted_at = ?, expires_at = ?
                     WHERE cache_key = ?`,
                    [value, meta.policyType || 'search_ranking', now.toISOString(), expires, key]
                );
            } else {
                await db.run(
                    `INSERT INTO bandit_shared_models (cache_key, policy_type, model_json, fitted_at, expires_at)
                     VALUES (?, ?, ?, ?, ?)`,
                    [key, meta.policyType || 'search_ranking', value, now.toISOString(), expires]
                );
            }
            return true;
        },
    };
}

function createSharedLinearModelStore({
    redis = null,
    db = null,
    memory = processMemory,
    ttlSeconds = DEFAULT_TTL_SECONDS,
} = {}) {
    const remote = wrapRedis(redis) || wrapDb(db);
    const local = memory || processMemory;
    return {
        hourlyModelKey,
        async load(policyType, at) {
            const key = hourlyModelKey(policyType, at);
            const fromLocal = await local.get(key).catch(() => null);
            if (fromLocal) return deserializeModel(fromLocal);
            if (remote) {
                const raw = await remote.get(key).catch((err) => {
                    logger.debug({ err, key }, 'shared linear model remote get failed');
                    return null;
                });
                if (raw) {
                    await local.set(key, raw, ttlSeconds).catch(() => null);
                    return deserializeModel(raw);
                }
            }
            return null;
        },
        async save(policyType, model, at) {
            const key = hourlyModelKey(policyType, at);
            const raw = serializeModel(model);
            if (!raw) return { ok: false, key };
            await local.set(key, raw, ttlSeconds).catch(() => null);
            if (remote) {
                await remote.set(key, raw, ttlSeconds, { policyType }).catch((err) => {
                    logger.debug({ err, key }, 'shared linear model remote set failed');
                    return null;
                });
            }
            return { ok: true, key };
        },
    };
}

let _redis = undefined;
function getOptionalRedis() {
    if (_redis !== undefined) return _redis;
    try {
        const { createRedisClient } = require('../../config/redisClient');
        _redis = createRedisClient('bandit-linear-model') || null;
    } catch {
        _redis = null;
    }
    return _redis;
}

function defaultSharedStore(db = null) {
    return createSharedLinearModelStore({ redis: getOptionalRedis(), db });
}

module.exports = {
    hourlyModelKey,
    serializeModel,
    deserializeModel,
    createMemoryBackend,
    createSharedLinearModelStore,
    defaultSharedStore,
    DEFAULT_TTL_SECONDS,
};
