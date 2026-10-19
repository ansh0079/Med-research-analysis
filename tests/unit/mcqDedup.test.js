'use strict';

const { normalizeMcqStem, dedupeMcqList } = require('../../server/utils/mcqDedup');

describe('mcqDedup', () => {
    test('normalizeMcqStem strips stopwords, punctuation and case', () => {
        const a = normalizeMcqStem('A 34-year-old with severe TBI: which initial step is most appropriate?');
        const b = normalizeMcqStem('a 34 year old with severe tbi which initial step is most appropriate');
        expect(a).toBe(b);
        expect(a.length).toBeGreaterThan(8);
    });

    test('dedupeMcqList keeps first occurrence and drops exact duplicates', () => {
        const q = { question: 'In a patient with sepsis, which vasopressor is first-line?' };
        const { kept, removed } = dedupeMcqList([q, { ...q }, { question: 'A different question about asthma inhalers?' }]);
        expect(kept).toHaveLength(2);
        expect(removed).toHaveLength(1);
        expect(removed[0].reason).toBe('duplicate_stem');
    });

    test('dedupeMcqList respects pre-seeded stems from the live bank', () => {
        const seen = new Set([normalizeMcqStem('In a patient with sepsis, which vasopressor is first-line?')]);
        const { kept, removed } = dedupeMcqList([
            { question: 'In a patient with sepsis, which vasopressor is first-line?' },
        ], seen);
        expect(kept).toHaveLength(0);
        expect(removed).toHaveLength(1);
    });

    test('dedupeMcqList keeps short/empty stems untouched', () => {
        const { kept, removed } = dedupeMcqList([{ question: '' }, { question: 'A?' }, { question: 'A?' }]);
        // '' and 'A?' normalize to <8 chars, so all are kept verbatim
        expect(kept).toHaveLength(3);
        expect(removed).toHaveLength(0);
    });
});
