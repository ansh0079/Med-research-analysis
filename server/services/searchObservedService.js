'use strict';

const logger = require('../config/logger');
const { searchQueue, registerJobHandler } = require('./jobQueue');
const { shouldAutoSeedFromSearch } = require('./searchLearningConfig');

const JOB_TYPE = 'search-observed';

function safeString(value, max = 500) {
    return String(value || '').trim().slice(0, max);
}

function compactArticle(article = {}) {
    if (!article || typeof article !== 'object') return null;
    return {
        uid: article.uid || null,
        pmid: article.pmid || null,
        doi: article.doi || null,
        title: article.title || '',
        abstract: article.abstract || '',
        journal: article.journal || null,
        source: article.source || null,
        _source: article._source || article.source || null,
        pubdate: article.pubdate || null,
        pubtype: Array.isArray(article.pubtype) ? article.pubtype.slice(0, 8) : [],
        authors: Array.isArray(article.authors) ? article.authors.slice(0, 12) : [],
        pmcrefcount: article.pmcrefcount ?? null,
        isFree: article.isFree ?? null,
        _quality: article._quality || null,
        _impact: article._impact || null,
        _retraction: article._retraction || null,
        _pinnedLandmark: Boolean(article._pinnedLandmark),
    };
}

function compactRanking(row = {}) {
    if (!row || typeof row !== 'object') return null;
    return {
        uid: row.uid || null,
        pmid: row.pmid || null,
        doi: row.doi || null,
        title: row.title || '',
        compositeScore: row.compositeScore ?? null,
        archetype: row.archetype || null,
        citations: row.citations ?? null,
        year: row.year ?? null,
        reasons: Array.isArray(row.reasons) ? row.reasons.slice(0, 8) : [],
    };
}

function buildSearchObservedPayload({
    query,
    articles = [],
    bouquetRanking = [],
    previousQueries = [],
    userId = null,
    sessionId = null,
    enrichKey = null,
    trainingStage = null,
    sessionDepth = 0,
} = {}) {
    return {
        query: safeString(query, 300),
        articles: (Array.isArray(articles) ? articles : []).slice(0, 24).map(compactArticle).filter(Boolean),
        bouquetRanking: (Array.isArray(bouquetRanking) ? bouquetRanking : []).slice(0, 24).map(compactRanking).filter(Boolean),
        previousQueries: (Array.isArray(previousQueries) ? previousQueries : []).map((q) => safeString(q, 200)).filter(Boolean).slice(-5),
        userId: userId || null,
        sessionId: sessionId || null,
        enrichKey: enrichKey || null,
        trainingStage: trainingStage || null,
        sessionDepth: Number(sessionDepth || 0),
    };
}

async function enqueueSearchObservedSideEffects(input = {}) {
    const payload = buildSearchObservedPayload(input);
    if (!payload.query || payload.articles.length === 0) {
        return { skipped: true, reason: 'empty_search_observed_payload' };
    }
    return searchQueue.enqueueNamed(JOB_TYPE, payload, {
        label: `search-observed:${payload.query.slice(0, 80)}`,
        priority: -2,
    });
}

