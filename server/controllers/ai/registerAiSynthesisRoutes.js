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
function registerAiSynthesisRoutes(app, ctx) {
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

    app.post('/api/ai/journal-club', limitBodySize(2 * 1024 * 1024), requireJson, requireAuthJwt, requireVerifiedEmail, requirePaidFeature('journalClub'), aiUserLimit(8, 60), validateBody(schemas.journalClub), async (req, res) => {
        const { articles, topic, provider = 'auto' } = req.body;
        const topArticles = [...articles]
            .sort((a, b) => (b._impact?.score ?? 0) - (a._impact?.score ?? 0))
            .slice(0, 8);
        try {
            const ai = createAiService({ serverConfig, fetchImpl });
            const normalizedTopic = String(topic || '').trim();
            const [teachingObjects, groundedClaims] = await Promise.all([
                db.listTeachingObjectsForTopic(normalizedTopic, { limit: 3 }).catch(() => []),
                db.listTeachingObjectClaimsForTopic(normalizedTopic, { limit: 8 }).catch(() => []),
            ]);
            const memoryParts = [];
            const teachingContext = teachingObjectsToQuizContext(teachingObjects, { maxObjects: 3, maxClaims: 6 });
            if (teachingContext) memoryParts.push(teachingContext);
            if (groundedClaims.length) {
                memoryParts.push([
                    'HIGH-VALUE CLAIMS TO TEST OR DISCUSS:',
                    ...groundedClaims.slice(0, 8).map((claim, index) => (
                        `CLAIM-${index + 1} (${claim.verificationStatus || 'unverified'}): ${claim.claimText}`
                    )),
                ].join('\n'));
            }
            const prompt = buildJournalClubPrompt(topArticles, normalizedTopic, memoryParts.join('\n\n'));
            const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider }, serverConfig);
            if (!selectedProvider) {
                return res.status(503).json({ error: 'No AI provider configured' });
            }
            let rawText;
            const used = selectedProvider;
            if (selectedProvider === 'gemini') {
                rawText = await ai.callGemini(prompt, selectedModel, { temperature: 0.25 });
            } else {
                rawText = await ai.callMistralAI(prompt, selectedModel, { temperature: 0.25 });
            }
            let pack;
            try {
                const jsonMatch = String(rawText || '').match(/\{[\s\S]*\}/);
                pack = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
            } catch {
                return res.status(502).json({ error: 'AI returned malformed journal club JSON' });
            }
            res.json({
                topic: normalizedTopic,
                provider: used,
                pack,
                memoryContext: {
                    teachingObjects: teachingObjects.length,
                    groundedClaims: groundedClaims.length,
                },
                disclaimer: AI_DISCLAIMER,
            });
        } catch (error) {
            req.log.error({ err: error }, 'Journal club generation error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // SSE Streaming Endpoints
    // ==========================================

}

module.exports = { registerAiSynthesisRoutes };
