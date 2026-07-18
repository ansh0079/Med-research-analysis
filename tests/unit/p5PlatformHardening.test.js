'use strict';

const path = require('path');
const { execFileSync } = require('child_process');
const {
    buildProductionReadinessSummary,
    evaluateLearningSignals,
} = require('../../server/services/productionObservabilityService');

describe('P5 learning signal observability', () => {
    test('evaluateLearningSignals flags empty pipeline', () => {
        const alerts = [];
        const result = evaluateLearningSignals({ totalLearningSignals: 0 }, alerts);
        expect(result.status).toBe('insufficient_data');
        expect(result.checks[0].label).toBe('Learning signals');
    });

    test('evaluateLearningSignals watches low propensity coverage', () => {
        const alerts = [];
        const result = evaluateLearningSignals({
            totalLearningSignals: 100,
            interactionTotal: 40,
            searchRankingDecisions: 50,
            decisionsWithPropensity: 10,
            propensityCoverage: 0.2,
            quizSignals: 10,
        }, alerts);
        expect(result.status).toBe('watch');
        expect(result.checks.some((c) => /propensit/i.test(c.message))).toBe(true);
        expect(alerts.some((a) => a.area === 'learningSignals')).toBe(true);
    });

    test('buildProductionReadinessSummary includes learningSignals section', () => {
        const summary = buildProductionReadinessSummary({
            windowDays: 7,
            qualityMetrics: {
                search: { sampleSize: 25, noClickRate: 0.22, lowRecallQueryCount: 1 },
                synthesis: { citationValidationPassRate: 0.96, citationValidationSample: 20 },
            },
            rewardStats: {
                totalSignals: 40,
                attributedSignals: 34,
                skippedSignals: 6,
                attributionRate: 0.85,
            },
            jobStats: {
                queued: 1, running: 0, completed: 20, failed: 1, deadLetter: 0, total: 22,
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
                totalLearningSignals: 120,
                interactionTotal: 60,
                searchRankingDecisions: 40,
                decisionsWithPropensity: 36,
                propensityCoverage: 0.9,
                quizSignals: 20,
            },
            slo: {
                rolling: [
                    { slo: 'search_latency_p95', total: 20, ok: true, successRate: 0.98 },
                    { slo: 'synopsis_success_rate', total: 20, ok: true, successRate: 0.97 },
                ],
            },
        });

        expect(summary.sections.learningSignals).toBeDefined();
        expect(summary.sections.learningSignals.status).toBe('healthy');
        // 6 sections healthy → score 100
        expect(summary.status).toBe('healthy');
    });
});

describe('P5 service boundary checker', () => {
    test('check-service-boundaries exits 0 on current tree', () => {
        const script = path.join(__dirname, '../../tools/check-service-boundaries.js');
        const stdout = execFileSync(process.execPath, [script], {
            encoding: 'utf8',
            cwd: path.join(__dirname, '../..'),
        });
        expect(stdout).toMatch(/passed/i);
    });
});
