'use strict';

const crypto = require('crypto');
const { TEMPERATURE, AI_DISCLAIMER } = require('../../services/aiService');
const { buildAnalysisPrompt } = require('../../prompts');
const { getProviderCandidates } = require('../../utils/aiProvider');
const { recordProviderFailure, recordProviderSuccess } = require('../../services/ai/providerHealth');
const { setupSSE, sendSSE } = require('../../utils/sse');

/**
 * Call ai.callText across every configured provider in order, stopping at the
 * first success.
 *
 * This route used to pin `provider: 'claude'` outright ("Analysis routes
 * always use Claude Haiku"), bypassing both the auto-routing that skips a
 * provider providerHealth has benched and any in-request retry at all. With
 * the Anthropic account out of credit, every /api/ai/analyze, /stream, and
 * /explain call surfaced a raw "Claude stream error: 400 ... credit balance
 * is too low" to the client -- with a funded Gemini key sitting right there,
 * because nothing here ever tried it.
 *
 * callText already reports success/failure into providerHealth (see
 * executeProviderCall in aiService.js), so a real account failure benches the
 * provider for every other caller too, not just this request.
 */
async function callTextWithFallback(ai, candidates, prompt, options, { logger } = {}) {
    let lastErr = null;
    for (const candidate of candidates) {
        try {
            const text = await ai.callText(prompt, candidate.provider, candidate.model, options);
            return { text, provider: candidate.provider, model: candidate.model };
        } catch (err) {
            lastErr = err;
            logger?.warn?.({ err, provider: candidate.provider }, 'Analysis provider failed; trying next');
        }
    }
    throw lastErr || new Error('No AI provider configured');
}

/**
 * Same idea for the streaming endpoint, with the one constraint SSE adds: once
 * a chunk has reached the client, switching providers mid-reply would look
 * like a corrupted response, so a failure past that point is surfaced rather
 * than retried. callTextStream does not run through executeProviderCall (see
 * that function's own comment on why), so failures and successes are recorded
 * into providerHealth here explicitly -- otherwise a dead account would never
 * get benched by this route at all, streaming or not.
 */
async function* streamTextWithFallback(ai, candidates, prompt, options, { logger } = {}) {
    let lastErr = null;
    for (const candidate of candidates) {
        let chunksSent = false;
        try {
            for await (const chunk of ai.callTextStream(prompt, candidate.provider, candidate.model, options)) {
                chunksSent = true;
                yield { chunk, provider: candidate.provider, model: candidate.model };
            }
            recordProviderSuccess(candidate.provider);
            return;
        } catch (err) {
            recordProviderFailure(candidate.provider, err, { logger });
            if (chunksSent) throw err;
            lastErr = err;
            logger?.warn?.({ err, provider: candidate.provider }, 'Analysis stream provider failed; trying next');
        }
    }
    throw lastErr || new Error('No AI provider configured');
}

/**
 * Registers /api/ai/analyze (JSON), /api/ai/analyze/stream, and /api/ai/explain.
 */
