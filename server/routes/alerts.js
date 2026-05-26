const { runAlertDigests } = require('../services/digestService');

function registerAlertRoutes(app, { db, serverConfig, fetch: fetchImpl, requireJson, requireAuthJwt, requireRole, rateLimit }) {
    app.get('/api/alerts', requireAuthJwt, async (req, res) => {
        try {
            const rows = await db.getUserSearchAlerts(req.user.id);
            res.json({ alerts: rows });
        } catch (error) {
            req.log.error({ err: error }, 'Get alerts error');
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/alerts', requireJson, requireAuthJwt, async (req, res) => {
        const { query, sources, frequency = 'weekly' } = req.body;
        if (!query || !query.trim()) return res.status(400).json({ error: 'query is required' });
        if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
            return res.status(400).json({ error: 'frequency must be daily, weekly, or monthly' });
        }
        try {
            const alertData = {
                query: query.trim(),
                frequency,
                sources: JSON.stringify(sources || ['pubmed']),
            };
            const result = await db.createSearchAlert(req.user.id, alertData);
            res.status(201).json({ success: true, alertId: result.id });
        } catch (error) {
            req.log.error({ err: error }, 'Create alert error');
            res.status(500).json({ error: error.message });
        }
    });

    app.delete('/api/alerts/:id', requireAuthJwt, async (req, res) => {
        try {
            await db.deactivateSearchAlert(req.user.id, req.params.id);
            res.json({ success: true });
        } catch (error) {
            req.log.error({ err: error }, 'Delete alert error');
            res.status(500).json({ error: error.message });
        }
    });

    // Email-safe unsubscribe — no auth required, but rate-limited to prevent token scanning
    app.post('/api/admin/alerts/digest/run', requireAuthJwt, requireRole('admin'), rateLimit(2, 300), async (req, res) => {
        try {
            const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
            const result = await runAlertDigests(db, appUrl, serverConfig, fetchImpl);
            res.json({ success: true, ...result });
        } catch (error) {
            req.log.error({ err: error }, 'Manual digest run error');
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/alerts/unsubscribe', rateLimit(10, 60), async (req, res) => {
        try {
            const { token } = req.query;
            if (!token) return res.status(400).json({ error: 'token is required' });

            const alert = await db.get(
                'SELECT * FROM search_alerts WHERE unsubscribe_token = ?',
                [token]
            );
            if (!alert) return res.status(404).json({ error: 'Invalid or expired token' });

            await db.run('UPDATE search_alerts SET active = 0, digest_enabled = 0 WHERE id = ?', [
                alert.id,
            ]);
            res.json({ success: true, message: 'You have been unsubscribed from this alert.' });
        } catch (error) {
            req.log.error({ err: error }, 'Unsubscribe error');
            res.status(500).json({ error: error.message });
        }
    });
}

module.exports = { registerAlertRoutes };
