// ==========================================
// Cache Module
// L1: node-cache (in-memory, sync) | L2: Redis (distributed, async)
// Swap to Redis in production: set REDIS_URL
// ==========================================

const NodeCache = require('node-cache');
const logger = require('../server/config/logger');
const { createRedisClient } = require('../server/config/redisClient');

class CacheManager {
    constructor(options = {}) {
        // Default TTL: 1 hour for search results, configurable
        this.cache = new NodeCache({
            stdTTL: options.defaultTTL || 3600,
            checkperiod: 600, // Check for expired keys every 10 minutes
            useClones: false // Better performance
        });

        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0
        };

        this.redis = null;
        this.redisPrefix = options.redisPrefix || 'medsearch:';

        // Listen for cache events
        this.cache.on('expired', (key) => {
            logger.debug({ key }, 'Cache key expired');
        });

        this.cache.on('flush', () => {
            logger.debug('Cache flushed');
        });
    }

    get isRedisEnabled() {
        return !!this.redis;
    }

    // ==========================================
    // Lifecycle
    // ==========================================

    async connect() {
        if (process.env.REDIS_URL) {
            try {
                this.redis = createRedisClient('cache', {
                    maxRetriesPerRequest: 3,
                });
                await this.redis.ping();
                logger.info('Redis L2 cache connected');
            } catch (err) {
                logger.warn({ err }, 'Redis unavailable; falling back to in-memory cache only');
                this.redis = null;
            }
        }
        logger.info('In-memory L1 cache ready');
        return true;
    }

    async close() {
        if (this.redis) {
            await this.redis.quit();
            this.redis = null;
            logger.info('Redis cache disconnected');
        }
        this.flush();
        return true;
    }

    // ==========================================
    // Basic Operations (L1 in-memory, sync)
    // ==========================================

    async get(key) {
        if (this.redis) {
            try {
                const raw = await this.redis.get(this.redisPrefix + key);
                if (raw) {
                    this.stats.hits++;
                    const parsed = JSON.parse(raw);
                    // Backfill L1 cache for faster subsequent access
                    const ttl = await this.redis.ttl(this.redisPrefix + key);
                    this.cache.set(key, parsed, ttl > 0 ? ttl : undefined);
                    return parsed;
                }
            } catch (err) {
                logger.warn({ err, key }, 'Redis get failed; falling back to in-memory');
            }
        }

        const value = this.cache.get(key);
        if (value !== undefined) {
            this.stats.hits++;
            return value;
        }
        this.stats.misses++;
        return undefined; // Consistent with NodeCache's return for missing key
    }

    async set(key, value, ttlSeconds = null) {
        this.stats.sets++;
        this.cache.set(key, value, ttlSeconds); // Always set to L1

        if (this.redis) {
            try {
                const fullKey = this.redisPrefix + key;
                const raw = JSON.stringify(value);
                if (ttlSeconds && ttlSeconds > 0) {
                    await this.redis.setex(fullKey, ttlSeconds, raw);
                } else {
                    await this.redis.set(fullKey, raw);
                }
            } catch (err) {
                logger.warn({ err, key }, 'Redis set failed');
            }
        }
    }

    flush() {
        return this.cache.flushAll();
    }

    // ==========================================
    // Delete Operation (L1 & L2)
    // ==========================================

    async del(key) {
        this.cache.del(key); // Always delete from L1
        if (!this.redis) return true;
        try {
            await this.redis.del(this.redisPrefix + key);
            return true;
        } catch (err) {
            logger.warn({ err, key }, 'Redis del failed');
            return false;
        }
    }

    async getAsync(key) {
        return this.get(key);
    }

    async setAsync(key, value, ttlSeconds = null) {
        return this.set(key, value, ttlSeconds);
    }

    async delAsync(key) {
        return this.del(key);
    }

    // has() remains sync as it only checks L1
    has(key) {
        return this.cache.has(key);
    }

    // ==========================================
    // Search Result Caching
    // ==========================================

    async getSearchResults(query, sources, specificity) {
        const key = this._searchKey(query, sources, specificity);
        return this.get(key); // Now async
    }

    async setSearchResults(query, sources, specificity, results, ttlSeconds = 1800) { // 30 min default
        const key = this._searchKey(query, sources, specificity);
        await this.set(key, { // Now async
            results,
            cachedAt: new Date().toISOString(),
            query,
            sources,
            specificity
        }, ttlSeconds);
    }

    async _scanRedisKeys(matchPattern) {
        if (!this.redis) return [];
        const keys = [];
        let cursor = '0';
        const fullPattern = this.redisPrefix + matchPattern;
        do {
            const [nextCursor, batch] = await this.redis.scan(cursor, 'MATCH', fullPattern, 'COUNT', 100);
            cursor = nextCursor;
            if (batch.length > 0) keys.push(...batch);
        } while (cursor !== '0');
        return keys;
    }

    async invalidateSearch(query) { // Made async to support Redis del
        // Find and delete all cache entries matching this query pattern
        const keys = this.cache.keys();
        const pattern = `search:${query.toLowerCase()}:`;
        keys.forEach(key => {
            if (key.startsWith(pattern)) this.del(key); // Call async del
        });
        if (this.redis) {
            const redisKeys = await this._scanRedisKeys(pattern + '*');
            if (redisKeys.length > 0) await this.redis.del(...redisKeys);
        }
    }

    _searchKey(query, sources, specificity) {
        const sourceStr = (sources || ['pubmed']).sort().join(',');
        // Suffix bumps invalidate entries cached before server-side relevance filtering matched current rules.
        return `search:${query.toLowerCase()}:${sourceStr}:${specificity || 'moderate'}:rf1`;
    }

    // ==========================================
    // Article Caching
    // ==========================================

    async getArticle(articleId, source) {
        const key = `article:${source}:${articleId}`;
        return this.get(key); // Now async
    }

    async setArticle(articleId, source, articleData, ttlSeconds = 86400) { // 24 hours
        const key = `article:${source}:${articleId}`;
        await this.set(key, articleData, ttlSeconds); // Now async
    }

    // ==========================================
    // Analysis Caching (distributed-aware)
    // ==========================================

    async getAnalysis(articleId, type, model) { // Renamed from getAnalysisAsync
        const key = `analysis:${articleId}:${type}:${model || 'default'}`;
        return this.get(key); // Now async
    }

    async setAnalysis(articleId, type, model, result, ttlSeconds = 604800) { // Renamed from setAnalysisAsync
        const key = `analysis:${articleId}:${type}:${model || 'default'}`;
        await this.set(key, { // Now async
            result,
            cachedAt: new Date().toISOString(),
            model,
            type
        }, ttlSeconds);
    }

    // ==========================================
    // Rate Limiting (distributed-aware)
    // ==========================================

    async checkRateLimit(key, maxRequests, windowSeconds) {
        const now = Math.floor(Date.now() / 1000);
        const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
        const cacheKey = `ratelimit:${key}:${windowStart}`;

        if (this.redis) {
            try {
                const fullKey = this.redisPrefix + cacheKey;
                const current = await this.redis.incr(fullKey);
                if (current === 1) {
                    await this.redis.expire(fullKey, windowSeconds);
                }
                const remaining = Math.max(0, maxRequests - current);
                const allowed = current <= maxRequests;
                return {
                    allowed,
                    remaining,
                    resetTime: (windowStart + windowSeconds) * 1000
                };
            } catch (err) {
                logger.warn({ err, key }, 'Redis rate limit failed; falling back to memory');
            }
        }

        let current = this.get(cacheKey);
        if (!current) {
            current = { count: 0, windowStart };
        }

        if (current.count >= maxRequests) {
            return {
                allowed: false,
                remaining: 0,
                resetTime: (windowStart + windowSeconds) * 1000
            };
        }

        current.count++;
        this.set(cacheKey, current, windowSeconds);

        return {
            allowed: true,
            remaining: maxRequests - current.count,
            resetTime: (windowStart + windowSeconds) * 1000
        };
    }

    // ==========================================
    // Session Caching
    // ==========================================

    async getSession(sessionId) {
        return this.get(`session:${sessionId}`); // Now async
    }

    async setSession(sessionId, sessionData, ttlSeconds = 86400) { // 24 hours
        await this.set(`session:${sessionId}`, sessionData, ttlSeconds); // Now async
    }

    // ==========================================
    // Stats & Monitoring
    // ==========================================

    getStats() {
        const stats = this.cache.getStats();
        return {
            ...this.stats,
            keys: this.cache.keys().length,
            hits: stats.hits + this.stats.hits,
            misses: stats.misses + this.stats.misses,
            hitRate: this._calculateHitRate(),
            redisEnabled: this.isRedisEnabled
        };
    }

    _calculateHitRate() {
        const total = this.stats.hits + this.stats.misses;
        return total > 0 ? (this.stats.hits / total * 100).toFixed(2) + '%' : 'N/A';
    }

    getKeys(pattern = null) {
        const keys = this.cache.keys();
        if (!pattern) return keys;
        return keys.filter(key => key.includes(pattern));
    }

    // ==========================================
    // Pipeline support (batch operations)
    // ==========================================

    pipeline() {
        const operations = [];
        return {
            get: (key) => { operations.push(['get', key]); return this; },
            set: (key, value, ttl) => { operations.push(['set', key, value, ttl]); return this; },
            del: (key) => { operations.push(['del', key]); return this; },
            exec: async () => {
                return operations.map(([op, ...args]) => {
                    if (op === 'get') return this.get(args[0]); // Await async get
                    if (op === 'set') return this.set(args[0], args[1], args[2]); // Await async set
                    if (op === 'del') return this.del(args[0]); // Await async del
                    return null;
                });
            }
        };
    }
}

// Export singleton
module.exports = new CacheManager();
