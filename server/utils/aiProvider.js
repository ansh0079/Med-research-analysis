/**
 * Centralised AI provider resolution.
 * Eliminates the ~8× duplication of provider auto-selection logic across routes and services.
 */

const { PINNED_MODELS } = require('../services/aiService');

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

    const selectedModel = options.model || PINNED_MODELS[selectedProvider] || null;
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
        keys.gemini ? { provider: 'gemini', model: options.model || PINNED_MODELS.gemini } : null,
        keys.mistral ? { provider: 'mistral', model: options.model || PINNED_MODELS.mistral } : null,
    ].filter(Boolean);
}

module.exports = { resolveProvider, getProviderCandidates, PINNED_MODELS };
