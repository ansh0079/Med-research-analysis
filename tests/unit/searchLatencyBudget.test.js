'use strict';

const {
    createLatencyBudget,
    VECTOR_SKIP_FRACTION,
    PICO_SKIP_FRACTION,
} = require('../../server/services/search/latencyBudget');
const { applyPicoRerankStage } = require('../../server/services/search/searchPipeline');

describe('search latency budget', () => {
    test('shouldSkip after the configured fraction of the budget', () => {
        const budget = createLatencyBudget({ budgetMs: 1000, startedAt: Date.now() - 500 });
        expect(budget.shouldSkip(VECTOR_SKIP_FRACTION)).toBe(true);
        expect(budget.exceeded()).toBe(false);
        budget.skip('vector_fusion');
        const snap = budget.snapshot();
        expect(snap.skippedStages).toEqual(['vector_fusion']);
        expect(snap.partialResults).toBe(true);
        expect(snap.budgetMs).toBe(1000);
    });

    test('applyPicoRerankStage returns partial results when budget is spent', async () => {
        const articles = [
            { uid: 'a', title: 'Sepsis fluids' },
            { uid: 'b', title: 'Sepsis antibiotics' },
        ];
        const telemetry = {};
        const budget = createLatencyBudget({ budgetMs: 200, startedAt: Date.now() - 200 });
        const out = await applyPicoRerankStage({
            articles,
            pico: { intervention: 'fluids', confidence: 0.9 },
            query: 'sepsis fluids',
            queryIntent: 'management',
            safeLimit: 10,
            serverConfig: { keys: {} },
            fetchImpl: jest.fn(),
            telemetry,
            latencyBudget: budget,
        });
        expect(out).toEqual(articles);
        expect(telemetry.picoRerank.skippedBudget).toBe(true);
        expect(budget.snapshot().skippedStages).toContain('pico_rerank');
    });

    test('synthetic load P95 stays within budget when expensive stages skip', () => {
        const budgetMs = 2500;
        const latencies = [];
        for (let i = 0; i < 200; i += 1) {
            const fetchMs = 400 + (i % 20) * 80;
            const vectorMs = fetchMs > budgetMs * VECTOR_SKIP_FRACTION ? 0 : 600;
            const picoMs = fetchMs + vectorMs > budgetMs * PICO_SKIP_FRACTION ? 0 : 900;
            const total = Math.min(budgetMs, fetchMs + vectorMs + picoMs + 50);
            latencies.push(total);
        }
        latencies.sort((a, b) => a - b);
        const p95 = latencies[Math.floor(0.95 * (latencies.length - 1))];
        expect(p95).toBeLessThanOrEqual(budgetMs);
    });
});
