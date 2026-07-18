'use strict';

const { createVectorSearchService, DEFAULT_MIN_SCORE } = require('./vectorSearchService');

/**
 * Personalization facade — maps to future recommendation-service boundary.
 * Blends query + learner profile embeddings for semantic retrieval.
 */
async function personalizedSemanticSearch({
    db,
    serverConfig,
    query,
    userProfileText = '',
    userEmbedding = null,
    limit = 10,
    minScore = DEFAULT_MIN_SCORE,
    queryWeight = 0.75,
} = {}) {
    if (!query || typeof query !== 'string') {
        const { appErrorFromCode } = require('../errors/appErrors');
        throw appErrorFromCode('VALIDATION_ERROR', 'query is required');
    }
    const vector = createVectorSearchService({ db, serverConfig });
    return vector.semanticSearch({
        query,
        limit,
        minScore,
        userProfileText,
        userEmbedding,
        queryWeight,
    });
}

function clampLimit(limit, fallback = 10, max = 50) {
    const parsed = Number.parseInt(String(limit), 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, 1), max);
}

function createRecommendationService({ db, serverConfig, fetchImpl } = {}) {
    return {
        async getRecommendations({ userId, sessionId = null, contextArticleId = null, limit = 10 } = {}) {
            const safeLimit = clampLimit(limit);
            if (contextArticleId && db?.getRelatedArticles) {
                const articles = await db.getRelatedArticles(contextArticleId, { limit: safeLimit, userId, sessionId });
                return { recommendations: Array.isArray(articles) ? articles : [], cached: false };
            }
            if (db?.getPersonalizedRecommendations) {
                const recommendations = await db.getPersonalizedRecommendations(userId, { limit: safeLimit, sessionId });
                return { recommendations: Array.isArray(recommendations) ? recommendations : [], cached: false };
            }
            if (db?.getGlobalEngagedArticles) {
                const recommendations = await db.getGlobalEngagedArticles(null, safeLimit);
                return { recommendations: Array.isArray(recommendations) ? recommendations : [], cached: false };
            }
            return { recommendations: [], cached: false };
        },

        async getRelatedForArticle({ id, limit = 5 } = {}) {
            const safeLimit = clampLimit(limit, 5);
            if (db?.getRelatedArticles) {
                const articles = await db.getRelatedArticles(id, { limit: safeLimit });
                return { articles: Array.isArray(articles) ? articles : [], cached: false };
            }
            if (id) {
                const query = String(id);
                const out = await personalizedSemanticSearch({
                    db,
                    serverConfig,
                    query,
                    limit: safeLimit,
                    minScore: 0.2,
                }).catch(() => null);
                if (out?.articles) return { articles: out.articles, cached: false };
            }
            return { articles: [], cached: false };
        },

        async getTrending({ limit = 10 } = {}) {
            const safeLimit = clampLimit(limit);
            if (db?.getTrendingArticles) {
                const articles = await db.getTrendingArticles({ limit: safeLimit });
                return { articles: Array.isArray(articles) ? articles : [], cached: false };
            }
            if (db?.getGlobalEngagedArticles) {
                const articles = await db.getGlobalEngagedArticles(null, safeLimit);
                return { articles: Array.isArray(articles) ? articles : [], cached: false };
            }
            return { articles: [], cached: false };
        },

        async recordInteraction({ userId, articleId, dwellTime = null, saved = null, clicked = null } = {}) {
            if (db?.recordArticleInteraction) {
                return db.recordArticleInteraction({ userId, articleId, dwellTime, saved, clicked });
            }
            if (db?.recordSearchFeedback) {
                const feedbackType = saved ? 'saved' : clicked ? 'clicked' : 'viewed';
                return db.recordSearchFeedback({ userId, articleUid: articleId, feedbackType, dwellTime });
            }
            return null;
        },
    };
}

module.exports = {
    createRecommendationService,
    personalizedSemanticSearch,
};
