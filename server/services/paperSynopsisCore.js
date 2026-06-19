'use strict';

const logger = require('../config/logger');
const crypto = require('crypto');
const { createAiService, PINNED_MODELS, TEMPERATURE, AI_DISCLAIMER } = require('./aiService');
const { buildSynopsisPrompt } = require('../prompts');
const { persistPaperTeachingObject } = require('./teachingObjectService');
const { getProviderCandidates } = require('../utils/aiProvider');
const { enrichWithCachedFullText, enqueuePdfPreindex } = require('./pdfPreindexService');
const { validateAiOutput } = require('./aiOutputValidation');
const { recordSynopsisGeneration } = require('./observabilityMetrics');
const { annotateActiveSpan, withSpan } = require('../utils/tracing');
const { getPromptVersion } = require('../prompts/promptVersions');
const { createBudgetForAction, runWithLlmBudget } = require('./llmRequestBudget');
const { alignTopicClaimsWithGuidelines } = require('./claimGuidelineEngine');
const {
    getUserExplanationPreferences,
    hasCustomExplanationPreferences,
} = require('./agentSelfImprovementService');

function getPaperSynopsisArticleId(article = {}) {
    return article.uid || article.pmid || article.doi
        || crypto.createHash('md5').update(article.title || '').digest('hex').slice(0, 12);
}

function normalizeTrainingStage(stage) {
    const validStages = new Set(['preclinical', 'early_clinical', 'finals', 'foundation_doctor']);
    return validStages.has(stage) ? stage : null;
}

function explanationPreferencesCacheSuffix(preferences) {
    if (!hasCustomExplanationPreferences(preferences)) return '';
    return `:ep:${crypto.createHash('md5').update(JSON.stringify(preferences)).digest('hex').slice(0, 8)}`;
}

function getPaperSynopsisCacheKey(article = {}, selectedModel = 'unknown', trainingStage = null, promptVersion = null, preferenceSuffix = '') {
    const articleId = getPaperSynopsisArticleId(article);
    const stage = normalizeTrainingStage(trainingStage) || 'default';
    const pv = promptVersion || getPromptVersion('synopsis');
    return `synopsis:${articleId}:${selectedModel}:${stage}:pv:${pv}${preferenceSuffix || ''}`;
}

async function invalidatePaperSynopsisCache({ cache, article, selectedModel = null, trainingStage = null } = {}) {
    if (!cache || !article) return false;
    const models = selectedModel
        ? [...new Set([selectedModel, PINNED_MODELS.gemini, PINNED_MODELS.mistral, 'unknown'].filter(Boolean))]
        : [PINNED_MODELS.gemini, PINNED_MODELS.mistral, 'unknown'];
    const stages = trainingStage
        ? [trainingStage]
        : ['default', 'preclinical', 'early_clinical', 'finals', 'foundation_doctor'];
    const del = cache.delAsync || cache.del;
    if (typeof del !== 'function') return false;
    const articleId = getPaperSynopsisArticleId(article);
    const keys = [
        ...models.flatMap((model) => stages.map((stage) => getPaperSynopsisCacheKey(article, model, stage))),
        ...models.map((model) => `synopsis:${articleId}:${model}`),
    ];
    await Promise.all([...new Set(keys)].map((key) => (
        del.call(cache, key).catch?.(() => false)
    )));
    return true;
}

async function runPaperSynopsisGeneration({
    article,
    provider = 'auto',
    serverConfig,
    fetchImpl,
    cache,
    db,
    sessionId = null,
    log = null,
    jobKey = null,
    topic = '',
    trainingStage = null,
    userId = null,
}) {
    const articleId = getPaperSynopsisArticleId(article);
    return withSpan('synopsis.paper.generate', {
        'article.id': articleId,
        'article.title': article?.title,
        'synopsis.topic': topic,
        'synopsis.training_stage': trainingStage,
        'synopsis.provider_requested': provider,
    }, () => runWithLlmBudget(createBudgetForAction('synopsis'), () => runPaperSynopsisGenerationInner({
        article,
        provider,
        serverConfig,
        fetchImpl,
        cache,
        db,
        sessionId,
        log,
        jobKey,
        topic,
        trainingStage,
        articleId,
        userId,
    })));
}

