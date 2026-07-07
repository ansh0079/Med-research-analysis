'use strict';

const { TEMPERATURE, MAX_OUTPUT_TOKENS } = require('../../services/aiService');
const { resolveProvider } = require('../../utils/aiProvider');
const { setupSSE, sendSSE } = require('../../utils/sse');
const {
    runFullSynthesisGeneration,
    prepareSynthesisContext,
    parseSynthesisText,
    validateSynthesisCitations,
    buildSynthesisResult,
    persistSynthesisResult,
    getSynthesisCacheKey,
    selectTopSynthesisArticles,
} = require('../../services/synthesisGenerationCore');
const {
    runPaperSynopsisGeneration,
    getPaperSynopsisArticleId,
    invalidatePaperSynopsisCache,
} = require('../../services/paperSynopsisCore');
const { getOrEnqueueFullSynthesis, getOrEnqueuePaperSynopsis } = require('../../services/aiGenerationJobService');
const { persistPaperTeachingObject } = require('../../services/teachingObjectService');

function registerSynthesisRoutes(app, {
    db,
    cache,
    serverConfig,
    fetchImpl,
    ai,
    logger,
    limitBodySize,
    requireJson,
    requireAiAuth,
    requireAuthJwt,
    requireVerifiedEmail,
    requirePaidFeature,
    requireMonthlyLimit,
    rateLimit,
    aiUserLimit,
    synthesisLimit,
    validateBody,
    schemas,
    helpers,
}) {
    const { maybeStoreTopicKnowledge, attachEvidenceDeltaIfAvailable } = helpers;

    app.post('/api/ai/synthesize', limitBodySize(2 * 1024 * 1024), requireJson, requireAiAuth, requireVerifiedEmail, requirePaidFeature('aiSynthesis'), requireMonthlyLimit('synthesisPerMonth', 'ai_synthesis'), synthesisLimit(3, 3600), validateBody(schemas.synthesize), async (req, res) => {
        const { articles, topic, provider = 'auto', async: asyncJob } = req.body;

        if (!Array.isArray(articles) || articles.length === 0) {
            return res.status(400).json({ error: 'At least one article is required for synthesis' });
        }

        const topArticles = [...articles]
            .sort((a, b) => (b._impact?.score ?? 0) - (a._impact?.score ?? 0))
            .slice(0, 15);

        // Default to async background job to avoid request timeouts on long synthesis.
        // Clients can pass async: false to opt into the legacy inline (blocking) path.
        if (asyncJob !== false) {
            try {
                const out = await getOrEnqueueFullSynthesis({
                    db,
                    topic: topic || '',
                    articles: topArticles,
                    provider,
                    serverConfig,
                    fetchImpl,
                    cache,
                    logger: req.log,
                    userId: req.user?.id || null,
                });
                const code = out.status === 'queued' || out.status === 'running' ? 202 : 200;
                return res.status(code).json(out);
            } catch (error) {
                req.log.error({ err: error }, 'Synthesis async enqueue error');
                return res.status(500).json({ error: 'Internal Server Error' });
            }
        }

        try {
            const result = await runFullSynthesisGeneration({
                articles: topArticles,
                topic: topic || 'General Medical Inquiry',
                provider,
                db,
                cache,
                serverConfig,
                fetchImpl,
                userId: req.user?.id || null,
            });
            void maybeStoreTopicKnowledge({
                topic,
                synthesis: result.synthesis,
                articles: topArticles,
                provider: result.audit?.provider,
                model: result.audit?.model,
                log: req.log,
            });
            await db.logEvent('synthesize', req.sessionId, {
                topic,
                articleCount: topArticles.length,
                citationOk: result.citationValidation?.ok ?? null,
                citationIssueCount: result.citationValidation?.issueCount ?? null,
            });
            res.json(result);
        } catch (error) {
            req.log.error({ err: error }, 'Synthesis error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/ai/synthesize/stream', limitBodySize(2 * 1024 * 1024), requireJson, requireAiAuth, requireVerifiedEmail, requirePaidFeature('aiSynthesis'), requireMonthlyLimit('synthesisPerMonth', 'ai_synthesis'), aiUserLimit(5, 60), validateBody(schemas.synthesize), async (req, res) => {
        const { articles, topic, provider = 'auto' } = req.body;

        if (!Array.isArray(articles) || articles.length === 0) {
            return res.status(400).json({ error: 'At least one article is required for synthesis' });
        }

        const topArticles = selectTopSynthesisArticles(articles);
        const synthesisPersonalization = { userId: req.user?.id || null };
        const cacheKey = getSynthesisCacheKey(topic, topArticles, null, synthesisPersonalization);
        const cached = await cache.getAsync(cacheKey);
        if (cached) {
            setupSSE(res);
            const promptHash = cached.audit?.promptHash;
            const derivedJobKey = cached.jobKey || (promptHash ? `syn:${promptHash}` : null);
            sendSSE(res, 'result', { ...cached, cached: true, jobKey: derivedJobKey || cached.jobKey });
            sendSSE(res, 'done', {});
            return res.end();
        }

        try {
            const context = await prepareSynthesisContext({ articles: topArticles, topic, db, cache, userId: req.user?.id || null });

            setupSSE(res);

            const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider }, serverConfig);
            if (!selectedProvider) {
                sendSSE(res, 'error', { message: 'No AI provider configured. Add GEMINI_API_KEY to .env' });
                return res.end();
            }

            let rawText = '';
            for await (const chunk of ai.callTextStream(context.prompt, selectedProvider, selectedModel, { temperature: TEMPERATURE.synthesis, maxOutputTokens: MAX_OUTPUT_TOKENS.synthesis })) {
                rawText += chunk;
                sendSSE(res, 'chunk', { text: chunk });
            }

            const synthesis = parseSynthesisText(rawText);
            const citationValidation = validateSynthesisCitations(synthesis, {
                sourceCount: context.topArticles.length,
                guidelineCount: context.guidelines.length,
            });
            const result = buildSynthesisResult({
                synthesis,
                topic,
                topArticles: context.topArticles,
                sourceMap: context.sourceMap,
                citationValidation,
                retractedUids: context.retractedUids,
                retractionResults: context.retractionResults,
                prompt: context.prompt,
                provider: selectedProvider,
                model: selectedModel,
                fullTextIndexedCount: context.fullTextIndexedCount,
                fullTextCoverageRatio: context.fullTextCoverageRatio,
            });

            await persistSynthesisResult({
                db,
                cache,
                cacheKey: context.cacheKey,
                result,
                topic,
                synthesis,
                topArticles: context.topArticles,
                model: selectedModel,
                serverConfig,
                userId: req.user?.id || null,
                provider: selectedProvider,
            });
            void maybeStoreTopicKnowledge({
                topic,
                synthesis,
                articles: context.topArticles,
                provider: selectedProvider,
                model: selectedModel,
                log: req.log,
            });
            await db.logEvent('synthesize', req.sessionId, {
                topic,
                articleCount: topArticles.length,
                citationOk: result.citationValidation?.ok ?? null,
                citationIssueCount: result.citationValidation?.issueCount ?? null,
            });

            sendSSE(res, 'result', result);
            sendSSE(res, 'done', {});
            res.end();
        } catch (error) {
            req.log.error({ err: error }, 'Synthesis stream error');
            if (!res.headersSent) {
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            sendSSE(res, 'error', { message: error.message || 'Stream error' });
            res.end();
        }
    });

    // ─────────────────────────────────────────────────────────────────
    // POST /api/ai/synopsis
    // Single-article structured synopsis — returns the 13-field schema.
    // Cached 24 hours. Use body.async=true to queue a durable job (poll GET /api/ai/jobs/:jobKey).
    // ─────────────────────────────────────────────────────────────────
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
                    ? await attachEvidenceDeltaIfAvailable(out, topic, req.user?.id || null)
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
            return res.json(await attachEvidenceDeltaIfAvailable(result, topic, req.user?.id || null));
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

module.exports = { registerSynthesisRoutes };
