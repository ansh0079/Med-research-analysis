const crypto = require('crypto');
const { generateEmbedding, articleToEmbedText } = require('../../embeddings');
const { getEmbeddingOptions: getKeys } = require('../embeddingOptions');

const EMBEDDING_DIM = 384;

// Unified minimum cosine-similarity threshold for vector search results.
// Override with VECTOR_SEARCH_MIN_SCORE env var (0–1, default 0.25).
// The unified search route historically used 0.25 while standalone routes
// defaulted to 0.4 — 0.25 is the right value for recall in the main pipeline.
const DEFAULT_MIN_SCORE = Math.min(0.99, Math.max(0, parseFloat(process.env.VECTOR_SEARCH_MIN_SCORE || '0.25')));
const QUERY_EMBEDDING_TTL_MS = 24 * 60 * 60 * 1000;
const queryEmbeddingMemory = new Map();

function normalizeQueryText(query) {
    return String(query || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildQueryEmbeddingCacheKey(query) {
    return `embed:query:${crypto.createHash('sha1').update(normalizeQueryText(query)).digest('hex').slice(0, 24)}`;
}

function rememberQueryEmbedding(key, value) {
    queryEmbeddingMemory.set(key, { value, expiresAt: Date.now() + QUERY_EMBEDDING_TTL_MS });
}

async function getCachedQueryEmbedding(cache, query) {
    const key = buildQueryEmbeddingCacheKey(query);
    const mem = queryEmbeddingMemory.get(key);
    if (mem && mem.expiresAt > Date.now() && Array.isArray(mem.value)) return mem.value;
    if (cache && typeof cache.get === 'function') {
        try {
            const hit = await cache.get(key);
            if (Array.isArray(hit)) {
                rememberQueryEmbedding(key, hit);
                return hit;
            }
        } catch {
            // cache miss / backend error — generate fresh
        }
    }
    return null;
}

async function setCachedQueryEmbedding(cache, query, embedding) {
    const key = buildQueryEmbeddingCacheKey(query);
    rememberQueryEmbedding(key, embedding);
    if (cache && typeof cache.set === 'function') {
        try {
            await cache.set(key, embedding, Math.floor(QUERY_EMBEDDING_TTL_MS / 1000));
        } catch {
            // in-memory cache still holds the value
        }
    }
    return key;
}

function clearQueryEmbeddingCache() {
    queryEmbeddingMemory.clear();
}

function normalizeVector(vec) {
    if (!Array.isArray(vec) || vec.length !== EMBEDDING_DIM) {
        return null;
    }
    const numbers = vec.map(Number);
    if (numbers.some((n) => !Number.isFinite(n))) return null;
    const norm = Math.sqrt(numbers.reduce((sum, value) => sum + value * value, 0)) || 1;
    return numbers.map((value) => value / norm);
}

function blendEmbeddings(queryEmbedding, userEmbedding = null, { queryWeight = 0.75 } = {}) {
    const q = normalizeVector(queryEmbedding);
    const u = normalizeVector(userEmbedding);
    if (!q) {
        throw new Error(`Invalid query embedding: expected ${EMBEDDING_DIM} dimensions`);
    }
    if (!u) return q;

    const safeQueryWeight = Math.max(0.5, Math.min(1, Number(queryWeight) || 0.75));
    const userWeight = 1 - safeQueryWeight;
    return normalizeVector(q.map((value, index) => (value * safeQueryWeight) + (u[index] * userWeight)));
}

/**
 * @param {object} deps
 * @param {import('../../database')} deps.db
 * @param {import('../../config').serverConfig} deps.serverConfig
 */
function createVectorSearchService({ db, serverConfig, cache = null }) {
    async function findSimilarPapers(embedding, { limit = 10, minScore = DEFAULT_MIN_SCORE } = {}) {
        if (!db.isVectorSearchAvailable()) {
            const err = new Error('UNAVAILABLE');
            err.code = 'UNAVAILABLE';
            throw err;
        }
        const rows = await db.searchSimilarArticlesCache(
            embedding,
            Math.min(100, parseInt(limit, 10) || 10),
            Math.min(0.99, Math.max(0, parseFloat(minScore)))
        );
        return {
            articles: rows.map((r) => r.data),
            scores: rows.map((r) => r.score),
        };
    }

    async function semanticSearch({
        query,
        limit = 10,
        minScore = DEFAULT_MIN_SCORE,
        userEmbedding = null,
        userProfileText = '',
        queryWeight = 0.75,
    }) {
        if (!query || typeof query !== 'string') {
            throw new Error('query is required');
        }
        const keys = getKeys(serverConfig);
        let queryEmbedding = await getCachedQueryEmbedding(cache, query);
        if (!queryEmbedding) {
            queryEmbedding = await generateEmbedding(query, keys);
            await setCachedQueryEmbedding(cache, query, queryEmbedding);
        }
        const profileEmbedding = userEmbedding || (userProfileText
            ? await generateEmbedding(userProfileText, keys)
            : null);
        const blendedEmbedding = blendEmbeddings(queryEmbedding, profileEmbedding, { queryWeight });
        const out = await findSimilarPapers(blendedEmbedding, { limit, minScore });
        return {
            ...out,
            semantic: {
                queryEmbeddingUsed: true,
                userEmbeddingUsed: Boolean(profileEmbedding),
                queryWeight: profileEmbedding ? Math.max(0.5, Math.min(1, Number(queryWeight) || 0.75)) : 1,
            },
        };
    }

    async function searchVector({ query, limit = 10, minScore = DEFAULT_MIN_SCORE }) {
        return semanticSearch({ query, limit, minScore });
    }

    async function indexArticles(articles) {
        if (!db.isVectorSearchAvailable()) {
            const err = new Error('UNAVAILABLE');
            err.code = 'UNAVAILABLE';
            throw err;
        }
        const keys = getKeys(serverConfig);
        const max = Math.min(50, articles.length);
        let indexed = 0;
        const errors = [];
        for (let i = 0; i < max; i++) {
            const article = articles[i];
            const externalId = String(article.uid ?? article.pmid ?? article.doi ?? `idx-${i}`);
            const source = String(article._source || 'search');
            const text = articleToEmbedText(article);
            try {
                const emb = await generateEmbedding(text, keys);
                await db.upsertArticleCacheVector(
                    externalId,
                    source,
                    article,
                    emb,
                    article.doi || null
                );
                indexed++;
            } catch (e) {
                errors.push({ externalId, message: e.message });
            }
        }
        return { indexed, attempted: max, errors };
    }

    return { searchVector, semanticSearch, findSimilarPapers, indexArticles, articleToEmbedText };
}

module.exports = {
    createVectorSearchService,
    DEFAULT_MIN_SCORE,
    EMBEDDING_DIM,
    QUERY_EMBEDDING_TTL_MS,
    normalizeVector,
    blendEmbeddings,
    normalizeQueryText,
    buildQueryEmbeddingCacheKey,
    getCachedQueryEmbedding,
    setCachedQueryEmbedding,
    clearQueryEmbeddingCache,
};
