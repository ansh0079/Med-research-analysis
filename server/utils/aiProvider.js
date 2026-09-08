/**
 * Centralised AI provider resolution.
 * Eliminates the ~8× duplication of provider auto-selection logic across routes and services.
 */

const { PINNED_MODELS } = require('../services/aiService');
const { filterAvailableProviders } = require('../services/ai/providerHealth');

const ALLOWED_MODELS = {
    claude: new Set([PINNED_MODELS.claude]),
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
        // Preference order, minus any provider whose account is currently
        // unusable. Most callers take this single answer and never retry, so a
        // dead account here is a dead feature -- see providerHealth.
        const preferred = [
            keys.anthropic ? { provider: 'claude' } : null,
            keys.gemini ? { provider: 'gemini' } : null,
            keys.mistral ? { provider: 'mistral' } : null,
        ].filter(Boolean);
        selectedProvider = filterAvailableProviders(preferred)[0]?.provider || null;
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
    // Cooling-down providers move to the back rather than out: an explicit
    // fallback loop should still try them if the healthy ones fail.
    const all = [
        keys.anthropic ? { provider: 'claude', model: resolvePinnedModel('claude', options.model) } : null,
        keys.gemini ? { provider: 'gemini', model: resolvePinnedModel('gemini', options.model) } : null,
        keys.mistral ? { provider: 'mistral', model: resolvePinnedModel('mistral', options.model) } : null,
    ].filter(Boolean);
    const healthy = filterAvailableProviders(all);
    const healthySet = new Set(healthy);
    return [...healthy, ...all.filter((c) => !healthySet.has(c))];
}

module.exports = { resolveProvider, getProviderCandidates, resolvePinnedModel, PINNED_MODELS };
