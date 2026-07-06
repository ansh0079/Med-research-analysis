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
function registerAiAnalysisRoutes(app, ctx) {
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

    app.post('/api/ai/analyze', limitBodySize(2 * 1024 * 1024), requireJson, requireAiAuth, requireMonthlyLimit('aiAnalysesPerMonth', 'ai_analysis'), aiUserLimit(10, 60), validateBody(schemas.analyze), async (req, res) => {
        const { text, analysisType, provider = 'auto', model } = req.body;

        const validationErrors = validateAnalysisBody(req.body);
        if (validationErrors.length > 0) {
            return res.status(400).json({ error: 'Validation failed', details: validationErrors });
        }

        const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider, model }, serverConfig);
        if (!selectedProvider) {
            return res.status(503).json({ error: 'No AI service configured. Add GEMINI_API_KEY or MISTRAL_API_KEY to .env' });
        }

        const temperature = TEMPERATURE.analysis;

        const textHash = crypto.createHash('md5').update(text).digest('hex');
        try {
            const cached = await db.getCachedAnalysis(textHash, analysisType, selectedModel);
            if (cached) {
                req.log.debug({ hash: textHash.substring(0, 8) }, 'Analysis DB cache hit');
                return res.json({ ...cached, cached: true, provider: selectedProvider });
            }

            const memCached = await cache.getAnalysisAsync(textHash, analysisType, selectedModel);
            if (memCached) {
                return res.json({ result: memCached.result, cached: true, provider: selectedProvider });
            }

            const prompt = buildAnalysisPrompt(text, analysisType);

            const generatedText = await ai.callText(prompt, selectedProvider, selectedModel, { temperature });

            const result = {
                result: generatedText,
                model: selectedModel,
                provider: selectedProvider,
                type: analysisType,
                timestamp: new Date().toISOString(),
                disclaimer: AI_DISCLAIMER,
            };

            await cache.setAnalysisAsync(textHash, analysisType, selectedModel, result);
            await db.cacheAnalysis(textHash, analysisType, selectedModel, result, 0, 0);
            await db.logEvent('analyze', req.sessionId, {
                type: analysisType,
                model: selectedModel,
                provider: selectedProvider,
            });

            res.json(result);
        } catch (error) {
            req.log.error({ err: error, provider: selectedProvider, model: selectedModel }, 'AI analysis error');
            const isDev = process.env.NODE_ENV === 'development';
            res.status(500).json({ error: 'Internal Server Error',
                provider: selectedProvider,
                model: selectedModel,
                ...(isDev && { stack: error.stack }),
            });
        }
    });

    app.post('/api/ai/explain', limitBodySize(2 * 1024 * 1024), requireJson, requireAiAuth, aiUserLimit(10, 60), validateBody(schemas.analyze), async (req, res) => {
        const { text, provider = 'auto', model } = req.body;

        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Text is required and must be a string' });
        }
        if (text.length > 50000) {
            return res.status(400).json({ error: 'Text exceeds maximum length of 50000 characters' });
        }

        const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider, model }, serverConfig);
        if (!selectedProvider) {
            return res.status(503).json({ error: 'No AI service configured. Add GEMINI_API_KEY or MISTRAL_API_KEY to .env' });
        }

        const temperature = TEMPERATURE.explain;

        const textHash = crypto.createHash('md5').update(text).digest('hex');
        const analysisType = 'layperson';

        try {
            const cached = await db.getCachedAnalysis(textHash, analysisType, selectedModel);
            if (cached) {
                return res.json({ ...cached, cached: true, provider: selectedProvider });
            }

            const memCached = await cache.getAnalysisAsync(textHash, analysisType, selectedModel);
            if (memCached) {
                return res.json({ result: memCached.result, cached: true, provider: selectedProvider });
            }

            const prompt = `Explain this medical research in simple terms that a patient could understand:\n\n${text}`;

            const generatedText = await ai.callText(prompt, selectedProvider, selectedModel, { temperature });

            const result = {
                result: generatedText,
                model: selectedModel,
                provider: selectedProvider,
                type: analysisType,
                timestamp: new Date().toISOString(),
                disclaimer: AI_DISCLAIMER,
            };

            await cache.setAnalysisAsync(textHash, analysisType, selectedModel, result);
            await db.cacheAnalysis(textHash, analysisType, selectedModel, result, 0, 0);
            await db.logEvent('explain', req.sessionId, { provider: selectedProvider, model: selectedModel });

            res.json(result);
        } catch (error) {
            req.log.error({ err: error }, 'AI explain error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/ai/providers', requireAuthJwt, (req, res) => {
        const providers = [];

        if (serverConfig.keys.gemini) {
            providers.push({
                id: 'gemini',
                name: 'Google Gemini',
                models: [
                    { id: PINNED_MODELS.gemini, name: 'Gemini 2.5 Flash-Lite (Recommended)' },
                    { id: PINNED_MODELS.geminiQuality, name: 'Gemini 2.5 Flash (Higher quality)' },
                ],
            });
        }
        if (serverConfig.keys.mistral) {
            providers.push({
                id: 'mistral',
                name: 'Mistral AI',
                models: [
                    { id: PINNED_MODELS.mistral, name: 'Mistral Small 4' },
                ],
            });
        }

        res.json({
            providers,
            default: serverConfig.keys.gemini ? 'gemini' : (serverConfig.keys.mistral ? 'mistral' : null),
        });
    });

    app.get('/api/ai/jobs', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const statusRaw = String(req.query?.status || 'queued,running').trim();
            const jobTypeRaw = String(req.query?.jobType || 'full_synthesis').trim();
            const limit = Math.min(Math.max(parseInt(req.query?.limit, 10) || 12, 1), 30);
            const statuses = statusRaw.split(',').map((s) => s.trim()).filter(Boolean);
            const jobTypes = jobTypeRaw.split(',').map((s) => s.trim()).filter(Boolean);
            const jobs = await db.listUserAiGenerationJobs(req.user.id, { statuses, jobTypes, limit });
            res.json({
                jobs: jobs.map((job) => ({
                    jobKey: job.jobKey,
                    jobType: job.jobType,
                    status: job.status,
                    topic: job.topic,
                    errorMessage: job.errorMessage,
                    attempts: job.attempts,
                    createdAt: job.createdAt,
                    updatedAt: job.updatedAt,
                    startedAt: job.startedAt,
                    completedAt: job.completedAt,
                })),
            });
        } catch (error) {
            req.log.error({ err: error }, 'AI generation jobs list error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/ai/jobs/:jobKey', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const jobKey = String(req.params.jobKey || '').trim();
            if (!jobKey || jobKey.length > 160) {
                return res.status(400).json({ error: 'Valid jobKey is required' });
            }
            const job = await db.getAiGenerationJobByKey(jobKey);
            if (!job) return res.status(404).json({ error: 'AI generation job not found' });
            res.json({
                job: {
                    jobKey: job.jobKey,
                    jobType: job.jobType,
                    status: job.status,
                    topic: job.topic,
                    result: job.resultPayload,
                    errorMessage: job.errorMessage,
                    provider: job.provider,
                    model: job.model,
                    audit: job.auditPayload,
                    attempts: job.attempts,
                    createdAt: job.createdAt,
                    updatedAt: job.updatedAt,
                    startedAt: job.startedAt,
                    completedAt: job.completedAt,
                },
            });
        } catch (error) {
            req.log.error({ err: error }, 'AI generation job fetch error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/ai/jobs/:jobKey/claims', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const jobKey = String(req.params.jobKey || '').trim();
            if (!jobKey || jobKey.length > 160) {
                return res.status(400).json({ error: 'Valid jobKey is required' });
            }
            const claims = await db.listAiGenerationClaimsByJobKey(jobKey);
            res.json({ jobKey, claims, count: claims.length });
        } catch (error) {
            req.log.error({ err: error }, 'AI generation claims fetch error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

module.exports = { registerAiAnalysisRoutes };
