'use strict';

const crypto = require('crypto');
const logger = require('../../config/logger');
const { validateQuery } = require('../../utils/articles');
const { safeFetch } = require('../../utils/fetch');
const { parseSearchRequestQuery, fetchAndRankSearchArticles } = require('../../services/searchPipeline');
const { buildSearchLearningContext, publicLearningContext } = require('../../services/searchLearningService');
const { recordSearchRankingDecisions } = require('../../services/personalizationBanditService');
const { buildLearnerContext, publicLearnerContextSummary } = require('../../services/learnerContextService');
const { publicRankingTraces } = require('../../services/searchRankingTrace');
const { buildEnrichmentCacheKey } = require('../../services/synthesisPersonalization');
const { enqueueSearchObservedSideEffects } = require('../../services/searchObservedService');
const { captureLowRecallSearch } = require('../../services/lowRecallLearningService');
const { clampLimit, setNoStoreSearchHeaders, attachApiKeyUser } = require('./searchHelpers');
const {
    buildSearchResultCacheKey,
    getCachedSearchResult,
    setCachedSearchResult,
} = require('../../services/searchResultCacheService');
const { searchLocalArticleCache } = require('../../services/localRetrievalService');
const {
    deriveSearchIntentProfile,
    routeSearchSources,
} = require('../../services/searchQueryIntentService');

const isDev = process.env.NODE_ENV === 'development';

