'use strict';

const logger = require('../config/logger');
const crypto = require('crypto');
const { createAiService, PINNED_MODELS, TEMPERATURE, AI_DISCLAIMER } = require('./aiService');
const { buildSynopsisPrompt } = require('../prompts');
const { persistPaperTeachingObject } = require('./teachingObjectService');
const { resolveProvider } = require('../utils/aiProvider');

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
}) {
    if (!article || typeof article !== 'object' || !article.title) {
        throw new Error('article with title is required');
    }

    const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider }, serverConfig);
    if (!selectedProvider) {
        throw new Error('No AI service configured. Add GEMINI_API_KEY or MISTRAL_API_KEY.');
    }
    const ai = createAiService({ serverConfig, fetchImpl });

    const articleId = article.uid || article.pmid || article.doi
        || crypto.createHash('md5').update(article.title).digest('hex').slice(0, 12);
    const cacheKey = `synopsis:${articleId}:${selectedModel}`;

    if (cache?.getAsync) {
        const memCached = await cache.getAsync(cacheKey);
        if (memCached) return { ...memCached, cached: true, jobKey: jobKey || memCached.jobKey };
    }

    const prompt = buildSynopsisPrompt(article);
    let rawText;
    if (selectedProvider === 'gemini') {
        rawText = await ai.callGemini(prompt, selectedModel, { temperature: TEMPERATURE.synopsis });
    } else {
        rawText = await ai.callMistralAI(prompt, selectedModel, { temperature: TEMPERATURE.synopsis });
    }

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
            fullTextCoverageRatio: article._pdfIndexed || article.pdfIndexed ? 1 : 0,
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

    return result;
}

module.exports = { runPaperSynopsisGeneration };
