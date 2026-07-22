const {
    buildProductionReadinessSummary,
    buildLearningLoopControlSummary,
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
            learningSignalStats: {
                totalLearningSignals: 100,
                interactionTotal: 50,
                searchRankingDecisions: 40,
                decisionsWithPropensity: 36,
                propensityCoverage: 0.9,
                quizSignals: 10,
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
        expect(summary.learningControl.mode).toBe('learning_enabled');
        expect(summary.alerts).toHaveLength(0);
        expect(summary.sections.search.status).toBe('healthy');
        expect(summary.sections.rewards.status).toBe('healthy');
        expect(summary.sections.synopsis.status).toBe('healthy');
        expect(summary.sections.learningSignals.status).toBe('healthy');
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
        expect(summary.learningControl.mode).toBe('safe_heuristic_fallback');
    });

    test('keeps learning loop in observe-only until beta signals exist', () => {
        const control = buildLearningLoopControlSummary({
            rewardStats: { totalSignals: 0, attributionRate: null },
            learningSignalStats: { totalLearningSignals: 0, searchRankingDecisions: 0 },
            jobStats: { deadLetter: 0 },
        });

        expect(control.mode).toBe('observe_only');
        expect(control.onlineLearningSafe).toBe(false);
        expect(control.warnings.join(' ')).toMatch(/No reward signals/i);
    });

    test('enables learning when rewards, propensity, and job health are safe', () => {
        const control = buildLearningLoopControlSummary({
            rewardStats: { totalSignals: 60, attributedSignals: 52, attributionRate: 52 / 60 },
            learningSignalStats: {
                totalLearningSignals: 140,
                searchRankingDecisions: 60,
                decisionsWithPropensity: 54,
                propensityCoverage: 0.9,
            },
            jobStats: { deadLetter: 0 },
        });

        expect(control.mode).toBe('learning_enabled');
        expect(control.onlineLearningSafe).toBe(true);
        expect(control.blockers).toHaveLength(0);
    });

    test('falls back when dead letters or unsafe reward attribution are present', () => {
        const control = buildLearningLoopControlSummary({
            rewardStats: { totalSignals: 30, attributedSignals: 6, attributionRate: 0.2 },
            learningSignalStats: {
                totalLearningSignals: 80,
                searchRankingDecisions: 35,
                decisionsWithPropensity: 10,
                propensityCoverage: 10 / 35,
            },
            jobStats: { deadLetter: 1 },
        });

        expect(control.mode).toBe('safe_heuristic_fallback');
        expect(control.onlineLearningSafe).toBe(false);
        expect(control.blockers.join(' ')).toMatch(/Dead-letter|Reward attribution|propensity/i);
    });
});
