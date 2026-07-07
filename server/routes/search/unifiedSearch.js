'use strict';

const crypto = require('crypto');
const logger = require('../../config/logger');
const { validateQuery } = require('../../utils/articles');
const { safeFetch } = require('../../utils/fetch');
const { parseSearchRequestQuery, fetchAndRankSearchArticles } = require('../../services/searchPipeline');
const { buildSearchLearningContext, publicLearningContext } = require('../../services/searchLearningService');
const { recordSearchRankingDecisions } = require('../../services/personalizationBanditService');
const { buildLearnerContext, publicLearnerContextSummary } = require('../../services/learnerContextService');
const { getSharedAiService } = require('../../services/aiService');
const { buildTopicKnowledgePrompt, buildGuidelineQuizPrompt } = require('../../prompts');
const { resolveProvider } = require('../../utils/aiProvider');
const { generateAndStoreMCQs } = require('../../services/mcqGeneratorService');
const { guidelineMcqKey } = require('../../utils/teachingObjectKeys');
const { searchGuidelines } = require('../../services/guidelineService');
const { persistConsensusTeachingObject } = require('../../services/teachingObjectService');
const { enqueuePdfPreindexForArticles } = require('../../services/pdfPreindexService');
const { alignTopicClaimsWithGuidelines } = require('../../services/claimGuidelineEngine');
const { parseJsonBlock, parseJsonArrayBlock } = require('../../utils/parseJson');
const { persistSearchedArticles } = require('../../services/articlePersistenceService');
const { validateAiOutput } = require('../../services/aiOutputValidation');
const { publicRankingTraces } = require('../../services/searchRankingTrace');
const { createBudgetForAction, runWithLlmBudget } = require('../../services/llmRequestBudget');
const { clampLimit, setNoStoreSearchHeaders, shouldAutoSeedFromSearch, attachApiKeyUser } = require('./searchHelpers');

const isDev = process.env.NODE_ENV === 'development';

// Guards against two concurrent identical queries both spawning a background
// LLM enrichment job. Node.js is single-threaded so Set operations are atomic.
const enrichmentInFlight = new Set();

