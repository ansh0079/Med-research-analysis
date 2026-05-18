const logger = require('../config/logger');
const { classifyClaimGuidelineAlignment } = require('../services/claimGuidelineAlignmentService');

function registerAdminRoutes(app, { db, cache, requireAuthJwt, requireRole }) {
    app.get('/api/admin/stats', requireAuthJwt, requireRole('admin'), async (req, res) => {
        try {
            const [users, searches, events, sessions, savedArticles] = await Promise.allSettled([
                db.get('SELECT COUNT(*) AS count FROM users'),
                db.get('SELECT COUNT(*) AS count FROM searches'),
                db.get('SELECT COUNT(*) AS count FROM events'),
                db.get('SELECT COUNT(*) AS count FROM sessions'),
                db.get('SELECT COUNT(*) AS count FROM saved_articles'),
            ]);

            const pick = (r) => (r.status === 'fulfilled' ? (r.value?.count ?? 0) : null);

            res.json({
                cache: cache.getStats(),
                database: {
                    users: pick(users),
                    totalSearches: pick(searches),
                    totalEvents: pick(events),
                    activeSessions: pick(sessions),
                    savedArticles: pick(savedArticles),
                    generatedAt: new Date().toISOString(),
                },
            });
        } catch (error) {
            req.log.error({ err: error }, 'Admin stats error');
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/admin/cache/clear', requireAuthJwt, requireRole('admin'), async (req, res) => {
        try {
            cache.flush();
            const cleaned = await db.cleanExpiredCache();
            res.json({ message: 'Cache cleared', dbCleaned: cleaned });
        } catch (error) {
            req.log.error({ err: error }, 'Cache clear error');
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/admin/readiness', requireAuthJwt, requireRole('admin'), async (req, res) => {
        const strictSmtp = String(process.env.REQUIRE_SMTP || '').toLowerCase() === 'true';
        const strictVector = String(process.env.REQUIRE_VECTOR_SEARCH || '').toLowerCase() === 'true';
        const smtpFields = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'APP_URL'];
        const missingSmtp = smtpFields.filter((k) => !process.env[k]);
        const vectorConfigured = Boolean(process.env.PG_VECTOR_URL || process.env.VECTOR_DATABASE_URL);
        const vectorAvailable = db.isVectorSearchAvailable();

        res.json({
            strictFlags: { requireSmtp: strictSmtp, requireVectorSearch: strictVector },
            smtp: { configured: missingSmtp.length === 0, missing: missingSmtp },
            vector: {
                configured: vectorConfigured,
                runtimeAvailable: vectorAvailable,
                provider: process.env.PG_VECTOR_URL
                    ? 'PG_VECTOR_URL'
                    : process.env.VECTOR_DATABASE_URL
                    ? 'VECTOR_DATABASE_URL'
                    : null,
            },
            paywall: {
                enabled: String(process.env.PAYWALL_ENABLED || '').toLowerCase() === 'true',
                allowInDev: String(process.env.PAYWALL_ALLOW_IN_DEV || 'true').toLowerCase() === 'true',
                allowedRoles: String(process.env.PAYWALL_ALLOWED_ROLES || 'admin,researcher,pro,enterprise')
                    .split(',')
                    .map((r) => r.trim())
                    .filter(Boolean),
            },
            checkedAt: new Date().toISOString(),
        });
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
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/admin/teaching-claims/review', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const limit = Math.min(Math.max(parseInt(String(req.query.limit || '40'), 10) || 40, 1), 100);
            const offset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0);
            const topic = String(req.query.topic || '').trim();
            const status = String(req.query.status || 'agent_draft,synthesis_inferred,abstract_only,unverified,guideline_conflict,stale_needs_refresh').trim();
            const claims = await db.listTeachingClaimsForReview({ topic, status, limit, offset });
            res.json({ claims, limit, offset, status, topic });
        } catch (error) {
            req.log.error({ err: error }, 'Teaching claim review list error');
            res.status(500).json({ error: error.message });
        }
    });

    app.patch('/api/admin/teaching-claims/:claimKey/verification', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const claimKey = String(req.params.claimKey || '').trim();
            if (!claimKey) return res.status(400).json({ error: 'claimKey is required' });
            const { verificationStatus, verificationReason, claimText } = req.body || {};
            const claim = await db.updateTeachingClaimVerification(claimKey, {
                verificationStatus,
                verificationReason,
                claimText,
                reviewerId: req.user?.id || null,
            });
            if (!claim) return res.status(404).json({ error: 'Claim not found' });
            res.json({ claim });
        } catch (error) {
            const status = /Invalid verification status/.test(error.message) ? 400 : 500;
            req.log.error({ err: error }, 'Teaching claim verification update error');
            res.status(status).json({ error: error.message });
        }
    });

    app.post('/api/admin/teaching-claims/:claimKey/guideline-check', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const claimKey = String(req.params.claimKey || '').trim();
            if (!claimKey) return res.status(400).json({ error: 'claimKey is required' });
            const claim = await db.getTeachingClaimByKey(claimKey);
            if (!claim) return res.status(404).json({ error: 'Claim not found' });
            const topic = claim.topic || claim.normalizedTopic || '';
            const guidelines = topic ? await db.getGuidelinesByTopic(topic, { limit: 8 }).catch((err) => { logger.warn({ err }, 'getGuidelinesByTopic failed'); return []; }) : [];
            const alignment = classifyClaimGuidelineAlignment(claim, guidelines);
            let updatedClaim = claim;
            if (['guideline_supported', 'guideline_conflict'].includes(alignment.recommendedVerificationStatus)) {
                updatedClaim = await db.updateTeachingClaimVerification(claimKey, {
                    verificationStatus: alignment.recommendedVerificationStatus,
                    verificationReason: alignment.reason,
                    reviewerId: req.user?.id || null,
                });
            }
            res.json({ claim: updatedClaim, alignment, guidelineCount: guidelines.length });
        } catch (error) {
            req.log.error({ err: error }, 'Teaching claim guideline check error');
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/admin/billing-audit', requireAuthJwt, requireRole('admin'), async (req, res) => {
        try {
            const limit = Math.min(500, parseInt(String(req.query.limit || '100'), 10) || 100);
            const offset = Math.max(0, parseInt(String(req.query.offset || '0'), 10) || 0);
            const action = req.query.action ? String(req.query.action) : null;
            const rows = await db.listBillingAuditLog({ limit, offset, action });
            res.json({ items: rows, limit, offset });
        } catch (error) {
            req.log.error({ err: error }, 'Billing audit list error');
            res.status(500).json({ error: error.message });
        }
    });
}

module.exports = { registerAdminRoutes };