async function processSearchObservedSideEffects(data = {}, deps = {}) {
    const {
        db,
        cache,
        serverConfig,
        fetchImpl,
        logger: log = logger,
    } = deps;
    if (!db) throw new Error('search-observed job requires db');

    const query = safeString(data.query, 300);
    const articles = Array.isArray(data.articles) ? data.articles : [];
    const bouquetRanking = Array.isArray(data.bouquetRanking) ? data.bouquetRanking : [];
    if (!query || articles.length === 0) {
        return { skipped: true, reason: 'empty_search_observed_payload' };
    }

    const results = await Promise.allSettled([
        (async () => {
            const { enqueuePdfIndexForBouquetArticles } = require('./enrichmentJobService');
            return enqueuePdfIndexForBouquetArticles({
                db,
                articles,
                bouquetRanking,
                cache,
                logger: log,
                limit: 8,
            });
        })(),
        (async () => {
            const { enqueueVectorIndexForBouquetArticles } = require('./vectorCoverageService');
            return enqueueVectorIndexForBouquetArticles({
                articles,
                bouquetRanking,
                limit: 12,
            });
        })(),
        (async () => {
            const { persistSearchedArticles } = require('./articlePersistenceService');
            return persistSearchedArticles(db, articles, query);
        })(),
        (async () => {
            if (!shouldAutoSeedFromSearch() || articles.length < 2) return { skipped: true, reason: 'auto_seed_disabled' };
            const { getOrEnqueueTopicSeed } = require('./enrichmentJobService');
            return getOrEnqueueTopicSeed({
                db,
                topic: query,
                articles: articles.slice(0, 8),
                serverConfig,
                fetchImpl,
                cache,
                logger: log,
            });
        })(),
        (async () => {
            const { getOrEnqueueGuidelineAlign } = require('./enrichmentJobService');
            return getOrEnqueueGuidelineAlign({
                db,
                topic: query,
                cache,
                logger: log,
                limit: 24,
            });
        })(),
        (async () => {
            const { getOrEnqueueFlagshipEnrich } = require('./enrichmentJobService');
            const { matchFlagshipTopic } = require('./flagshipEnrichService');
            const match = matchFlagshipTopic(query);
            const articlesWithPmids = articles.filter((a) => a?.pmid);
            if (match) {
                return getOrEnqueueFlagshipEnrich({
                    db,
                    topic: match.flagship.topic,
                    flagship: match.flagship,
                    articles: articlesWithPmids,
                    cache,
                    logger: log,
                });
            }
            if (articlesWithPmids.length >= 3) {
                return getOrEnqueueFlagshipEnrich({
                    db,
                    topic: query,
                    flagship: { topic: query, landmarkPmids: [] },
                    articles: articlesWithPmids,
                    cache,
                    logger: log,
                });
            }
            return { skipped: true, reason: 'insufficient_pmids_for_flagship_enrich' };
        })(),
        (async () => {
            if (!data.enrichKey) return { skipped: true, reason: 'missing_enrich_key' };
            const existingEnrich = await Promise.resolve(cache?.get?.(`enrichment:${data.enrichKey}`)).catch(() => null);
            if (existingEnrich?.status === 'ready') return { skipped: true, reason: 'enrichment_ready' };

            const {
                getOrEnqueueConsensusSynopsis,
                getOrEnqueueLiveClinicalAnswer,
            } = require('./aiGenerationJobService');
            const {
                consensusEnrichmentJobKey,
                liveClinicalAnswerEnrichmentJobKey,
            } = require('./searchEnrichmentKeys');
            const enrichPapers = articles.slice(0, 8);
            const previousQueries = Array.isArray(data.previousQueries) ? data.previousQueries : [];
            await Promise.all([
                getOrEnqueueConsensusSynopsis({
                    db,
                    topic: query,
                    articles: enrichPapers,
                    serverConfig,
                    fetchImpl,
                    cache,
                    logger: log,
                    jobKey: consensusEnrichmentJobKey(data.enrichKey),
                }),
                getOrEnqueueLiveClinicalAnswer({
                    db,
                    topic: query,
                    articles: enrichPapers,
                    guidelines: [],
                    previousQueries,
                    trainingStage: data.trainingStage || null,
                    sessionDepth: Number(data.sessionDepth || 0),
                    serverConfig,
                    fetchImpl,
                    cache,
                    logger: log,
                    jobKey: liveClinicalAnswerEnrichmentJobKey(data.enrichKey),
                }),
            ]);
            return { enqueued: true };
        })(),
    ]);

    const failed = results
        .map((result, index) => ({ result, index }))
        .filter(({ result }) => result.status === 'rejected')
        .map(({ result, index }) => ({ index, message: result.reason?.message || String(result.reason) }));
    if (failed.length > 0) {
        log.warn({ query, failed }, 'search-observed side effects partially failed');
    }

    return {
        ok: failed.length === 0,
        attempted: results.length,
        failed,
    };
}

function registerSearchObservedHandler(deps = {}) {
    registerJobHandler('search', JOB_TYPE, (data, ctx) => (
        processSearchObservedSideEffects(data, { ...deps, logger: ctx?.logger || deps.logger })
    ));
}

module.exports = {
    JOB_TYPE,
    buildSearchObservedPayload,
    enqueueSearchObservedSideEffects,
    processSearchObservedSideEffects,
    registerSearchObservedHandler,
};
