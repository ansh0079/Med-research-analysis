'use strict';

// Carries the provider-reported token counts for one model call back to the
// usage log and spend guard, which otherwise estimate tokens from characters.
// The estimate misses Gemini's hidden thinking tokens entirely, which is how a
// bill far above the logged spend went unnoticed.

const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

/** Runs fn and returns { value, usage }; usage is null if the provider reported none. */
async function captureProviderUsage(fn) {
    const slot = { usage: null };
    const value = await storage.run(slot, fn);
    return { value, usage: slot.usage };
}

/** Called by provider wrappers once a response (even a failed one) has been billed. */
function reportProviderUsage({ inputTokens, outputTokens, thoughtsTokens = 0 } = {}) {
    const slot = storage.getStore();
    if (!slot) return;
    const input = Number(inputTokens);
    const output = Number(outputTokens);
    if (!Number.isFinite(input) && !Number.isFinite(output)) return;
    slot.usage = {
        inputTokens: Number.isFinite(input) ? input : 0,
        // Thinking tokens are billed as output.
        outputTokens: (Number.isFinite(output) ? output : 0) + (Number(thoughtsTokens) || 0),
        thoughtsTokens: Number(thoughtsTokens) || 0,
    };
}

module.exports = { captureProviderUsage, reportProviderUsage };
