const logger = require('../config/logger');
const { createRecommendationService } = require('../services/recommendationService');

/**
 * @param {import('express').Application} app
 * @param {object} deps
 */
function registerRecommendationRoutes(app, deps) {
    const { serverConfig, db, rateLimit, requireJson, requireAuthJwt, fetch: fetchImpl } = deps;
    const rec = createRecommendationService({ db, serverConfig, fetchImpl });

    app.get('/api/recommendations/:userId', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        const { userId } = req.params;
        const { context: contextArticleId, limit = 10 } = req.query;

        if (req.user.id !== userId) {
            return res.status(403).json({ error: 'Forbidden: cannot view another user\'s recommendations' });
        }

        try {
            const out = await rec.getRecommendations({
                userId,
                sessionId: req.sessionId,
                contextArticleId: contextArticleId || undefined,
                limit,
            });
            await db.logEvent('recommendations', req.sessionId, {
                userId,
                count: out.recommendations.length,
                context: contextArticleId,
            });
            res.json({ recommendations: out.recommendations, cached: out.cached || false });
        } catch (error) {
            logger.error({ err: error }, 'Recommendations error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/articles/:id/related', rateLimit(30, 60), async (req, res) => {
        const { id } = req.params;
        const { limit = 5 } = req.query;

        try {
            const out = await rec.getRelatedForArticle({ id, limit });
            res.json({ articles: out.articles, cached: out.cached || false });
        } catch (error) {
            logger.error({ err: error }, 'Related articles error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/trending', rateLimit(30, 60), async (req, res) => {
        const { limit = 10 } = req.query;

        try {
            const out = await rec.getTrending({ limit });
            res.json({ articles: out.articles, cached: out.cached || false });
        } catch (error) {
            logger.error({ err: error }, 'Trending articles error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/interactions', requireJson, requireAuthJwt, rateLimit(50, 60), async (req, res) => {
        const { userId, articleId, dwellTime, saved, clicked } = req.body;

        if (!userId || !articleId) {
            return res.status(400).json({ error: 'userId and articleId are required' });
        }

        try {
            if (req.user.id !== userId) {
            return res.status(403).json({ error: 'Forbidden: userId mismatch' });
        }
        rec.recordInteraction({ userId, articleId, dwellTime, saved, clicked });

            await db.logEvent('interaction', req.sessionId, {
                userId,
                articleId,
                type: saved !== undefined ? 'save' : clicked ? 'click' : 'view',
                dwellTime,
            });

            res.json({ success: true });
        } catch (error) {
            console.error('Interaction recording error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

module.exports = { registerRecommendationRoutes };