function registerUnifiedSearchRoutes(app, deps) {
    const {
        db,
        cache,
        serverConfig,
        rateLimit,
        requireDailySearchLimit,
        fetchImpl,
        topicHelpers,
    } = deps;
    const { buildAgentGuidance, buildTopicIntelligence } = topicHelpers;
    const dailySearchLimit = typeof requireDailySearchLimit === 'function'
        ? requireDailySearchLimit()
        : ((_req, _res, next) => next());
    const f = fetchImpl || safeFetch;

    app.get('/api/search', rateLimit(30, 60), attachApiKeyUser, dailySearchLimit, async (req, res) => {
        const { q, query: queryParam, sources = 'pubmed,openalex', limit = 20, vector, specificity = 'moderate' } = req.query;
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
        const requestedSourceList = String(sources).split(',').map((s) => s.trim()).filter(Boolean);
        const explicitSources = Object.prototype.hasOwnProperty.call(req.query || {}, 'sources');
        const queryIntentProfile = deriveSearchIntentProfile(queryValidation.sanitized, { specificity: validSpecificity });
        const sourceList = routeSearchSources(requestedSourceList, queryIntentProfile, { explicitSources });
        const deferIntelligence = intelligenceMode === 'async';

        try {
            const routeTimings = {};
            const vectorParam = vector;
            const vectorOptOut = vectorParam === '0' || vectorParam === 'false';
            const vectorAvailable = db.isVectorSearchAvailable();
            const useVectorFusion = vectorAvailable && !vectorOptOut;
            const searchResultCacheKey = buildSearchResultCacheKey({
                query: queryValidation.sanitized,
                sourceList,
                safeLimit,
                specificity: validSpecificity,
                vectorEnabled: useVectorFusion,
                userId: req.user?.id ?? null,
                sessionId: req.sessionId ?? null,
                parsedStudyTypes,
                parsedYearFilters,
                queryIntentProfile,
            });
            let ranked = await getCachedSearchResult(cache, searchResultCacheKey);
            const rankedCacheHit = Boolean(ranked);

            let vectorList = [];
            if (!ranked && useVectorFusion) {
                try {
                    const vectorStarted = Date.now();
                    const { createVectorSearchService } = require('../../services/vectorSearchService');
                    const vs = createVectorSearchService({ db, serverConfig, cache });
                    const vr = await vs.searchVector({ query: queryValidation.sanitized, limit: safeLimit });
                    vectorList = Array.isArray(vr.articles) ? vr.articles : [];
                    routeTimings.vectorMs = Date.now() - vectorStarted;
                } catch (e) {
                    routeTimings.vectorMs = routeTimings.vectorMs ?? 0;
                    req.log.warn({ err: e }, 'Vector fusion skipped');
                }
            }

            let localRetrieval = { articles: [], used: false, available: Boolean(db?.searchCachedArticlesLocal) };
            if (!ranked && !useVectorFusion) {
                const localStarted = Date.now();
                localRetrieval = await searchLocalArticleCache(db, {
                    query: queryValidation.sanitized,
                    limit: safeLimit,
                });
                vectorList = localRetrieval.articles;
                routeTimings.localRetrievalMs = Date.now() - localStarted;
            }

            if (!ranked) {
                ranked = await fetchAndRankSearchArticles({
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
                    queryIntentProfile,
                });
                await setCachedSearchResult(cache, searchResultCacheKey, ranked);
            }

            let { articles } = ranked;
            let { telemetry, banditMeta } = ranked;
            const {
                teachingObjects: boostedObjects,
                teachingClaims: boostedClaims,
                learningContext,
            } = ranked;
            let learnerContext = null;
            if (req.user?.id) {
                try {
                    learnerContext = publicLearnerContextSummary(await buildLearnerContext(db, {
                        userId: req.user.id,
                        topic: queryValidation.sanitized,
                        previousQueries,
                        includeClaimMastery: true,
                        includeTrajectory: true,
                        claimLimit: 25,
                        trajectoryLimit: 6,
                        trajectoryDays: 60,
                    }));
                } catch (err) {
                    logger.warn({ err }, 'buildLearnerContext failed; using null fallback');
                }
            }

            let topicKnowledge = null;
            let agentGuidance = null;
            let knowledgeAvailable = false;
            let topicIntelligence = null;

            if (!deferIntelligence) {
                const intelligenceStarted = Date.now();
                topicKnowledge = await db.getTopicKnowledge(queryValidation.sanitized);
                agentGuidance = buildAgentGuidance(topicKnowledge);
                knowledgeAvailable = topicKnowledge !== null;
                try {
                    topicIntelligence = await buildTopicIntelligence(queryValidation.sanitized, articles, agentGuidance, {
                        topicKnowledge,
                        prefetchedObjects: boostedObjects,
                        prefetchedClaims: boostedClaims,
                    });
                } catch (err) {
                    logger.warn({ err }, 'buildTopicIntelligence failed; using null fallback');
                }
                routeTimings.intelligenceMs = Date.now() - intelligenceStarted;
            }

            const executionTime = Date.now() - startTime;
            routeTimings.totalRouteMs = executionTime;

            let lowRecallLearning = null;
            const expandedAliases = telemetry.lowRecallLearning?.expandedAliases
                || telemetry.meshExpansions
                || [];
            const sparseAfterRank = Array.isArray(articles) && articles.length > 0 && articles.length < 4;
            let queryAutoRepair = null;
            if (telemetry.lowRecallLearning || sparseAfterRank) {
                const resultCount = telemetry.lowRecallLearning?.resultCount ?? articles.length;
                lowRecallLearning = {
                    query: telemetry.lowRecallLearning?.query || queryValidation.sanitized,
                    resultCount,
                    aliasCount: expandedAliases.length,
                    aliases: expandedAliases.slice(0, 8),
                    reason: telemetry.lowRecallLearning ? 'pubmed_zero_hit' : 'sparse_ranked_results',
                };
                db.recordLowRecallSearch({
                    query: queryValidation.sanitized,
                    resultCount,
                    sources: sourceList,
                    expandedAliases,
                }).catch((err) => { logger.warn({ err }, 'recordLowRecallSearch failed'); });
                if (expandedAliases.length > 0) {
                    db.mergeTopicKnowledgeAliases(queryValidation.sanitized, expandedAliases, {
                        reason: telemetry.lowRecallLearning ? 'low_recall_mesh' : 'sparse_ranked_mesh',
                    }).catch((err) => { logger.warn({ err }, 'mergeTopicKnowledgeAliases failed'); });
                }
                try {
                    const { runQueryFailureAutoRepair } = require('../../services/search/queryFailureAutoRepairService');
                    const { buildProxyService } = require('../../services/externalApiProxy');
                    const proxy = buildProxyService({ serverConfig, cache, fetchImpl: f, logger });
                    const countResults = async (reformulated) => {
                        const ids = await proxy.pubmedEsearch(reformulated, { retmax: 20 });
                        return Array.isArray(ids) ? ids.length : 0;
                    };
                    queryAutoRepair = await runQueryFailureAutoRepair({
                        db,
                        query: queryValidation.sanitized,
                        resultCount,
                        threshold: 5,
                        countResults,
                        logger,
                    });
                    if (queryAutoRepair?.winner?.reformulatedQuery) {
                        lowRecallLearning.suggestedReformulation = queryAutoRepair.winner;
                    }
                    // Same-request repair: if a reformulation clearly beats current recall, re-rank once.
                    const winnerQ = queryAutoRepair?.winner?.reformulatedQuery;
                    const winnerCount = Number(queryAutoRepair?.winner?.resultCount || 0);
                    if (
                        queryAutoRepair?.repaired
                        && winnerQ
                        && winnerCount > resultCount
                        && (articles.length < 4 || telemetry.lowRecallLearning)
                    ) {
                        try {
                            const repairedRanked = await fetchAndRankSearchArticles({
                                db,
                                cache,
                                serverConfig,
                                fetchImpl: f,
                                query: winnerQ,
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
                            if (Array.isArray(repairedRanked.articles) && repairedRanked.articles.length > articles.length) {
                                articles = repairedRanked.articles;
                                banditMeta = repairedRanked.banditMeta || banditMeta;
                                telemetry = {
                                    ...(repairedRanked.telemetry || telemetry),
                                    queryAutoRepaired: true,
                                    originalLowRecall: telemetry.lowRecallLearning || null,
                                };
                                queryAutoRepair = {
                                    ...queryAutoRepair,
                                    appliedInRequest: true,
                                    repairedResultCount: articles.length,
                                };
                                lowRecallLearning.appliedReformulation = queryAutoRepair.winner;
                                lowRecallLearning.resultCount = articles.length;
                            }
                        } catch (repairErr) {
                            logger.warn({ err: repairErr }, 'same-request query auto-repair re-fetch failed');
                        }
                    }
                } catch (err) {
                    logger.warn({ err }, 'queryFailureAutoRepair failed');
                }
            }

            const vectorFusion = {
                used: useVectorFusion && vectorList.length > 0,
                available: vectorAvailable,
                count: vectorList.length,
                localFallbackUsed: !useVectorFusion && localRetrieval.used,
                localFallbackAvailable: localRetrieval.available,
                localFallbackMode: localRetrieval.mode || null,
                localFallbackCandidateCount: localRetrieval.candidateCount || 0,
            };

            const logSessionMeta = {
                sessionSequenceIndex: typeof req.sessionSequenceIndex === 'number' ? req.sessionSequenceIndex : 0,
                previousQueries,
            };

            // Uptime monitors never click a result, so their searches would enter the
            // learning corpus as permanently-unrewarded impressions. Skip the write.
            const [searchLogResult] = await Promise.allSettled([
                req.isSynthetic
                    ? Promise.resolve(null)
                    : db.logSearch(req.sessionId, queryValidation.sanitized, sourceList, {
                        vector: useVectorFusion,
                        intelligence: intelligenceMode,
                        queryIntent: queryIntentProfile.primaryIntent,
                        queryIntentProfile,
                    }, articles.length, executionTime, req.ip, logSessionMeta),
                db.logEvent('search', req.sessionId, {
                    query: queryValidation.sanitized,
                    sources: sourceList,
                    results: articles.length,
                    timings: { ...telemetry.timings, ...routeTimings },
                    queryIntent: ranked.queryIntent,
                    queryIntentProfile: ranked.queryIntentProfile || queryIntentProfile,
                    sourceFetches: telemetry.sourceFetches || {},
                    sourceCache: telemetry.sourceCache || {},
                    resultSetCacheHit: rankedCacheHit,
                    vectorFusion,
                    shadowRanker: ranked.shadowRanker || null,
                }),
            ]);
            const searchId = searchLogResult.status === 'fulfilled' ? (searchLogResult.value?.id ?? null) : null;
            if (req.user?.id) {
                const uids = articles.slice(0, 14).map((a) => a.uid).filter(Boolean);
                db.recordUserTopicSearchSignal(req.user.id, queryValidation.sanitized, uids).catch((err) => { logger.warn({ err }, 'recordUserTopicSearchSignal failed'); });
            }

            // A near-empty result set usually means our vocabulary, not the corpus,
            // is missing the term. Ask NLM MeSH for the canonical synonyms and fold
            // them into topic knowledge so the next search for this concept hits.
            // Fire-and-forget: never delay the response on an external lookup.
            if (!req.isSynthetic) {
                captureLowRecallSearch({
                    db,
                    fetchImpl: safeFetch,
                    query: queryValidation.sanitized,
                    resultCount: articles.length,
                    sources: sourceList,
                    logger,
                }).catch((err) => logger.debug({ err }, 'captureLowRecallSearch failed'));
            }
            let rankingAttribution = [];
            if (searchId && !req.isSynthetic) {
                try {
                    // Always record decisions so the RL loop has signal even for
                    // anonymous / first-time searches. Use heuristic_default when
                    // no personalized bandit arm was selected. Synthetic traffic is
                    // excluded: a monitor never clicks, so every row it writes is a
                    // permanently-unrewarded impression that biases offline eval.
                    const effectiveBanditMeta = banditMeta?.armId
                        ? { ...banditMeta, forceLog: true }
                        : { armId: 'heuristic_default', forceLog: true };
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
            const enrichUserId = req.user?.id ?? null;
            const enrichPreviousQueries = Array.isArray(previousQueries) ? previousQueries : [];
            let enrichTrainingStage = null;
            let enrichSessionDepth = learnerContext?.searchCount ?? 0;
            if (enrichUserId) {
                const profile = await db.getLearningProfile(enrichUserId).catch((err) => { logger.warn({ err }, 'getLearningProfile failed'); return null; });
                enrichTrainingStage = profile?.trainingStage || profile?.training_stage || null;
                if (!enrichSessionDepth) {
                    const topicMemory = await db.getUserTopicMemory(enrichUserId, queryValidation.sanitized).catch((err) => { logger.warn({ err }, 'getUserTopicMemory failed'); return null; });
                    enrichSessionDepth = Number(topicMemory?.searchCount || 0);
                }
            }
            const enrichKey = buildEnrichmentCacheKey(queryValidation.sanitized, articles, {
                userId: enrichUserId,
                trainingStage: enrichTrainingStage,
                previousQueries: enrichPreviousQueries,
                sessionDepth: enrichSessionDepth,
            });
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
                queryIntentProfile: ranked.queryIntentProfile || queryIntentProfile,
                ranking: ranked.bouquetRanking,
                searchTelemetry: {
                    timings: { ...telemetry.timings, ...routeTimings },
                    sources: telemetry.sourceFetches || {},
                    sourceFailures: telemetry.sourceFailures || {},
                    reformulation: telemetry.reformulation || null,
                    meshLookupMs: telemetry.meshLookupMs ?? null,
                    sourceCache: telemetry.sourceCache || {},
                    intentRouting: {
                        explicitSources,
                        requestedSources: requestedSourceList,
                        routedSources: sourceList,
                    },
                    resultSetCache: {
                        hit: rankedCacheHit,
                        key: isDev ? searchResultCacheKey : undefined,
                    },
                },
                ...(existingEnrich?.status === 'ready' ? { clinicalAnswer: existingEnrich.clinicalAnswer ?? null } : {}),
                ...(lowRecallLearning ? { lowRecallLearning } : {}),
                ...(queryAutoRepair ? { queryAutoRepair } : {}),
                ...(telemetry.topicEvidenceMemory ? { topicEvidenceMemory: telemetry.topicEvidenceMemory } : {}),
                personalizationAudit: {
                    banditMeta: banditMeta || null,
                    shadowRanker: ranked.shadowRanker || null,
                    rankingTraces: publicRankingTraces(articles),
                    guardrailMeta: banditMeta?.guardrailMeta || null,
                },
                rankingAttribution,
            });

            // Avoid background AI/PDF work during Jest API tests (prevents open handles and hung supertest).
            if (process.env.NODE_ENV === 'test') return;

            void enqueueSearchObservedSideEffects({
                query: queryValidation.sanitized,
                articles,
                bouquetRanking: ranked?.bouquetRanking || [],
                previousQueries: enrichPreviousQueries,
                userId: enrichUserId,
                sessionId: req.sessionId || null,
                enrichKey,
                trainingStage: enrichTrainingStage,
                sessionDepth: enrichSessionDepth,
            }).catch((err) => {
                logger.warn({ err, query: queryValidation.sanitized }, 'search-observed enqueue failed');
            });

        } catch (error) {
            req.log.error({ err: error }, 'Unified search error');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });
}

module.exports = { registerUnifiedSearchRoutes };
