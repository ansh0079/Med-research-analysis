'use strict';

/**
 * Token budget and prompt truncation for the learning agent.
 *
 * The agent prompt is composed of many optional context sections. Left
 * unchecked it can exceed model context windows. This module bounds the
 * prompt and trims the lowest-priority sections first.
 */

const { estimateTokensFromChars } = require('./llmUsageService');

const AGENT_INPUT_TOKEN_BUDGET = Math.max(
    1024,
    Number(process.env.AGENT_INPUT_TOKEN_BUDGET) || 12000,
);

// When unset, intent-specific defaults from agentPromptVersion apply.
// Set AGENT_OUTPUT_TOKEN_BUDGET to cap all agent outputs globally (min 256).
const AGENT_OUTPUT_TOKEN_BUDGET = process.env.AGENT_OUTPUT_TOKEN_BUDGET != null
    && String(process.env.AGENT_OUTPUT_TOKEN_BUDGET).trim() !== ''
    ? Math.max(256, Number(process.env.AGENT_OUTPUT_TOKEN_BUDGET) || 0)
    : 0;

function estimateTokens(text) {
    return estimateTokensFromChars(String(text || '').length);
}

/**
 * Trim a prompt to fit within maxTokens while preserving the most important
 * parts: the system prompt and the final user turn. Older conversation context,
 * cross-topic bridges, and retrieval sections are removed progressively.
 *
 * The prompt is expected to contain a final `---\n\n<user message>` separator.
 * If it does not, we fall back to truncating from the end (but never the last
 * 256 chars, which we assume contains the user turn).
 */
function truncateAgentPrompt(fullPrompt, maxTokens = AGENT_INPUT_TOKEN_BUDGET) {
    const original = String(fullPrompt || '');
    const originalTokens = estimateTokens(original);

    if (originalTokens <= maxTokens) {
        return {
            prompt: original,
            truncated: false,
            originalTokens,
            finalTokens: originalTokens,
        };
    }

    const separator = '\n\n---\n\n';
    const sepIndex = original.lastIndexOf(separator);
    let prefix = '';
    let userTurn = original;

    if (sepIndex >= 0) {
        prefix = original.slice(0, sepIndex);
        userTurn = original.slice(sepIndex + separator.length);
    }

    // Always keep the final user turn (up to a reasonable cap).
    const userTurnBudget = Math.min(
        estimateTokens(userTurn),
        Math.floor(maxTokens * 0.35),
    );
    let trimmedUserTurn = userTurn;
    while (estimateTokens(trimmedUserTurn) > userTurnBudget && trimmedUserTurn.length > 80) {
        const prev = trimmedUserTurn;
        trimmedUserTurn = trimmedUserTurn.slice(0, Math.max(80, Math.floor(trimmedUserTurn.length * 0.92)));
        if (trimmedUserTurn === prev) break;
    }

    const reservedTokens = estimateTokens(trimmedUserTurn) + 50; // separator + slack
    const prefixBudget = Math.max(0, maxTokens - reservedTokens);

    let trimmedPrefix = prefix;
    while (estimateTokens(trimmedPrefix) > prefixBudget && trimmedPrefix.length > 200) {
        const prev = trimmedPrefix;
        // Trim progressively: first drop cross-topic bridges, then retrieval,
        // then older conversation context, then topic memory/guidelines.
        trimmedPrefix = trimmedPrefix.slice(0, Math.max(200, Math.floor(trimmedPrefix.length * 0.94)));
        if (trimmedPrefix === prev) break;
    }

    let finalPrompt = trimmedPrefix
        ? `${trimmedPrefix}${separator}${trimmedUserTurn}`
        : trimmedUserTurn;

    // Hard cap: never exceed maxTokens (trim prefix first, then user turn as last resort).
    while (estimateTokens(finalPrompt) > maxTokens) {
        if (trimmedPrefix.length > 0) {
            trimmedPrefix = trimmedPrefix.slice(0, Math.max(0, Math.floor(trimmedPrefix.length * 0.9)));
            finalPrompt = `${trimmedPrefix}${separator}${trimmedUserTurn}`;
            continue;
        }
        if (trimmedUserTurn.length > 80) {
            trimmedUserTurn = trimmedUserTurn.slice(0, Math.max(80, Math.floor(trimmedUserTurn.length * 0.9)));
            finalPrompt = trimmedUserTurn;
            continue;
        }
        break;
    }

    const finalTokens = estimateTokens(finalPrompt);

    return {
        prompt: finalPrompt,
        truncated: true,
        originalTokens,
        finalTokens,
    };
}

function getAgentOutputTokenBudget(intent, fallback = 1800) {
    if (AGENT_OUTPUT_TOKEN_BUDGET > 0) return AGENT_OUTPUT_TOKEN_BUDGET;
    const { AGENT_PROMPT_SCHEMA } = require('./agentPromptVersion');
    return AGENT_PROMPT_SCHEMA.outputTokensByIntent[intent] ?? fallback;
}

module.exports = {
    AGENT_INPUT_TOKEN_BUDGET,
    AGENT_OUTPUT_TOKEN_BUDGET,
    estimateTokens,
    truncateAgentPrompt,
    getAgentOutputTokenBudget,
};
