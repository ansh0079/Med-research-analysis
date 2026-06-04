const {
    parsePreviousQueries,
    parseParsedStudyTypes,
    parseParsedYearFilters,
    parseProcessedQuery,
    filterRelevantArticles,
    yearInFilters,
} = require('../../server/services/searchPipeline');
const { buildEvidenceBouquet, isOffTopic, meshRelevanceRatio, queryMatchScore } = require('../../server/services/evidenceBouquetService');
const {
    appendPubMedPublicationFilters,
    publicationTypeClause,
} = require('../../server/services/unifiedEvidenceSearch');

describe('searchPipeline helpers', () => {
    test('parsePreviousQueries accepts JSON array strings', () => {
        expect(parsePreviousQueries('["sepsis","fluids"]')).toEqual(['sepsis', 'fluids']);
        expect(parsePreviousQueries('not-json')).toEqual([]);
    });

    test('parseParsedStudyTypes accepts publication type clauses', () => {
        const types = ['"Randomized Controlled Trial"[Publication Type]'];
        expect(parseParsedStudyTypes(JSON.stringify(types))).toEqual(types);
    });

    test('parseProcessedQuery only accepts bounded PubMed-shaped queries', () => {
        expect(parseProcessedQuery('(heart failure[tiab]) AND english[lang]')).toBe('(heart failure[tiab]) AND english[lang]');
        expect(parseProcessedQuery('plain user text')).toBeNull();
        expect(parseProcessedQuery('a'.repeat(701) + '[tiab]')).toBeNull();
    });

    test('parseParsedYearFilters accepts safe PubMed date filters', () => {
        expect(parseParsedYearFilters('["2020:2024[PDAT]","bad"]')).toEqual(['2020:2024[PDAT]']);
    });

    test('yearInFilters filters known publication years', () => {
        expect(yearInFilters({ pubdate: '2021' }, ['2020:2024[PDAT]'])).toBe(true);
        expect(yearInFilters({ pubdate: '2018' }, ['2020:2024[PDAT]'])).toBe(false);
        expect(yearInFilters({ title: 'unknown year' }, ['2020:2024[PDAT]'])).toBe(true);
    });

    test('filterRelevantArticles removes off-topic papers', () => {
        const articles = [
            { title: 'SGLT2 inhibitors in heart failure', abstract: 'Patients with HFrEF', pubdate: '2024', pmcrefcount: 10, pubtype: ['Journal Article'] },
            { title: 'Zebrafish kidney development', abstract: 'In vitro model', pubdate: '2024', pmcrefcount: 0, pubtype: ['Journal Article'] },
        ];
        const filtered = filterRelevantArticles(articles, {
            query: 'SGLT2 inhibitors heart failure',
            specificity: 'moderate',
            queryMeshTerms: ['Heart Failure'],
            parsedYearFilters: ['2020:2025[PDAT]'],
        });
        expect(filtered).toHaveLength(1);
        expect(filtered[0].title).toMatch(/SGLT2/i);
    });
});

describe('specificity-weighted ranking', () => {
    test('strict mode promotes stronger title and abstract query matches', () => {
        const articles = [
            {
                uid: 'generic',
                title: 'Heart failure treatment review',
                abstract: 'Broad review of adults and chronic care.',
                pubdate: '2024',
                pmcrefcount: 100,
                pubtype: ['Review'],
            },
            {
                uid: 'specific',
                title: 'SGLT2 inhibitors in heart failure',
                abstract: 'Randomized trial of SGLT2 inhibitors for heart failure outcomes.',
                pubdate: '2024',
                pmcrefcount: 100,
                pubtype: ['Randomized Controlled Trial'],
            },
        ];
        expect(queryMatchScore(articles[1], 'SGLT2 inhibitors heart failure')).toBeGreaterThan(queryMatchScore(articles[0], 'SGLT2 inhibitors heart failure'));
        const bouquet = buildEvidenceBouquet(articles, 'SGLT2 inhibitors heart failure', { count: 2, specificity: 'strict' });
        expect(bouquet.topPapers[0].uid).toBe('specific');
        expect(bouquet.ranking[0].reasons).toContain('Strong query match');
    });
});

describe('MeSH-aware relevance', () => {
    test('meshRelevanceRatio detects canonical terms in abstract', () => {
        const ratio = meshRelevanceRatio('patients with heart failure and reduced ejection fraction', ['Heart Failure', 'Diabetes Mellitus']);
        expect(ratio).toBeGreaterThan(0);
    });

    test('isOffTopic accepts paper matching MeSH expansion with partial text overlap', () => {
        const article = {
            title: 'Empagliflozin outcomes in chronic heart failure',
            abstract: 'This trial enrolled adults with heart failure and reduced ejection fraction.',
            pubdate: '2023',
            pmcrefcount: 40,
        };
        expect(isOffTopic(article, 'SGLT2 inhibitors heart failure', { queryMeshTerms: ['Heart Failure'] })).toBe(false);
    });

    test('isOffTopic rejects unrelated paper even with loose keywords', () => {
        const article = {
            title: 'Soil microbiome nitrogen cycling in agriculture',
            abstract: 'Field experiments across temperate climates.',
            pubdate: '2022',
            pmcrefcount: 12,
        };
        expect(isOffTopic(article, 'SGLT2 inhibitors heart failure', { queryMeshTerms: ['Heart Failure'] })).toBe(true);
    });
});

describe('PubMed publication filters', () => {
    test('publicationTypeClause wraps plain labels', () => {
        expect(publicationTypeClause('Systematic Review')).toBe('"Systematic Review"[Publication Type]');
    });

    test('appendPubMedPublicationFilters adds strict human and english filters', () => {
        const q = appendPubMedPublicationFilters('metformin PCOS', 'strict', [], ['2020:2024[PDAT]']);
        expect(q).toContain('metformin PCOS');
        expect(q).toContain('Randomized Controlled Trial');
        expect(q).toContain('humans[MeSH Terms]');
        expect(q).toContain('english[lang]');
        expect(q).toContain('2020:2024[PDAT]');
    });
});
