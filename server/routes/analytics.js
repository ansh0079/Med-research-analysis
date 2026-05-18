function registerAnalyticsRoutes(app, { db, rateLimit, requireAuthJwt, requireRole }) {
    // Aggregate stats are admin-only — individual users should not see org-wide search volumes
    app.get('/api/analytics/summary', requireAuthJwt, requireRole('admin'), rateLimit(30, 60), async (req, res) => {
        try {
            const [dailyStats, popularSearches] = await Promise.all([
                db.getDailyStats(30),
                db.getPopularSearches(20),
            ]);
            res.json({ dailyStats, popularSearches, generatedAt: new Date().toISOString() });
        } catch (error) {
            req.log.error({ err: error }, 'Analytics summary error');
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/analytics/event', rateLimit(60, 60), async (req, res) => {
        const { eventType, metadata = {} } = req.body;
        if (!eventType) return res.status(400).json({ error: 'eventType is required' });

        try {
            const result = await db.logEvent(eventType, req.sessionId, metadata);
            res.json({ success: true, eventId: result.id });
        } catch (error) {
            req.log.error({ err: error }, 'Log analytics event error');
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/analytics/popular', requireAuthJwt, requireRole('admin'), rateLimit(30, 60), async (req, res) => {
        try {
            const searches = await db.getPopularSearches(20);
            res.json({ searches });
        } catch (error) {
            req.log.error({ err: error }, 'Popular searches error');
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/analytics/daily', requireAuthJwt, requireRole('admin'), rateLimit(30, 60), async (req, res) => {
        try {
            const days = parseInt(req.query.days) || 30;
            const stats = await db.getDailyStats(days);
            res.json({ stats });
        } catch (error) {
            req.log.error({ err: error }, 'Daily stats error');
            res.status(500).json({ error: error.message });
        }
    });
}

module.exports = { registerAnalyticsRoutes };
