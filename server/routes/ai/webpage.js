'use strict';

const crypto = require('crypto');
const { resolveProvider } = require('../../utils/aiProvider');
const { inferWebpageContent } = require('../../services/webpageInferenceService');

function hashPage(page) {
    const basis = [
        page?.url || '',
        page?.title || '',
        String(page?.text || '').slice(0, 12000),
        String(page?.selectionText || '').slice(0, 4000),
    ].join('\n');
    return crypto.createHash('sha256').update(basis).digest('hex').slice(0, 24);
}

function registerWebpageInferenceRoutes(app, {
    db,
    cache,
    serverConfig,
    ai,
    limitBodySize,
    requireJson,
    requireAiAuth,
    requirePaidFeature,
    requireMonthlyLimit,
    aiUserLimit,
}) {
    app.post('/api/ai/webpage/infer',
        limitBodySize(512 * 1024),
        requireJson,
        requireAiAuth,
        requirePaidFeature('aiAnalysis'),
        requireMonthlyLimit('aiAnalysesPerMonth', 'webpage_inference'),
        aiUserLimit(12, 60),
        async (req, res) => {
            const { page, provider = 'auto', model } = req.body || {};
            if (!page || typeof page !== 'object') {
                return res.status(400).json({ error: 'page payload is required' });
            }

            const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider, model }, serverConfig);
            if (!selectedProvider) {
                return res.status(503).json({ error: 'No AI service configured' });
            }

            const pageHash = hashPage(page);
            const cacheKey = `webpage-infer:${pageHash}:${selectedProvider}:${selectedModel}`;

            try {
                const cached = await cache.getAsync(cacheKey);
                if (cached) {
                    return res.json({ ...cached, cached: true });
                }

                const result = await inferWebpageContent({
                    ai,
                    provider: selectedProvider,
                    model: selectedModel,
                    page,
                });
                const response = {
                    ...result,
                    provider: selectedProvider,
                    model: selectedModel,
                    cached: false,
                    timestamp: new Date().toISOString(),
                };

                await cache.setAsync(cacheKey, response, 1800);
                await db.logEvent?.('webpage_inference', req.sessionId, {
                    pageHash,
                    urlHost: (() => {
                        try { return new URL(page.url).hostname; } catch { return null; }
                    })(),
                    pageType: response.inference.pageType,
                    riskLevel: response.inference.safetyAssessment.riskLevel,
                    provider: selectedProvider,
                    model: selectedModel,
                });
                res.json(response);
            } catch (error) {
                req.log?.error?.({ err: error, provider: selectedProvider, model: selectedModel }, 'Webpage inference error');
                res.status(error.status || 500).json({
                    error: error.status === 400 ? error.message : 'Internal Server Error',
                    provider: selectedProvider,
                    model: selectedModel,
                });
            }
        }
    );
}

module.exports = { registerWebpageInferenceRoutes };
