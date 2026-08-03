'use strict';

const { collectBanditObservability } = require('../../services/banditObservabilityService');

function registerAdminObservabilityRoutes(app, { db, requireAuthJwt, requireRole, rateLimit }) {
    const requireAdmin = [requireAuthJwt, requireRole('admin', 'curator')];
    const limit = typeof rateLimit === 'function' ? rateLimit(120, 60) : ((_req, _res, next) => next());

    app.get('/api/admin/bandit/observability', ...requireAdmin, limit, async (req, res) => {
        try {
            const policyType = String(req.query.policyType || 'search_ranking').trim() || 'search_ranking';
            const scopeKey = String(req.query.scopeKey || 'global').trim() || 'global';
            const days = Math.min(Math.max(parseInt(String(req.query.days || '7'), 10) || 7, 1), 90);
            const observability = await collectBanditObservability(db, { policyType, scopeKey, days });
            res.json({ observability });
        } catch (error) {
            req.log.error({ err: error }, 'Bandit observability error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });
}

module.exports = { registerAdminObservabilityRoutes };
