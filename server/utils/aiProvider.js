/**
 * Centralised AI provider resolution.
 * Eliminates the ~8× duplication of provider auto-selection logic across routes and services.
 */

const { PINNED_MODELS } = require('../services/aiService');

const ALLOWED_MODELS = {
    gemini: new Set([PINNED_MODELS.gemini, PINNED_MODELS.geminiQuality]),
    mistral: new Set([PINNED_MODELS.mistral]),
};

function resolvePinnedModel(provider, requestedModel) {
    const fallback = PINNED_MODELS[provider] || null;
    if (!requestedModel) return fallback;
    return ALLOWED_MODELS[provider]?.has(requestedModel) ? requestedModel : fallback;
}

/**
 * Resolve provider and model from request options + server config.
 * @param {Object} options
 * @param {string} [options.provider='auto'] - 'gemini', 'mistral', or 'auto'
 * @param {string} [options.model] - explicit model override
 * @param {Object} serverConfig
 * @returns {{provider: string|null, model: string|null}}
 */
function resolveProvider(options = {}, serverConfig = {}) {
    const requestedProvider = options.provider || 'auto';
    const keys = serverConfig?.keys || {};

    let selectedProvider = requestedProvider;
    if (requestedProvider === 'auto') {
        if (keys.gemini) selectedProvider = 'gemini';
        else if (keys.mistral) selectedProvider = 'mistral';
        else selectedProvider = null;
    }

    if (!selectedProvider) {
        return { provider: null, model: null };
    }

    const selectedModel = resolvePinnedModel(selectedProvider, options.model);
    return { provider: selectedProvider, model: selectedModel };
}

function getProviderCandidates(options = {}, serverConfig = {}) {
    const requestedProvider = options.provider || 'auto';
    if (requestedProvider !== 'auto') {
        const resolved = resolveProvider(options, serverConfig);
        return resolved.provider ? [resolved] : [];
    }

    const keys = serverConfig?.keys || {};
    return [
        keys.gemini ? { provider: 'gemini', model: resolvePinnedModel('gemini', options.model) } : null,
        keys.mistral ? { provider: 'mistral', model: resolvePinnedModel('mistral', options.model) } : null,
    ].filter(Boolean);
}

module.exports = { resolveProvider, getProviderCandidates, resolvePinnedModel, PINNED_MODELS };
