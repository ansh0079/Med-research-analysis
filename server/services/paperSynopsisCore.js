'use strict';

const logger = require('../config/logger');
const crypto = require('crypto');
const { createAiService, PINNED_MODELS, TEMPERATURE, AI_DISCLAIMER } = require('./aiService');
const { buildSynopsisPrompt } = require('../prompts');
const { persistPaperTeachingObject } = require('./teachingObjectService');
const { getProviderCandidates } = require('../utils/aiProvider');
const { enrichWithCachedFullText, enqueuePdfPreindex } = require('./pdfPreindexService');
const { alignTopicClaimsWithGuidelines } = require('./claimGuidelineEngine');

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
}) {
    if (!article || typeof article !== 'object' || !article.title) {
        throw new Error('article with title is required');
    }

    const providerCandidates = getProviderCandidates({ provider }, serverConfig);
    if (!providerCandidates.length) {
        throw new Error('No AI service configured. Add GEMINI_API_KEY or MISTRAL_API_KEY.');
    }
    const ai = createAiService({ serverConfig, fetchImpl });

    const articleId = article.uid || article.pmid || article.doi
        || crypto.createHash('md5').update(article.title).digest('hex').slice(0, 12);
    const selectedModelForCache = providerCandidates[0]?.model || 'unknown';
    const cacheKey = `synopsis:${articleId}:${selectedModelForCache}`;

    if (cache?.getAsync) {
        const memCached = await cache.getAsync(cacheKey);
        if (memCached) return { ...memCached, cached: true, jobKey: jobKey || memCached.jobKey };
    }

    // Enrich with full-text sections when cached — improves numerical result extraction
    const [enriched] = await enrichWithCachedFullText([article], cache, db).catch(() => [article]);
    let guidelines = [];
    let topicKnowledge = null;
    if (topic && db) {
        try {
            if (typeof db.getGuidelinesByTopic === 'function') {
                guidelines = await db.getGuidelinesByTopic(topic, { limit: 4 });
            }
        } catch (err) {
            logger.debug({ err, topic }, 'Failed to load guidelines for paper synopsis');
        }
        try {
            if (typeof db.getTopicKnowledge === 'function') {
                topicKnowledge = await db.getTopicKnowledge(topic);
            }
        } catch (err) {
            logger.debug({ err, topic }, 'Failed to load topic knowledge for paper synopsis');
        }
    }
    const prompt = buildSynopsisPrompt(enriched, { topic, guidelines, topicKnowledge, trainingStage });
    let rawText = '';
    let selectedProvider = null;
    let selectedModel = null;
    let lastProviderError = null;
    for (const candidate of providerCandidates) {
        try {
            rawText = candidate.provider === 'gemini'
                ? await ai.callGemini(prompt, candidate.model, { temperature: TEMPERATURE.synopsis, maxOutputTokens: 2200 })
                : await ai.callMistralAI(prompt, candidate.model, { temperature: TEMPERATURE.synopsis, maxOutputTokens: 2200 });
            selectedProvider = candidate.provider;
            selectedModel = candidate.model;
            break;
        } catch (err) {
            lastProviderError = err;
            logger.warn({ err, provider: candidate.provider, model: candidate.model, articleId }, 'Synopsis provider failed; trying fallback if available');
        }
    }
    if (!selectedProvider) throw lastProviderError || new Error('No AI provider returned a synopsis response');

    const jsonStart = rawText.indexOf('{');
    const jsonEnd = rawText.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('AI did not return valid JSON');
    }
    let synopsis;
    synopsis = JSON.parse(rawText.slice(jsonStart, jsonEnd + 1));

    const validTrust = ['HIGH', 'MODERATE', 'LOW', 'VERY_LOW'];
    if (!validTrust.includes(synopsis.trustRating)) synopsis.trustRating = 'MODERATE';

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
        await cache.setAsync(cacheKey, result, 86400);
    }
    if (sessionId && db?.logEvent) {
        await db.logEvent('synopsis', sessionId, { articleId }).catch((err) => { logger.warn({ err }, 'logEvent failed'); return null; });
    }
    await persistPaperTeachingObject({ db, article, synopsisResult: result, topic }).catch((err) => {
        log?.warn?.({ err, articleId }, 'Paper teaching object persistence skipped');
    });

    if (cache && fetchImpl) {
        enqueuePdfPreindex(article, { cache, db, serverConfig, fetch: fetchImpl });
    }
    if (topic && db) {
        void alignTopicClaimsWithGuidelines(db, topic, { limit: 12, apply: true }).catch((err) => {
            logger.warn({ err, topic }, 'post-synopsis guideline align skipped');
        });
    }

    return result;
}

module.exports = { runPaperSynopsisGeneration };
