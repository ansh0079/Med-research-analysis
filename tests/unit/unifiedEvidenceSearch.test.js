const {
    collapseNearDuplicateTitles,
    dedupeKey,
    normalizeDoi,
} = require('../../server/services/unifiedEvidenceSearch');

describe('unifiedEvidenceSearch helpers', () => {
    test('normalizeDoi strips resolver URL', () => {
        expect(normalizeDoi('https://doi.org/10.1234/abc')).toBe('10.1234/abc');
        expect(normalizeDoi('http://dx.doi.org/10.1234/ABC')).toBe('10.1234/abc');
    });

    test('dedupeKey uses normalized DOI across formats', () => {
        const a = { doi: '10.1234/AbC', title: 'T' };
        const b = { doi: 'https://doi.org/10.1234/abc', title: 'T' };
        expect(dedupeKey(a)).toBe(dedupeKey(b));
    });

    test('collapseNearDuplicateTitles keeps first high-ranked title', () => {
        const articles = [
            {
                title: 'Long term outcomes after stent placement for coronary disease',
                pubdate: '2020',
                uid: '1',
            },
            {
                title: 'Long-term outcomes after stent placement for coronary artery disease',
                pubdate: '2020',
                uid: '2',
            },
            { title: 'Vitamin D and mortality — unrelated topic', pubdate: '2021', uid: '3' },
        ];
        const out = collapseNearDuplicateTitles(articles, { minJaccard: 0.72 });
        expect(out).toHaveLength(2);
        expect(out.map((a) => a.uid)).toEqual(['1', '3']);
    });

    test('collapseNearDuplicateTitles does not merge different years when both known', () => {
        const articles = [
            {
                title: 'Long term outcomes after stent placement for coronary disease',
                pubdate: '2020',
                uid: '1',
            },
            {
                title: 'Long-term outcomes after stent placement for coronary artery disease',
                pubdate: '2015',
                uid: '2',
            },
        ];
        const out = collapseNearDuplicateTitles(articles, { minJaccard: 0.72 });
        expect(out).toHaveLength(2);
    });
});
