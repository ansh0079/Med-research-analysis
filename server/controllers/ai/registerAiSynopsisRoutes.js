const crypto = require('crypto');
const logger = require('../../config/logger');
const { createAiService, PINNED_MODELS, TEMPERATURE, MAX_OUTPUT_TOKENS, AI_DISCLAIMER } = require('../../services/aiService');
const { buildQuizPrompt, buildSeminalKnowledgeExtractionPrompt, buildAnalysisPrompt, buildPicoExtractionPrompt, buildJournalClubPrompt } = require('../../prompts');
const { batchCheckRetractions } = require('../../services/qualityService');
const { validateMedicalOutputCitations, validateSourceIndices } = require('../../services/citationValidator');
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
const claimMapService = require('../../services/claimMapService');
const { teachingObjectsToQuizContext, persistPaperTeachingObject } = require('../../services/teachingObjectService');
const { limitBodySize } = require('../../utils/validation');
const { resolveProvider } = require('../../utils/aiProvider');
const { parseJsonArrayStrict, parseStructuredQuizArray } = require('../../utils/parseJson');
const { createLlmUsageLogger, buildUsageEntry } = require('../../services/llmUsageService');
const { createMcqValidationService } = require('../../services/mcqValidationService');
const { createBudgetForAction, runWithLlmBudget } = require('../../services/llmRequestBudget');
const { getPromptVersion } = require('../../prompts/promptVersions');
const { validateAiOutput } = require('../../services/aiOutputValidation');
const { enrichLearnerContextForQuiz } = require('../../services/learnerContextService');
const { buildEvidenceDeltaBrief } = require('../../services/evidenceDeltaBriefService');
const { coldStartMcqKey, guidelineMcqKey, liveQuizMcqKey } = require('../../utils/teachingObjectKeys');
const { generateCaseScenario, saveCaseScenario, getCaseScenario, recordCaseChoice } = require('../../services/caseScenarioService');

/**
 * @param {import('express').Application} app
 * @param {ReturnType<import('./createAiRouteContext').createAiRouteContext>} ctx
 */
function registerAiSynopsisRoutes(app, ctx) {
    const {
        serverConfig,
        db,
        cache,
        rateLimit,
        ai,
        mcqValidator,
        logLlm,
        requireAiAuth,
        aiUserLimit,
        strictAiLimit,
        synthesisLimit,
        caseGenerationLimit,
        limitBodySize,
        requireJson,
        requireAuthJwt,
        requireVerifiedEmail,
        requirePaidFeature,
        requireMonthlyLimit,
        validateBody,
        validateAnalysisBody,
        schemas,
        fetchImpl,
        extractJsonArray,
        generateQuizQuestions,
        mapColdStartMcq,
        serveColdStartMCQs,
        buildStudyRunOutline,
        selectStudyRunTargets,
        selectAdaptiveMemoryTargets,
        normalizeOutlineNodeId,
        normalizeClaimKey,
        assignQuizPromptVariant,
        normalizeVisualExplanation,
        selectAdaptiveClaimAnchors,
        extractJsonObject,
        maybeStoreTopicKnowledge,
        attachEvidenceDeltaIfAvailable,
    } = ctx;


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

    // Direct Feedback Loop: Refine AI output based on user preference signal
    app.post('/api/ai/refine', requireJson, requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        const { feedback, topic } = req.body || {};
        const VALID_FEEDBACK = ['too_basic', 'too_complex', 'focus_mechanisms', 'focus_exam'];
        if (!VALID_FEEDBACK.includes(feedback)) {
            return res.status(400).json({ error: `feedback must be one of: ${VALID_FEEDBACK.join(', ')}` });
        }

        try {
            const profile = await db.getLearningProfile(req.user.id).catch((err) => { logger.warn({ err }, 'getLearningProfile failed'); return null; });
            const updates = {};
            if (feedback === 'too_basic') {
                updates.preferredDifficulty = 'hard';
                updates.defaultExplanationDepth = 'mechanistic';
            } else if (feedback === 'too_complex') {
                updates.preferredDifficulty = 'easy';
                updates.defaultExplanationDepth = 'foundation';
            } else if (feedback === 'focus_mechanisms') {
                updates.defaultExplanationDepth = 'mechanistic';
            } else if (feedback === 'focus_exam') {
                updates.defaultExplanationDepth = 'exam_focus';
            }

            await db.upsertLearningProfile(req.user.id, updates);

            // If a topic is provided, also nudge the user's topic memory toward deeper engagement
            if (topic) {
                const tm = await db.getUserTopicMemory(req.user.id, topic).catch((err) => { logger.warn({ err }, 'getUserTopicMemory failed'); return null; });
                if (tm && tm.memoryTier === 'sparse') {
                    // Implicitly promote topic memory tier when user actively refines
                    await db.recordUserTopicSavedArticleSignal?.(req.user.id, topic, 'refine-feedback').catch((err) => { logger.warn({ err }, 'recordUserTopicSavedArticleSignal failed'); });
                }
            }

            const updatedProfile = await db.getLearningProfile(req.user.id);
            res.json({
                feedback,
                applied: updates,
                profile: updatedProfile,
                message: `Preference updated. Future ${topic ? `"${topic}"` : ''} content will use the ${updates.defaultExplanationDepth || updates.preferredDifficulty} rubric.`,
            });
        } catch (error) {
            req.log.error({ err: error }, 'Refine preference error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // AI dependency health — exposes circuit breaker state for monitoring
    app.get('/api/ai/health', (req, res) => {
        const breakers = ai._breakers || {};
        res.json({
            providers: Object.keys(ai.AI_PROVIDERS || {}),
            breakers: Object.fromEntries(
                Object.entries(breakers).map(([name, breaker]) => [name, breaker.health?.() || { state: 'unknown' }])
            ),
            timestamp: new Date().toISOString(),
        });
    });
}

module.exports = { registerAiSynopsisRoutes };