function registerUnifiedSearchRoutes(app, deps) {
    const {
        db,
        cache,
        serverConfig,
        rateLimit,
        requireDailySearchLimit,
        fetchImpl,
        enqueuePdfPreindex,
        topicHelpers,
    } = deps;
    const { buildAgentGuidance, buildTopicIntelligence } = topicHelpers;
    const dailySearchLimit = typeof requireDailySearchLimit === 'function'
        ? requireDailySearchLimit()
        : ((_req, _res, next) => next());
    const f = fetchImpl || safeFetch;
    const pdfDeps = { cache, db, serverConfig, fetch: f };

    const queueFullTextIndexing = (articleList) => {
        if (typeof enqueuePdfPreindex === 'function') {
            for (const article of (articleList || []).slice(0, 6)) enqueuePdfPreindex(article, pdfDeps);
        } else {
            enqueuePdfPreindexForArticles(articleList, pdfDeps);
        }
    };

    app.get('/api/search', rateLimit(30, 60), attachApiKeyUser, dailySearchLimit, async (req, res) => {
        const { q, query: queryParam, sources = 'pubmed', limit = 20, vector, specificity = 'moderate' } = req.query;
        const { previousQueries, parsedStudyTypes, parsedYearFilters, intelligenceMode } = parseSearchRequestQuery(req);
        req.previousQueries = previousQueries;
        const safeLimit = clampLimit(limit);
        setNoStoreSearchHeaders(res);
        const startTime = Date.now();
        const query = q || queryParam;
        if (!query) return res.status(400).json({ error: 'Query is required' });

        const queryValidation = validateQuery(query);
        if (!queryValidation.valid) return res.status(400).json({ error: queryValidation.error });

        const validSpecificity = ['broad', 'moderate', 'strict'].includes(specificity) ? specificity : 'moderate';
        const sourceList = String(sources).split(',').map((s) => s.trim()).filter(Boolean);
        const deferIntelligence = intelligenceMode === 'async';

        try {
            const routeTimings = {};
            const vectorParam = vector;
            const vectorOptOut = vectorParam === '0' || vectorParam === 'false';
            const vectorAvailable = db.isVectorSearchAvailable();
            const useVectorFusion = vectorAvailable && !vectorOptOut;

            let vectorList = [];
            if (useVectorFusion) {
                try {
                    const vectorStarted = Date.now();
                    const { createVectorSearchService } = require('../../services/vectorSearchService');
                    const vs = createVectorSearchService({ db, serverConfig });
                    const vr = await vs.searchVector({ query: queryValidation.sanitized, limit: safeLimit, minScore: 0.25 });
                    vectorList = Array.isArray(vr.articles) ? vr.articles : [];
                    routeTimings.vectorMs = Date.now() - vectorStarted;
                } catch (e) {
                    routeTimings.vectorMs = routeTimings.vectorMs ?? 0;
                    req.log.warn({ err: e }, 'Vector fusion skipped');
                }
            }

            const ranked = await fetchAndRankSearchArticles({
                db,
                cache,
                serverConfig,
                fetchImpl: f,
                query: queryValidation.sanitized,
                safeLimit,
                sourceList,
                specificity: validSpecificity,
                parsedStudyTypes,
                parsedYearFilters,
                previousQueries,
                vectorList,
                userId: req.user?.id ?? null,
                sessionId: req.sessionId ?? null,
            });

            let { articles } = ranked;
            const {
                telemetry,
                teachingObjects: boostedObjects,
                teachingClaims: boostedClaims,
                learningContext,
                banditMeta,
            } = ranked;
            const learnerContext = req.user?.id
                ? publicLearnerContextSummary(await buildLearnerContext(db, {
                    userId: req.user.id,
                    topic: queryValidation.sanitized,
                    previousQueries,
                    includeClaimMastery: true,
                    includeTrajectory: true,
                    claimLimit: 25,
                    trajectoryLimit: 6,
                    trajectoryDays: 60,
                }))
                : null;

            let topicKnowledge = null;
            let agentGuidance = null;
            let knowledgeAvailable = false;
            let topicIntelligence = null;

            if (!deferIntelligence) {
                const intelligenceStarted = Date.now();
                topicKnowledge = await db.getTopicKnowledge(queryValidation.sanitized);
                agentGuidance = buildAgentGuidance(topicKnowledge);
                knowledgeAvailable = topicKnowledge !== null;
                topicIntelligence = await buildTopicIntelligence(queryValidation.sanitized, articles, agentGuidance, {
                    topicKnowledge,
                    prefetchedObjects: boostedObjects,
                    prefetchedClaims: boostedClaims,
                });
                routeTimings.intelligenceMs = Date.now() - intelligenceStarted;
            }

            const executionTime = Date.now() - startTime;
            routeTimings.totalRouteMs = executionTime;

            let lowRecallLearning = null;
            if (telemetry.lowRecallLearning) {
                lowRecallLearning = {
                    query: telemetry.lowRecallLearning.query,
                    resultCount: telemetry.lowRecallLearning.resultCount,
                    aliasCount: telemetry.lowRecallLearning.aliasCount,
                };
                const expandedAliases = telemetry.lowRecallLearning.expandedAliases || telemetry.meshExpansions || [];
                db.recordLowRecallSearch({
                    query: queryValidation.sanitized,
                    resultCount: 0,
                    sources: sourceList,
                    expandedAliases,
                }).catch((err) => { logger.warn({ err }, 'recordLowRecallSearch failed'); });
                if (expandedAliases.length > 0) {
                    db.mergeTopicKnowledgeAliases(queryValidation.sanitized, expandedAliases, { reason: 'low_recall_mesh' }).catch((err) => { logger.warn({ err }, 'mergeTopicKnowledgeAliases failed'); });
                }
            }

            const vectorFusion = {
                used: useVectorFusion && vectorList.length > 0,
                available: vectorAvailable,
                count: vectorList.length,
            };

            const logSessionMeta = {
                sessionSequenceIndex: typeof req.sessionSequenceIndex === 'number' ? req.sessionSequenceIndex : 0,
                previousQueries,
            };

            const [searchLogResult] = await Promise.allSettled([
                db.logSearch(req.sessionId, queryValidation.sanitized, sourceList, { vector: useVectorFusion, intelligence: intelligenceMode }, articles.length, executionTime, req.ip, logSessionMeta),
                db.logEvent('search', req.sessionId, { query: queryValidation.sanitized, sources: sourceList, results: articles.length, timings: { ...telemetry.timings, ...routeTimings } }),
            ]);
            const searchId = searchLogResult.status === 'fulfilled' ? (searchLogResult.value?.id ?? null) : null;
            if (req.user?.id) {
                const uids = articles.slice(0, 14).map((a) => a.uid).filter(Boolean);
                db.recordUserTopicSearchSignal(req.user.id, queryValidation.sanitized, uids).catch((err) => { logger.warn({ err }, 'recordUserTopicSearchSignal failed'); });
            }
            let rankingAttribution = [];
            if (searchId) {
                try {
                    // Always record decisions so the RL loop has signal even for
                    // anonymous / first-time searches. Use 'organic' as the arm
                    // when no bandit arm was selected.
                    const effectiveBanditMeta = banditMeta?.armId
                        ? { ...banditMeta, forceLog: true }
                        : { armId: 'organic', forceLog: true };
                    const logged = await recordSearchRankingDecisions(db, {
                        userId: req.user?.id ?? null,
                        searchId,
                        topic: queryValidation.sanitized,
                        normalizedTopic: db.normalizeTopic(queryValidation.sanitized),
                        articles,
                        banditMeta: effectiveBanditMeta,
                    });
                    rankingAttribution = logged?.decisions || [];
                } catch (err) {
                    logger.warn({ err }, 'recordSearchRankingDecisions failed');
                }
            }
            if (rankingAttribution.length > 0) {
                const byUid = new Map(rankingAttribution.map((row) => [String(row.articleUid).toLowerCase(), row]));
                articles = articles.map((article) => {
                    const key = String(article.uid || '').toLowerCase();
                    const att = byUid.get(key);
                    if (!att) return article;
                    return {
                        ...article,
                        _decisionId: att.decisionId,
                        _banditArmId: att.banditArmId || article._banditArmId || null,
                    };
                });
            }

            // Stable key so repeated identical searches reuse cached AI output.
            const enrichKey = crypto
                .createHash('sha256')
                .update(JSON.stringify({ q: queryValidation.sanitized, uids: articles.slice(0, 8).map((a) => a.uid) }))
                .digest('hex')
                .slice(0, 32);
            const enrichCacheKey = `enrichment:${enrichKey}`;
            const existingEnrich = await Promise.resolve(cache.get(enrichCacheKey)).catch((err) => { logger.warn({ err }, 'cache get failed'); return null; });
            const aiEnrichmentStatus = existingEnrich?.status === 'ready' ? 'ready' : 'pending';

            res.json({
                articles,
                count: articles.length,
                searchId,
                sources: sourceList,
                ...(deferIntelligence ? {} : {
                    agentGuidance,
                    knowledgeAvailable,
                    topicIntelligence,
                }),
                learningContext,
                learnerContext,
                vectorFusion,
                aiEnrichmentKey: enrichKey,
                aiEnrichmentStatus,
                intelligenceStatus: deferIntelligence ? 'deferred' : 'sync',
                queryIntent: ranked.queryIntent,
                ranking: ranked.bouquetRanking,
                searchTelemetry: {
                    timings: { ...telemetry.timings, ...routeTimings },
                    sources: telemetry.sourceFetches || {},
                    reformulation: telemetry.reformulation || null,
                    meshLookupMs: telemetry.meshLookupMs ?? null,
                },
                ...(existingEnrich?.status === 'ready' ? { clinicalAnswer: existingEnrich.clinicalAnswer ?? null } : {}),
                ...(lowRecallLearning ? { lowRecallLearning } : {}),
                personalizationAudit: {
                    banditMeta: banditMeta || null,
                    rankingTraces: publicRankingTraces(articles),
                },
                rankingAttribution,
            });

            // Avoid background AI/PDF work during Jest API tests (prevents open handles and hung supertest).
            if (process.env.NODE_ENV === 'test') return;

            queueFullTextIndexing(articles);

            // Persist search-accessed articles as permanent system resources (fire-and-forget)
            void persistSearchedArticles(db, articles, queryValidation.sanitized).catch((err) => {
                logger.warn({ err }, 'persistSearchedArticles failed');
            });

            // Auto-seed topic knowledge for any query that has enough papers but no existing synopsis
            if (shouldAutoSeedFromSearch() && articles.length >= 2) {
                const seedQuery = queryValidation.sanitized;
                const seedArticles = articles.slice(0, 8);
                void (async () => {
                    try {
                        // Double-check no concurrent seed already landed
                        const alreadySeeded = await db.getTopicKnowledge(seedQuery);
                        if (alreadySeeded) return;

                        const ai = getSharedAiService({ serverConfig, fetchImpl: f });
                        const prompt = buildTopicKnowledgePrompt(seedQuery, seedArticles);
                        const { provider: seedProvider, model: seedModel } = resolveProvider({}, serverConfig);
                        if (!seedProvider) return;
                        const raw = await ai.callText(prompt, seedProvider, seedModel, { temperature: 0.15 });

                        const knowledgeRaw = parseJsonBlock(raw);
                        const validated = validateAiOutput('topic_knowledge', knowledgeRaw, { allowDegrade: false });
                        if (!validated.ok) return;
                        const knowledge = validated.data;
                        if (!knowledge?.mentorMessage) return;

                        const sourceArticles = seedArticles.map((a, i) => ({
                            sourceIndex: i + 1,
                            uid: a.uid || null,
                            title: a.title || 'Unknown',
                            doi: a.doi || null,
                            pmid: a.pmid || null,
                            source: a.journal || a.source || null,
                            pubdate: a.pubdate || null,
                        }));

                        await db.upsertTopicKnowledge(seedQuery, knowledge, sourceArticles, 'ai_generated', 0.65);
                        logger.info({ topic: seedQuery, papers: seedArticles.length }, 'Auto-seeded new topic from user query');

                        // Generate cold-start MCQs from the knowledge we just created
                        try {
                            await generateAndStoreMCQs(db, ai, seedQuery, knowledge, { provider: seedProvider, model: seedModel });
                            logger.info({ topic: seedQuery }, 'Auto-generated cold-start MCQs');
                        } catch (mcqErr) {
                            logger.warn({ err: mcqErr, topic: seedQuery }, 'Auto MCQ generation failed');
                        }

                        // Search for clinical guidelines and generate guideline MCQs if found
                        try {
                            const ncbiKey = serverConfig.keys.ncbi;
                            const ncbiEmail = serverConfig.keys.ncbiEmail;
                            const guidelines = await searchGuidelines(seedQuery, ncbiKey, ncbiEmail);
                            if (guidelines.length > 0) {
                                // Store guidelines
                                for (const gl of guidelines) {
                                    await db.createGuideline({
                                        topic: seedQuery,
                                        sourceBody: gl.source || 'PubMed Guideline',
                                        sourceYear: gl.pubdate ? parseInt(String(gl.pubdate).slice(0, 4), 10) : null,
                                        recommendationText: gl.title,
                                        sourceUrl: gl.uid ? `https://pubmed.ncbi.nlm.nih.gov/${gl.uid}/` : null,
                                    }).catch(() => {});
                                }

                                // Generate guideline-anchored MCQs via Claude if available
                                if (serverConfig.keys.anthropic) {
                                    const guidelineKey = guidelineMcqKey(db, seedQuery);
                                    const existingGl = await db.getTeachingObjectByKey(guidelineKey).catch(() => null);
                                    if (!existingGl) {
                                        const glPrompt = buildGuidelineQuizPrompt(seedQuery, guidelines);
                                        try {
                                            const glRaw = await ai.callText(glPrompt, seedProvider, seedModel, { temperature: 0.3, maxOutputTokens: 2500 });
                                            const glMcqsRaw = parseJsonArrayBlock(glRaw);
                                            const validatedGl = validateAiOutput('quiz_generation', glMcqsRaw, { allowDegrade: false });
                                            const glMcqs = validatedGl.ok
                                                ? (Array.isArray(validatedGl.data?.questions) ? validatedGl.data.questions : glMcqsRaw)
                                                : null;
                                            if (Array.isArray(glMcqs) && glMcqs.length > 0) {
                                                {
                                                    await db.upsertTeachingObject({
                                                        objectKey: guidelineKey,
                                                        objectType: 'guideline_mcq',
                                                        topic: db.normalizeTopic(seedQuery),
                                                        title: `Guideline MCQs: ${seedQuery}`,
                                                        payload: { mcqs: glMcqs.slice(0, 5), guidelineCount: guidelines.length, generatedAt: new Date().toISOString() },
                                                        provider: seedProvider,
                                                        model: seedModel,
                                                        confidence: 0.85,
                                                    });
                                                    logger.info({ topic: seedQuery, count: glMcqs.length, guidelines: guidelines.length }, 'Auto-generated guideline MCQs');
                                                }
                                            }
                                        } catch (glMcqErr) {
                                            logger.warn({ err: glMcqErr, topic: seedQuery }, 'Auto guideline MCQ generation failed');
                                        }
                                    }
                                }
                                logger.info({ topic: seedQuery, guidelines: guidelines.length }, 'Auto-stored guidelines for new topic');
                            }
                        } catch (glErr) {
                            logger.warn({ err: glErr, topic: seedQuery }, 'Auto guideline search failed');
                        }
                    } catch (err) {
                        logger.warn({ err, topic: seedQuery }, 'Auto-seed failed');
                        // Record failure so it can be retried via the admin panel
                        db.logEvent('auto_seed_failed', null, {
                            topic: seedQuery,
                            error: err.message,
                            papers: seedArticles.length,
                        }).catch(() => {});
                    }
                })();
            }

            void alignTopicClaimsWithGuidelines(db, queryValidation.sanitized, {
                limit: 24,
                apply: true,
                reviewerId: null,
            }).catch((err) => { req.log?.warn?.({ err }, 'background guideline align skipped'); });

            // If already cached or a job is already running for this key, skip.
            if (existingEnrich?.status === 'ready') return;
            if (enrichmentInFlight.has(enrichCacheKey)) return;
            enrichmentInFlight.add(enrichCacheKey);

            // Capture values before request scope ends, then fire background AI job.
            const enrichQuery = queryValidation.sanitized;
            const enrichPapers = articles.slice(0, 8);
            const enrichUserId = req.user?.id ?? null;
            const enrichPreviousQueries = Array.isArray(req.previousQueries) ? req.previousQueries : [];

            void runWithLlmBudget(createBudgetForAction('search_enrichment'), async () => {
                try {
                    let trainingStage = null;
                    if (enrichUserId) {
                        const p = await db.getLearningProfile(enrichUserId).catch((err) => { logger.warn({ err }, 'getLearningProfile failed'); return null; });
                        trainingStage = p?.trainingStage || p?.training_stage || null;
                    }
                    let userTopicMemory = null;
                    if (enrichUserId) {
                        userTopicMemory = await db.getUserTopicMemory(enrichUserId, enrichQuery).catch((err) => { logger.warn({ err }, 'getUserTopicMemory failed'); return null; });
                    }
                    const sessionDepth = Number(userTopicMemory?.searchCount || 0);

                    const { generateLiveClinicalAnswer } = require('../../services/aiGenerationJobService');
                    const { generateConsensusSynopsisSafe } = require('../../services/consensusSynopsisService');

                    const [caResult, csResult] = await Promise.allSettled([
                        generateLiveClinicalAnswer({
                            topic: enrichQuery,
                            articles: enrichPapers,
                            guidelines: [],
                            previousQueries: enrichPreviousQueries,
                            trainingStage,
                            sessionDepth,
                            serverConfig,
                            fetchImpl: f,
                        }),
                        generateConsensusSynopsisSafe({
                            topic: enrichQuery,
                            articles: enrichPapers,
                            serverConfig,
                            fetchImpl: f,
                            cache,
                            db,
                            limit: 5,
                        }, console),
                    ]);

                    const caRaw = caResult.status === 'fulfilled' ? caResult.value : null;
                    const clinicalAnswer = caRaw?.clinicalAnswer ?? null;
                    const consensusSynopsis = csResult.status === 'fulfilled' ? csResult.value : null;
                    if (consensusSynopsis) {
                        await persistConsensusTeachingObject({
                            db,
                            topic: enrichQuery,
                            consensusSynopsis,
                            articles: enrichPapers,
                        }).catch((err) => { logger.warn({ err }, 'persistConsensusTeachingObject failed'); return null; });
                    }

                    await Promise.resolve(cache.set(enrichCacheKey, { status: 'ready', clinicalAnswer, consensusSynopsis }, 3600)).catch((err) => { logger.warn({ err }, 'cache set failed'); });
                } catch (err) {
                    console.warn('[enrichment] background job failed:', err?.message);
                    await Promise.resolve(cache.set(enrichCacheKey, { status: 'failed' }, 300)).catch((err) => { logger.warn({ err }, 'cache set failed'); });
                } finally {
                    enrichmentInFlight.delete(enrichCacheKey);
                }
            });

        } catch (error) {
            req.log.error({ err: error }, 'Unified search error');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });
}

module.exports = { registerUnifiedSearchRoutes };
