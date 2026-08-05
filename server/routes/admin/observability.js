'use strict';

const logger = require('../../config/logger');
const {
    collectProductionObservability,
    collectLearningLoopControl,
} = require('../../services/productionObservabilityService');
const { collectBanditObservability } = require('../../services/banditObservabilityService');
const { listLearningLedger } = require('../../services/ops/learningLedgerService');

function registerAdminObservabilityRoutes(app, { db, requireAuthJwt, requireRole, rateLimit }) {
    const requireAdmin = [requireAuthJwt, requireRole('admin', 'curator')];
    const banditLimit = typeof rateLimit === 'function' ? rateLimit(120, 60) : ((_req, _res, next) => next());

    app.get('/api/admin/bandit/observability', ...requireAdmin, banditLimit, async (req, res) => {
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

    app.get('/api/admin/learning-health', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const limit = Math.min(Math.max(parseInt(String(req.query.limit || '10'), 10) || 10, 1), 50);
            const lowRecallDays = Math.min(Math.max(parseInt(String(req.query.days || '7'), 10) || 7, 1), 90);
            const [health, teachingObjects, staleTopics, strongMemoryRefresh] = await Promise.all([
                db.getLearningObservability({ limit, lowRecallDays }),
                db.getTeachingObjectStats({ limit }).catch((err) => { logger.warn({ err }, 'getTeachingObjectStats failed'); return null; }),
                db.getStaleTopicsForRefresh({ limit }).catch((err) => { logger.warn({ err }, 'getStaleTopicsForRefresh failed'); return []; }),
                db.getStrongMemoryTopicsForRefresh({ limit }).catch((err) => { logger.warn({ err }, 'getStrongMemoryTopicsForRefresh failed'); return []; }),
            ]);
            health.teachingObjects = teachingObjects;
            health.freshness = {
                staleTopics,
                strongMemoryRefresh,
            };
            res.json({ health });
        } catch (error) {
            req.log.error({ err: error }, 'Learning health error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/admin/cron-health', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const rows = await db.all('SELECT * FROM cron_heartbeats ORDER BY task').catch(() => []);
            const now = Date.now();
            // A task is stale when its last run is older than its expected cadence
            // (longest cadence is weekly) plus slack. Interval tasks run far more
            // often; anything silent for >26h that has ever run deserves a flag.
            const WEEKLY_TASKS = new Set(['queue-failure-digest']);
            const crons = rows.map((row) => {
                const lastRunMs = row.last_run_at ? Date.parse(row.last_run_at) : null;
                const staleAfterMs = (WEEKLY_TASKS.has(row.task) ? 7 * 24 + 2 : 26) * 3600 * 1000;
                return {
                    task: row.task,
                    lastRunAt: row.last_run_at,
                    lastStatus: row.last_status,
                    lastError: row.last_error,
                    lastDurationMs: row.last_duration_ms,
                    consecutiveFailures: Number(row.consecutive_failures || 0),
                    runsTotal: Number(row.runs_total || 0),
                    stale: lastRunMs != null && (now - lastRunMs) > staleAfterMs,
                };
            });
            const failing = crons.filter((c) => c.lastStatus === 'error' || c.stale);
            res.json({ crons, failingCount: failing.length, generatedAt: new Date().toISOString() });
        } catch (error) {
            req.log.error({ err: error }, 'Cron health error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/admin/claim-observability', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const limit = Math.min(Math.max(parseInt(String(req.query.limit || '25'), 10) || 25, 1), 80);
            const observability = await db.getAdminClaimObservability({ limit });
            res.json({ observability });
        } catch (error) {
            req.log.error({ err: error }, 'Claim observability error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/admin/llm-cost-dashboard', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const days = Math.min(Math.max(parseInt(String(req.query.days || '30'), 10) || 30, 1), 365);
            const limit = Math.min(Math.max(parseInt(String(req.query.limit || '15'), 10) || 15, 1), 50);
            const dashboard = await db.getAdminLlmCostDashboard({ days, limit });
            res.json({ dashboard });
        } catch (error) {
            req.log.error({ err: error }, 'LLM cost dashboard error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/admin/production-observability', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const days = Math.min(Math.max(parseInt(String(req.query.days || '7'), 10) || 7, 1), 90);
            const observability = await collectProductionObservability(db, { days });
            res.json({ observability });
        } catch (error) {
            req.log.error({ err: error }, 'Production observability error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/admin/learning-loop-control', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const days = Math.min(Math.max(parseInt(String(req.query.days || '7'), 10) || 7, 1), 90);
            const control = await collectLearningLoopControl(db, { days });
            res.json({ control });
        } catch (error) {
            req.log.error({ err: error }, 'Learning loop control error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/admin/learning-ledger', ...requireAdmin, banditLimit, async (req, res) => {
        try {
            const days = Math.min(Math.max(parseInt(String(req.query.days || '7'), 10) || 7, 1), 90);
            const limit = Math.min(Math.max(parseInt(String(req.query.limit || '40'), 10) || 40, 1), 200);
            const offset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0);
            const policyType = String(req.query.policyType || '').trim();
            const userId = String(req.query.userId || '').trim();
            const onlyWithReward = String(req.query.onlyWithReward || '') === '1'
                || String(req.query.onlyWithReward || '').toLowerCase() === 'true';
            const ledger = await listLearningLedger(db, {
                policyType,
                userId,
                days,
                limit,
                offset,
                onlyWithReward,
            });
            res.json({ ledger });
        } catch (error) {
            req.log.error({ err: error }, 'Learning ledger error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });
}

module.exports = { registerAdminObservabilityRoutes };
