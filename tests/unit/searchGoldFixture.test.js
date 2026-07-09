'use strict';

const { loadSearchGoldFixture } = require('../../scripts/load-search-gold-fixture');
const { inferQueryCategory, evaluateSearchResults, summarizeSearchEval } = require('../../server/services/searchQualityEvalService');

describe('search gold fixture loader', () => {
    test('loads base fixture plus expansion to reach 65 queries', () => {
        const fixture = loadSearchGoldFixture('tests/fixtures/search-quality-gold.json');
        expect(fixture.queryCount).toBeGreaterThanOrEqual(65);
        expect(fixture.expansionQueryCount).toBe(25);
    });

    test('applies off-topic overrides from expansion file', () => {
        const fixture = loadSearchGoldFixture('tests/fixtures/search-quality-gold.json');
        const sglt2 = fixture.queries.find((row) => row.query.startsWith('SGLT2 inhibitors heart failure'));
        expect(sglt2?.offTopicUids).toContain('26378978');
        expect(sglt2?.category).toBe('landmark_rct');
    });
});

describe('searchQualityEvalService phase 2 metrics', () => {
    test('computes precision@5 and landmark hit flags', () => {
        const spec = {
            query: 'landmark trial',
            category: 'landmark_rct',
            relevantUids: ['111', '222'],
            offTopicUids: ['999'],
            k: 10,
        };
        const articles = [
            { uid: '111' },
            { uid: '999' },
            { uid: '333' },
            { uid: '222' },
        ];
        const metrics = evaluateSearchResults(spec, articles, { k: 10 });
        expect(metrics.precisionAt5).toBeCloseTo(0.5, 5);
        expect(metrics.landmarkHit).toBe(true);
        expect(metrics.offTopicHits).toBe(1);
    });

    test('summarizes landmark and guideline hit rates', () => {
        const summary = summarizeSearchEval([
            { query: 'a', category: 'landmark_rct', recallAtK: 1, offTopicRateAtK: 0, requiredTypeCoverage: 1, landmarkHit: true, anyRelevantHit: true, precisionAt5: 0.2, mrr: 1, ndcgAtK: 1, recallProxy: 1 },
            { query: 'b', category: 'landmark_rct', recallAtK: 0, offTopicRateAtK: 0.1, requiredTypeCoverage: 1, landmarkHit: false, anyRelevantHit: false, precisionAt5: 0, mrr: 0, ndcgAtK: 0, recallProxy: 0 },
            { query: 'c', category: 'guideline', recallAtK: 1, offTopicRateAtK: 0, requiredTypeCoverage: 1, guidelineHit: true, anyRelevantHit: true, precisionAt5: 0.2, mrr: 1, ndcgAtK: 1, recallProxy: 1 },
        ]);
        expect(summary.landmarkHitRate).toBeCloseTo(0.5, 5);
        expect(summary.guidelineHitRate).toBeCloseTo(1, 5);
        expect(summary.landmarkMisses).toEqual(['b']);
    });

    test('infers category from required types when omitted', () => {
        expect(inferQueryCategory({ requiredTypes: ['guideline'] })).toBe('guideline');
        expect(inferQueryCategory({ requiredTypes: ['meta-analysis'] })).toBe('meta_analysis');
        expect(inferQueryCategory({ requiredTypes: ['randomized controlled trial'] })).toBe('landmark_rct');
    });
});
