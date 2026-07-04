'use strict';

const {
    evaluateSearchResults,
    summarizeSearchEval,
    articleMatchesType,
} = require('../../server/services/searchQualityEvalService');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeArticles(uids) {
    return uids.map((uid) => ({ uid, pmid: uid, pubtype: [] }));
}

function makeSpec(overrides = {}) {
    return {
        query: 'test query',
        k: 5,
        relevantUids: ['a', 'b', 'c'],
        offTopicUids: [],
        requiredTypes: [],
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// articleMatchesType
// ---------------------------------------------------------------------------

describe('articleMatchesType', () => {
    test('matches by pubtype array (case-insensitive)', () => {
        expect(articleMatchesType({ pubtype: ['Randomized Controlled Trial'] }, 'randomized controlled trial')).toBe(true);
    });

    test('matches by archetype field', () => {
        expect(articleMatchesType({ archetype: 'landmark_rct' }, 'rct')).toBe(true);
        expect(articleMatchesType({ archetype: 'recent_review' }, 'review')).toBe(true);
    });

    test('matches by studyDesign field', () => {
        expect(articleMatchesType({ studyDesign: 'Systematic Review' }, 'systematic review')).toBe(true);
    });

    test('returns true when no type required', () => {
        expect(articleMatchesType({ pubtype: [] }, '')).toBe(true);
    });

    test('returns false when type not present', () => {
        expect(articleMatchesType({ pubtype: ['Case Report'] }, 'meta-analysis')).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Original integration test (kept intact)
// ---------------------------------------------------------------------------

describe('searchQualityEvalService — original tests', () => {
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
            { query: 'good', precisionAtK: 0.1, recallAtK: 1, offTopicRateAtK: 0, requiredTypeCoverage: 1 },
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

// ---------------------------------------------------------------------------
// Precision / Recall
// ---------------------------------------------------------------------------

describe('evaluateSearchResults — precision and recall', () => {
    test('perfect precision and recall when all top-K are relevant', () => {
        const spec = makeSpec({ relevantUids: ['a', 'b', 'c'], k: 3 });
        const result = evaluateSearchResults(spec, makeArticles(['a', 'b', 'c']));

        expect(result.precisionAtK).toBe(1);
        expect(result.recallAtK).toBe(1);
        expect(result.offTopicRateAtK).toBe(0);
        expect(result.relevantHits).toBe(3);
    });

    test('zero precision when no relevant articles retrieved', () => {
        const spec = makeSpec({ relevantUids: ['a', 'b'], k: 3 });
        const result = evaluateSearchResults(spec, makeArticles(['x', 'y', 'z']));

        expect(result.precisionAtK).toBe(0);
        expect(result.recallAtK).toBe(0);
        expect(result.relevantHits).toBe(0);
        expect(result.missingRelevantUids).toEqual(expect.arrayContaining(['a', 'b']));
    });

    test('respects k — relevant article beyond cutoff does not count', () => {
        const spec = makeSpec({ relevantUids: ['c'], k: 2 });
        const result = evaluateSearchResults(spec, makeArticles(['a', 'b', 'c']));

        expect(result.relevantHits).toBe(0);
        expect(result.recallAtK).toBe(0);
    });

    test('partial recall when some relevant articles are missing', () => {
        const spec = makeSpec({ relevantUids: ['a', 'b', 'c'], k: 5 });
        const result = evaluateSearchResults(spec, makeArticles(['a', 'x', 'b', 'y', 'z']));

        expect(result.relevantHits).toBe(2);
        expect(result.recallAtK).toBeCloseTo(2 / 3, 5);
        expect(result.missingRelevantUids).toContain('c');
    });

    test('detects off-topic articles', () => {
        const spec = makeSpec({ relevantUids: ['a'], offTopicUids: ['z'], k: 3 });
        const result = evaluateSearchResults(spec, makeArticles(['a', 'b', 'z']));

        expect(result.offTopicHits).toBe(1);
        expect(result.offTopicRateAtK).toBeCloseTo(1 / 3, 5);
    });
});

// ---------------------------------------------------------------------------
// MRR
// ---------------------------------------------------------------------------

describe('evaluateSearchResults — MRR', () => {
    test('MRR = 1 when first result is relevant', () => {
        const spec = makeSpec({ relevantUids: ['a'], k: 5 });
        expect(evaluateSearchResults(spec, makeArticles(['a', 'b', 'c'])).mrr).toBe(1);
    });

    test('MRR = 0.5 when first relevant result is at rank 2', () => {
        const spec = makeSpec({ relevantUids: ['b'], k: 5 });
        expect(evaluateSearchResults(spec, makeArticles(['x', 'b', 'c'])).mrr).toBeCloseTo(0.5, 5);
    });

    test('MRR = 1/3 when first relevant result is at rank 3', () => {
        const spec = makeSpec({ relevantUids: ['c'], k: 5 });
        expect(evaluateSearchResults(spec, makeArticles(['x', 'y', 'c'])).mrr).toBeCloseTo(1 / 3, 5);
    });

    test('MRR = 0 when no relevant results', () => {
        const spec = makeSpec({ relevantUids: ['z'], k: 5 });
        expect(evaluateSearchResults(spec, makeArticles(['a', 'b', 'c'])).mrr).toBe(0);
    });

    test('MRR uses first relevant hit only (not best)', () => {
        const spec = makeSpec({ relevantUids: ['a', 'b'], k: 5 });
        // 'b' is first relevant at rank 2, 'a' is at rank 4
        const result = evaluateSearchResults(spec, makeArticles(['x', 'b', 'y', 'a', 'z']));
        expect(result.mrr).toBeCloseTo(0.5, 5);
    });
});

// ---------------------------------------------------------------------------
// nDCG
// ---------------------------------------------------------------------------

describe('evaluateSearchResults — nDCG', () => {
    test('nDCG = 1 when results are in ideal order', () => {
        const spec = makeSpec({ relevantUids: ['a', 'b'], k: 3 });
        expect(evaluateSearchResults(spec, makeArticles(['a', 'b', 'x'])).ndcgAtK).toBe(1);
    });

    test('nDCG < 1 when relevant results are not in top positions', () => {
        const spec = makeSpec({ relevantUids: ['a', 'b'], k: 4 });
        const result = evaluateSearchResults(spec, makeArticles(['x', 'y', 'a', 'b']));
        expect(result.ndcgAtK).toBeGreaterThan(0);
        expect(result.ndcgAtK).toBeLessThan(1);
    });

    test('nDCG = 0 when no relevant results', () => {
        const spec = makeSpec({ relevantUids: ['z'], k: 3 });
        expect(evaluateSearchResults(spec, makeArticles(['a', 'b', 'c'])).ndcgAtK).toBe(0);
    });

    test('better ordering produces strictly higher nDCG', () => {
        const spec = makeSpec({ relevantUids: ['a', 'b'], k: 4 });
        const good = evaluateSearchResults(spec, makeArticles(['a', 'b', 'x', 'y']));
        const bad = evaluateSearchResults(spec, makeArticles(['x', 'y', 'a', 'b']));
        expect(good.ndcgAtK).toBeGreaterThan(bad.ndcgAtK);
    });
});

// ---------------------------------------------------------------------------
// requiredTypes coverage
// ---------------------------------------------------------------------------

describe('evaluateSearchResults — requiredTypes', () => {
    test('full coverage when all required types are present', () => {
        const spec = makeSpec({ requiredTypes: ['meta-analysis', 'guideline'], k: 5 });
        const articles = [
            { uid: 'a', pubtype: ['Meta-Analysis'] },
            { uid: 'b', pubtype: ['Practice Guideline'] },
            { uid: 'c', pubtype: ['Case Report'] },
        ];
        expect(evaluateSearchResults(spec, articles).requiredTypeCoverage).toBe(1);
    });

    test('partial coverage when only some required types are present', () => {
        const spec = makeSpec({ requiredTypes: ['meta-analysis', 'randomized controlled trial'], k: 5 });
        const articles = [
            { uid: 'a', pubtype: ['Meta-Analysis'] },
            { uid: 'b', pubtype: ['Case Report'] },
        ];
        expect(evaluateSearchResults(spec, articles).requiredTypeCoverage).toBe(0.5);
    });

    test('coverage = 1 when no types required', () => {
        const spec = makeSpec({ requiredTypes: [], k: 5 });
        expect(evaluateSearchResults(spec, makeArticles(['a', 'b'])).requiredTypeCoverage).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// summarizeSearchEval
// ---------------------------------------------------------------------------

describe('summarizeSearchEval', () => {
    test('averages metrics across multiple eval rows', () => {
        const rows = [
            { precisionAtK: 0.8, recallAtK: 0.6, offTopicRateAtK: 0.1, mrr: 1, ndcgAtK: 0.9, requiredTypeCoverage: 1, query: 'q1' },
            { precisionAtK: 0.4, recallAtK: 0.2, offTopicRateAtK: 0.3, mrr: 0.5, ndcgAtK: 0.5, requiredTypeCoverage: 0.5, query: 'q2' },
        ];
        const summary = summarizeSearchEval(rows);

        expect(summary.queryCount).toBe(2);
        expect(summary.precisionAtK).toBeCloseTo(0.6, 5);
        expect(summary.recallAtK).toBeCloseTo(0.4, 5);
        expect(summary.mrr).toBeCloseTo(0.75, 5);
        expect(summary.ndcgAtK).toBeCloseTo(0.7, 5);
    });

    test('identifies all failing query types', () => {
        const rows = [
            { precisionAtK: 0.1, recallAtK: 1, offTopicRateAtK: 0.05, mrr: 1, ndcgAtK: 0.9, requiredTypeCoverage: 1, query: 'good' },
            { precisionAtK: 0.1, recallAtK: 0.3, offTopicRateAtK: 0.05, mrr: 0.5, ndcgAtK: 0.5, requiredTypeCoverage: 1, query: 'low-recall' },
            { precisionAtK: 0.1, recallAtK: 1, offTopicRateAtK: 0.25, mrr: 1, ndcgAtK: 0.9, requiredTypeCoverage: 1, query: 'high-off-topic' },
            { precisionAtK: 0.1, recallAtK: 1, offTopicRateAtK: 0.05, mrr: 1, ndcgAtK: 0.9, requiredTypeCoverage: 0.5, query: 'missing-type' },
        ];
        const summary = summarizeSearchEval(rows);

        expect(summary.failingQueries).toContain('low-recall');
        expect(summary.failingQueries).toContain('high-off-topic');
        expect(summary.failingQueries).toContain('missing-type');
        expect(summary.failingQueries).not.toContain('good');
    });

    test('returns zero summary for empty input', () => {
        const summary = summarizeSearchEval([]);
        expect(summary.queryCount).toBe(0);
        expect(summary.precisionAtK).toBe(0);
        expect(summary.mrr).toBe(0);
        expect(summary.failingQueries).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// UID normalization
// ---------------------------------------------------------------------------

describe('evaluateSearchResults — UID normalization', () => {
    test('strips pubmed: prefix from article UIDs', () => {
        const spec = makeSpec({ relevantUids: ['12345678'], k: 3 });
        const articles = [{ uid: 'pubmed:12345678', pmid: null }];
        expect(evaluateSearchResults(spec, articles).relevantHits).toBe(1);
    });

    test('strips pmid prefix from relevantUids', () => {
        const spec = makeSpec({ relevantUids: ['pmid:12345678'], k: 3 });
        const articles = [{ uid: '12345678' }];
        expect(evaluateSearchResults(spec, articles).relevantHits).toBe(1);
    });
});