async function runPaperSynopsisGenerationInner({
    article,
    provider,
    serverConfig,
    fetchImpl,
    cache,
    db,
    sessionId,
    log,
    jobKey,
    topic,
    trainingStage,
    articleId,
    userId = null,
}) {
    if (!article || typeof article !== 'object' || !article.title) {
        throw new Error('article with title is required');
    }

    const providerCandidates = getProviderCandidates({ provider }, serverConfig);
    if (!providerCandidates.length) {
        throw new Error('No AI service configured. Add GEMINI_API_KEY or MISTRAL_API_KEY.');
    }
    const ai = createAiService({ serverConfig, fetchImpl });

    const effectiveTrainingStage = normalizeTrainingStage(trainingStage);
    let explanationPreferences = null;
    if (userId && db) {
        explanationPreferences = await getUserExplanationPreferences(db, userId).catch((err) => {
            logger.debug({ err, userId }, 'Failed to load explanation preferences for synopsis');
            return null;
        });
    }
    const preferenceSuffix = explanationPreferencesCacheSuffix(explanationPreferences);
    const selectedModelForCache = providerCandidates[0]?.model || 'unknown';
    const candidateCacheKeys = [...new Set(providerCandidates
        .map((candidate) => getPaperSynopsisCacheKey(
            article,
            candidate.model || 'unknown',
            effectiveTrainingStage,
            null,
            preferenceSuffix
        ))
        .concat(getPaperSynopsisCacheKey(article, selectedModelForCache, effectiveTrainingStage, null, preferenceSuffix)))];

    if (cache?.getAsync) {
        for (const candidateCacheKey of candidateCacheKeys) {
            const memCached = await withSpan('synopsis.cache_get', { 'cache.key': candidateCacheKey }, () => cache.getAsync(candidateCacheKey));
            if (memCached) return { ...memCached, cached: true, jobKey: jobKey || memCached.jobKey };
        }
    }

    // Enrich with full-text sections when cached — improves numerical result extraction
    const [enriched] = await withSpan('synopsis.full_text_enrichment', { 'article.id': articleId }, () => (
        enrichWithCachedFullText([article], cache, db).catch(() => [article])
    ));
    let guidelines = [];
    let topicKnowledge = null;
    if (topic && db) {
        try {
            if (typeof db.getGuidelinesByTopic === 'function') {
                guidelines = await withSpan('synopsis.guideline_context', { 'synopsis.topic': topic }, () => db.getGuidelinesByTopic(topic, { limit: 4 }));
            }
        } catch (err) {
            logger.debug({ err, topic }, 'Failed to load guidelines for paper synopsis');
        }
        try {
            if (typeof db.getTopicKnowledge === 'function') {
                topicKnowledge = await withSpan('synopsis.topic_knowledge_context', { 'synopsis.topic': topic }, () => db.getTopicKnowledge(topic));
            }
        } catch (err) {
            logger.debug({ err, topic }, 'Failed to load topic knowledge for paper synopsis');
        }
    }
    let synopsisFeedbackStats = null;
    if (db?.getSynopsisFeedbackStats) {
        synopsisFeedbackStats = await db.getSynopsisFeedbackStats(articleId).catch((err) => {
            logger.debug({ err, articleId }, 'Failed to load synopsis feedback stats');
            return null;
        });
    }
    const prompt = buildSynopsisPrompt(enriched, {
        topic,
        guidelines,
        topicKnowledge,
        trainingStage: effectiveTrainingStage,
        synopsisFeedbackStats,
        explanationPreferences,
    });
    let rawSynopsis = null;
    let selectedProvider = null;
    let selectedModel = null;
    let lastProviderError = null;
    for (const candidate of providerCandidates) {
        try {
            rawSynopsis = await withSpan('synopsis.llm_call', {
                'llm.provider': candidate.provider,
                'llm.model': candidate.model,
                'article.id': articleId,
            }, () => ai.callStructured(
                prompt,
                candidate.provider,
                candidate.model,
                { temperature: TEMPERATURE.synopsis, maxOutputTokens: 2200, usage: { operation: 'synopsis', topic } }
            ));
            if (rawSynopsis === null) break;
            selectedProvider = candidate.provider;
            selectedModel = candidate.model;
            break;
        } catch (err) {
            lastProviderError = err;
            logger.warn({ err, provider: candidate.provider, model: candidate.model, articleId }, 'Synopsis provider failed; trying fallback if available');
        }
    }
    if (!selectedProvider || !rawSynopsis) {
        recordSynopsisGeneration({ ok: false, provider, model: selectedModelForCache });
        throw lastProviderError || new Error('No AI provider returned a synopsis response');
    }

    let synopsis = rawSynopsis;
    const validated = validateAiOutput('paper_synopsis', synopsis, { allowDegrade: false });
    if (!validated.ok) {
        recordSynopsisGeneration({ ok: false, provider: selectedProvider, model: selectedModel });
        throw new Error(`AI synopsis validation failed: ${validated.errors.join('; ')}`);
    }
    synopsis = validated.data;

    const hasAbstract = Boolean(article.abstract && String(article.abstract).length > 40);
    const result = {
        synopsis,
        articleId,
        provider: selectedProvider,
        model: selectedModel,
        timestamp: new Date().toISOString(),
        disclaimer: AI_DISCLAIMER,
        jobKey,
        audit: {
            provider: selectedProvider,
            model: selectedModel,
            promptHash: crypto.createHash('md5').update(prompt).digest('hex'),
            promptVersion: getPromptVersion('synopsis'),
            trainingStage: effectiveTrainingStage,
            synopsisFeedbackStats,
            sourceCount: 1,
            fullTextCoverageRatio: enriched._fullTextIndexed ? 1 : (article._pdfIndexed || article.pdfIndexed ? 1 : 0),
            citationValidation: null,
            retractionChecked: Boolean(article._retraction),
            retractionFlagged: Boolean(article._retraction?.isRetracted),
            humanReviewStatus: 'none',
            generatedAt: new Date().toISOString(),
            abstractOnly: !hasAbstract,
        },
    };

    if (cache?.setAsync) {
        const cacheKey = getPaperSynopsisCacheKey(article, selectedModel || selectedModelForCache, effectiveTrainingStage);
        await withSpan('synopsis.cache_set', { 'cache.key': cacheKey }, () => cache.setAsync(cacheKey, result, 7 * 86400));
    }
    if (sessionId && db?.logEvent) {
        await db.logEvent('synopsis', sessionId, { articleId, userId: userId || undefined }).catch((err) => { logger.warn({ err }, 'logEvent failed'); return null; });
    }
    await withSpan('synopsis.persist_teaching_object', { 'article.id': articleId, 'synopsis.topic': topic }, () => (
        persistPaperTeachingObject({ db, article, synopsisResult: result, topic }).catch((err) => {
            log?.warn?.({ err, articleId }, 'Paper teaching object persistence skipped');
        })
    ));

    if (cache && fetchImpl) {
        enqueuePdfPreindex(article, { cache, db, serverConfig, fetch: fetchImpl });
    }
    if (topic && db) {
        void withSpan('synopsis.guideline_alignment', { 'synopsis.topic': topic }, () => (
            alignTopicClaimsWithGuidelines(db, topic, { limit: 12, apply: true })
        )).catch((err) => {
            logger.warn({ err, topic }, 'post-synopsis guideline align skipped');
        });
    }

    annotateActiveSpan({
        'llm.provider': selectedProvider,
        'llm.model': selectedModel,
        'synopsis.trust_rating': synopsis.trustRating,
    });
    recordSynopsisGeneration({ ok: true, provider: selectedProvider, model: selectedModel });
    return result;
}

module.exports = {
    runPaperSynopsisGeneration,
    getPaperSynopsisArticleId,
    getPaperSynopsisCacheKey,
    invalidatePaperSynopsisCache,
};
