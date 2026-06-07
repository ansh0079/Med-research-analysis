const { collectQualityMetrics } = require('../services/qualityMetricsService');
const { getSloStatus } = require('../services/observabilityMetrics');

function registerAnalyticsRoutes(app, { db, rateLimit, requireAuthJwt, requireRole, requireJson }) {
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

    app.get('/api/analytics/quality-metrics', requireAuthJwt, requireRole('admin'), rateLimit(20, 60), async (req, res) => {
        try {
            const days = Math.min(90, Math.max(7, parseInt(req.query.days, 10) || 30));
            const metrics = await collectQualityMetrics(db, days);
            res.json({ ...metrics, slo: getSloStatus() });
        } catch (error) {
            req.log.error({ err: error }, 'Quality metrics error');
            res.status(500).json({ error: error.message });
        }
    });

    const parseJson = typeof requireJson === 'function' ? requireJson : (_req, _res, next) => next();

    app.post('/api/analytics/quality-feedback', rateLimit(30, 60), parseJson, async (req, res) => {
        const {
            productType,
            topic,
            factualAccuracy,
            completeness,
            clinicalUsefulness,
            timeSavedMinutes,
            comment,
            metadata = {},
        } = req.body || {};
        const type = String(productType || '').trim();
        const allowed = new Set(['synthesis', 'case', 'agent', 'search']);
        if (!allowed.has(type)) {
            return res.status(400).json({ error: 'productType must be synthesis, case, agent, or search' });
        }
        const clampRating = (value) => {
            const n = Number(value);
            if (!Number.isFinite(n)) return null;
            return Math.min(5, Math.max(1, Math.round(n)));
        };
        try {
            await db.recordProductQualityFeedback({
                userId: req.user?.id ?? null,
                sessionId: req.sessionId,
                productType: type,
                topic: topic ? String(topic).slice(0, 240) : null,
                factualAccuracy: clampRating(factualAccuracy),
                completeness: clampRating(completeness),
                clinicalUsefulness: clampRating(clinicalUsefulness),
                timeSavedMinutes: timeSavedMinutes != null ? Math.max(0, Math.min(480, Number(timeSavedMinutes))) : null,
                comment,
                metadata,
            });
            await db.logEvent('quality_feedback', req.sessionId, {
                productType: type,
                topic: topic ? String(topic).slice(0, 120) : null,
                clinicalUsefulness: clampRating(clinicalUsefulness),
                timeSavedMinutes: timeSavedMinutes != null ? Number(timeSavedMinutes) : null,
            }).catch(() => undefined);
            res.json({ ok: true });
        } catch (error) {
            req.log.error({ err: error }, 'Quality feedback error');
            res.status(500).json({ error: error.message });
        }
    });
}

module.exports = { registerAnalyticsRoutes };
