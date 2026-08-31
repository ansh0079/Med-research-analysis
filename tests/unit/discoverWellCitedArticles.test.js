const { normalizeTopicForQuery, isReviewType, rankCandidates } = require('../../server/scripts/discoverWellCitedArticles');

describe('discoverWellCitedArticles helpers', () => {
    describe('normalizeTopicForQuery', () => {
        test('strips a colon subtitle', () => {
            expect(normalizeTopicForQuery('Malaria: P. falciparum vs non-falciparum')).toBe('Malaria');
        });

        test('strips a parenthetical', () => {
            expect(normalizeTopicForQuery('Plaque psoriasis biologic therapy (IL-17/IL-23 inhibitors)'))
                .toBe('Plaque psoriasis biologic therapy');
        });

        test('leaves a plain topic unchanged', () => {
            expect(normalizeTopicForQuery('sepsis')).toBe('sepsis');
        });
    });

    describe('isReviewType', () => {
        test('detects a review publication type case-insensitively', () => {
            expect(isReviewType({ publicationTypes: ['Systematic Review'] })).toBe(true);
            expect(isReviewType({ publicationTypes: ['REVIEW'] })).toBe(true);
        });

        test('returns false for a non-review type', () => {
            expect(isReviewType({ publicationTypes: ['Journal Article'] })).toBe(false);
        });

        test('returns false when publicationTypes is missing', () => {
            expect(isReviewType({})).toBe(false);
        });
    });

    describe('rankCandidates', () => {
        const paper = (over) => ({
            title: 'Some paper', year: 2020, citationCount: 50,
            journal: { name: 'J' }, externalIds: { DOI: '10.1/x', PubMed: '123' },
            publicationTypes: ['Journal Article'], ...over,
        });

        test('filters out papers below the citation floor', () => {
            const out = rankCandidates([paper({ citationCount: 5 }), paper({ citationCount: 100 })]);
            expect(out).toHaveLength(1);
            expect(out[0].citationCount).toBe(100);
        });

        test('never filters a PubMed-fallback paper with a null citation count', () => {
            const out = rankCandidates([paper({ citationCount: null, uncitationRanked: true })]);
            expect(out).toHaveLength(1);
            expect(out[0].citationCount).toBeNull();
            expect(out[0].citationRanked).toBe(false);
        });

        test('ranks reviews above non-reviews regardless of citation count', () => {
            const review = paper({ citationCount: 30, publicationTypes: ['Review'] });
            const nonReview = paper({ citationCount: 500, publicationTypes: ['Journal Article'] });
            const out = rankCandidates([nonReview, review]);
            expect(out[0].isReview).toBe(true);
        });

        test('caps output at 5 candidates', () => {
            const many = Array.from({ length: 10 }, () => paper({}));
            expect(rankCandidates(many)).toHaveLength(5);
        });
    });
});
