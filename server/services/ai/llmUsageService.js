'use strict';

const logger = require('../../config/logger');

/** Rough USD per 1M tokens (input/output blended estimate for dashboards). */
const MODEL_COST_PER_MTOK = {
    'gemini-2.0-flash': { in: 0.1, out: 0.4 },
    'gemini-2.5-flash-lite': { in: 0.1, out: 0.4 },
    'gemini-2.5-flash': { in: 0.3, out: 2.5 },
    'gemini-2.5-pro': { in: 1.25, out: 10.0 },
    'mistral-small-2603': { in: 0.15, out: 0.6 },
    'claude-haiku-4-5': { in: 1.0, out: 5.0 },
    'claude-sonnet-4-6': { in: 3.0, out: 15.0 },
    'claude-opus-4-8': { in: 5.0, out: 25.0 },
    'claude-opus-4-7': { in: 5.0, out: 25.0 },
    'claude-opus-4-6': { in: 5.0, out: 25.0 },
    'claude-fable-5': { in: 10.0, out: 50.0 },
    default: { in: 0.25, out: 0.75 },
};

function estimateTokensFromChars(chars = 0) {
    return Math.max(1, Math.ceil(Number(chars || 0) / 4));
}

function estimateCostUsd(model, inputTokens, outputTokens) {
    const key = String(model || '').toLowerCase();
    // Exact name, else the longest listed name the model starts with (a dated id such as
    // claude-haiku-4-5-20251001 takes claude-haiku-4-5's price). Matching on the vendor word alone priced any
    // unlisted model at that vendor's first entry: gemini-2.5-pro at Flash-2.0 rates, about 25x too low.
    const prefix = Object.keys(MODEL_COST_PER_MTOK)
        .filter((k) => k !== 'default' && key.startsWith(k))
        .sort((a, b) => b.length - a.length)[0];
    const rates = MODEL_COST_PER_MTOK[key]
        || (prefix ? MODEL_COST_PER_MTOK[prefix] : null)
        || MODEL_COST_PER_MTOK.default;
    return (inputTokens / 1e6) * rates.in + (outputTokens / 1e6) * rates.out;
}

function createLlmUsageLogger(db) {
    return async function logLlmUsage(entry) {
        if (!db?.logLlmUsage) return;
        try {
            await db.logLlmUsage(entry);
        } catch (err) {
            // observability must not break primary flows
            logger.debug({ err, operation: entry?.operation }, 'Failed to log LLM usage');
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
    usage = null,
}) {
    const promptChars = String(prompt || '').length;
    const responseChars = String(response || '').length;
    // Columns keep their historical names; they hold provider-reported counts
    // whenever the provider returned them, which includes thinking tokens.
    const estimatedInputTokens = usage?.inputTokens ?? estimateTokensFromChars(promptChars);
    const estimatedOutputTokens = usage?.outputTokens ?? estimateTokensFromChars(responseChars);
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
