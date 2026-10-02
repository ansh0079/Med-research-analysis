'use strict';

/**
 * Hit rate for the caches that actually save a model or retrieval call.
 * A layer with no samples has hitRate null. That is "not measured", not 0%.
 */

const LAYERS = Object.freeze(['search', 'synthesis', 'live-answer', 'guidelines']);
const REDIS_KEY = 'cache-layers';

const memory = Object.fromEntries(LAYERS.map((layer) => [layer, { hits: 0, misses: 0 }]));

function shape(hits, misses) {
    const h = Number(hits) || 0;
    const m = Number(misses) || 0;
    const requests = h + m;
    return {
        hits: h,
        misses: m,
        requests,
        hitRate: requests > 0 ? h / requests : null,
    };
}

function snapshotFromMemory() {
    return {
        since: 'process',
        layers: Object.fromEntries(LAYERS.map((layer) => [layer, shape(memory[layer].hits, memory[layer].misses)])),
    };
}

function recordCacheLayer(layer, hit) {
    const row = memory[layer];
    if (!row) return;
    if (hit) row.hits += 1;
    else row.misses += 1;
    try {
        const cache = require('../../../cache');
        if (cache?.redis?.hincrby) {
            const prefix = cache.redisPrefix || 'medsearch:';
            cache.redis.hincrby(`${prefix}${REDIS_KEY}`, `${layer}:${hit ? 'hits' : 'misses'}`, 1).catch(() => {});
        }
    } catch {
        // Metrics must not change the request that was just served.
    }
}

async function cacheLayerSnapshot() {
    try {
        const cache = require('../../../cache');
        if (cache?.redis?.hgetall) {
            const prefix = cache.redisPrefix || 'medsearch:';
            const raw = await cache.redis.hgetall(`${prefix}${REDIS_KEY}`);
            if (raw && Object.keys(raw).length > 0) {
                const layers = {};
                for (const layer of LAYERS) {
                    layers[layer] = shape(raw[`${layer}:hits`], raw[`${layer}:misses`]);
                }
                return { since: 'redis', layers };
            }
        }
    } catch {
        // Fall through to this process.
    }
    return snapshotFromMemory();
}

function resetCacheLayerMetrics() {
    for (const layer of LAYERS) {
        memory[layer].hits = 0;
        memory[layer].misses = 0;
    }
}

module.exports = {
    LAYERS,
    recordCacheLayer,
    cacheLayerSnapshot,
    resetCacheLayerMetrics,
};
