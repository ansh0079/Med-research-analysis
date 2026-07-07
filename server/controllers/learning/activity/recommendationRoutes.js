'use strict';

const { getPersonalisedRecommendations } = require('../../../services/learningAgentService');

function registerRecommendationRoutes(app, deps) {
    const { db, requireAuthJwt, rateLimit } = deps;

    app.get('/api/learning/recommendations', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const limit = Math.min(Math.max(parseInt(String(req.query.limit || '8'), 10) || 8, 1), 20);
            const recommendations = await getPersonalisedRecommendations(db, req.user.id, { limit });
            res.json({ recommendations, generatedAt: new Date().toISOString() });
        } catch (error) {
            req.log.error({ err: error }, 'Learning recommendations error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

module.exports = { registerRecommendationRoutes };
