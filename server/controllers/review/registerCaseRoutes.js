const logger = require('../../config/logger');
const { createAiService, PINNED_MODELS } = require('../../services/aiService');
const {
    buildPicoExtractionPrompt,
    buildScreeningAssistPrompt,
    buildCaseEvidencePrompt,
    buildCaseSearchQueryPrompt,
    buildTeachingVignettePrompt,
} = require('../../prompts');
const { buildAdaptiveCasePrompt, buildCaseInitPrompt, buildCaseStepPrompt, STEP_SEQUENCE } = require('../../prompts/adaptiveCase');
const { createReviewService } = require('../../services/reviewService');
const { gatherEvidenceArticlesForCase, heuristicSearchQuery } = require('../../services/caseEvidenceService');
const { extractTrialGuidelineConflicts } = require('../../services/conflictExtractionService');
const {
    extractPicoProfile,
    rerankArticlesByPico,
    selectTopRerankedArticles,
} = require('../../services/articleReranker');
const { getInferredMisconceptionsForTopic } = require('../../services/misconceptionInferenceService');
const { findRelatedTopicsWithMisconceptions, buildJitReminder } = require('../../services/relatedTopicService');
const { normalizeCaseMcqList } = require('../../utils/normalizeCaseMcqs');
const { createMcqValidationService } = require('../../services/mcqValidationService');

/**
 * @param {import('express').Application} app
 * @param {ReturnType<import('./createReviewRouteContext').createReviewRouteContext>} ctx
 */
