'use strict';

function registerTopicMasteryRoutes(app, deps) {
    const { db, requireAuthJwt, rateLimit } = deps;

    app.get('/api/learning/mastery', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const { limit = 50, offset = 0 } = req.query;
            const mastery = await db.listUserTopicMastery(req.user.id, {
                limit: Math.min(parseInt(limit, 10) || 50, 100),
                offset: parseInt(offset, 10) || 0,
            });
            res.json({ mastery });
        } catch (error) {
            req.log.error({ err: error }, 'List topic mastery error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/mastery/:topic/cohort', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const cohort = await db.getMasteryCohortBenchmark(req.user.id, req.params.topic);
            if (!cohort) return res.status(404).json({ error: 'No mastery data for this topic' });
            res.json({ cohort });
        } catch (error) {
            req.log.error({ err: error }, 'Mastery cohort benchmark error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/mastery/:topic', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const mastery = await db.getUserTopicMastery(req.user.id, req.params.topic);
            if (!mastery) return res.status(404).json({ error: 'No mastery data for this topic' });
            res.json({ mastery });
        } catch (error) {
            req.log.error({ err: error }, 'Get topic mastery error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

module.exports = { registerTopicMasteryRoutes };
