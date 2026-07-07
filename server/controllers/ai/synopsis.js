'use strict';

const logger = require('../../config/logger');
const { limitBodySize } = require('../../utils/validation');
const {
    runPaperSynopsisGeneration,
    getPaperSynopsisArticleId,
    invalidatePaperSynopsisCache,
} = require('../../services/paperSynopsisCore');
const { getOrEnqueuePaperSynopsis } = require('../../services/aiGenerationJobService');
const { persistPaperTeachingObject } = require('../../services/teachingObjectService');
const { buildEvidenceDeltaBrief } = require('../../services/evidenceDeltaBriefService');

async function attachEvidenceDeltaIfAvailable({ db }, result, topic, userId) {
    if (!result || !topic || !userId || !db?.normalizeTopic) return result;
    const brief = await buildEvidenceDeltaBrief(db, userId, topic).catch((err) => {
        logger.debug({ err, topic }, 'synopsis evidence delta unavailable');
        return null;
    });
    if (!brief?.significantChange) return result;
    return { ...result, evidenceDelta: brief };
}

function registerSynopsisRoutes(app, deps) {
    const {
        db, cache, serverConfig, fetchImpl,
        requireJson, requireAiAuth, requireAuthJwt, requirePaidFeature, rateLimit,
        validateBody, schemas,
    } = deps;

    app.post('/api/ai/synopsis', limitBodySize(512 * 1024), requireJson, requireAiAuth, requirePaidFeature('aiSynthesis'), rateLimit(20, 60), validateBody(schemas.synopsis), async (req, res) => {
        const { article, provider = 'auto', async: asyncJob, topic = '', trainingStage: requestedTrainingStage = null } = req.body;
        try {
            let trainingStage = requestedTrainingStage;
            if (!trainingStage && req.user?.id && db?.getLearningProfile) {
                const profile = await db.getLearningProfile(req.user.id).catch((err) => {
                    logger.warn({ err }, 'getLearningProfile for synopsis failed');
                    return null;
                });
                trainingStage = profile?.trainingStage || profile?.training_stage || null;
            }
            if (asyncJob === true) {
                const out = await getOrEnqueuePaperSynopsis({
                    db,
                    article,
                    provider,
                    serverConfig,
                    fetchImpl,
                    cache,
                    logger: req.log,
                    topic,
                    trainingStage,
                    userId: req.user?.id || null,
                });
                const code = out.status === 'queued' || out.status === 'running' ? 202
                    : out.status === 'failed' ? 503 : 200;
                const withDelta = code === 200
                    ? await attachEvidenceDeltaIfAvailable({ db }, out, topic, req.user?.id || null)
                    : out;
                return res.status(code).json(withDelta);
            }
            const result = await runPaperSynopsisGeneration({
                article,
                provider,
                serverConfig,
                fetchImpl,
                cache,
                db,
                sessionId: req.sessionId,
                log: req.log,
                topic,
                trainingStage,
                userId: req.user?.id || null,
            });
            return res.json(await attachEvidenceDeltaIfAvailable({ db }, result, topic, req.user?.id || null));
        } catch (error) {
            req.log.error({ err: error }, 'Synopsis generation error');
            const status = /No AI service|No AI provider/.test(error.message) ? 503 : 500;
            return res.status(status).json({ error: error.message });
        }
    });

    app.post('/api/ai/synopsis/feedback', limitBodySize(128 * 1024), requireJson, requireAiAuth, rateLimit(60, 60), async (req, res) => {
        const {
            article,
            articleUid,
            topic = null,
            trainingStage = null,
            provider = null,
            model = null,
            feedbackType,
            reason = null,
            cached = null,
        } = req.body || {};
        const type = String(feedbackType || '').trim();
        const uid = articleUid || (article ? getPaperSynopsisArticleId(article) : null);
        if (!uid || !['helpful', 'not_helpful'].includes(type)) {
            return res.status(400).json({ error: 'articleUid/article and feedbackType (helpful|not_helpful) are required' });
        }
        try {
            if (db?.recordSynopsisFeedback) {
                await db.recordSynopsisFeedback({
                    userId: req.user?.id || null,
                    sessionId: req.sessionId,
                    articleUid: uid,
                    topic,
                    trainingStage,
                    provider,
                    model,
                    feedbackType: type,
                    reason,
                    metadata: { cached },
                });
            }
            if (type === 'not_helpful' && article) {
                await invalidatePaperSynopsisCache({ cache, article, selectedModel: model, trainingStage }).catch((err) => {
                    logger.warn({ err, articleUid: uid }, 'synopsis cache invalidation failed');
                    return false;
                });
            }
            if (db?.logEvent) {
                await db.logEvent(type === 'helpful' ? 'synopsis_feedback_helpful' : 'synopsis_feedback_not_helpful', req.sessionId, {
                    articleUid: uid,
                    topic,
                    trainingStage,
                }).catch((err) => { logger.warn({ err }, 'synopsis feedback logEvent failed'); return null; });
            }
            return res.json({ ok: true, feedbackType: type, cacheInvalidated: type === 'not_helpful' && Boolean(article) });
        } catch (error) {
            req.log.error({ err: error }, 'Synopsis feedback error');
            return res.status(500).json({ error: 'Failed to record synopsis feedback' });
        }
    });

    app.post('/api/teaching-objects/paper', limitBodySize(512 * 1024), requireJson, requireAiAuth, requirePaidFeature('aiSynthesis'), rateLimit(20, 60), validateBody(schemas.synopsis), async (req, res) => {
        const { article, provider = 'auto', topic = '' } = req.body;
        try {
            const synopsisResult = await runPaperSynopsisGeneration({
                article,
                provider,
                serverConfig,
                fetchImpl,
                cache,
                db,
                sessionId: req.sessionId,
                log: req.log,
                topic,
                userId: req.user?.id || null,
            });
            const teachingObject = await persistPaperTeachingObject({ db, article, synopsisResult, topic });
            res.json({ synopsis: synopsisResult.synopsis, articleId: synopsisResult.articleId, teachingObject });
        } catch (error) {
            req.log.error({ err: error }, 'Teaching object generation error');
            const status = /No AI service|No AI provider/.test(error.message) ? 503 : 500;
            res.status(status).json({ error: error.message });
        }
    });

    app.get('/api/teaching-objects/paper/:articleUid', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const teachingObject = await db.getTeachingObjectForArticle(req.params.articleUid);
            if (!teachingObject) return res.status(404).json({ error: 'Teaching object not found' });
            res.json({ teachingObject });
        } catch (error) {
            req.log.error({ err: error }, 'Teaching object fetch error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

module.exports = { registerSynopsisRoutes };
