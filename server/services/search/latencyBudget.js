'use strict';

const DEFAULT_SEARCH_LATENCY_BUDGET_MS = Number(process.env.SEARCH_LATENCY_BUDGET_MS || 2500) || 2500;
const VECTOR_SKIP_FRACTION = Number(process.env.SEARCH_BUDGET_VECTOR_FRACTION || 0.4) || 0.4;
const PICO_SKIP_FRACTION = Number(process.env.SEARCH_BUDGET_PICO_FRACTION || 0.7) || 0.7;

function resolveBudgetMs(budgetMs) {
    const n = Number(budgetMs);
    return Number.isFinite(n) && n > 0 ? Math.max(200, n) : DEFAULT_SEARCH_LATENCY_BUDGET_MS;
}

function createLatencyBudget({
    budgetMs = DEFAULT_SEARCH_LATENCY_BUDGET_MS,
    startedAt = Date.now(),
} = {}) {
    const budget = resolveBudgetMs(budgetMs);
    const skippedStages = [];

    return {
        budgetMs: budget,
        startedAt,
        skippedStages,
        elapsed() {
            return Date.now() - startedAt;
        },
        remaining() {
            return budget - (Date.now() - startedAt);
        },
        exceeded() {
            return Date.now() - startedAt >= budget;
        },
        shouldSkip(fraction = 1) {
            const cutoff = budget * Math.max(0, Math.min(1, Number(fraction) || 1));
            return Date.now() - startedAt >= cutoff;
        },
        skip(stage) {
            if (stage && !skippedStages.includes(stage)) skippedStages.push(stage);
            return this;
        },
        snapshot() {
            const elapsedMs = Date.now() - startedAt;
            return {
                budgetMs: budget,
                elapsedMs,
                remainingMs: Math.max(0, budget - elapsedMs),
                exceeded: elapsedMs >= budget,
                skippedStages: [...skippedStages],
                partialResults: skippedStages.length > 0,
            };
        },
    };
}

module.exports = {
    DEFAULT_SEARCH_LATENCY_BUDGET_MS,
    VECTOR_SKIP_FRACTION,
    PICO_SKIP_FRACTION,
    createLatencyBudget,
    resolveBudgetMs,
};
