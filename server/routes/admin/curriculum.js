'use strict';

const logger = require('../../config/logger');
const fs = require('fs/promises');
const path = require('path');
const { alignTopicClaimsWithGuidelines } = require('../../services/claimGuidelineEngine');
const { seedCurriculumTopic } = require('../../services/curriculumSeedService');
const {
    runCurriculumSeedBatch,
    loadGuardrailState,
    updateCurriculumSeedSchedulerSettings,
} = require('../../services/curriculumSeedScheduler');
const { collectTopicReadiness } = require('../../services/topicReadinessService');

function registerAdminCurriculumRoutes(app, { db, cache, requireAuthJwt, requireRole, serverConfig, fetch }) {
    app.post('/api/admin/curriculum/import-core-topics', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const seedPath = path.join(__dirname, '..', '..', 'data', 'coreClinicalTopics.json');
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

    app.get('/api/admin/topics/readiness', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const limit = Math.min(Math.max(parseInt(String(req.query.limit || '200'), 10) || 200, 1), 2000);
            const offset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0);
            const curriculumSlug = String(req.query.curriculumSlug || 'specialty-clinical-topics').trim();
            const includeRows = String(req.query.includeRows || 'true').toLowerCase() !== 'false';
            const readiness = await collectTopicReadiness(db, {
                curriculumSlug,
                limit,
                offset,
                includeRows,
            });
            res.json({ readiness });
        } catch (error) {
            req.log.error({ err: error }, 'Topic readiness report error');
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
}

module.exports = { registerAdminCurriculumRoutes };
