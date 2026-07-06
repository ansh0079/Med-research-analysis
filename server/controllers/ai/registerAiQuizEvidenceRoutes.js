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
function registerAiQuizEvidenceRoutes(app, ctx) {
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


    app.post('/api/quiz/from-evidence', requireJson, requireAiAuth, rateLimit(10, 60), async (req, res) => {
        return runWithLlmBudget(createBudgetForAction('quiz'), async () => {
        const { topic, articles = [], count = 3, difficulty = 'mixed' } = req.body;
        if (!topic || typeof topic !== 'string' || topic.trim().length < 2) {
            return res.status(400).json({ error: 'topic is required' });
        }
        if (!Array.isArray(articles) || articles.length === 0) {
            return res.status(400).json({ error: 'At least one article is required' });
        }
        const safeCount = Math.min(Math.max(parseInt(String(count), 10) || 3, 1), 5);
        const guidelines = await db.getGuidelinesByTopic(topic.trim(), { limit: 3 }).catch((err) => { logger.warn({ err }, 'operation failed'); return []; });

        let userContext = null;
        if (req.user?.id) {
            userContext = await enrichLearnerContextForQuiz(db, {
                userId: req.user.id,
                topic: topic.trim(),
                claimLimit: 25,
                trajectoryLimit: 6,
                recentAttemptLimit: 20,
            });
        }

        // Community signals for evidence-to-quiz
        const communityTopPicks = await db.getGlobalEngagedArticles?.(db.normalizeTopic(topic.trim()), 3).catch((err) => { logger.warn({ err }, 'operation failed'); return []; }) || [];
        const teachingObjects = await db.listTeachingObjectsForTopic(topic.trim(), { limit: 8 }).catch((err) => { logger.warn({ err }, 'operation failed'); return []; });
        const teachingObjectContext = teachingObjectsToQuizContext(teachingObjects);
        const promptVariant = assignQuizPromptVariant(req.user?.id, topic.trim());

        const prompt = buildQuizPrompt(
            topic.trim(),
            articles.slice(0, 5),
            { count: safeCount, difficulty, communityTopPicks, teachingObjectContext, promptVariant },
            guidelines,
            userContext
        );

        const { provider: selectedProvider, model: initialQuizModel } = resolveProvider({}, serverConfig);
        if (!selectedProvider) {
            return res.status(503).json({ error: 'No AI provider configured. Add GEMINI_API_KEY or MISTRAL_API_KEY to .env' });
        }

        try {
            const quizUsage = { operation: 'quiz', topic: topic.trim(), userId: req.user?.id || null };
            const generated = await generateQuizQuestions(ai, {
                prompt,
                provider: selectedProvider,
                model: initialQuizModel,
                usage: quizUsage,
            });
            const raw = generated.questions;
            const usedProvider = generated.usedProvider;
            const quizModel = generated.quizModel;

            if (!Array.isArray(raw)) {
                return res.status(502).json({ error: 'AI returned non-array quiz data. Please retry.' });
            }

            let validationSummary = { reviewed: 0, rejected: 0, rejections: [], skipped: false };
            let validatedRaw = raw;
            const batchTs = Date.now();
            try {
                const validation = await mcqValidator.validateBatch({
                    topic: topic.trim(),
                    questions: raw,
                    provider: usedProvider,
                    model: quizModel,
                    articles,
                    guidelines,
                });
                if (validation) {
                    for (let idx = 0; idx < raw.length; idx++) {
                        const rejection = validation.rejections.find((r) => r.mcqIndex === idx + 1);
                        void mcqValidator.recordValidationResult({
                            questionId: `quiz_${batchTs}_${idx}`,
                            topic: topic.trim(),
                            normalizedTopic: db.normalizeTopic(topic.trim()),
                            jobKey: null,
                            promptVariant: promptVariant || null,
                            status: rejection ? 'rejected' : 'passed',
                            reasons: rejection ? rejection.issues : [],
                            reviewerNotes: rejection ? rejection.reason : null,
                            provider: usedProvider,
                            model: quizModel,
                        });
                    }
                    validatedRaw = raw.filter((_, idx) => validation.validIndices.has(idx + 1));
                    validationSummary = {
                        reviewed: validation.reviewed,
                        rejected: validation.rejections.length,
                        rejections: validation.rejections,
                        skipped: false,
                        modelsUsed: validation.modelsUsed || [],
                        safetyFlags: validation.safetyFlags || [],
                        crossCheckAgreement: validation.crossCheckAgreement || null,
                    };
                    if (validatedRaw.length === 0) {
                        return res.status(502).json({
                            error: 'All generated MCQs failed clinical validation. Please retry.',
                            validation: validationSummary,
                        });
                    }
                }
            } catch (validationErr) {
                req.log.warn({ err: validationErr }, 'MCQ validation skipped after reviewer failure');
                validationSummary = { reviewed: 0, rejected: 0, rejections: [], skipped: true };
            }

            const VALID_QTYPES = ['recall', 'clinical_application', 'trial_interpretation', 'guideline', 'pitfall'];
            const LETTERS = ['A', 'B', 'C', 'D'];
            const questions = validatedRaw.map((q, idx) => {
                const sourceIndices = validateSourceIndices(q.sourceIndices, articles.length);
                const resolvedSourceUid = (sourceIndices?.[0] && articles[sourceIndices[0] - 1]?.uid) || null;
                let distractorRationale = null;
                if (q.distractorRationale && typeof q.distractorRationale === 'object' && !Array.isArray(q.distractorRationale)) {
                    distractorRationale = {};
                    for (const [k, v] of Object.entries(q.distractorRationale)) {
                        const letter = String(k).trim().toUpperCase().slice(0, 1);
                        if (['A', 'B', 'C', 'D'].includes(letter)) distractorRationale[letter] = String(v || '').trim();
                    }
                    if (Object.keys(distractorRationale).length === 0) distractorRationale = null;
                }
                return {
                    id: `evq_${batchTs}_${idx}`,
                    type: 'multiple_choice',
                    questionType: VALID_QTYPES.includes(q.questionType) ? q.questionType : 'clinical_application',
                    question: String(q.question || ''),
                    options: Array.isArray(q.options) ? q.options : null,
                    correctAnswer: Number.isInteger(q.correctAnswer) ? (LETTERS[q.correctAnswer] || 'A') : String(q.correctAnswer || ''),
                    explanation: String(q.explanation || ''),
                    explanationDeep: q.explanationDeep ? String(q.explanationDeep) : null,
                    whyOthersWrong: q.whyOthersWrong ? String(q.whyOthersWrong) : null,
                    distractorRationale,
                    visualExplanation: normalizeVisualExplanation(q.visualExplanation),
                    difficulty: difficulty !== 'mixed' ? difficulty : (['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium'),
                    sourceArticle: q.sourceArticle || null,
                    sourceReference: q.sourceReference || null,
                    sourceArticleUid: resolvedSourceUid,
                    sourceIndices,
                    outlineNodeId: null,
                    topic: topic.trim(),
                    promptVariant,
                    validationStatus: validationSummary.skipped ? 'validation_skipped' : 'llm_validated',
                };
            });

            res.json({ questions, topic: topic.trim(), provider: usedProvider, model: quizModel, promptVariant, validation: validationSummary, disclaimer: AI_DISCLAIMER });
        } catch (error) {
            req.log.error({ err: error }, 'Quiz-from-evidence error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
        });
    });

    // ── Practice Pool: serve pre-seeded MCQs across all topics ──────────────
    app.get('/api/quiz/pool', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const count = Math.min(Math.max(parseInt(String(req.query.count || '10'), 10) || 10, 1), 30);
            const difficulty = req.query.difficulty || 'all';
            const questionType = req.query.type || 'all';

            // Fetch all pre-seeded teaching objects (cold-start + guideline)
            const rows = await db.all(
                `SELECT topic, object_type, object_payload FROM teaching_objects
                 WHERE object_type IN ('cold_start_mcq', 'guideline_mcq')
                 ORDER BY RANDOM()`
            );

            // Flatten all MCQs, attach topic + source type
            const allMcqs = [];
            for (const row of rows) {
                let payload;
                try { payload = JSON.parse(row.object_payload || '{}'); } catch { continue; }
                const mcqs = payload.mcqs || [];
                for (const q of mcqs) {
                    if (!q.question || !q.options || !q.correctAnswer) continue;
                    if (difficulty !== 'all' && q.difficulty !== difficulty) continue;
                    if (questionType !== 'all' && q.questionType !== questionType) continue;
                    const stableHash = crypto
                        .createHash('sha1')
                        .update(`${row.topic}|${row.object_type}|${q.question}|${q.correctAnswer}`)
                        .digest('hex')
                        .slice(0, 16);
                    allMcqs.push({
                        id: `pool_${stableHash}`,
                        topic: row.topic,
                        source: row.object_type === 'guideline_mcq' ? 'guideline' : 'evidence',
                        type: q.type || 'multiple_choice',
                        questionType: q.questionType || 'recall',
                        question: q.question,
                        options: q.options,
                        correctAnswer: q.correctAnswer,
                        explanation: q.explanation || null,
                        guidelineRef: q.guidelineRef || null,
                        difficulty: q.difficulty || 'medium',
                        outlineNodeId: q.outlineNodeId || `pool:${stableHash}`,
                        outlineLabel: q.outlineLabel || q.question.slice(0, 120),
                        claimKey: q.claimKey || q.claim_key || null,
                        sourceArticleUid: q.sourceArticleUid || q.articleUid || null,
                        sourceArticleTitle: q.sourceArticleTitle || q.sourceArticle || null,
                    });
                }
            }

            // Shuffle and slice to requested count
            for (let i = allMcqs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allMcqs[i], allMcqs[j]] = [allMcqs[j], allMcqs[i]];
            }

            res.json({ questions: allMcqs.slice(0, count), total: allMcqs.length });
        } catch (err) {
            req.log.error({ err }, 'Practice pool error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

module.exports = { registerAiQuizEvidenceRoutes };
