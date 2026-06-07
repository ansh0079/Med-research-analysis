'use strict';

const { AsyncLocalStorage } = require('async_hooks');
const { estimateTokensFromChars, estimateCostUsd } = require('./llmUsageService');

const budgetStorage = new AsyncLocalStorage();

/** Per user-action LLM budgets — override via env LLM_BUDGET_<ACTION>_CALLS / _COST_USD */
const ACTION_BUDGET_DEFAULTS = {
    synthesis: { maxCalls: 5, maxCostUsd: 0.08 },
    search_enrichment: { maxCalls: 4, maxCostUsd: 0.06 },
    quiz: { maxCalls: 6, maxCostUsd: 0.05 },
    synopsis: { maxCalls: 2, maxCostUsd: 0.02 },
    agent_turn: { maxCalls: 5, maxCostUsd: 0.06 },
    analyze: { maxCalls: 2, maxCostUsd: 0.02 },
    default: { maxCalls: 3, maxCostUsd: 0.03 },
};

class LlmBudgetExceededError extends Error {
    constructor(reason, snapshot = {}) {
        super(`LLM request budget exceeded (${reason})`);
        this.name = 'LlmBudgetExceededError';
        this.reason = reason;
        this.status = 429;
        this.snapshot = snapshot;
    }
}

class LlmRequestBudget {
    constructor({ maxCalls, maxCostUsd, label = 'default' } = {}) {
        this.maxCalls = Math.max(1, Number(maxCalls) || ACTION_BUDGET_DEFAULTS.default.maxCalls);
        this.maxCostUsd = Math.max(0.001, Number(maxCostUsd) || ACTION_BUDGET_DEFAULTS.default.maxCostUsd);
        this.label = label;
        this.calls = 0;
        this.estimatedCostUsd = 0;
        this.terminated = false;
    }

    estimateCallCost(prompt, model) {
        const inputTokens = estimateTokensFromChars(String(prompt || '').length);
        const outputTokens = estimateTokensFromChars(Math.min(4096, String(prompt || '').length * 0.25));
        return estimateCostUsd(model, inputTokens, outputTokens);
    }

    canAffordCall({ prompt, model } = {}) {
        if (this.terminated) return false;
        if (this.calls >= this.maxCalls) return false;
        const projected = this.estimatedCostUsd + this.estimateCallCost(prompt, model);
        return projected <= this.maxCostUsd + 1e-9;
    }

    assertCanCall({ prompt, model } = {}) {
        if (this.terminated) {
            throw new LlmBudgetExceededError('terminated', this.snapshot());
        }
        if (this.calls >= this.maxCalls) {
            this.terminated = true;
            throw new LlmBudgetExceededError('call_limit', this.snapshot());
        }
        const projected = this.estimatedCostUsd + this.estimateCallCost(prompt, model);
        if (projected > this.maxCostUsd + 1e-9) {
            this.terminated = true;
            throw new LlmBudgetExceededError('cost_limit', this.snapshot());
        }
    }

    recordCall({ prompt, response, model }) {
        this.calls += 1;
        const inputTokens = estimateTokensFromChars(String(prompt || '').length);
        const outputTokens = estimateTokensFromChars(String(response || '').length);
        this.estimatedCostUsd += estimateCostUsd(model, inputTokens, outputTokens);
        if (this.calls >= this.maxCalls) this.terminated = true;
    }

    snapshot() {
        return {
            label: this.label,
            calls: this.calls,
            maxCalls: this.maxCalls,
            estimatedCostUsd: this.estimatedCostUsd,
            maxCostUsd: this.maxCostUsd,
            terminated: this.terminated,
        };
    }
}

function readEnvBudget(action, field, fallback) {
    const key = `LLM_BUDGET_${String(action).toUpperCase()}_${field}`;
    const raw = process.env[key];
    if (raw == null || raw === '') return fallback;
    return field === 'CALLS' ? Number(raw) : Number(raw);
}

function createBudgetForAction(action = 'default') {
    const defaults = ACTION_BUDGET_DEFAULTS[action] || ACTION_BUDGET_DEFAULTS.default;
    return new LlmRequestBudget({
        maxCalls: readEnvBudget(action, 'CALLS', defaults.maxCalls),
        maxCostUsd: readEnvBudget(action, 'COST_USD', defaults.maxCostUsd),
        label: action,
    });
}

function runWithLlmBudget(budget, fn) {
    return budgetStorage.run(budget, fn);
}

function getActiveLlmBudget() {
    return budgetStorage.getStore() || null;
}

module.exports = {
    LlmBudgetExceededError,
    LlmRequestBudget,
    ACTION_BUDGET_DEFAULTS,
    createBudgetForAction,
    runWithLlmBudget,
    getActiveLlmBudget,
};