function registerAnalysisRoutes(app, {
    db,
    cache,
    serverConfig,
    ai,
    limitBodySize,
    requireJson,
    requireAiAuth,
    requireMonthlyLimit,
    aiUserLimit,
    validateBody,
    validateAnalysisBody,
    schemas,
}) {
    app.post('/api/ai/analyze',
        limitBodySize(2 * 1024 * 1024), requireJson, requireAiAuth,
        requireMonthlyLimit('aiAnalysesPerMonth', 'ai_analysis'), aiUserLimit(10, 60),
        validateBody(schemas.analyze),
        async (req, res) => {
            const { text, analysisType } = req.body;

            const validationErrors = validateAnalysisBody(req.body);
            if (validationErrors.length > 0) {
                return res.status(400).json({ error: 'Validation failed', details: validationErrors });
            }

            const candidates = getProviderCandidates({}, serverConfig);
            if (!candidates.length) {
                return res.status(503).json({ error: 'No AI provider configured. Add GEMINI_API_KEY, ANTHROPIC_API_KEY, or MISTRAL_API_KEY to .env' });
            }
            // Only used for the cache key and error reporting before a provider
            // actually answers; the response always reports whichever provider
            // really produced the result.
            let selectedModel = candidates[0].model;

            const textHash = crypto.createHash('md5').update(text).digest('hex');
            try {
                const cached = await db.getCachedAnalysis(textHash, analysisType, selectedModel);
                if (cached) {
                    req.log.debug({ hash: textHash.substring(0, 8) }, 'Analysis DB cache hit');
                    return res.json({ ...cached, cached: true });
                }

                const analysisCacheKey = `analysis:${textHash}:${analysisType}:${selectedModel}`;
                const memCached = await cache.getAsync(analysisCacheKey);
                if (memCached) {
                    return res.json({ result: memCached.result, cached: true });
                }

                const prompt = buildAnalysisPrompt(text, analysisType);
                const { text: generatedText, provider: usedProvider, model: usedModel } =
                    await callTextWithFallback(ai, candidates, prompt, { temperature: TEMPERATURE.analysis }, { logger: req.log });
                selectedModel = usedModel;

                const result = {
                    result: generatedText,
                    model: usedModel,
                    provider: usedProvider,
                    type: analysisType,
                    timestamp: new Date().toISOString(),
                    disclaimer: AI_DISCLAIMER,
                };

                await cache.setAsync(analysisCacheKey, result, 3600);
                await db.cacheAnalysis(textHash, analysisType, usedModel, result, 0, 0);
                await db.logEvent('analyze', req.sessionId, { type: analysisType, model: usedModel, provider: usedProvider });

                res.json(result);
            } catch (error) {
                req.log.error({ err: error, model: selectedModel }, 'AI analysis error');
                const isDev = process.env.NODE_ENV === 'development';
                res.status(500).json({
                    error: 'Internal Server Error',
                    ...(isDev && { stack: error.stack }),
                });
            }
        }
    );

    app.post('/api/ai/analyze/stream',
        limitBodySize(2 * 1024 * 1024), requireJson, requireAiAuth,
        requireMonthlyLimit('aiAnalysesPerMonth', 'ai_analysis'), aiUserLimit(10, 60),
        validateBody(schemas.analyze),
        async (req, res) => {
            const { text, analysisType } = req.body;

            const validationErrors = validateAnalysisBody(req.body);
            if (validationErrors.length > 0) {
                return res.status(400).json({ error: 'Validation failed', details: validationErrors });
            }

            const candidates = getProviderCandidates({}, serverConfig);
            if (!candidates.length) {
                return res.status(503).json({ error: 'No AI provider configured. Add GEMINI_API_KEY, ANTHROPIC_API_KEY, or MISTRAL_API_KEY to .env' });
            }
            let selectedModel = candidates[0].model;

            const textHash = crypto.createHash('md5').update(text).digest('hex');

            try {
                const cached = await db.getCachedAnalysis(textHash, analysisType, selectedModel);
                if (cached) {
                    setupSSE(res);
                    sendSSE(res, 'result', { ...cached, cached: true });
                    sendSSE(res, 'done', {});
                    return res.end();
                }

                const streamCacheKey = `analysis:${textHash}:${analysisType}:${selectedModel}`;
                const memCached = await cache.getAsync(streamCacheKey);
                if (memCached) {
                    setupSSE(res);
                    sendSSE(res, 'result', { result: memCached.result, cached: true });
                    sendSSE(res, 'done', {});
                    return res.end();
                }

                const prompt = buildAnalysisPrompt(text, analysisType);
                setupSSE(res);

                let fullText = '';
                let usedProvider = candidates[0].provider;
                let usedModel = selectedModel;
                for await (const part of streamTextWithFallback(ai, candidates, prompt, { temperature: TEMPERATURE.analysis }, { logger: req.log })) {
                    fullText += part.chunk;
                    usedProvider = part.provider;
                    usedModel = part.model;
                    sendSSE(res, 'chunk', { text: part.chunk });
                }
                selectedModel = usedModel;

                const result = {
                    result: fullText,
                    model: usedModel,
                    provider: usedProvider,
                    type: analysisType,
                    timestamp: new Date().toISOString(),
                    disclaimer: AI_DISCLAIMER,
                };

                await cache.setAsync(streamCacheKey, result, 3600);
                await db.cacheAnalysis(textHash, analysisType, usedModel, result, 0, 0);
                await db.logEvent('analyze', req.sessionId, { type: analysisType, model: usedModel, provider: usedProvider });

                sendSSE(res, 'result', result);
                sendSSE(res, 'done', {});
                res.end();
            } catch (error) {
                req.log.error({ err: error, model: selectedModel }, 'AI analysis stream error');
                if (!res.headersSent) {
                    return res.status(500).json({ error: 'Internal Server Error', model: selectedModel });
                }
                sendSSE(res, 'error', { message: error.message || 'Stream error' });
                res.end();
            }
        }
    );

    app.post('/api/ai/explain',
        limitBodySize(2 * 1024 * 1024), requireJson, requireAiAuth,
        aiUserLimit(10, 60),
        validateBody(schemas.analyze),
        async (req, res) => {
            const { text } = req.body;

            if (!text || typeof text !== 'string') {
                return res.status(400).json({ error: 'Text is required and must be a string' });
            }
            if (text.length > 50000) {
                return res.status(400).json({ error: 'Text exceeds maximum length of 50000 characters' });
            }

            const candidates = getProviderCandidates({}, serverConfig);
            if (!candidates.length) {
                return res.status(503).json({ error: 'No AI provider configured. Add GEMINI_API_KEY, ANTHROPIC_API_KEY, or MISTRAL_API_KEY to .env' });
            }

            const textHash = crypto.createHash('md5').update(text).digest('hex');
            const analysisType = 'layperson';

            try {
                const cached = await db.getCachedAnalysis(textHash, analysisType, candidates[0].model);
                if (cached) {
                    return res.json({ ...cached, cached: true });
                }

                const explainCacheKey = `analysis:${textHash}:${analysisType}:${candidates[0].model}`;
                const memCached = await cache.getAsync(explainCacheKey);
                if (memCached) {
                    return res.json({ result: memCached.result, cached: true });
                }

                const prompt = `Explain this medical research in simple terms that a patient could understand:\n\n${text}`;
                const { text: generatedText, provider: usedProvider, model: usedModel } =
                    await callTextWithFallback(ai, candidates, prompt, { temperature: TEMPERATURE.explain }, { logger: req.log });

                const result = {
                    result: generatedText,
                    model: usedModel,
                    provider: usedProvider,
                    type: analysisType,
                    timestamp: new Date().toISOString(),
                    disclaimer: AI_DISCLAIMER,
                };

                await cache.setAsync(explainCacheKey, result, 3600);
                await db.cacheAnalysis(textHash, analysisType, usedModel, result, 0, 0);
                await db.logEvent('explain', req.sessionId, { provider: usedProvider, model: usedModel });

                res.json(result);
            } catch (error) {
                req.log.error({ err: error }, 'AI explain error');
                res.status(500).json({ error: 'Internal Server Error' });
            }
        }
    );
}

module.exports = { registerAnalysisRoutes };
