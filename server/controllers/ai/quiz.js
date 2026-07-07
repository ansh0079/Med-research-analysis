'use strict';

const crypto = require('crypto');
const logger = require('../../config/logger');
const { PINNED_MODELS, AI_DISCLAIMER } = require('../../services/aiService');
const { buildQuizPrompt } = require('../../prompts');
const { resolveProvider } = require('../../utils/aiProvider');
const { validateSourceIndices } = require('../../services/citationValidator');
const { teachingObjectsToQuizContext } = require('../../services/teachingObjectService');
const { liveQuizMcqKey } = require('../../utils/teachingObjectKeys');
const { enrichLearnerContextForQuiz } = require('../../services/learnerContextService');
const { createBudgetForAction, runWithLlmBudget } = require('../../services/llmRequestBudget');
const {
    generateQuizQuestions,
    serveColdStartMCQs,
    buildStudyRunOutline,
    selectStudyRunTargets,
    selectAdaptiveMemoryTargets,
    normalizeOutlineNodeId,
    normalizeClaimKey,
    assignQuizPromptVariant,
    normalizeVisualExplanation,
    selectAdaptiveClaimAnchors,
} = require('./quizHelpers');

function registerQuizRoutes(app, deps) {
    const {
        db, serverConfig, ai, mcqValidator,
        requireJson, requireAiAuth, requireAuthJwt,
        aiUserLimit, rateLimit, validateBody, schemas,
    } = deps;

    app.post('/api/quiz/generate', requireJson, requireAiAuth, aiUserLimit(10, 60), validateBody(schemas.quiz), async (req, res) => {
        return runWithLlmBudget(createBudgetForAction('quiz'), async () => {
            const {
                topic, articles = [], count = 5, difficulty = 'mixed', studyRunId, trainingStage, explanationDepth, explicitTargetNodeIds, mode, claimJobKey,
            } = req.body;

            if (!topic || typeof topic !== 'string' || topic.trim().length < 2) {
                return res.status(400).json({ error: 'topic is required' });
            }

            let claimAnchors = null;
            let resolvedClaimJobKey = null;
            let claimSourceJob = null;
            let claimAnchorMode = 'none';
            if (claimJobKey && String(claimJobKey).trim()) {
                resolvedClaimJobKey = String(claimJobKey).trim().slice(0, 160);
                claimSourceJob = await db.getAiGenerationJobByKey(resolvedClaimJobKey).catch((err) => { logger.warn({ err }, 'getAiGenerationJobByKey failed'); return null; });
                if (!claimSourceJob) {
                    return res.status(404).json({ error: 'claim job not found', jobKey: resolvedClaimJobKey });
                }
                if (claimSourceJob.status !== 'completed') {
                    return res.status(409).json({
                        error: 'AI job not complete — poll GET /api/ai/jobs/:jobKey until status is completed',
                        jobKey: resolvedClaimJobKey,
                        status: claimSourceJob.status,
                    });
                }
                claimAnchors = await db.listAiGenerationClaimsByJobKey(resolvedClaimJobKey);
                if (!claimAnchors.length) {
                    return res.status(409).json({ error: 'No claims stored for this job yet', jobKey: resolvedClaimJobKey });
                }
                claimAnchorMode = 'job';
            }

            const userPlan = req.user?.subscription_plan || 'free';
            const planLimit = userPlan === 'premium' ? 20 : userPlan === 'standard' ? 10 : 3;
            const safeCount = Math.min(Math.max(parseInt(String(count), 10) || Math.min(5, planLimit), 1), planLimit);

            const cleanTopic = topic.trim();
            let effectiveDifficulty = difficulty;
            const topicKnowledgeRow = await db.getTopicKnowledge(cleanTopic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; });

            // Hot path — serve pre-seeded pool when topic is well-known
            if (!resolvedClaimJobKey) {
                const collectiveMemory = topicKnowledgeRow?.knowledge?.collective_memory || null;
                const uniqueUsers = collectiveMemory?.uniqueUsers || 0;
                if (uniqueUsers >= 50) {
                    const poolMcqs = await serveColdStartMCQs(db, cleanTopic, safeCount, req.user?.id);
                    if (poolMcqs) {
                        logger.info({ topic: cleanTopic, uniqueUsers, path: 'hot' }, 'Serving from collective memory pool');
                        return res.json({
                            questions: poolMcqs,
                            topic: cleanTopic,
                            provider: 'collective_memory',
                            path: 'hot',
                            uniqueUsers,
                            disclaimer: AI_DISCLAIMER,
                        });
                    }
                }
            }

            const { provider: selectedProvider } = resolveProvider({}, serverConfig);
            const guidelines = await db.getGuidelinesByTopic(cleanTopic, { limit: 5 }).catch((err) => { logger.warn({ err }, 'getGuidelinesByTopic failed'); return []; });

            let studyRun = null;
            if (studyRunId && req.user?.id) {
                studyRun = await db.getStudyRun(studyRunId);
                if (!studyRun) return res.status(404).json({ error: 'Study run not found' });
                if (studyRun.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
            }

            const runTopicKnowledgeRow = studyRun?.outlineId
                ? await db.get(`SELECT * FROM topic_knowledge WHERE id = ?`, [studyRun.outlineId]).then((row) => db.mapTopicKnowledgeRow(row)).catch((err) => { logger.warn({ err }, 'get topic_knowledge by id failed'); return null; })
                : null;
            const effectiveTopicKnowledge = runTopicKnowledgeRow || topicKnowledgeRow;
            const prefillTeachingPoints = Array.isArray(req.body.teachingPoints) ? req.body.teachingPoints : [];
            const prefillMcqAngles = Array.isArray(req.body.mcqAngles)
                ? req.body.mcqAngles.map((a) => String(a || '').trim()).filter(Boolean)
                : [];
            let mergedTopicKnowledge = effectiveTopicKnowledge;
            if (prefillTeachingPoints.length > 0 || prefillMcqAngles.length > 0) {
                const existingKnowledge = effectiveTopicKnowledge?.knowledge || {};
                mergedTopicKnowledge = {
                    ...(effectiveTopicKnowledge || {}),
                    knowledge: {
                        ...existingKnowledge,
                        ...(prefillTeachingPoints.length ? { teachingPoints: prefillTeachingPoints } : {}),
                        ...(prefillMcqAngles.length ? { mcqAngles: prefillMcqAngles } : {}),
                    },
                };
            }
            const outlineNodes = buildStudyRunOutline(mergedTopicKnowledge);
            let claimMastery = [];
            let teachingObjects = [];
            let teachingClaims = [];
            let userContext = null;
            if (req.user?.id) {
                userContext = await enrichLearnerContextForQuiz(db, {
                    userId: req.user.id,
                    topic: cleanTopic,
                    claimLimit: 40,
                    weakTopicLimit: 10,
                    trajectoryLimit: 8,
                    trajectoryDays: 120,
                    recentAttemptLimit: 20,
                });
                if (userContext?.profile?.effectiveDifficulty) {
                    effectiveDifficulty = userContext.profile.effectiveDifficulty;
                }
            }
            if (!claimAnchors && !resolvedClaimJobKey) {
                claimMastery = userContext?.claimMastery || [];
                [teachingObjects, teachingClaims] = await Promise.all([
                    db.listTeachingObjectsForTopic(cleanTopic, { limit: 8 }).catch((err) => { logger.warn({ err }, 'listTeachingObjectsForTopic failed'); return []; }),
                    db.listTeachingObjectClaimsForTopic(cleanTopic, { limit: 40 }).catch((err) => { logger.warn({ err }, 'listTeachingObjectClaimsForTopic failed'); return []; }),
                ]);
                claimAnchors = selectAdaptiveClaimAnchors({ claimMastery, groundedClaims: teachingClaims, count: safeCount });
                if (!claimAnchors.length) claimAnchors = null;
                else claimAnchorMode = 'adaptive_teaching_object';
            }
            if (!resolvedClaimJobKey && (!teachingClaims || teachingClaims.length === 0)) {
                const poolMcqs = await serveColdStartMCQs(db, cleanTopic, safeCount, req.user?.id);
                if (poolMcqs) {
                    return res.json({ questions: poolMcqs, topic: cleanTopic, provider: 'cold_start_cache', path: 'cold_start_fallback', disclaimer: AI_DISCLAIMER });
                }
                return res.status(409).json({ error: 'No teaching claims for this topic. Generate paper synopses or topic synthesis before quizzing.', code: 'CLAIMS_REQUIRED', topic: cleanTopic });
            }
            if (!claimAnchors && teachingClaims.length > 0) {
                claimAnchors = selectAdaptiveClaimAnchors({ claimMastery, groundedClaims: teachingClaims, count: safeCount });
                if (claimAnchors.length) claimAnchorMode = 'adaptive_teaching_object';
            }
            if (!claimAnchors) {
                const poolMcqs = await serveColdStartMCQs(db, cleanTopic, safeCount, req.user?.id);
                if (poolMcqs) {
                    return res.json({ questions: poolMcqs, topic: cleanTopic, provider: 'cold_start_cache', path: 'cold_start_fallback', disclaimer: AI_DISCLAIMER });
                }
                return res.status(409).json({ error: 'Could not anchor quiz to teaching claims. Add or refresh claims for this topic.', code: 'CLAIMS_REQUIRED', topic: cleanTopic });
            }
            const effectiveQuizCount = claimAnchors ? Math.min(safeCount, claimAnchors.length) : safeCount;
            let targetNodes = studyRun ? selectStudyRunTargets(studyRun, outlineNodes, effectiveQuizCount) : [];

            if (!studyRun && Array.isArray(explicitTargetNodeIds) && explicitTargetNodeIds.length > 0) {
                const nodeMap = new Map(outlineNodes.map((n) => [n.id, n]));
                const spacedRepTargets = [];
                for (const id of explicitTargetNodeIds.slice(0, effectiveQuizCount)) {
                    const node = nodeMap.get(String(id));
                    if (node) spacedRepTargets.push({ ...node, reason: mode === 'spaced_rep' ? 'spaced rep due' : 'targeted review' });
                }
                targetNodes = spacedRepTargets;
            }

            const topicMemory = userContext?.topicMemory || null;
            const needAdaptive = Math.max(0, effectiveQuizCount - targetNodes.length);
            if (needAdaptive > 0 && topicMemory && mergedTopicKnowledge && outlineNodes.length) {
                const extra = selectAdaptiveMemoryTargets(outlineNodes, topicMemory, needAdaptive + 8);
                const seen = new Set(targetNodes.map((t) => t.id));
                for (const n of extra) {
                    if (targetNodes.length >= effectiveQuizCount) break;
                    if (!seen.has(n.id)) {
                        targetNodes.push({ ...n, priority: 'remediate_weakness' });
                        seen.add(n.id);
                    }
                }
            }

            const collectiveMemory = mergedTopicKnowledge?.knowledge?.collective_memory || null;
            const uniqueUsers = collectiveMemory?.uniqueUsers || 0;
            const topicPath = uniqueUsers >= 50 ? 'hot' : uniqueUsers >= 15 ? 'warm' : 'cold';
            const knownMisconceptions = topicPath === 'warm' || topicPath === 'hot'
                ? (collectiveMemory?.sharedMisconceptions || [])
                : [];

            let personalMisconceptions = [];
            if (req.user?.id && db.getUserClaimMisconceptions) {
                personalMisconceptions = await db.getUserClaimMisconceptions(req.user.id, cleanTopic, {
                    limit: 5,
                    minOccurrences: 1,
                }).catch((err) => { logger.warn({ err }, 'getUserClaimMisconceptions failed'); return []; });
            }

            const communityTopPicks = await db.getGlobalEngagedArticles?.(db.normalizeTopic(cleanTopic), 3).catch((err) => { logger.warn({ err }, 'operation failed'); return []; }) || [];
            const teachingObjectContext = teachingObjectsToQuizContext(teachingObjects);
            const promptVariant = assignQuizPromptVariant(req.user?.id, cleanTopic);

            const prompt = buildQuizPrompt(
                cleanTopic,
                articles,
                {
                    count: effectiveQuizCount,
                    difficulty: effectiveDifficulty,
                    topicKnowledge: mergedTopicKnowledge,
                    targetNodes,
                    trainingStage,
                    explanationDepth,
                    communityTopPicks,
                    knownMisconceptions,
                    personalMisconceptions,
                    claimAnchors: claimAnchors || undefined,
                    teachingObjectContext,
                    promptVariant,
                },
                guidelines,
                userContext
            );

            if (!selectedProvider) {
                return res.status(503).json({ error: 'Claim-anchored quiz requires GEMINI_API_KEY or MISTRAL_API_KEY.', code: 'CLAIMS_REQUIRED' });
            }

            const quizUsage = { operation: 'quiz', topic: cleanTopic, userId: req.user?.id || null };

            try {
                let usedProvider = selectedProvider;
                let quizModel = PINNED_MODELS[usedProvider] || PINNED_MODELS.claude;
                let raw;
                try {
                    const generated = await generateQuizQuestions(ai, { prompt, provider: usedProvider, model: quizModel, usage: quizUsage });
                    raw = generated.questions;
                    usedProvider = generated.usedProvider;
                    quizModel = generated.quizModel;
                } catch (providerErr) {
                    if (usedProvider === 'gemini' && serverConfig.keys.mistral) {
                        req.log.warn({ err: providerErr }, 'Gemini quiz generation failed; falling back to Mistral');
                    } else {
                        req.log.warn({ err: providerErr }, 'Primary provider failed; trying cold-start MCQs');
                    }
                    const coldStart = await serveColdStartMCQs(db, cleanTopic, effectiveQuizCount, req.user?.id);
                    if (coldStart) {
                        return res.json({ questions: coldStart, topic: cleanTopic, provider: 'cold_start_cache', model: null, disclaimer: AI_DISCLAIMER, warning: 'AI provider unavailable; serving pre-generated questions.' });
                    }
                    throw providerErr;
                }

                if (!Array.isArray(raw)) {
                    return res.status(502).json({ error: claimAnchors ? 'AI returned non-array claim-anchored quiz data. Please retry.' : 'AI returned non-array quiz data. Please retry.' });
                }

                let validationSummary = { reviewed: 0, rejected: 0, rejections: [], skipped: false };
                let validatedRaw = raw;
                const batchTs = Date.now();
                try {
                    const validation = await mcqValidator.validateBatch({ topic: cleanTopic, questions: raw, provider: usedProvider, model: quizModel, articles, guidelines });
                    if (validation) {
                        for (let idx = 0; idx < raw.length; idx++) {
                            const rejection = validation.rejections.find((r) => r.mcqIndex === idx + 1);
                            void mcqValidator.recordValidationResult({
                                questionId: `quiz_${batchTs}_${idx}`,
                                topic: cleanTopic,
                                normalizedTopic: db.normalizeTopic(cleanTopic),
                                jobKey: resolvedClaimJobKey || null,
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
                            return res.status(502).json({ error: 'All generated MCQs failed clinical validation. Please retry.', validation: validationSummary });
                        }
                    }
                } catch (validationErr) {
                    req.log.warn({ err: validationErr }, 'MCQ validation skipped after reviewer failure');
                    validationSummary = { reviewed: 0, rejected: 0, rejections: [], skipped: true };
                }

                const VALID_QTYPES = ['recall', 'clinical_application', 'trial_interpretation', 'guideline', 'pitfall'];
                const LETTERS = ['A', 'B', 'C', 'D'];
                const validOutlineNodeIds = new Set(outlineNodes.map((node) => node.id));
                const validClaimKeys = claimAnchors ? new Set(claimAnchors.map((c) => c.claimKey)) : null;
                const claimByKey = claimAnchors ? new Map(claimAnchors.map((c) => [c.claimKey, c])) : null;
                const questions = validatedRaw.map((q, idx) => {
                    const sourceIndices = validateSourceIndices(q.sourceIndices, articles.length);
                    const ck = claimAnchors ? normalizeClaimKey(q.claimKey, validClaimKeys, claimAnchors, idx) : null;
                    const cmeta = ck && claimByKey ? claimByKey.get(ck) : null;
                    const resolvedSourceUid = cmeta?.articleUid
                        || (sourceIndices?.[0] && articles[sourceIndices[0] - 1]?.uid)
                        || null;
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
                        id: `quiz_${batchTs}_${idx}`,
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
                        difficulty: effectiveDifficulty !== 'mixed' ? effectiveDifficulty : (['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium'),
                        sourceArticle: q.sourceArticle || null,
                        sourceReference: q.sourceReference || null,
                        sourceArticleUid: resolvedSourceUid,
                        sourceIndices,
                        outlineNodeId: normalizeOutlineNodeId(q.outlineNodeId, validOutlineNodeIds, targetNodes, sourceIndices, idx),
                        topic: cleanTopic,
                        claimKey: ck,
                        promptVariant,
                        validationStatus: validationSummary.skipped ? 'validation_skipped' : 'llm_validated',
                        outlineLabel: cmeta ? String(cmeta.claimText || '').slice(0, 200) : null,
                    };
                });

                db.upsertTeachingObject({
                    objectKey: liveQuizMcqKey(db, cleanTopic),
                    objectType: 'live_quiz_mcq',
                    normalizedTopic: db.normalizeTopic(cleanTopic),
                    topic: cleanTopic,
                    title: `Live quiz MCQs: ${cleanTopic}`,
                    payload: { mcqs: questions, generatedAt: new Date().toISOString() },
                    provider: usedProvider,
                    model: quizModel,
                    confidence: validationSummary.skipped ? 0.5 : 0.8,
                }).catch((err) => req.log.warn({ err }, 'Failed to cache live quiz MCQs'));

                const auditPayload = claimSourceJob?.auditPayload && typeof claimSourceJob.auditPayload === 'object'
                    ? claimSourceJob.auditPayload
                    : {};
                res.json({
                    questions,
                    topic: cleanTopic,
                    provider: usedProvider,
                    model: quizModel,
                    disclaimer: AI_DISCLAIMER,
                    studyRunId: studyRun?.id || null,
                    targetNodes,
                    claimJobKey: resolvedClaimJobKey || undefined,
                    promptVariant,
                    validation: validationSummary,
                    claimAnchorMode,
                    adaptiveClaimCount: claimAnchorMode === 'adaptive_teaching_object' ? claimAnchors.length : undefined,
                    evidenceAudit: claimSourceJob ? {
                        jobKey: claimSourceJob.jobKey,
                        jobType: claimSourceJob.jobType,
                        model: claimSourceJob.model || auditPayload.model || null,
                        provider: claimSourceJob.provider || auditPayload.provider || null,
                        generatedAt: claimSourceJob.completedAt || auditPayload.generatedAt || claimSourceJob.updatedAt,
                        sourceCount: auditPayload.sourceCount != null ? auditPayload.sourceCount : null,
                        fullTextCoverageRatio: auditPayload.fullTextCoverageRatio ?? null,
                        citationOk: auditPayload.citationValidation?.ok ?? null,
                        citationIssueCount: auditPayload.citationValidation?.issueCount,
                        retractionFlagged: Boolean(auditPayload.retractionFlagged),
                        retractionChecked: Boolean(auditPayload.retractionChecked ?? auditPayload.retractionCheckedCount),
                        humanReviewStatus: auditPayload.humanReviewStatus ?? null,
                        claimCount: claimAnchors ? claimAnchors.length : 0,
                    } : undefined,
                });
            } catch (error) {
                req.log.error({ err: error }, 'Quiz generation error');
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });
    });

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
                const generated = await generateQuizQuestions(ai, { prompt, provider: selectedProvider, model: initialQuizModel, usage: quizUsage });
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
                    const validation = await mcqValidator.validateBatch({ topic: topic.trim(), questions: raw, provider: usedProvider, model: quizModel, articles, guidelines });
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
                            return res.status(502).json({ error: 'All generated MCQs failed clinical validation. Please retry.', validation: validationSummary });
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

    app.get('/api/quiz/pool', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const count = Math.min(Math.max(parseInt(String(req.query.count || '10'), 10) || 10, 1), 30);
            const difficulty = req.query.difficulty || 'all';
            const questionType = req.query.type || 'all';

            const rows = await db.all(
                `SELECT topic, object_type, object_payload FROM teaching_objects
                 WHERE object_type IN ('cold_start_mcq', 'guideline_mcq')
                 ORDER BY RANDOM()`
            );

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

module.exports = { registerQuizRoutes };
