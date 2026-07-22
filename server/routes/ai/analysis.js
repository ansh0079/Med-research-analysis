'use strict';

const crypto = require('crypto');
const { TEMPERATURE, AI_DISCLAIMER } = require('../../services/aiService');
const { buildAnalysisPrompt } = require('../../prompts');
const { resolveProvider } = require('../../utils/aiProvider');
const { setupSSE, sendSSE } = require('../../utils/sse');

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
            const { text, analysisType, provider = 'auto', model } = req.body;

            const validationErrors = validateAnalysisBody(req.body);
            if (validationErrors.length > 0) {
                return res.status(400).json({ error: 'Validation failed', details: validationErrors });
            }

            const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider, model }, serverConfig);
            if (!selectedProvider) {
                return res.status(503).json({ error: 'No AI service configured. Add GEMINI_API_KEY or MISTRAL_API_KEY to .env' });
            }

            const textHash = crypto.createHash('md5').update(text).digest('hex');
            try {
                const cached = await db.getCachedAnalysis(textHash, analysisType, selectedModel);
                if (cached) {
                    req.log.debug({ hash: textHash.substring(0, 8) }, 'Analysis DB cache hit');
                    return res.json({ ...cached, cached: true, provider: selectedProvider });
                }

                const analysisCacheKey = `analysis:${textHash}:${analysisType}:${selectedModel}`;
                const memCached = await cache.getAsync(analysisCacheKey);
                if (memCached) {
                    return res.json({ result: memCached.result, cached: true, provider: selectedProvider });
                }

                const prompt = buildAnalysisPrompt(text, analysisType);
                const generatedText = await ai.callText(prompt, selectedProvider, selectedModel, { temperature: TEMPERATURE.analysis });

                const result = {
                    result: generatedText,
                    model: selectedModel,
                    provider: selectedProvider,
                    type: analysisType,
                    timestamp: new Date().toISOString(),
                    disclaimer: AI_DISCLAIMER,
                };

                await cache.setAsync(analysisCacheKey, result, 3600);
                await db.cacheAnalysis(textHash, analysisType, selectedModel, result, 0, 0);
                await db.logEvent('analyze', req.sessionId, { type: analysisType, model: selectedModel, provider: selectedProvider });

                res.json(result);
            } catch (error) {
                req.log.error({ err: error, provider: selectedProvider, model: selectedModel }, 'AI analysis error');
                const isDev = process.env.NODE_ENV === 'development';
                res.status(500).json({
                    error: 'Internal Server Error',
                    provider: selectedProvider,
                    model: selectedModel,
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
            const { text, analysisType, provider = 'auto', model } = req.body;

            const validationErrors = validateAnalysisBody(req.body);
            if (validationErrors.length > 0) {
                return res.status(400).json({ error: 'Validation failed', details: validationErrors });
            }

            const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider, model }, serverConfig);
            if (!selectedProvider) {
                return res.status(503).json({ error: 'No AI service configured. Add GEMINI_API_KEY or MISTRAL_API_KEY to .env' });
            }

            const textHash = crypto.createHash('md5').update(text).digest('hex');

            try {
                const cached = await db.getCachedAnalysis(textHash, analysisType, selectedModel);
                if (cached) {
                    setupSSE(res);
                    sendSSE(res, 'result', { ...cached, cached: true, provider: selectedProvider });
                    sendSSE(res, 'done', {});
                    return res.end();
                }

                const streamCacheKey = `analysis:${textHash}:${analysisType}:${selectedModel}`;
                const memCached = await cache.getAsync(streamCacheKey);
                if (memCached) {
                    setupSSE(res);
                    sendSSE(res, 'result', { result: memCached.result, cached: true, provider: selectedProvider });
                    sendSSE(res, 'done', {});
                    return res.end();
                }

                const prompt = buildAnalysisPrompt(text, analysisType);
                setupSSE(res);

                let fullText = '';
                for await (const chunk of ai.callTextStream(prompt, selectedProvider, selectedModel, { temperature: TEMPERATURE.analysis })) {
                    fullText += chunk;
                    sendSSE(res, 'chunk', { text: chunk });
                }

                const result = {
                    result: fullText,
                    model: selectedModel,
                    provider: selectedProvider,
                    type: analysisType,
                    timestamp: new Date().toISOString(),
                    disclaimer: AI_DISCLAIMER,
                };

                await cache.setAsync(streamCacheKey, result, 3600);
                await db.cacheAnalysis(textHash, analysisType, selectedModel, result, 0, 0);
                await db.logEvent('analyze', req.sessionId, { type: analysisType, model: selectedModel, provider: selectedProvider });

                sendSSE(res, 'result', result);
                sendSSE(res, 'done', {});
                res.end();
            } catch (error) {
                req.log.error({ err: error, provider: selectedProvider, model: selectedModel }, 'AI analysis stream error');
                if (!res.headersSent) {
                    return res.status(500).json({ error: 'Internal Server Error', provider: selectedProvider, model: selectedModel });
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
            const { text, provider = 'auto', model } = req.body;

            if (!text || typeof text !== 'string') {
                return res.status(400).json({ error: 'Text is required and must be a string' });
            }
            if (text.length > 50000) {
                return res.status(400).json({ error: 'Text exceeds maximum length of 50000 characters' });
            }

            const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider, model }, serverConfig);
            if (!selectedProvider) {
                return res.status(503).json({ error: 'No AI service configured. Add GEMINI_API_KEY or MISTRAL_API_KEY to .env' });
            }

            const textHash = crypto.createHash('md5').update(text).digest('hex');
            const analysisType = 'layperson';

            try {
                const cached = await db.getCachedAnalysis(textHash, analysisType, selectedModel);
                if (cached) {
                    return res.json({ ...cached, cached: true, provider: selectedProvider });
                }

                const explainCacheKey = `analysis:${textHash}:${analysisType}:${selectedModel}`;
                const memCached = await cache.getAsync(explainCacheKey);
                if (memCached) {
                    return res.json({ result: memCached.result, cached: true, provider: selectedProvider });
                }

                const prompt = `Explain this medical research in simple terms that a patient could understand:\n\n${text}`;
                const generatedText = await ai.callText(prompt, selectedProvider, selectedModel, { temperature: TEMPERATURE.explain });

                const result = {
                    result: generatedText,
                    model: selectedModel,
                    provider: selectedProvider,
                    type: analysisType,
                    timestamp: new Date().toISOString(),
                    disclaimer: AI_DISCLAIMER,
                };

                await cache.setAsync(explainCacheKey, result, 3600);
                await db.cacheAnalysis(textHash, analysisType, selectedModel, result, 0, 0);
                await db.logEvent('explain', req.sessionId, { provider: selectedProvider, model: selectedModel });

                res.json(result);
            } catch (error) {
                req.log.error({ err: error }, 'AI explain error');
                res.status(500).json({ error: 'Internal Server Error' });
            }
        }
    );
}

module.exports = { registerAnalysisRoutes };
