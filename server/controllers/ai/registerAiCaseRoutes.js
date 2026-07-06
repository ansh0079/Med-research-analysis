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
function registerAiCaseRoutes(app, ctx) {
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

    app.post('/api/ai/generate-case',
        limitBodySize(64 * 1024),
        requireJson,
        requireAuthJwt,
        requireVerifiedEmail,
        strictAiLimit(3, 3600),  // Only 3 case generations per hour
        requirePaidFeature('case_scenarios'),  // Paywall for advanced feature
        async (req, res) => {
            try {
                const { topic, difficulty = 'medium', provider = 'auto', model } = req.body;
                
                if (!topic || typeof topic !== 'string' || topic.length < 3) {
                    return res.status(400).json({ error: 'Topic is required and must be at least 3 characters' });
                }
                
                if (!['easy', 'medium', 'hard'].includes(difficulty)) {
                    return res.status(400).json({ error: 'Difficulty must be easy, medium, or hard' });
                }
                
                // Get user profile for personalization
                const userProfile = await db.getLearningProfile(req.user.id).catch(() => null);
                
                const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider, model }, serverConfig);
                if (!selectedProvider) {
                    return res.status(503).json({ error: 'No AI service configured' });
                }

                const guidelines = await db.getGuidelinesByTopic(topic.trim(), { limit: 5 })
                    .catch((err) => { logger.warn({ err }, 'getGuidelinesByTopic failed'); return []; });

                // Generate case scenario
                const caseScenario = await generateCaseScenario(ai, {
                    topic,
                    difficulty,
                    userProfile,
                    provider: selectedProvider,
                    model: selectedModel,
                    guidelines
                });
                
                // Save to database
                const savedCase = await saveCaseScenario(db, req.user.id, caseScenario);
                
                // Log event
                await db.logEvent('case_generated', req.sessionId, {
                    topic,
                    difficulty,
                    caseId: savedCase.caseId,
                    provider: selectedProvider,
                    model: selectedModel
                });
                
                res.json({
                    caseId: savedCase.caseId,
                    vignette: savedCase.vignette,
                    initialScenario: savedCase.decisionTree.initial,
                    disclaimer: AI_DISCLAIMER
                });
            } catch (error) {
                req.log.error({ err: error }, 'Case generation error');
                res.status(500).json({ error: 'Internal Server Error' });
            }
        }
    );
    
    app.get('/api/ai/case/:caseId',
        requireAuthJwt,
        rateLimit(60, 60),
        async (req, res) => {
            try {
                const { caseId } = req.params;
                const caseScenario = await getCaseScenario(db, caseId, req.user.id);
                
                if (!caseScenario) {
                    return res.status(404).json({ error: 'Case scenario not found' });
                }
                
                res.json({ case: caseScenario });
            } catch (error) {
                req.log.error({ err: error }, 'Case retrieval error');
                res.status(500).json({ error: 'Internal Server Error' });
            }
        }
    );
    
    app.post('/api/ai/case/:caseId/respond',
        limitBodySize(16 * 1024),
        requireJson,
        requireAuthJwt,
        rateLimit(30, 60),
        async (req, res) => {
            try {
                const { caseId } = req.params;
                const { nodeId, choiceId } = req.body;
                
                if (!nodeId || !choiceId) {
                    return res.status(400).json({ error: 'nodeId and choiceId are required' });
                }
                
                const result = await recordCaseChoice(db, caseId, req.user.id, nodeId, choiceId);
                
                // Log event
                await db.logEvent('case_choice', req.sessionId, {
                    caseId,
                    nodeId,
                    choiceId,
                    isAppropriate: result.feedback?.isAppropriate,
                    isTerminal: result.isTerminal
                });
                
                res.json(result);
            } catch (error) {
                req.log.error({ err: error, caseId: req.params.caseId }, 'Case response error');
                res.status(500).json({ error: error.message || 'Internal Server Error' });
            }
        }
    );
}

module.exports = { registerAiCaseRoutes };
