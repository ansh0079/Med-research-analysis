const { generateEmbedding, articleToEmbedText } = require('../embeddings');
const { getEmbeddingOptions: getKeys } = require('./embeddingOptions');

/**
 * @param {object} deps
 * @param {import('../../database')} deps.db
 * @param {import('../../config').serverConfig} deps.serverConfig
 */
function createVectorSearchService({ db, serverConfig }) {
    async function searchVector({ query, limit = 10, minScore = 0.4 }) {
        if (!db.isVectorSearchAvailable()) {
            const err = new Error('UNAVAILABLE');
            err.code = 'UNAVAILABLE';
            throw err;
        }
        const keys = getKeys(serverConfig);
        const embedding = await generateEmbedding(query, keys);
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

    return { searchVector, indexArticles, articleToEmbedText };
}

module.exports = { createVectorSearchService };
