const logger = require('../config/logger');
const crypto = require('crypto');
const { classifyClaimGuidelineAlignment } = require('../services/claimGuidelineAlignmentService');
const { alignClaimWithGuidelines, alignTopicClaimsWithGuidelines } = require('../services/claimGuidelineEngine');
const { seedCurriculumTopic } = require('../services/curriculumSeedService');
const {
    runCurriculumSeedBatch,
    loadGuardrailState,
    updateCurriculumSeedSchedulerSettings,
    getCurriculumSeedSchedulerSettings,
} = require('../services/curriculumSeedScheduler');
const {
    getBackgroundAutomationState,
    setBackgroundAutomationPaused,
} = require('../services/backgroundAutomationService');
const { aggregateCollectiveMemory } = require('../services/collectiveMemoryService');
const { QUALITY_QUEUES } = require('../services/clinicalQualityReviewService');
const { collectProductionObservability } = require('../services/productionObservabilityService');
const fs = require('fs/promises');
const path = require('path');

function registerAdminRoutes(app, { db, cache, requireAuthJwt, requireRole, serverConfig, fetch }) {
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
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.post('/api/admin/cache/clear', requireAuthJwt, requireRole('admin'), async (req, res) => {
        try {
            cache.flush();
            const cleaned = await db.cleanExpiredCache();
            res.json({ message: 'Cache cleared', dbCleaned: cleaned });
        } catch (error) {
            req.log.error({ err: error }, 'Cache clear error');
            res.status(500).json({ error: 'Internal server error' });
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
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/admin/automation', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const [automation, curriculumScheduler] = await Promise.all([
                getBackgroundAutomationState(db),
                getCurriculumSeedSchedulerSettings(db),
            ]);
            res.json({ automation, curriculumScheduler, generatedAt: new Date().toISOString() });
        } catch (error) {
            req.log.error({ err: error }, 'Automation status error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.patch('/api/admin/automation', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            if (req.body?.paused == null) {
                return res.status(400).json({ error: 'paused (boolean) is required' });
            }
            const automation = await setBackgroundAutomationPaused(db, {
                paused: Boolean(req.body.paused),
                userId: req.user?.id || null,
                reason: req.body.reason || null,
            });
            res.json({ automation });
        } catch (error) {
            req.log.error({ err: error }, 'Automation pause update error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/admin/clinical-quality-queue', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const topic = String(req.query.topic || '').trim();
            const queue = String(req.query.queue || '').trim();
            const limit = Math.min(Math.max(parseInt(String(req.query.limit || '40'), 10) || 40, 1), 100);
            const offset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0);
            const counts = await db.getClinicalQualityQueueCounts(topic);
            const claims = queue
                ? await db.listClinicalQualityReviewClaims({ queue, topic, limit, offset })
                : [];
            res.json({ queues: QUALITY_QUEUES, counts, claims, queue: queue || null, topic: topic || null, limit, offset });
        } catch (error) {
            const status = /Invalid quality queue/.test(error.message) ? 400 : 500;
            req.log.error({ err: error }, 'Clinical quality queue error');
            res.status(status).json({ error: status < 500 ? error.message : 'Internal server error' });
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
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.patch('/api/admin/teaching-claims/:claimKey/curator-metadata', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const claimKey = String(req.params.claimKey || '').trim();
            if (!claimKey) return res.status(400).json({ error: 'claimKey is required' });
            const {
                examRelevant,
                practiceChanging,
                overclaimed,
                paperSectionRef,
                curatorNotes,
            } = req.body || {};
            const claim = await db.updateTeachingClaimCuratorMetadata(claimKey, {
                ...(examRelevant != null ? { examRelevant: Boolean(examRelevant) } : {}),
                ...(practiceChanging != null ? { practiceChanging: Boolean(practiceChanging) } : {}),
                ...(overclaimed != null ? { overclaimed: Boolean(overclaimed) } : {}),
                ...(paperSectionRef != null ? { paperSectionRef: String(paperSectionRef) } : {}),
                ...(curatorNotes != null ? { curatorNotes: String(curatorNotes) } : {}),
            }, req.user?.id || null);
            if (!claim) return res.status(404).json({ error: 'Claim not found' });
            if (overclaimed) {
                await db.updateTeachingClaimVerification(claimKey, {
                    verificationStatus: 'stale_needs_refresh',
                    verificationReason: 'Curator marked as overclaimed.',
                    reviewerId: req.user?.id || null,
                }).catch(() => {});
            }
            res.json({ claim });
        } catch (error) {
            req.log.error({ err: error }, 'Curator metadata update error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.post('/api/admin/topics/:topic/guideline-watch-scan', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const topic = decodeURIComponent(String(req.params.topic || '').trim());
            const { runGuidelineWatchtowerScan } = require('../services/guidelineWatchtowerService');
            const result = await runGuidelineWatchtowerScan(db, topic);
            res.json(result);
        } catch (error) {
            req.log.error({ err: error }, 'Guideline watch scan error');
            res.status(500).json({ error: 'Internal server error' });
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
            res.status(status).json({ error: status < 500 ? error.message : 'Internal server error' });
        }
    });

    app.post('/api/admin/teaching-claims/:claimKey/guideline-check', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const claimKey = String(req.params.claimKey || '').trim();
            if (!claimKey) return res.status(400).json({ error: 'claimKey is required' });
            const claim = await db.getTeachingClaimByKey(claimKey);
            if (!claim) return res.status(404).json({ error: 'Claim not found' });
            const { claim: updatedClaim, alignment, guidelineCount } = await alignClaimWithGuidelines(db, claim, {
                apply: true,
                reviewerId: req.user?.id || null,
            });
            res.json({ claim: updatedClaim, alignment, guidelineCount });
        } catch (error) {
            req.log.error({ err: error }, 'Teaching claim guideline check error');
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

    app.post('/api/admin/curriculum/import-core-topics', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const seedPath = path.join(__dirname, '..', 'data', 'coreClinicalTopics.json');
            const raw = await fs.readFile(seedPath, 'utf8');
            const topics = JSON.parse(raw);
            const result = await db.importCurriculumSeedTopics(topics, {
                curriculumSlug: 'specialty-clinical-topics',
                curriculumName: 'Core Clinical Topics',
                examStageLabel: 'Core clinical practice',
                description: 'Curated high-yield clinical topics for evidence synthesis, claim extraction, and adaptive review.',
                sortOrder: 10,
            });
            res.json({
                importedCount: result.importedCount,
                topics: result.topics,
                source: 'server/data/coreClinicalTopics.json',
            });
        } catch (error) {
            req.log.error({ err: error }, 'Core curriculum topic import error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/admin/curriculum/seed-topics', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const limit = Math.min(Math.max(parseInt(String(req.query.limit || '200'), 10) || 200, 1), 500);
            const offset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0);
            const seedStatus = String(req.query.seedStatus || '').trim();
            const topics = await db.listCurriculumSeedTopics({ seedStatus, limit, offset });
            res.json({ topics, count: topics.length });
        } catch (error) {
            req.log.error({ err: error }, 'Curriculum seed topic list error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/admin/curriculum/scheduler', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const limit = Math.min(Math.max(parseInt(String(req.query.limit || '10'), 10) || 10, 1), 50);
            const [runs, dueTopics, failedTopics, statusCounts] = await Promise.all([
                db.listLearningSchedulerRuns({ runType: 'curriculum_seed', limit }),
                db.listCurriculumSeedCandidates({ limit: 10 }),
                db.listCurriculumSeedCandidates({
                    limit: 10,
                    seedStatuses: ['failed', 'failed_low_recall', 'seeded_with_warnings'],
                }),
                db.getCurriculumSeedStatusCounts(),
            ]);
            const guardrails = await loadGuardrailState(db);
            res.json({
                scheduler: {
                    generatedAt: new Date().toISOString(),
                    runs,
                    dueTopics,
                    failedTopics,
                    statusCounts,
                    guardrails,
                },
            });
        } catch (error) {
            req.log.error({ err: error }, 'Curriculum scheduler observability error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/admin/curriculum/seed-health', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const report = await db.getSeedHealthReport();
            res.json({ health: report, generatedAt: new Date().toISOString() });
        } catch (error) {
            req.log.error({ err: error }, 'Curriculum seed health report error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.patch('/api/admin/curriculum/scheduler/settings', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const settings = await updateCurriculumSeedSchedulerSettings(db, req.body || {});
            const guardrails = await loadGuardrailState(db);
            res.json({ settings, guardrails });
        } catch (error) {
            req.log.error({ err: error }, 'Curriculum scheduler settings update error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.post('/api/admin/curriculum/seed-topics/:topicId/seed', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const topicId = String(req.params.topicId || '').trim();
            if (!topicId) return res.status(400).json({ error: 'topicId is required' });
            const body = req.body || {};
            const seedOptions = {
                db,
                cache,
                serverConfig,
                fetchImpl: fetch,
                provider: body.provider || 'auto',
                topicId,
                limits: {
                    searchLimit: body.searchLimit,
                    synthesisArticles: body.synthesisArticles,
                    synopsisArticles: body.synopsisArticles,
                },
                log: req.log || logger,
            };
            if (body.background === false) {
                const result = await seedCurriculumTopic(seedOptions);
                return res.json(result);
            }

            const topic = await db.getCurriculumSeedTopic(topicId);
            if (!topic) return res.status(404).json({ error: 'Curriculum topic not found' });
            const queuedTopic = await db.updateCurriculumSeedStatus(topicId, { seedStatus: 'queued' });
            setImmediate(() => {
                seedCurriculumTopic(seedOptions).catch((err) => {
                    logger.error({ err, topicId }, 'Background curriculum seed failed');
                });
            });
            return res.status(202).json({ accepted: true, topic: queuedTopic || { ...topic, seedStatus: 'queued' } });
        } catch (error) {
            req.log.error({ err: error }, 'Curriculum seed topic error');
            const status = /not found/i.test(error.message) ? 404 : 500;
            res.status(status).json({ error: status < 500 ? error.message : 'Internal server error' });
        }
    });

    app.post('/api/admin/curriculum/seed-batch', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const body = req.body || {};
            const result = await runCurriculumSeedBatch({
                db,
                cache,
                serverConfig,
                fetchImpl: fetch,
                log: req.log || logger,
                batchSize: body.batchSize || 2,
                force: body.force === true,
                limits: {
                    searchLimit: body.searchLimit,
                    synthesisArticles: body.synthesisArticles,
                    synopsisArticles: body.synopsisArticles,
                },
                seedStatuses: Array.isArray(body.seedStatuses) ? body.seedStatuses : [],
            });
            res.json(result);
        } catch (error) {
            req.log.error({ err: error }, 'Curriculum seed batch error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.post('/api/admin/curriculum/retry-failed', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const body = req.body || {};
            const result = await runCurriculumSeedBatch({
                db,
                cache,
                serverConfig,
                fetchImpl: fetch,
                log: req.log || logger,
                batchSize: body.batchSize || 2,
                force: body.force === true,
                seedStatuses: ['failed', 'failed_low_recall', 'seeded_with_warnings'],
                limits: {
                    searchLimit: body.searchLimit,
                    synthesisArticles: body.synthesisArticles,
                    synopsisArticles: body.synopsisArticles,
                },
            });
            res.json(result);
        } catch (error) {
            req.log.error({ err: error }, 'Curriculum failed seed retry error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.post('/api/admin/topics/:topic/guideline-align', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const topic = decodeURIComponent(String(req.params.topic || '').trim());
            if (topic.length < 2) return res.status(400).json({ error: 'topic is required' });
            const limit = Math.min(Math.max(parseInt(String(req.body?.limit || req.query?.limit || '40'), 10) || 40, 1), 100);
            const result = await alignTopicClaimsWithGuidelines(db, topic, {
                limit,
                apply: req.body?.apply !== false,
                reviewerId: req.user?.id || null,
            });
            res.json(result);
        } catch (error) {
            req.log.error({ err: error }, 'Topic guideline align error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.post('/api/admin/aggregate-memory', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            res.json(await aggregateCollectiveMemory(db));
        } catch (error) {
            req.log.error({ err: error }, 'Aggregate memory error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/admin/aggregate-memory/stats', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const [topicCount, attemptCount, topicsWithMemory, memoryRows] = await Promise.all([
                db.get(`SELECT COUNT(DISTINCT normalized_topic) as count FROM quiz_attempts`),
                db.get(`SELECT COUNT(*) as count FROM quiz_attempts`),
                db.get(`SELECT COUNT(*) as count FROM topic_knowledge WHERE knowledge LIKE '%collective_memory%'`),
                db.all(`SELECT knowledge FROM topic_knowledge WHERE knowledge LIKE '%collective_memory%'`),
            ]);
            const topTopics = await db.all(
                `SELECT normalized_topic, COUNT(*) as attempts, COUNT(DISTINCT user_id) as users
                 FROM quiz_attempts GROUP BY normalized_topic ORDER BY attempts DESC LIMIT 10`
            );

            let trackedPsychometricItems = 0;
            let unreliablePsychometricItems = 0;
            for (const row of memoryRows || []) {
                let knowledge = {};
                try {
                    knowledge = JSON.parse(row.knowledge || '{}');
                } catch {
                    continue;
                }
                const cm = knowledge.collective_memory;
                if (!cm) continue;
                const items = [
                    ...(Array.isArray(cm.highDiscrimination) ? cm.highDiscrimination : []),
                    ...(Array.isArray(cm.tooEasy) ? cm.tooEasy : []),
                    ...(Array.isArray(cm.tooHard) ? cm.tooHard : []),
                    ...(Array.isArray(cm.flaggedForReview) ? cm.flaggedForReview : []),
                ];
                const seen = new Set();
                for (const item of items) {
                    const key = item?.conceptHash || item?.questionText;
                    if (!key || seen.has(key)) continue;
                    seen.add(key);
                    trackedPsychometricItems += 1;
                    const attempts = Number(item.sampleSize ?? item.totalAttempts ?? 0);
                    if (item.reliable === false || attempts < 30) unreliablePsychometricItems += 1;
                }
            }

            res.json({
                topicsWithAttempts: topicCount?.count ?? 0,
                totalAttempts: attemptCount?.count ?? 0,
                topicsWithMemory: topicsWithMemory?.count ?? 0,
                trackedPsychometricItems,
                unreliablePsychometricItems,
                topTopics,
            });
        } catch (error) {
            req.log.error({ err: error }, 'Aggregate memory stats error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // ── Audit log — paginated JSON view ──────────────────────────────────────
    app.get('/api/admin/audit-log', requireAuthJwt, requireRole('admin'), async (req, res) => {
        try {
            const limit = Math.min(500, parseInt(String(req.query.limit || '100'), 10) || 100);
            const offset = Math.max(0, parseInt(String(req.query.offset || '0'), 10) || 0);
            const userId = req.query.userId ? String(req.query.userId) : undefined;
            const action = req.query.action ? String(req.query.action) : undefined;
            const rows = await db.getAuditLogs({ userId, action, limit, offset });
            res.json({ items: rows, limit, offset });
        } catch (error) {
            req.log.error({ err: error }, 'Audit log list error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // ── Audit log — CSV export with optional date range ──────────────────────
    app.get('/api/admin/audit-log/export', requireAuthJwt, requireRole('admin'), async (req, res) => {
        try {
            const userId   = req.query.userId   ? String(req.query.userId)   : undefined;
            const action   = req.query.action   ? String(req.query.action)   : undefined;
            const dateFrom = req.query.dateFrom ? String(req.query.dateFrom) : undefined;
            const dateTo   = req.query.dateTo   ? String(req.query.dateTo)   : undefined;

            // Fetch up to 10 000 rows for export
            let sql = `SELECT id, user_id, session_id, action, resource_type, resource_id, ip_address, created_at FROM audit_logs WHERE 1=1`;
            const params = [];
            if (userId)   { sql += ` AND user_id = ?`;      params.push(userId); }
            if (action)   { sql += ` AND action = ?`;       params.push(action); }
            if (dateFrom) { sql += ` AND created_at >= ?`;  params.push(dateFrom); }
            if (dateTo)   { sql += ` AND created_at <= ?`;  params.push(dateTo + 'T23:59:59Z'); }
            sql += ` ORDER BY created_at DESC LIMIT 10000`;

            const rows = await db.all(sql, params);

            const header = ['id', 'user_id', 'session_id', 'action', 'resource_type', 'resource_id', 'ip_address', 'created_at'];
            const escape = (v) => {
                if (v == null) return '';
                const s = String(v);
                return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
            };
            const csv = [
                header.join(','),
                ...rows.map((r) => header.map((k) => escape(r[k])).join(',')),
            ].join('\n');

            const filename = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(csv);
        } catch (error) {
            req.log.error({ err: error }, 'Audit log export error');
            res.status(500).json({ error: 'Internal server error' });
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
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/admin/quiz-validation-stats', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const topic = req.query.topic ? String(req.query.topic) : null;
            const provider = req.query.provider ? String(req.query.provider) : null;
            const model = req.query.model ? String(req.query.model) : null;
            const days = Math.min(90, Math.max(1, parseInt(String(req.query.days || '30'), 10) || 30));
            const stats = await db.getQuizValidationStats({ topic, provider, model, days });
            const total = stats.reduce((sum, s) => sum + s.count, 0);
            const rejected = stats.filter((s) => s.status === 'rejected').reduce((sum, s) => sum + s.count, 0);
            res.json({
                stats,
                summary: {
                    total,
                    rejected,
                    rejectionRate: total > 0 ? Number((rejected / total).toFixed(4)) : 0,
                    days,
                    topic: topic || null,
                    provider: provider || null,
                    model: model || null,
                },
            });
        } catch (error) {
            req.log.error({ err: error }, 'Quiz validation stats error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // ==========================================
    // Beta Invite Codes
    // ==========================================

    // List all invite codes
    app.get('/api/admin/invite-codes', requireAuthJwt, requireRole('admin'), async (req, res) => {
        try {
            const rows = await db.all(
                `SELECT id, code, label, specialty, max_uses, use_count, created_by, created_at, expires_at
                 FROM beta_invites ORDER BY created_at DESC`
            );
            res.json({ invites: rows });
        } catch (error) {
            req.log.error({ err: error }, 'List invite codes error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Create one or more invite codes
    // Body: { count?: number, label?: string, specialty?: string, maxUses?: number, expiresAt?: string }
    app.post('/api/admin/invite-codes', requireAuthJwt, requireRole('admin'), async (req, res) => {
        try {
            const { count = 1, label, specialty, maxUses = 1, expiresAt } = req.body;
            const n = Math.min(Math.max(parseInt(count) || 1, 1), 200);
            const created = [];
            for (let i = 0; i < n; i++) {
                const code = [
                    crypto.randomBytes(3).toString('hex').toUpperCase(),
                    crypto.randomBytes(3).toString('hex').toUpperCase(),
                ].join('-');
                const id = crypto.randomUUID();
                await db.run(
                    `INSERT INTO beta_invites (id, code, label, specialty, max_uses, use_count, created_by, expires_at)
                     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
                    [id, code, label || null, specialty || null, maxUses, req.user.id, expiresAt || null]
                );
                created.push({ id, code, label, specialty, maxUses, expiresAt });
            }
            res.status(201).json({ created });
        } catch (error) {
            req.log.error({ err: error }, 'Create invite codes error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Delete (revoke) an invite code
    app.delete('/api/admin/invite-codes/:id', requireAuthJwt, requireRole('admin'), async (req, res) => {
        try {
            await db.run(`DELETE FROM beta_invites WHERE id = ?`, [req.params.id]);
            res.json({ message: 'Invite code revoked.' });
        } catch (error) {
            req.log.error({ err: error }, 'Delete invite code error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });
}

module.exports = { registerAdminRoutes };
