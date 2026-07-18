'use strict';

const { buildQuizPrompt } = require('../prompts');
const { AI_DISCLAIMER, PINNED_MODELS } = require('./aiService');
const { validateSourceIndices } = require('./citationValidator');
const { teachingObjectsToQuizContext } = require('./teachingObjectService');
const { resolveProvider } = require('../utils/aiProvider');
const { enrichLearnerContextForQuiz } = require('./learnerContextService');
const { liveQuizMcqKey } = require('../utils/teachingObjectKeys');
const { applyQuizClaimSelectionBandit } = require('./personalizationBanditService');

const VALID_QTYPES = ['recall', 'clinical_application', 'trial_interpretation', 'guideline', 'pitfall'];
const LETTERS = ['A', 'B', 'C', 'D'];

function response(body, status = 200) {
    return { status, body };
}

function normalizeDistractorRationale(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const distractorRationale = {};
    for (const [k, v] of Object.entries(value)) {
        const letter = String(k).trim().toUpperCase().slice(0, 1);
        if (LETTERS.includes(letter)) distractorRationale[letter] = String(v || '').trim();
    }
    return Object.keys(distractorRationale).length > 0 ? distractorRationale : null;
}

async function validateMcqBatch({
    mcqValidator,
    logger,
    topic,
    normalizedTopic,
    raw,
    provider,
    model,
    articles,
    guidelines,
    jobKey = null,
    promptVariant = null,
    questionIdPrefix = 'quiz',
}) {
    let validationSummary = { reviewed: 0, rejected: 0, rejections: [], skipped: false };
    let validatedRaw = raw;
    const batchTs = Date.now();

    try {
        const validation = await mcqValidator.validateBatch({
            topic,
            questions: raw,
            provider,
            model,
            articles,
            guidelines,
        });
        if (validation) {
            for (let idx = 0; idx < raw.length; idx++) {
                const rejection = validation.rejections.find((r) => r.mcqIndex === idx + 1);
                void mcqValidator.recordValidationResult({
                    questionId: `${questionIdPrefix}_${batchTs}_${idx}`,
                    topic,
                    normalizedTopic,
                    jobKey,
                    promptVariant: promptVariant || null,
                    status: rejection ? 'rejected' : 'passed',
                    reasons: rejection ? rejection.issues : [],
                    reviewerNotes: rejection ? rejection.reason : null,
                    provider,
                    model,
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
                return {
                    error: response({
                        error: 'All generated MCQs failed clinical validation. Please retry.',
                        validation: validationSummary,
                    }, 502),
                };
            }
        }
    } catch (validationErr) {
        logger.warn({ err: validationErr }, 'MCQ validation skipped after reviewer failure');
        validationSummary = { reviewed: 0, rejected: 0, rejections: [], skipped: true };
    }

    return { batchTs, validatedRaw, validationSummary };
}

function buildEvidenceAudit(claimSourceJob, claimAnchors) {
    if (!claimSourceJob) return undefined;
    const auditPayload = claimSourceJob.auditPayload && typeof claimSourceJob.auditPayload === 'object'
        ? claimSourceJob.auditPayload
        : {};
    return {
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
    };
}

function createQuizGenerationService({ db, serverConfig, ai, mcqValidator, logger, helpers }) {
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
    } = helpers;

    async function generateQuiz({ body, user = {}, log = logger }) {
        const {
            topic, articles = [], count = 5, difficulty = 'mixed', studyRunId, trainingStage, explanationDepth, explicitTargetNodeIds, mode, claimJobKey,
        } = body || {};

        if (!topic || typeof topic !== 'string' || topic.trim().length < 2) {
            return response({ error: 'topic is required' }, 400);
        }

        let claimAnchors = null;
        let resolvedClaimJobKey = null;
        let claimSourceJob = null;
        let claimAnchorMode = 'none';
        if (claimJobKey && String(claimJobKey).trim()) {
            resolvedClaimJobKey = String(claimJobKey).trim().slice(0, 160);
            claimSourceJob = await db.getAiGenerationJobByKey(resolvedClaimJobKey)
                .catch((err) => { logger.warn({ err }, 'getAiGenerationJobByKey failed'); return null; });
            if (!claimSourceJob) {
                return response({ error: 'claim job not found', jobKey: resolvedClaimJobKey }, 404);
            }
            if (claimSourceJob.status !== 'completed') {
                return response({
                    error: 'AI job not complete - poll GET /api/ai/jobs/:jobKey until status is completed',
                    jobKey: resolvedClaimJobKey,
                    status: claimSourceJob.status,
                }, 409);
            }
            claimAnchors = await db.listAiGenerationClaimsByJobKey(resolvedClaimJobKey);
            if (!claimAnchors.length) {
                return response({ error: 'No claims stored for this job yet', jobKey: resolvedClaimJobKey }, 409);
            }
            claimAnchorMode = 'job';
        }

        const userPlan = user?.subscription_plan || 'free';
        const planLimit = userPlan === 'premium' ? 20 : userPlan === 'standard' ? 10 : 3;
        const safeCount = Math.min(Math.max(parseInt(String(count), 10) || Math.min(5, planLimit), 1), planLimit);

        const cleanTopic = topic.trim();
        let effectiveDifficulty = difficulty;
        const topicKnowledgeRow = await db.getTopicKnowledge(cleanTopic)
            .catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; });

        if (!resolvedClaimJobKey) {
            const collectiveMemory = topicKnowledgeRow?.knowledge?.collective_memory || null;
            const uniqueUsers = collectiveMemory?.uniqueUsers || 0;
            const topicPath = uniqueUsers >= 50 ? 'hot' : uniqueUsers >= 15 ? 'warm' : 'cold';
            if (topicPath === 'hot') {
                const poolMcqs = await serveColdStartMCQs(db, cleanTopic, safeCount, user?.id);
                if (poolMcqs) {
                    logger.info({ topic: cleanTopic, uniqueUsers, path: 'hot' }, 'Serving from collective memory pool');
                    return response({
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
        const guidelines = await db.getGuidelinesByTopic(cleanTopic, { limit: 5 })
            .catch((err) => { logger.warn({ err }, 'getGuidelinesByTopic failed'); return []; });

        let studyRun = null;
        if (studyRunId && user?.id) {
            studyRun = await db.getStudyRun(studyRunId);
            if (!studyRun) return response({ error: 'Study run not found' }, 404);
            if (studyRun.userId !== user.id) return response({ error: 'Forbidden' }, 403);
        }

        const runTopicKnowledgeRow = studyRun?.outlineId
            ? await db.get('SELECT * FROM topic_knowledge WHERE id = ?', [studyRun.outlineId])
                .then((row) => db.mapTopicKnowledgeRow(row))
                .catch((err) => { logger.warn({ err }, 'get topic_knowledge by id failed'); return null; })
            : null;
        const effectiveTopicKnowledge = runTopicKnowledgeRow || topicKnowledgeRow;
        const prefillTeachingPoints = Array.isArray(body.teachingPoints) ? body.teachingPoints : [];
        const prefillMcqAngles = Array.isArray(body.mcqAngles)
            ? body.mcqAngles.map((a) => String(a || '').trim()).filter(Boolean)
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
        if (user?.id) {
            userContext = await enrichLearnerContextForQuiz(db, {
                userId: user.id,
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
            const candidatePool = selectAdaptiveClaimAnchors({
                claimMastery,
                groundedClaims: teachingClaims,
                count: Math.min(Math.max(safeCount * 3, safeCount), 15),
            });
            if (candidatePool.length) {
                const banditPick = await applyQuizClaimSelectionBandit(db, user?.id || null, candidatePool, {
                    count: safeCount,
                    topic: cleanTopic,
                    normalizedTopic: db.normalizeTopic(cleanTopic),
                });
                claimAnchors = banditPick.anchors;
                claimAnchorMode = 'adaptive_teaching_object_bandit';
            }
            if (!claimAnchors?.length) claimAnchors = null;
        }

        if (!resolvedClaimJobKey && (!teachingClaims || teachingClaims.length === 0)) {
            const poolMcqs = await serveColdStartMCQs(db, cleanTopic, safeCount, user?.id);
            if (poolMcqs) {
                return response({
                    questions: poolMcqs,
                    topic: cleanTopic,
                    provider: 'cold_start_cache',
                    path: 'cold_start_fallback',
                    disclaimer: AI_DISCLAIMER,
                });
            }
            return response({
                error: 'No teaching claims for this topic. Generate paper synopses or topic synthesis before quizzing.',
                code: 'CLAIMS_REQUIRED',
                topic: cleanTopic,
            }, 409);
        }

        if (!claimAnchors && teachingClaims.length > 0) {
            const candidatePool = selectAdaptiveClaimAnchors({
                claimMastery,
                groundedClaims: teachingClaims,
                count: Math.min(Math.max(safeCount * 3, safeCount), 15),
            });
            if (candidatePool.length) {
                const banditPick = await applyQuizClaimSelectionBandit(db, user?.id || null, candidatePool, {
                    count: safeCount,
                    topic: cleanTopic,
                    normalizedTopic: db.normalizeTopic(cleanTopic),
                });
                claimAnchors = banditPick.anchors;
                claimAnchorMode = 'adaptive_teaching_object_bandit';
            }
        }

        if (!claimAnchors) {
            const poolMcqs = await serveColdStartMCQs(db, cleanTopic, safeCount, user?.id);
            if (poolMcqs) {
                return response({
                    questions: poolMcqs,
                    topic: cleanTopic,
                    provider: 'cold_start_cache',
                    path: 'cold_start_fallback',
                    disclaimer: AI_DISCLAIMER,
                });
            }
            return response({
                error: 'Could not anchor quiz to teaching claims. Add or refresh claims for this topic.',
                code: 'CLAIMS_REQUIRED',
                topic: cleanTopic,
            }, 409);
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
        if (user?.id && db.getUserClaimMisconceptions) {
            personalMisconceptions = await db.getUserClaimMisconceptions(user.id, cleanTopic, {
                limit: 5,
                minOccurrences: 1,
            }).catch((err) => { logger.warn({ err }, 'getUserClaimMisconceptions failed'); return []; });
        }

        const communityTopPicks = await db.getGlobalEngagedArticles?.(db.normalizeTopic(cleanTopic), 3)
            .catch((err) => { logger.warn({ err }, 'operation failed'); return []; }) || [];
        const teachingObjectContext = teachingObjectsToQuizContext(teachingObjects);
        const promptVariant = assignQuizPromptVariant(user?.id, cleanTopic);

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
            return response({
                error: 'Claim-anchored quiz requires GEMINI_API_KEY or MISTRAL_API_KEY.',
                code: 'CLAIMS_REQUIRED',
            }, 503);
        }

        try {
            let usedProvider = selectedProvider;
            let quizModel = PINNED_MODELS[usedProvider] || PINNED_MODELS.claude;
            let raw;
            try {
                const generated = await generateQuizQuestions(ai, {
                    prompt,
                    provider: usedProvider,
                    model: quizModel,
                    usage: { operation: 'quiz', topic: cleanTopic, userId: user?.id || null },
                });
                raw = generated.questions;
                usedProvider = generated.usedProvider;
                quizModel = generated.quizModel;
            } catch (providerErr) {
                if (usedProvider === 'gemini' && serverConfig.keys.mistral) {
                    log.warn({ err: providerErr }, 'Gemini quiz generation failed; falling back to Mistral');
                } else {
                    log.warn({ err: providerErr }, 'Primary provider failed; trying cold-start MCQs');
                }
                const coldStart = await serveColdStartMCQs(db, cleanTopic, effectiveQuizCount, user?.id);
                if (coldStart) {
                    return response({
                        questions: coldStart,
                        topic: cleanTopic,
                        provider: 'cold_start_cache',
                        model: null,
                        disclaimer: AI_DISCLAIMER,
                        warning: 'AI provider unavailable; serving pre-generated questions.',
                    });
                }
                throw providerErr;
            }

            if (!Array.isArray(raw)) {
                return response({
                    error: claimAnchors
                        ? 'AI returned non-array claim-anchored quiz data. Please retry.'
                        : 'AI returned non-array quiz data. Please retry.',
                }, 502);
            }

            const validation = await validateMcqBatch({
                mcqValidator,
                logger: log,
                topic: cleanTopic,
                normalizedTopic: db.normalizeTopic(cleanTopic),
                raw,
                provider: usedProvider,
                model: quizModel,
                articles,
                guidelines,
                jobKey: resolvedClaimJobKey || null,
                promptVariant,
                questionIdPrefix: 'quiz',
            });
            if (validation.error) return validation.error;

            const validOutlineNodeIds = new Set(outlineNodes.map((node) => node.id));
            const validClaimKeys = claimAnchors ? new Set(claimAnchors.map((c) => c.claimKey)) : null;
            const claimByKey = claimAnchors ? new Map(claimAnchors.map((c) => [c.claimKey, c])) : null;
            const questions = validation.validatedRaw.map((q, idx) => {
                const sourceIndices = validateSourceIndices(q.sourceIndices, articles.length);
                const ck = claimAnchors ? normalizeClaimKey(q.claimKey, validClaimKeys, claimAnchors, idx) : null;
                const cmeta = ck && claimByKey ? claimByKey.get(ck) : null;
                const resolvedSourceUid = cmeta?.articleUid
                    || (sourceIndices?.[0] && articles[sourceIndices[0] - 1]?.uid)
                    || null;
                return {
                    id: `quiz_${validation.batchTs}_${idx}`,
                    type: 'multiple_choice',
                    questionType: VALID_QTYPES.includes(q.questionType) ? q.questionType : 'clinical_application',
                    question: String(q.question || ''),
                    options: Array.isArray(q.options) ? q.options : null,
                    correctAnswer: Number.isInteger(q.correctAnswer) ? (LETTERS[q.correctAnswer] || 'A') : String(q.correctAnswer || ''),
                    explanation: String(q.explanation || ''),
                    explanationDeep: q.explanationDeep ? String(q.explanationDeep) : null,
                    whyOthersWrong: q.whyOthersWrong ? String(q.whyOthersWrong) : null,
                    distractorRationale: normalizeDistractorRationale(q.distractorRationale),
                    visualExplanation: normalizeVisualExplanation(q.visualExplanation),
                    difficulty: effectiveDifficulty !== 'mixed' ? effectiveDifficulty : (['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium'),
                    sourceArticle: q.sourceArticle || null,
                    sourceReference: q.sourceReference || null,
                    sourceArticleUid: resolvedSourceUid,
                    sourceIndices,
                    outlineNodeId: normalizeOutlineNodeId(q.outlineNodeId, validOutlineNodeIds, targetNodes, sourceIndices, idx),
                    topic: cleanTopic,
                    claimKey: ck,
                    claimDecisionId: cmeta?.claimDecisionId ?? null,
                    banditArmId: cmeta?._banditArmId || ck || null,
                    promptVariant,
                    validationStatus: validation.validationSummary.skipped ? 'validation_skipped' : 'llm_validated',
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
                confidence: validation.validationSummary.skipped ? 0.5 : 0.8,
            }).catch((err) => log.warn({ err }, 'Failed to cache live quiz MCQs'));

            return response({
                questions,
                topic: cleanTopic,
                provider: usedProvider,
                model: quizModel,
                disclaimer: AI_DISCLAIMER,
                studyRunId: studyRun?.id || null,
                targetNodes,
                claimJobKey: resolvedClaimJobKey || undefined,
                promptVariant,
                validation: validation.validationSummary,
                claimAnchorMode,
                adaptiveClaimCount: claimAnchorMode.startsWith('adaptive_teaching_object') ? claimAnchors.length : undefined,
                evidenceAudit: buildEvidenceAudit(claimSourceJob, claimAnchors),
            });
        } catch (error) {
            log.error({ err: error }, 'Quiz generation error');
            return response({ error: 'Internal Server Error' }, 500);
        }
    }

    async function generateFromEvidence({ body, user = {}, log = logger }) {
        const { topic, articles = [], count = 3, difficulty = 'mixed' } = body || {};
        if (!topic || typeof topic !== 'string' || topic.trim().length < 2) {
            return response({ error: 'topic is required' }, 400);
        }
        if (!Array.isArray(articles) || articles.length === 0) {
            return response({ error: 'At least one article is required' }, 400);
        }

        const cleanTopic = topic.trim();
        const safeCount = Math.min(Math.max(parseInt(String(count), 10) || 3, 1), 5);
        const guidelines = await db.getGuidelinesByTopic(cleanTopic, { limit: 3 })
            .catch((err) => { logger.warn({ err }, 'operation failed'); return []; });

        let userContext = null;
        if (user?.id) {
            userContext = await enrichLearnerContextForQuiz(db, {
                userId: user.id,
                topic: cleanTopic,
                claimLimit: 25,
                trajectoryLimit: 6,
                recentAttemptLimit: 20,
            });
        }

        const communityTopPicks = await db.getGlobalEngagedArticles?.(db.normalizeTopic(cleanTopic), 3)
            .catch((err) => { logger.warn({ err }, 'operation failed'); return []; }) || [];
        const teachingObjects = await db.listTeachingObjectsForTopic(cleanTopic, { limit: 8 })
            .catch((err) => { logger.warn({ err }, 'operation failed'); return []; });
        const teachingObjectContext = teachingObjectsToQuizContext(teachingObjects);
        const promptVariant = assignQuizPromptVariant(user?.id, cleanTopic);

        const prompt = buildQuizPrompt(
            cleanTopic,
            articles.slice(0, 5),
            { count: safeCount, difficulty, communityTopPicks, teachingObjectContext, promptVariant },
            guidelines,
            userContext
        );

        const { provider: selectedProvider, model: initialQuizModel } = resolveProvider({}, serverConfig);
        if (!selectedProvider) {
            return response({ error: 'No AI provider configured. Add GEMINI_API_KEY or MISTRAL_API_KEY to .env' }, 503);
        }

        try {
            const generated = await generateQuizQuestions(ai, {
                prompt,
                provider: selectedProvider,
                model: initialQuizModel,
                usage: { operation: 'quiz', topic: cleanTopic, userId: user?.id || null },
            });
            const raw = generated.questions;
            const usedProvider = generated.usedProvider;
            const quizModel = generated.quizModel;

            if (!Array.isArray(raw)) {
                return response({ error: 'AI returned non-array quiz data. Please retry.' }, 502);
            }

            const validation = await validateMcqBatch({
                mcqValidator,
                logger: log,
                topic: cleanTopic,
                normalizedTopic: db.normalizeTopic(cleanTopic),
                raw,
                provider: usedProvider,
                model: quizModel,
                articles,
                guidelines,
                promptVariant,
                questionIdPrefix: 'quiz',
            });
            if (validation.error) return validation.error;

            const questions = validation.validatedRaw.map((q, idx) => {
                const sourceIndices = validateSourceIndices(q.sourceIndices, articles.length);
                const resolvedSourceUid = (sourceIndices?.[0] && articles[sourceIndices[0] - 1]?.uid) || null;
                return {
                    id: `evq_${validation.batchTs}_${idx}`,
                    type: 'multiple_choice',
                    questionType: VALID_QTYPES.includes(q.questionType) ? q.questionType : 'clinical_application',
                    question: String(q.question || ''),
                    options: Array.isArray(q.options) ? q.options : null,
                    correctAnswer: Number.isInteger(q.correctAnswer) ? (LETTERS[q.correctAnswer] || 'A') : String(q.correctAnswer || ''),
                    explanation: String(q.explanation || ''),
                    explanationDeep: q.explanationDeep ? String(q.explanationDeep) : null,
                    whyOthersWrong: q.whyOthersWrong ? String(q.whyOthersWrong) : null,
                    distractorRationale: normalizeDistractorRationale(q.distractorRationale),
                    visualExplanation: normalizeVisualExplanation(q.visualExplanation),
                    difficulty: difficulty !== 'mixed' ? difficulty : (['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium'),
                    sourceArticle: q.sourceArticle || null,
                    sourceReference: q.sourceReference || null,
                    sourceArticleUid: resolvedSourceUid,
                    sourceIndices,
                    outlineNodeId: null,
                    topic: cleanTopic,
                    promptVariant,
                    validationStatus: validation.validationSummary.skipped ? 'validation_skipped' : 'llm_validated',
                };
            });

            return response({
                questions,
                topic: cleanTopic,
                provider: usedProvider,
                model: quizModel,
                promptVariant,
                validation: validation.validationSummary,
                disclaimer: AI_DISCLAIMER,
            });
        } catch (error) {
            log.error({ err: error }, 'Quiz-from-evidence error');
            return response({ error: 'Internal Server Error' }, 500);
        }
    }

    return { generateQuiz, generateFromEvidence };
}

module.exports = {
    createQuizGenerationService,
    normalizeDistractorRationale,
};