function registerCaseRoutes(app, ctx) {
    const {
        serverConfig,
        db,
        cache,
        rateLimit,
        requireJson,
        requireAuthJwt,
        requireCaseAuth,
        requirePaidFeature,
        validateBody,
        schemas,
        auditLog,
        fetchImpl,
        ai,
        reviews,
        mcqValidator,
        validateCaseMcqs,
        assertTeamMember,
        resolveOwner,
        requireReviewAccess,
        callProvider,
        normalizeLearningMode,
        firstArticleTitle,
        fallbackLearningCase,
        fallbackTeachingVignette,
    } = ctx;

    app.post(
        '/api/cases/analyze',
        requireJson,
        requireCaseAuth,
        validateBody(schemas.caseAnalyze),
        rateLimit(8, 60),
        async (req, res) => {
        try {
            const { caseText, provider = 'auto' } = req.body;
            const topic = String(req.body.topic || '').trim();
            const learningMode = normalizeLearningMode(req.body.learningMode);
            const seedArticles = Array.isArray(req.body.seedArticles) ? req.body.seedArticles : [];

            let literatureQuery = heuristicSearchQuery(topic ? `${topic}\n${caseText}` : caseText);
            let queryHints = null;
            try {
                const qPrompt = buildCaseSearchQueryPrompt(topic ? `Topic: ${topic}\n${caseText}` : caseText);
                const { text: qText } = await callProvider(qPrompt, provider);
                const qParsed = reviews.parseJsonBlock(qText);
                const q = qParsed && typeof qParsed.searchQuery === 'string' ? qParsed.searchQuery.trim() : '';
                if (q.length >= 6) {
                    literatureQuery = q.slice(0, 420);
                    queryHints = qParsed;
                }
            } catch (err) {
                req.log?.warn?.({ err }, 'AI query generation failed, falling back to heuristic');
            }

            const seedKey =
                seedArticles.length > 0
                    ? seedArticles
                        .map((s) => String(s.uid || s.doi || s.pmid || '').slice(0, 80))
                        .join('|')
                        .slice(0, 200)
                    : '';
            const knowledgeTopic = (topic || literatureQuery || '').trim();
            const topicKnowledgeRow = knowledgeTopic.length >= 2
                ? await db.getTopicKnowledge(knowledgeTopic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; })
                : null;
            const tkSig = topicKnowledgeRow?.updatedAt
                ? String(topicKnowledgeRow.updatedAt).slice(0, 24)
                : 'none';
            let userContext = null;
            if (req.user && req.user.id) {
                const masteryTopic = (topic || knowledgeTopic || '').trim();
                const [profile, mastery, personalMisconceptions, inferredMisconceptions, allTopicsWithMisconceptions] = await Promise.all([
                    db.getLearningProfile(req.user.id).catch((err) => { logger.warn({ err }, 'getLearningProfile failed'); return null; }),
                    db.getUserTopicMastery(req.user.id, masteryTopic).catch((err) => { logger.warn({ err }, 'getUserTopicMastery failed'); return null; }),
                    db.getUserClaimMisconceptions?.(req.user.id, masteryTopic, { limit: 5 }).catch((err) => { logger.warn({ err }, 'getUserClaimMisconceptions failed'); return []; }) || [],
                    getInferredMisconceptionsForTopic(db, req.user.id, masteryTopic, { lookbackLimit: 12 }).catch((err) => { logger.warn({ err }, 'getInferredMisconceptionsForTopic failed'); return []; }),
                    db.listUserTopicMemoryWithMisconceptions?.(req.user.id, { limit: 20 }).catch((err) => { logger.warn({ err }, 'listUserTopicMemoryWithMisconceptions failed'); return []; }) || [],
                ]);

                // Phase 3: Build Just-in-Time reminder from related topics
                const relatedTopics = findRelatedTopicsWithMisconceptions(masteryTopic, allTopicsWithMisconceptions || [], { maxResults: 2 });
                const jitReminder = buildJitReminder(masteryTopic, relatedTopics);

                userContext = {
                    profile,
                    mastery,
                    personalMisconceptions: personalMisconceptions || [],
                    inferredMisconceptions: inferredMisconceptions || [],
                    justInTimeReminder: jitReminder,
                };
            }

            const userLevel = userContext?.mastery?.tier || userContext?.profile?.effectiveDifficulty || 'unknown';
            const cacheKey = `case:${learningMode}:${userLevel}:${topic.toLowerCase()}:${literatureQuery.slice(0, 220).toLowerCase()}:s:${seedKey}:tk:${tkSig}`;
            const cached = await Promise.resolve(cache.get(cacheKey)).catch(() => null);
            if (cached) return res.json({ ...cached, cached: true });

            const { articles: baseArticles, vectorUsed, sourcesTried } = await gatherEvidenceArticlesForCase({
                searchQuery: literatureQuery,
                limit: 30,
                serverConfig,
                db,
                fetch: fetchImpl,
                logWarn: req.log?.warn ? (...args) => req.log.warn(...args) : undefined,
                seedArticles,
            });

            // ── Hybrid Reranking: score articles against patient PICO ───────────
            const picoProfile = await extractPicoProfile(caseText, {
                ai,
                cache,
                serverConfig,
                logWarn: req.log?.warn ? (...args) => req.log.warn(...args) : undefined,
            });
            const reranked = await rerankArticlesByPico(baseArticles, picoProfile, {
                ai,
                serverConfig,
                logWarn: req.log?.warn ? (...args) => req.log.warn(...args) : undefined,
            });
            const topArticles = selectTopRerankedArticles(reranked, { topN: 10, strictPopulation: true });

            const evidenceRows = [];
            for (const article of topArticles) {
                const picoKey = String(article.uid || article.pmid || '').trim();
                const pico = picoKey ? (await reviews.getPico(picoKey))?.extraction || null : null;
                evidenceRows.push({ article, pico });
            }

            const guidelines = await db.getGuidelinesByTopic((topic || knowledgeTopic || '').trim(), { limit: 5 }).catch((err) => { logger.warn({ err }, 'operation failed'); return []; });

            const conflictTopic = (topic || knowledgeTopic || '').trim();
            const { conflictMatrix, guidelineAlignment } = await extractTrialGuidelineConflicts(
                evidenceRows,
                guidelines,
                {
                    topic: conflictTopic,
                    serverConfig,
                    fetchImpl,
                    provider,
                    logger: req.log,
                }
            );

            const prompt = buildCaseEvidencePrompt(
                caseText,
                evidenceRows,
                { topic, learningMode, topicKnowledge: topicKnowledgeRow },
                guidelines,
                userContext,
                conflictMatrix
            );
            const { text, provider: usedProvider, model } = await callProvider(prompt, provider);
            const parsed = reviews.parseJsonBlock(text) || {};
            const learning = fallbackLearningCase({ parsed, caseText, topic, learningMode, articles: topArticles });
            learning.caseMCQs = await validateCaseMcqs(knowledgeTopic || topic, learning.caseMCQs, topArticles);
            const result = {
                provider: usedProvider,
                model,
                query: literatureQuery,
                queryHints,
                searchSources: sourcesTried,
                vectorUsed,
                ...learning,
                caseSummary: String(parsed.caseSummary || ''),
                interventions: Array.isArray(parsed.interventions) ? parsed.interventions : [],
                uncertainties: Array.isArray(parsed.uncertainties) ? parsed.uncertainties : [],
                conflictMatrix,
                guidelineAlignment,
                followUpQuestions: Array.isArray(parsed.followUpQuestions) ? parsed.followUpQuestions.slice(0, 4) : [],
                disclaimer: String(
                    parsed.disclaimer ||
                        'FOR RESEARCH SUPPORT ONLY. This summary is not a substitute for clinical judgement. Findings must be verified against primary sources and interpreted by a qualified healthcare professional before informing any patient care decision.'
                ),
                safetyNotes: String(
                    parsed.safetyNotes ||
                        'Research-assistant output only. Verify with full guidelines and local protocols before clinical use.'
                ),
                citations: topArticles,
                justInTimeReminder: userContext?.justInTimeReminder || null,
                rerankMeta: {
                    totalFetched: baseArticles.length,
                    picoProfile: picoProfile || {},
                    topScores: topArticles.slice(0, 5).map((a) => ({
                        title: a.title,
                        overallScore: a._rerank?.overallScore ?? null,
                        exclusionFlags: a._rerank?.exclusionFlags ?? [],
                    })),
                },
            };
            await Promise.resolve(cache.set(cacheKey, result, 1800)).catch(() => undefined);
            await db.logEvent('case:analyze', req.sessionId, {
                query: literatureQuery,
                topic,
                learningMode,
                evidenceCount: baseArticles.length,
                vectorUsed,
            });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
        }
    );

    // ── Teaching Vignette ────────────────────────────────────────────────────
    // POST /api/cases/teaching-vignette
    // Accepts { topic, seedArticles, learningMode } — no free-text patient needed.
    // Generates a fully-synthetic teaching case grounded strictly in the supplied abstracts.
    app.post(
        '/api/cases/teaching-vignette',
        requireJson,
        requireCaseAuth,
        rateLimit(8, 60),
        async (req, res) => {
            try {
                const topic = String(req.body.topic || '').trim();
                if (!topic) return res.status(400).json({ error: 'topic is required' });

                const seedArticles = Array.isArray(req.body.seedArticles) ? req.body.seedArticles.slice(0, 8) : [];
                if (!seedArticles.length) return res.status(400).json({ error: 'seedArticles is required (at least 1)' });

                const learningMode = normalizeLearningMode(req.body.learningMode);
                const provider = req.body.provider || 'auto';

                const seedKey = seedArticles
                    .map((s) => String(s.uid || s.doi || s.pmid || s.title || '').slice(0, 60))
                    .join('|')
                    .slice(0, 200);
                const topicKnowledgeRow = await db.getTopicKnowledge(topic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; });
                const tkSig = topicKnowledgeRow?.updatedAt
                    ? String(topicKnowledgeRow.updatedAt).slice(0, 24)
                    : 'none';
                const cacheKey = `teaching:${learningMode}:${topic.toLowerCase().slice(0, 80)}:${seedKey}:tk:${tkSig}`;
                const cached = await Promise.resolve(cache.get(cacheKey)).catch(() => null);
                if (cached) return res.json({ ...cached, cached: true });

                const guidelines = await db.getGuidelinesByTopic(topic || '', { limit: 5 }).catch((err) => { logger.warn({ err }, 'getGuidelinesByTopic failed'); return []; });

                let userContext = null;
                if (req.user && req.user.id) {
                    const [profile, mastery] = await Promise.all([
                        db.getLearningProfile(req.user.id).catch((err) => { logger.warn({ err }, 'getLearningProfile failed'); return null; }),
                        db.getUserTopicMastery(req.user.id, topic || '').catch((err) => { logger.warn({ err }, 'getUserTopicMastery failed'); return null; }),
                    ]);
                    userContext = { profile, mastery };
                }

                const prompt = buildTeachingVignettePrompt(topic, seedArticles, learningMode, guidelines, userContext, topicKnowledgeRow);
                const { text, provider: usedProvider, model } = await callProvider(prompt, provider);
                const parsed = reviews.parseJsonBlock(text) || {};
                const fallback = fallbackTeachingVignette({ topic, learningMode, seedArticles, guidelines, topicKnowledgeRow });
                const useText = (value, fallbackValue) => {
                    const textValue = String(value || '').trim();
                    return textValue || fallbackValue;
                };
                const useArray = (value, fallbackValue) => (
                    Array.isArray(value) && value.length ? value : fallbackValue
                );

                // Post-check: flag management text referencing drug names not found in any seed abstract.
                const seedText = seedArticles.map((a) => (a.abstract || '') + ' ' + (a.title || '')).join(' ').toLowerCase();
                const managementText = useText(parsed.managementReasoning, fallback.managementReasoning);
                const drugPattern = /\b([a-z]{4,}(?:mab|nib|mycin|cillin|olol|pril|sartan|statin|tidine|oxacin|cycline|azole|vir|umab))\b/gi;
                const flaggedDrugs = [];
                for (const match of managementText.matchAll(drugPattern)) {
                    const drug = match[1].toLowerCase();
                    if (!seedText.includes(drug)) flaggedDrugs.push(match[1]);
                }

                const result = {
                    provider: usedProvider,
                    model,
                    topic,
                    learningMode,
                    seedCount: seedArticles.length,
                    presentingComplaint: useText(parsed.presentingComplaint, fallback.presentingComplaint),
                    history: useText(parsed.history, fallback.history),
                    examination: useText(parsed.examination, fallback.examination),
                    investigations: useText(parsed.investigations, fallback.investigations),
                    differential: useArray(parsed.differential, fallback.differential),
                    managementReasoning: managementText,
                    teachingPoints: useArray(parsed.teachingPoints, fallback.teachingPoints),
                    evidenceLinks: useArray(parsed.evidenceLinks, fallback.evidenceLinks),
                    uncertaintyFlags: useArray(parsed.uncertaintyFlags, fallback.uncertaintyFlags),
                    caseMCQs: await validateCaseMcqs(topic, useArray(parsed.caseMCQs, fallback.caseMCQs), seedArticles),
                    postCheckFlags: flaggedDrugs.length > 0
                        ? { unsupportedDrugReferences: [...new Set(flaggedDrugs)], note: 'These drug names appear in management text but were not found in any seed abstract. Verify before use.' }
                        : null,
                    disclaimer: String(parsed.disclaimer || 'FOR RESEARCH AND EDUCATION ONLY. This vignette is fictional. Management steps are derived from provided research abstracts and must not be used for direct patient care.'),
                };

                await Promise.resolve(cache.set(cacheKey, result, 1800)).catch(() => undefined);
                await db.logEvent('case:teaching_vignette', req.sessionId, {
                    topic,
                    learningMode,
                    seedCount: seedArticles.length,
                    flaggedDrugs: flaggedDrugs.length,
                });
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        }
    );

    // ── Adaptive Case: Recommend topics ─────────────────────────────────────
    app.get('/api/cases/recommend', requireAuthJwt, rateLimit(20, 60), async (req, res) => {
        try {
            const weakTopics = await db.getWeakTopicsForCases(req.user.id, { limit: 8 });
            const recentTopics = await db.getRecentCaseTopics(req.user.id, { days: 7 }).catch(() => []);
            const recentSet = new Set(recentTopics);
            const fresh = weakTopics.filter(t => !recentSet.has(t.normalizedTopic));
            const repeated = weakTopics.filter(t => recentSet.has(t.normalizedTopic));
            res.json({ recommendations: [...fresh, ...repeated].slice(0, 5), recentTopics });
        } catch (error) {
            req.log?.error?.({ err: error }, 'Case recommend error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // ── Adaptive Case: Generate branching case ──────────────────────────────
    app.post('/api/cases/adaptive-vignette', requireJson, requireAuthJwt, rateLimit(6, 60), async (req, res) => {
        try {
            const topic = String(req.body.topic || '').trim();
            if (!topic) return res.status(400).json({ error: 'topic is required' });
            const learningMode = normalizeLearningMode(req.body.learningMode);
            const difficulty = ['easy', 'medium', 'hard'].includes(req.body.difficulty) ? req.body.difficulty : 'medium';

            const [guidelines, topicKnowledge, mastery] = await Promise.all([
                db.getGuidelinesByTopic(topic, { limit: 8 }).catch(() => []),
                db.getTopicKnowledge(topic).catch(() => null),
                db.getUserTopicMastery(req.user.id, topic).catch(() => null),
            ]);

            const weaknesses = [];
            if (mastery) {
                if (mastery.recallScore < 60) weaknesses.push({ type: 'recall', score: mastery.recallScore });
                if (mastery.clinicalApplicationScore < 60) weaknesses.push({ type: 'clinical_application', score: mastery.clinicalApplicationScore });
                if (mastery.trialInterpretationScore < 60) weaknesses.push({ type: 'trial_interpretation', score: mastery.trialInterpretationScore });
                if (mastery.guidelineScore < 60) weaknesses.push({ type: 'guideline', score: mastery.guidelineScore });
                if (mastery.pitfallScore < 60) weaknesses.push({ type: 'pitfall', score: mastery.pitfallScore });
            }

            const synopsis = topicKnowledge?.knowledge?.fullTextSynopsis || topicKnowledge?.knowledge?.synopsis || null;

            // Evidence density check
            const guidelineCount = (guidelines || []).length;
            const tk = topicKnowledge?.knowledge || topicKnowledge;
            const teachingPointCount = (tk?.coreTeachingPoints?.length || 0) + (tk?.teachingPoints?.length || 0);
            const evidenceDensity = guidelineCount + teachingPointCount;
            let evidenceWarning = null;
            if (evidenceDensity === 0) {
                evidenceWarning = 'No guidelines or teaching points found for this topic. The case will rely on general clinical knowledge and may be less evidence-grounded.';
            } else if (guidelineCount === 0 && teachingPointCount < 3) {
                evidenceWarning = 'Limited evidence base: no guidelines found and only a few teaching points. Case quality may be reduced.';
            } else if (evidenceDensity < 3) {
                evidenceWarning = 'Thin evidence base for this topic. The case may not cover all clinical angles.';
            }

            // Branching mode: generate only step 1 and store evidence context for later steps
            const prompt = buildCaseInitPrompt(topic, guidelines, topicKnowledge, weaknesses, { learningMode, difficulty }, synopsis);
            const { text } = await callProvider(prompt, 'auto');
            const parsed = reviews.parseJsonBlock(text);
            if (!parsed || !parsed.step) {
                return res.status(502).json({ error: 'Failed to generate initial case step' });
            }

            const sourcesUsed = (guidelines || []).map(g => {
                let label = g.source_body;
                if (g.source_year) label += ` (${g.source_year})`;
                return label;
            });

            const caseData = {
                title: parsed.title || `Case: ${topic}`,
                setting: parsed.setting || 'ED',
                patientProfile: parsed.patientProfile || '',
                steps: [parsed.step],
                sourcesUsed,
            };

            const evidenceContext = {
                guidelines: (guidelines || []).map(g => ({
                    source_body: g.source_body, source_year: g.source_year,
                    recommendation_text: g.recommendation_text,
                    recommendation_strength: g.recommendation_strength,
                    certainty_of_evidence: g.certainty_of_evidence,
                    population: g.population, cautions: g.cautions,
                })),
                topicKnowledge: topicKnowledge?.knowledge || null,
                synopsis,
            };

            const session = await db.createCaseSession({
                userId: req.user.id,
                topic,
                learningMode,
                difficulty,
                caseData,
                targetedWeaknesses: weaknesses,
                evidenceContext,
                generationMode: 'branching',
            });

            await db.logEvent('case:adaptive_vignette', req.sessionId, { topic, learningMode, difficulty, mode: 'branching', evidenceDensity });
            res.json({ session, evidenceWarning });
        } catch (error) {
            req.log?.error?.({ err: error }, 'Adaptive vignette error');
            res.status(500).json({ error: error.message });
        }
    });

    // ── Adaptive Case: Get session ──────────────────────────────────────────
    app.get('/api/cases/sessions/:id', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const session = await db.getCaseSession(req.params.id);
            if (!session || session.userId !== req.user.id) return res.status(404).json({ error: 'Session not found' });
            res.json({ session });
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // ── Adaptive Case: List sessions ────────────────────────────────────────
    app.get('/api/cases/sessions', requireAuthJwt, rateLimit(20, 60), async (req, res) => {
        try {
            const status = req.query.status || '';
            const sessions = await db.getCaseSessionsForUser(req.user.id, { status, limit: 20 });
            res.json({ sessions });
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // ── Adaptive Case: Submit step response (branching) ──────────────────────
    app.post('/api/cases/sessions/:id/respond', requireJson, requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const session = await db.getCaseSessionWithEvidence(req.params.id);
            if (!session || session.userId !== req.user.id) return res.status(404).json({ error: 'Session not found' });
            if (session.status === 'completed') return res.status(400).json({ error: 'Session already completed' });

            const { stepIndex, selectedAnswer, timeMs } = req.body;
            if (stepIndex == null || !selectedAnswer) return res.status(400).json({ error: 'stepIndex and selectedAnswer required' });

            const step = session.caseData?.steps?.[stepIndex];
            if (!step) return res.status(400).json({ error: 'Invalid step index' });

            const isCorrect = selectedAnswer === step.correctAnswer;
            const response = { selectedAnswer, isCorrect, timeMs: timeMs || 0, answeredAt: new Date().toISOString() };
            await db.submitCaseStepResponse(session.id, stepIndex, response);

            const stepFeedback = {
                isCorrect,
                explanation: step.explanation,
                whyOthersWrong: step.whyOthersWrong,
                teachingPoint: step.teachingPoint,
                evidenceSource: step.evidenceSource || null,
                branchingNote: null,
            };

            const nextStepIndex = stepIndex + 1;
            const isFinalStep = nextStepIndex >= 5;

            // For branching mode, generate the next step based on the user's answer
            if (session.generationMode === 'branching' && !isFinalStep) {
                const caseHistory = (session.caseData?.steps || []).map((s, i) => ({
                    narrative: s.narrative,
                    question: s.question,
                    questionType: s.questionType,
                    correctAnswer: s.correctAnswer,
                    patientProfile: session.caseData?.patientProfile,
                    userAnswer: i === stepIndex ? selectedAnswer : (session.responses[i]?.selectedAnswer || s.correctAnswer),
                    wasCorrect: i === stepIndex ? isCorrect : (session.responses[i]?.isCorrect ?? true),
                }));

                const nextStepType = STEP_SEQUENCE[nextStepIndex] || 'resolution';
                const stepPrompt = buildCaseStepPrompt({
                    topic: session.topic,
                    stepIndex: nextStepIndex,
                    stepType: nextStepType,
                    caseHistory,
                    userAnswer: selectedAnswer,
                    wasCorrect: isCorrect,
                    evidenceContext: session.evidenceContext,
                    options: { learningMode: session.learningMode, difficulty: session.difficulty },
                });

                let stepParsed = null;
                try {
                    const { text: stepText } = await callProvider(stepPrompt, 'auto');
                    stepParsed = reviews.parseJsonBlock(stepText);
                } catch (genErr) {
                    req.log?.warn?.({ err: genErr }, 'Step generation failed, using fallback');
                    stepParsed = {
                        step: {
                            type: nextStepType,
                            narrative: `The clinical team continues managing the patient. Based on the previous findings, the case progresses to the ${nextStepType} phase.`,
                            question: `What is the most appropriate next step in ${nextStepType}?`,
                            questionType: 'clinical_application',
                            options: ['A: Continue current management', 'B: Reassess and modify approach', 'C: Escalate to senior review', 'D: Discharge with follow-up'],
                            correctAnswer: 'B',
                            explanation: 'Reassessing based on evolving clinical data is the safest approach when the clinical picture is uncertain.',
                            whyOthersWrong: 'Continuing without reassessment risks missing changes; escalation may be premature; discharge requires stability.',
                            teachingPoint: 'Always reassess clinical decisions as new information becomes available.',
                            evidenceSource: null,
                            branchingNote: 'This step was generated as a fallback due to a technical issue.',
                        },
                    };
                }

                if (stepParsed?.step) {
                    await db.appendCaseStep(session.id, stepParsed.step);
                    stepFeedback.branchingNote = stepParsed.step.branchingNote || null;
                }
            }

            // If this was the last step (step 5 answered), finalize
            if (isFinalStep || (session.generationMode !== 'branching' && nextStepIndex >= (session.caseData?.steps?.length || 5))) {
                // For branching mode, generate the summary on the final step
                if (session.generationMode === 'branching') {
                    const finalSession = await db.getCaseSessionWithEvidence(session.id);
                    const allHistory = (finalSession.caseData?.steps || []).map((s, i) => ({
                        narrative: s.narrative, question: s.question, questionType: s.questionType,
                        correctAnswer: s.correctAnswer,
                        patientProfile: finalSession.caseData?.patientProfile,
                        userAnswer: i === stepIndex ? selectedAnswer : (finalSession.responses[i]?.selectedAnswer || s.correctAnswer),
                        wasCorrect: i === stepIndex ? isCorrect : (finalSession.responses[i]?.isCorrect ?? true),
                    }));
                    const summaryPrompt = buildCaseStepPrompt({
                        topic: session.topic,
                        stepIndex: 4,
                        stepType: 'resolution',
                        caseHistory: allHistory,
                        userAnswer: selectedAnswer,
                        wasCorrect: isCorrect,
                        evidenceContext: finalSession.evidenceContext,
                        options: { learningMode: session.learningMode, difficulty: session.difficulty },
                    });
                    // Parse the last step response for case-level summary data
                    const lastParsed = reviews.parseJsonBlock(
                        (await callProvider(summaryPrompt, 'auto').catch(() => ({ text: '{}' }))).text
                    );
                    if (lastParsed) {
                        await db.finalizeCaseData(session.id, {
                            caseSummary: lastParsed.caseSummary,
                            keyLearningPoints: lastParsed.keyLearningPoints,
                            guidelinesApplied: lastParsed.guidelinesApplied,
                            evidenceGaps: lastParsed.evidenceGaps,
                        });
                    }
                }

                const updatedSession = await db.getCaseSession(session.id);
                const responses = updatedSession.responses || [];
                const correctCount = responses.filter(r => r?.isCorrect).length;
                const totalScore = Math.round((correctCount / Math.max(responses.length, 1)) * 100);
                await db.completeCaseSession(session.id, totalScore);
                const final = await db.getCaseSession(session.id);

                // Update user topic mastery based on case performance
                try {
                    const allSteps = final.caseData?.steps || [];
                    const allResponses = final.responses || [];
                    const typeScores = {};
                    for (let i = 0; i < allSteps.length; i++) {
                        const qType = allSteps[i]?.questionType || 'clinical_application';
                        const resp = allResponses[i];
                        if (!typeScores[qType]) typeScores[qType] = { correct: 0, total: 0 };
                        typeScores[qType].total++;
                        if (resp?.isCorrect) typeScores[qType].correct++;
                    }
                    const pct = (type) => typeScores[type] ? Math.round((typeScores[type].correct / typeScores[type].total) * 100) : null;
                    const existing = await db.getUserTopicMastery(req.user.id, session.topic).catch(() => null);
                    const blend = (newVal, oldVal, weight = 0.4) => {
                        if (newVal == null) return oldVal ?? null;
                        if (oldVal == null) return newVal;
                        return Math.round(oldVal * (1 - weight) + newVal * weight);
                    };
                    const scores = {
                        overallScore: blend(totalScore, existing?.overallScore),
                        recallScore: blend(pct('recall'), existing?.recallScore),
                        clinicalApplicationScore: blend(pct('clinical_application'), existing?.clinicalApplicationScore),
                        trialInterpretationScore: blend(pct('trial_interpretation'), existing?.trialInterpretationScore),
                        guidelineScore: blend(pct('guideline'), existing?.guidelineScore),
                        pitfallScore: blend(pct('pitfall'), existing?.pitfallScore),
                        attemptsCount: (existing?.attemptsCount || 0) + 1,
                        correctCount: (existing?.correctCount || 0) + (allResponses.filter(r => r?.isCorrect).length),
                        lastAttemptAt: new Date().toISOString(),
                    };
                    await db.upsertUserTopicMastery(req.user.id, session.topic, scores);
                } catch (_) { /* mastery update is non-critical */ }

                // Difficulty auto-calibration
                let suggestedDifficulty = null;
                if (totalScore >= 90 && session.difficulty !== 'hard') {
                    suggestedDifficulty = session.difficulty === 'easy' ? 'medium' : 'hard';
                } else if (totalScore <= 40 && session.difficulty !== 'easy') {
                    suggestedDifficulty = session.difficulty === 'hard' ? 'medium' : 'easy';
                }

                // Cross-learning recommendation
                let crossLearningRecommendation = null;
                try {
                    const normalizedTopic = db.normalizeTopic(session.topic);
                    const [crosslinks, masteryList] = await Promise.all([
                        db.getTopicCrosslinks(normalizedTopic, { limit: 8 }).catch(() => []),
                        db.listUserTopicMastery(req.user.id, { limit: 50 }).catch(() => []),
                    ]);
                    const masteryMap = new Map((masteryList || []).map(m => [m.normalizedTopic || db.normalizeTopic(m.topic), m]));
                    const candidates = (crosslinks || [])
                        .map(cl => {
                            const m = masteryMap.get(cl.normalizedTopic);
                            return {
                                topic: cl.topic, normalizedTopic: cl.normalizedTopic,
                                linkType: cl.linkType, linkStrength: cl.strength,
                                aiRationale: cl.aiRationale,
                                overallScore: m?.overallScore ?? null, attemptsCount: m?.attemptsCount ?? 0,
                            };
                        })
                        .sort((a, b) => {
                            const aScore = a.overallScore ?? 100;
                            const bScore = b.overallScore ?? 100;
                            if (aScore < 70 && bScore >= 70) return -1;
                            if (bScore < 70 && aScore >= 70) return 1;
                            if (a.attemptsCount === 0 && b.attemptsCount > 0) return -1;
                            if (b.attemptsCount === 0 && a.attemptsCount > 0) return 1;
                            return (b.linkStrength || 0) - (a.linkStrength || 0);
                        });
                    if (candidates.length > 0) {
                        const pick = candidates[0];
                        let reason = '';
                        if (pick.overallScore != null && pick.overallScore < 70) reason = `You scored ${pick.overallScore}% on this related topic — a case would help reinforce it.`;
                        else if (pick.attemptsCount === 0) reason = `You haven't been tested on this related topic yet.`;
                        else reason = `This topic is clinically related and would strengthen your understanding of ${session.topic}.`;
                        crossLearningRecommendation = {
                            topic: pick.topic, normalizedTopic: pick.normalizedTopic,
                            linkType: pick.linkType, rationale: pick.aiRationale || reason,
                            reason, overallScore: pick.overallScore,
                        };
                    }
                } catch (_) { /* non-critical */ }

                return res.json({ session: final, stepFeedback, crossLearningRecommendation, suggestedDifficulty });
            }

            const updated = await db.getCaseSession(session.id);
            res.json({ session: updated, stepFeedback, generatingNextStep: session.generationMode === 'branching' });
        } catch (error) {
            req.log?.error?.({ err: error }, 'Case step respond error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });
}

module.exports = { registerCaseRoutes };
