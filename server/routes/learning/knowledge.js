const logger = require('../../config/logger');
function registerKnowledgeRoutes(app, deps) {
    const { db, requireAuthJwt, requireAuthOrBeta, requireVerifiedEmail, rateLimit, serverConfig, fetch: fetchImpl } = deps;
    const { limitBodySize, requireJson, validateBody, schemas } = require('../../utils/validation');
    const requireQuizAuth = requireAuthOrBeta || requireAuthJwt;

    function recordLearningEventSafe(event) {
        return db.recordLearningEvent(event).catch((err) => {
            logger.warn({ err, eventType: event?.eventType }, 'recordLearningEvent failed');
            return null;
        });
    }

    app.get('/api/learning/topic-overview', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const topic = String(req.query.topic || '').trim();
            if (topic.length < 2) return res.status(400).json({ error: 'topic is required' });
            const [activeRun, practiceAlerts, snapshots] = await Promise.all([
                db.getActiveStudyRun(req.user.id, topic).catch(() => null),
                db.listPracticeChangingTeachingObjects({ topic, limit: 6 }).catch(() => []),
                (db.getLatestSynthesisSnapshots?.(topic, 1) ?? Promise.resolve([])).catch(() => []),
            ]);
            res.json({
                topic,
                activeRun: activeRun || null,
                practiceAlerts,
                latestSnapshot: snapshots[0] || null,
            });
        } catch (error) {
            req.log.error({ err: error }, 'Topic overview error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/topic-evidence-memory', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const topic = String(req.query.topic || '').trim();
            if (topic.length < 2) return res.status(400).json({ error: 'topic is required' });
            const { buildTopicEvidenceMemory } = require('../../services/topicEvidenceMemoryService');
            const memory = await buildTopicEvidenceMemory(db, req.user.id, topic);
            res.json({ memory });
        } catch (error) {
            req.log.error({ err: error }, 'Topic evidence memory error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/claim-lifecycle', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const topic = String(req.query.topic || '').trim();
            if (topic.length < 2) return res.status(400).json({ error: 'topic is required' });
            const { describeClaimLifecycle, summarizeTopicLifecycle } = require('../services/claimLifecycleService');
            const claims = await db.listTeachingObjectClaimsForTopic(topic, { limit: 80 });
            const lifecycle = claims.map(describeClaimLifecycle);
            const summary = summarizeTopicLifecycle(claims);
            const regeneration = await (db.listClaimRegenerationForTopic?.(topic, { limit: 15 }) ?? Promise.resolve([]));
            res.json({ topic, summary, claims: lifecycle, regeneration });
        } catch (error) {
            req.log.error({ err: error }, 'Claim lifecycle error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/evidence-delta', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const topic = String(req.query.topic || '').trim();
            if (topic.length < 2) return res.status(400).json({ error: 'topic is required' });
            const { buildEvidenceDeltaBrief } = require('../services/evidenceDeltaBriefService');
            const brief = await buildEvidenceDeltaBrief(db, req.user.id, topic);
            res.json({ brief });
        } catch (error) {
            req.log.error({ err: error }, 'Evidence delta brief error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/knowledge-graph', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const topic = String(req.query.topic || '').trim();
            if (topic.length < 2) return res.status(400).json({ error: 'topic is required' });
            const { buildPersonalKnowledgeGraph } = require('../services/personalKnowledgeGraphService');
            const graph = await buildPersonalKnowledgeGraph(db, req.user.id, topic);
            res.json({ graph });
        } catch (error) {
            req.log.error({ err: error }, 'Knowledge graph error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/confidence-calibration', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const topic = String(req.query.topic || '').trim();
            const { getConfidenceCalibrationProfile } = require('../services/confidenceCalibrationService');
            const profile = await getConfidenceCalibrationProfile(db, req.user.id, topic);
            res.json({ profile });
        } catch (error) {
            req.log.error({ err: error }, 'Confidence calibration error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/learning/learning-rounds', requireAuthJwt, rateLimit(10, 60), async (req, res) => {
        try {
            const topic = String(req.body?.topic || '').trim();
            if (topic.length < 2) return res.status(400).json({ error: 'topic is required' });
            const { createLearningRound } = require('../services/learningRoundsService');
            const result = await createLearningRound(db, req.user.id, topic);
            const items = result?.round?.items || result?.items || [];
            for (const claimKey of items.map((item) => item.claimKey).filter(Boolean)) {
                void recordLearningEventSafe({
                    userId: req.user.id,
                    eventType: 'claim_seen',
                    topic,
                    claimKey,
                    sourceType: 'learning_round',
                    sourceId: result?.round?.id || null,
                    payload: { itemCount: items.length },
                });
            }
            res.status(201).json(result);
        } catch (error) {
            req.log.error({ err: error }, 'Create learning round error');
            res.status(500).json({ error: error.message || 'Internal Server Error' });
        }
    });

    app.get('/api/learning/learning-rounds/:id', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const roundId = parseInt(String(req.params.id), 10);
            if (!roundId) return res.status(400).json({ error: 'invalid round id' });
            const round = await db.getLearningRound(roundId, req.user.id);
            if (!round) return res.status(404).json({ error: 'Round not found' });
            res.json({ round });
        } catch (error) {
            req.log.error({ err: error }, 'Get learning round error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/learning/case-to-evidence', requireAuthJwt, rateLimit(8, 60), async (req, res) => {
        try {
            const clinicalQuestion = String(req.body?.clinicalQuestion || req.body?.caseText || '').trim();
            const topic = String(req.body?.topic || '').trim();
            if (clinicalQuestion.length < 12) {
                return res.status(400).json({ error: 'clinicalQuestion is required (min 12 chars)' });
            }
            const { buildCaseToEvidenceBrief } = require('../services/caseToEvidenceService');
            const result = await buildCaseToEvidenceBrief(db, {
                clinicalQuestion,
                topic,
                serverConfig,
                fetchImpl,
                seedArticles: req.body?.seedArticles || [],
                userId: req.user.id,
            });
            res.json(result);
        } catch (error) {
            req.log.error({ err: error }, 'Case-to-evidence error');
            res.status(500).json({ error: error.message || 'Internal Server Error' });
        }
    });

    app.get('/api/learning/guideline-watch', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const topic = String(req.query.topic || '').trim();
            if (topic.length < 2) return res.status(400).json({ error: 'topic is required' });
            const events = await (db.listGuidelineWatchEvents?.(topic, { limit: 20 }) ?? Promise.resolve([]));
            res.json({ events });
        } catch (error) {
            req.log.error({ err: error }, 'Guideline watch list error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/learning/topic-review', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const topic = String(req.body?.topic || req.query?.topic || '').trim();
            if (topic.length < 2) return res.status(400).json({ error: 'topic is required' });
            const review = await db.upsertUserTopicReview(req.user.id, topic);
            res.json({ review });
        } catch (error) {
            req.log.error({ err: error }, 'Topic review record error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/topic-memory', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
            const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
            const memories = await db.listUserTopicMemory(req.user.id, { limit, offset });
            res.json({ memories });
        } catch (error) {
            req.log.error({ err: error }, 'List topic memory error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/topic-proposals/:topic', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const topic = String(req.params.topic || '').trim();
            if (topic.length < 2) return res.status(400).json({ error: 'topic is required' });
            const result = await db.listTopicKnowledgeProposalsForUser(req.user.id, { topic, status: 'pending_review', limit: 5 });
            res.json({ proposals: result.proposals, total: result.total });
        } catch (error) {
            req.log.error({ err: error }, 'List topic proposals error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Quiz Attempts
    // ==========================================


}

module.exports = { registerKnowledgeRoutes };
