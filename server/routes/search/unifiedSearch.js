'use strict';

const crypto = require('crypto');
const logger = require('../../config/logger');
const { validateQuery } = require('../../utils/articles');
const { safeFetch } = require('../../utils/fetch');
const { parseSearchRequestQuery, fetchAndRankSearchArticles } = require('../../services/searchPipeline');
const { buildSearchLearningContext, publicLearningContext } = require('../../services/searchLearningService');
const { recordSearchRankingDecisions } = require('../../services/personalizationBanditService');
const { buildLearnerContext, publicLearnerContextSummary } = require('../../services/learnerContextService');
const { persistSearchedArticles } = require('../../services/articlePersistenceService');
const { publicRankingTraces } = require('../../services/searchRankingTrace');
const { buildEnrichmentCacheKey } = require('../../services/synthesisPersonalization');
const {
    getOrEnqueueConsensusSynopsis,
    getOrEnqueueLiveClinicalAnswer,
} = require('../../services/aiGenerationJobService');
const {
    getOrEnqueueTopicSeed,
    getOrEnqueueGuidelineAlign,
    getOrEnqueuePdfIndex,
} = require('../../services/enrichmentJobService');
const {
    consensusEnrichmentJobKey,
    liveClinicalAnswerEnrichmentJobKey,
} = require('../../services/searchEnrichmentKeys');
const { clampLimit, setNoStoreSearchHeaders, shouldAutoSeedFromSearch, attachApiKeyUser } = require('./searchHelpers');

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
                    const vr = await vs.searchVector({ query: queryValidation.sanitized, limit: safeLimit });
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

            // Queue durable PDF indexing jobs for search hits (idempotent, deduped).
            const freeArticles = articles.filter((a) => a && (a.isFree || a.pmcid || a.openAccess || a.openAccessUrl || a.fullTextUrl));
            const pdfCandidates = [...freeArticles, ...articles].slice(0, 6);
            const seenPdf = new Set();
            for (const article of pdfCandidates) {
                const key = String(article?.doi || article?.pmid || article?.pmcid || article?.uid || '').toLowerCase();
                if (!key || seenPdf.has(key)) continue;
                seenPdf.add(key);
                void getOrEnqueuePdfIndex({ db, article, cache, logger }).catch((err) => {
                    logger.warn({ err }, 'getOrEnqueuePdfIndex failed');
                });
            }

            // Persist search-accessed articles as permanent system resources (fire-and-forget)
            void persistSearchedArticles(db, articles, queryValidation.sanitized).catch((err) => {
                logger.warn({ err }, 'persistSearchedArticles failed');
            });

            // Auto-seed topic knowledge for any query that has enough papers but no existing synopsis.
            if (shouldAutoSeedFromSearch() && articles.length >= 2) {
                void getOrEnqueueTopicSeed({
                    db,
                    topic: queryValidation.sanitized,
                    articles: articles.slice(0, 8),
                    serverConfig,
                    fetchImpl: f,
                    cache,
                    logger,
                }).catch((err) => {
                    logger.warn({ err, topic: queryValidation.sanitized }, 'getOrEnqueueTopicSeed failed');
                });
            }

            // Guideline alignment runs as a durable job.
            void getOrEnqueueGuidelineAlign({
                db,
                topic: queryValidation.sanitized,
                cache,
                logger,
                limit: 24,
            }).catch((err) => {
                req.log?.warn?.({ err }, 'getOrEnqueueGuidelineAlign failed');
            });

            // Search enrichment (clinical answer + consensus synopsis) runs as durable jobs.
            // If already cached, skip. Otherwise enqueue idempotent jobs.
            if (existingEnrich?.status === 'ready') return;

            const enrichQuery = queryValidation.sanitized;
            const enrichPapers = articles.slice(0, 8);
            const consensusKey = consensusEnrichmentJobKey(enrichKey);
            const liveCaKey = liveClinicalAnswerEnrichmentJobKey(enrichKey);

            void getOrEnqueueConsensusSynopsis({
                db,
                topic: enrichQuery,
                articles: enrichPapers,
                serverConfig,
                fetchImpl: f,
                cache,
                logger,
                jobKey: consensusKey,
            }).catch((err) => {
                logger.warn({ err, topic: enrichQuery }, 'getOrEnqueueConsensusSynopsis failed');
            });

            void getOrEnqueueLiveClinicalAnswer({
                db,
                topic: enrichQuery,
                articles: enrichPapers,
                guidelines: [],
                previousQueries: enrichPreviousQueries,
                trainingStage: enrichTrainingStage,
                sessionDepth: enrichSessionDepth,
                serverConfig,
                fetchImpl: f,
                cache,
                logger,
                jobKey: liveCaKey,
            }).catch((err) => {
                logger.warn({ err, topic: enrichQuery }, 'getOrEnqueueLiveClinicalAnswer failed');
            });

        } catch (error) {
            req.log.error({ err: error }, 'Unified search error');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });
}

module.exports = { registerUnifiedSearchRoutes };
