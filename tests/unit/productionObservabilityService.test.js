const {
    buildProductionReadinessSummary,
} = require('../../server/services/productionObservabilityService');

describe('productionObservabilityService', () => {
    test('summarizes a healthy production loop', () => {
        const summary = buildProductionReadinessSummary({
            windowDays: 7,
            qualityMetrics: {
                search: {
                    sampleSize: 25,
                    noClickRate: 0.22,
                    lowRecallQueryCount: 1,
                },
                synthesis: {
                    citationValidationPassRate: 0.96,
                    citationValidationSample: 20,
                },
            },
            rewardStats: {
                totalSignals: 40,
                attributedSignals: 34,
                skippedSignals: 6,
                attributionRate: 0.85,
            },
            jobStats: {
                queued: 1,
                running: 0,
                completed: 20,
                failed: 1,
                deadLetter: 0,
                total: 22,
            },
            synopsisStats: {
                totalClaims: 60,
                trustedClaims: 50,
                riskyClaims: 4,
                pendingReviewClaims: 6,
                trustRate: 50 / 60,
                riskyRate: 4 / 60,
            },
            slo: {
                rolling: [
                    { slo: 'search_latency_p95', total: 20, ok: true, successRate: 0.98 },
                    { slo: 'synopsis_success_rate', total: 20, ok: true, successRate: 0.97 },
                ],
            },
        });

        expect(summary.status).toBe('healthy');
        expect(summary.score).toBe(100);
        expect(summary.alerts).toHaveLength(0);
        expect(summary.sections.search.status).toBe('healthy');
        expect(summary.sections.rewards.status).toBe('healthy');
        expect(summary.sections.synopsis.status).toBe('healthy');
    });

    test('surfaces degraded alerts and concrete actions', () => {
        const summary = buildProductionReadinessSummary({
            qualityMetrics: {
                search: {
                    sampleSize: 30,
                    noClickRate: 0.8,
                    lowRecallQueryCount: 18,
                },
                synthesis: {
                    citationValidationPassRate: 0.82,
                    citationValidationSample: 12,
                },
            },
            rewardStats: {
                totalSignals: 20,
                attributedSignals: 4,
                skippedSignals: 16,
                attributionRate: 0.2,
            },
            jobStats: {
                queued: 3,
                running: 1,
                completed: 10,
                failed: 4,
                deadLetter: 2,
                total: 20,
            },
            synopsisStats: {
                totalClaims: 50,
                trustedClaims: 10,
                riskyClaims: 24,
                pendingReviewClaims: 30,
                trustRate: 0.2,
                riskyRate: 0.48,
            },
            slo: {
                rolling: [
                    { slo: 'search_latency_p95', total: 20, ok: false, successRate: 0.8 },
                ],
            },
        });

        expect(summary.status).toBe('degraded');
        expect(summary.score).toBeLessThan(70);
        expect(summary.alerts.map((alert) => alert.area)).toEqual(expect.arrayContaining([
            'search',
            'rewards',
            'jobs',
            'synopsis',
            'slo',
        ]));
        expect(summary.actions.join(' ')).toMatch(/dead-letter|reward|quality queue/i);
    });
});
