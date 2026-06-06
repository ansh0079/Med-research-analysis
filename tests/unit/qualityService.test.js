const { computeQualityScore, computeScoreConfidenceInterval } = require('../../server/services/qualityService');

describe('qualityService confidence intervals', () => {
    test('adds wider interval when study design and sample size are missing', () => {
        const interval = computeScoreConfidenceInterval(42, [], [
            'Study design not identified in abstract',
            'Sample size not reported in abstract',
        ]);

        expect(interval.lower).toBeLessThan(42);
        expect(interval.upper).toBeGreaterThan(42);
        expect(interval.uncertainty).toBe('high');
        expect(interval.margin).toBeGreaterThanOrEqual(18);
    });

    test('computeQualityScore returns confidenceInterval on graded output', () => {
        const result = computeQualityScore({
            title: 'Randomized controlled trial of therapy X',
            abstract: 'We enrolled 1,200 patients in a randomized controlled trial. Primary outcome HR 0.82 (95% CI 0.71-0.94). Funding from NIHR. Conflict of interest disclosed.',
            pubtype: ['Randomized Controlled Trial'],
        });

        expect(result.score).toBeGreaterThanOrEqual(55);
        expect(result.confidenceInterval).toMatchObject({
            lower: expect.any(Number),
            upper: expect.any(Number),
            margin: expect.any(Number),
            uncertainty: expect.stringMatching(/low|moderate|high/),
        });
        expect(result.confidenceInterval.lower).toBeLessThanOrEqual(result.score);
        expect(result.confidenceInterval.upper).toBeGreaterThanOrEqual(result.score);
    });
});
