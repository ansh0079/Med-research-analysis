const {
    evaluateSearchResults,
    summarizeSearchEval,
    articleMatchesType,
} = require('../../server/services/searchQualityEvalService');

describe('searchQualityEvalService', () => {
    test('computes precision, recall, off-topic rate, and type coverage at k', () => {
        const spec = {
            query: 'sglt2 heart failure reduced ejection fraction rct',
            relevantUids: ['pmid-1', 'pmid-3', 'pmid-9'],
            offTopicUids: ['pmid-2'],
            requiredTypes: ['randomized controlled trial', 'guideline'],
            k: 4,
        };
        const articles = [
            { uid: 'pmid-1', pubtype: ['Randomized Controlled Trial'] },
            { uid: 'pmid-2', pubtype: ['Review'] },
            { uid: 'pmid-3', pubtype: ['Practice Guideline'] },
            { uid: 'pmid-4', pubtype: ['Editorial'] },
            { uid: 'pmid-9', pubtype: ['Randomized Controlled Trial'] },
        ];

        const metrics = evaluateSearchResults(spec, articles);

        expect(metrics.precisionAtK).toBe(0.5);
        expect(metrics.recallAtK).toBeCloseTo(2 / 3);
        expect(metrics.offTopicRateAtK).toBe(0.25);
        expect(metrics.mrr).toBe(1);
        expect(metrics.ndcgAtK).toBeGreaterThan(0);
        expect(metrics.requiredTypeCoverage).toBe(1);
        expect(metrics.missingRelevantUids).toEqual(['9']);
    });

    test('summarizes failing queries for launch review', () => {
        const rows = [
            { query: 'good', precisionAtK: 0.8, recallAtK: 0.6, offTopicRateAtK: 0, requiredTypeCoverage: 1 },
            { query: 'too broad', precisionAtK: 0.3, recallAtK: 0.2, offTopicRateAtK: 0.4, requiredTypeCoverage: 0.5 },
        ];

        const summary = summarizeSearchEval(rows);

        expect(summary.queryCount).toBe(2);
        expect(summary.failingQueries).toEqual(['too broad']);
        expect(summary.offTopicRateAtK).toBeCloseTo(0.2);
    });

    test('matches study types across local article fields', () => {
        expect(articleMatchesType({ archetype: 'landmark_rct' }, 'rct')).toBe(true);
        expect(articleMatchesType({ studyDesign: 'Systematic Review' }, 'systematic review')).toBe(true);
    });
});
