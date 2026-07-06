'use strict';

const DEFAULT_AGENT_PROMPT_TOKEN_BUDGET = 24000;
const DEFAULT_AGENT_OUTPUT_TOKEN_BUDGET = 1800;

function estimateTokens(text) {
    return Math.ceil(String(text || '').length / 4);
}

function getAgentPromptTokenBudget() {
    return Math.max(
        4000,
        Number(process.env.AGENT_PROMPT_TOKEN_BUDGET || DEFAULT_AGENT_PROMPT_TOKEN_BUDGET)
    );
}

function truncateAgentPrompt(prompt, maxTokens = getAgentPromptTokenBudget()) {
    const text = String(prompt || '');
    const originalTokens = estimateTokens(text);
    if (originalTokens <= maxTokens) {
        return {
            prompt: text,
            truncated: false,
            originalTokens,
            finalTokens: originalTokens,
        };
    }

    const maxChars = Math.max(1000, maxTokens * 4);
    const headChars = Math.floor(maxChars * 0.68);
    const tailChars = maxChars - headChars;
    const truncatedPrompt = [
        text.slice(0, headChars).trimEnd(),
        '\n\n[...conversation and retrieval context truncated to fit model budget...]\n\n',
        text.slice(-tailChars).trimStart(),
    ].join('');

    return {
        prompt: truncatedPrompt,
        truncated: true,
        originalTokens,
        finalTokens: estimateTokens(truncatedPrompt),
    };
}

function getAgentOutputTokenBudget(intent, fallback = DEFAULT_AGENT_OUTPUT_TOKEN_BUDGET) {
    const key = `AGENT_OUTPUT_TOKENS_${String(intent || 'default').toUpperCase()}`;
    const specific = Number(process.env[key]);
    if (Number.isFinite(specific) && specific > 0) return specific;
    const generic = Number(process.env.AGENT_OUTPUT_TOKEN_BUDGET);
    if (Number.isFinite(generic) && generic > 0) return generic;
    return Math.max(256, Number(fallback) || DEFAULT_AGENT_OUTPUT_TOKEN_BUDGET);
}

module.exports = {
    estimateTokens,
    getAgentPromptTokenBudget,
    truncateAgentPrompt,
    getAgentOutputTokenBudget,
};
