'use strict';

/** Rough USD per 1M tokens (input/output blended estimate for dashboards). */
const MODEL_COST_PER_MTOK = {
    'gemini-2.0-flash': { in: 0.1, out: 0.4 },
    'gemini-2.5-flash-lite': { in: 0.1, out: 0.4 },
    'gemini-2.5-flash': { in: 0.3, out: 2.5 },
    'mistral-small-latest': { in: 0.2, out: 0.6 },
    'mistral-large-latest': { in: 2.0, out: 6.0 },
    default: { in: 0.25, out: 0.75 },
};

function estimateTokensFromChars(chars = 0) {
    return Math.max(1, Math.ceil(Number(chars || 0) / 4));
}

function estimateCostUsd(model, inputTokens, outputTokens) {
    const key = String(model || '').toLowerCase();
    const rates = MODEL_COST_PER_MTOK[key]
        || MODEL_COST_PER_MTOK[Object.keys(MODEL_COST_PER_MTOK).find((k) => key.includes(k.split('-')[0])) || '']
        || MODEL_COST_PER_MTOK.default;
    return (inputTokens / 1e6) * rates.in + (outputTokens / 1e6) * rates.out;
}

function createLlmUsageLogger(db) {
    return async function logLlmUsage(entry) {
        if (!db?.logLlmUsage) return;
        try {
            await db.logLlmUsage(entry);
        } catch {
            // observability must not break primary flows
        }
    };
}

function buildUsageEntry({
    operation,
    provider,
    model,
    topic,
    userId,
    prompt,
    response,
    success = true,
    errorMessage = null,
    durationMs = null,
}) {
    const promptChars = String(prompt || '').length;
    const responseChars = String(response || '').length;
    const estimatedInputTokens = estimateTokensFromChars(promptChars);
    const estimatedOutputTokens = estimateTokensFromChars(responseChars);
    const estimatedCostUsd = estimateCostUsd(model, estimatedInputTokens, estimatedOutputTokens);
    return {
        operation,
        provider,
        model,
        topic,
        userId,
        promptChars,
        responseChars,
        estimatedInputTokens,
        estimatedOutputTokens,
        estimatedCostUsd,
        success,
        errorMessage,
        durationMs,
    };
}

module.exports = {
    estimateTokensFromChars,
    estimateCostUsd,
    createLlmUsageLogger,
    buildUsageEntry,
};
