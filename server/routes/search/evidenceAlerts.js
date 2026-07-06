'use strict';

const { clampLimit } = require('./searchHelpers');

function registerEvidenceAlertRoutes(app, deps) {
    const { db, rateLimit, requireAuthJwt } = deps;

    app.get('/api/me/evidence-alerts', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const limit = clampLimit(req.query.limit, 40, 1, 80);
            const unreadOnly = String(req.query.unread || '').toLowerCase() === '1' || String(req.query.unread || '').toLowerCase() === 'true';
            const normalizedTopic = req.query.topic ? decodeURIComponent(String(req.query.topic)) : '';
            const rows = await db.listProactiveEvidenceAlertsForUser(req.user.id, { limit, unreadOnly, normalizedTopic });
            res.json({ alerts: rows });
        } catch (error) {
            req.log?.error?.({ err: error }, 'Evidence alerts list failed');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/me/evidence-alerts/:id/read', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'valid alert id is required' });
        try {
            const row = await db.markProactiveEvidenceAlertRead(id, req.user.id);
            if (!row) return res.status(404).json({ error: 'Alert not found' });
            res.json({ alert: row });
        } catch (error) {
            req.log?.error?.({ err: error }, 'Evidence alert read failed');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

module.exports = { registerEvidenceAlertRoutes };
