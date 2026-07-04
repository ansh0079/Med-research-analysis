const {
    parsePreviousQueries,
    parseParsedStudyTypes,
    parseParsedYearFilters,
    inferServerQueryHints,
    annotateSearchRankMetadata,
    filterRelevantArticles,
    matchesPicoInterventionComparator,
    mergeRerankedWithRemainder,
    normalizePicoProfileForReranker,
    yearInFilters,
} = require('../../server/services/searchPipeline');
const {
    buildEvidenceBouquet,
    classifyArchetype,
    isOffTopic,
    meshRelevanceRatio,
    queryAliasMatchScore,
    queryMatchScore,
} = require('../../server/services/evidenceBouquetService');
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

    test('inferServerQueryHints extracts lightweight study-type and date filters', () => {
        const hints = inferServerQueryHints('2020-2024 systematic review of SGLT2 inhibitors');
        expect(hints.studyTypes).toContain('"Systematic Review"[Publication Type]');
        expect(hints.yearFilters).toEqual(['2020:2024[PDAT]']);
    });

    test('curated pinned landmarks bypass brittle PICO intervention wording filters', () => {
        const pico = {
            confidence: 0.9,
            intervention: 'SGLT2 inhibitors',
            comparison: '',
        };
        const pinnedLandmark = {
            uid: 'pubmed-31535829',
            pmid: '31535829',
            _pinnedLandmark: true,
            title: 'Dapagliflozin in Patients with Heart Failure and Reduced Ejection Fraction.',
            abstract: '',
        };
        const unpinnedTitleSynonym = {
            uid: 'candidate-analysis',
            title: 'Dapagliflozin in Patients with Heart Failure and Reduced Ejection Fraction.',
            abstract: '',
        };

        expect(matchesPicoInterventionComparator(
            pinnedLandmark,
            pico,
            'SGLT2 inhibitors heart failure reduced ejection fraction randomized trial'
        )).toBe(true);
        expect(matchesPicoInterventionComparator(
            unpinnedTitleSynonym,
            pico,
            'SGLT2 inhibitors heart failure reduced ejection fraction randomized trial'
        )).toBe(false);
    });

    test('parseParsedYearFilters accepts safe PubMed date filters', () => {
        expect(parseParsedYearFilters('["2020:2024[PDAT]","bad"]')).toEqual(['2020:2024[PDAT]']);
    });

    test('yearInFilters filters known publication years', () => {
        expect(yearInFilters({ pubdate: '2021' }, ['2020:2024[PDAT]'])).toBe(true);
        expect(yearInFilters({ pubdate: '2018' }, ['2020:2024[PDAT]'])).toBe(false);
        expect(yearInFilters({ title: 'unknown year' }, ['2020:2024[PDAT]'])).toBe(true);
    });

    test('matchesPicoInterventionComparator filters clear intervention and comparator mismatches', () => {
        const pico = { intervention: 'SGLT2 inhibitor', comparison: 'placebo', confidence: 0.8 };
        expect(matchesPicoInterventionComparator({
            title: 'SGLT2 inhibitor versus placebo in heart failure',
            abstract: 'Adults were randomized to SGLT2 inhibitor or placebo.',
        }, pico, 'SGLT2 inhibitor vs placebo')).toBe(true);
        expect(matchesPicoInterventionComparator({
            title: 'Beta blockers in heart failure',
            abstract: 'Adults received beta blockers.',
        }, pico, 'SGLT2 inhibitor vs placebo')).toBe(false);
    });

    test('normalizePicoProfileForReranker fills query fallback and intent', () => {
        const profile = normalizePicoProfileForReranker(
            { population: 'adults', intervention: 'steroids', confidence: 0.8 },
            'steroids ARDS mortality',
            'management'
        );
        expect(profile.population).toBe('adults');
        expect(profile.intervention).toBe('steroids');
        expect(profile.outcome).toBe('steroids ARDS mortality');
        expect(profile.queryIntent).toBe('management');
    });

    test('mergeRerankedWithRemainder preserves rerank order and appends unscored papers', () => {
        const original = [
            { uid: 'a', title: 'A' },
            { uid: 'b', title: 'B' },
            { uid: 'c', title: 'C' },
        ];
        const reranked = [
            { uid: 'b', title: 'B', _rerank: { overallScore: 0.9 } },
        ];
        expect(mergeRerankedWithRemainder(reranked, original, 3).map((a) => a.uid)).toEqual(['b', 'a', 'c']);
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

    test('filterRelevantArticles keeps trial-alias hits with historic title wording', () => {
        const articles = [
            {
                title: 'Angiotensin-neprilysin inhibition versus enalapril in heart failure',
                abstract: '',
                authors: [{ name: 'PARADIGM-HF Investigators' }],
                pubdate: '2014',
                pubtype: ['Randomized Controlled Trial'],
            },
        ];
        const filtered = filterRelevantArticles(articles, {
            query: 'sacubitril valsartan heart failure reduced ejection fraction mortality',
            queryAliases: ['PARADIGM-HF'],
        });
        expect(filtered).toHaveLength(1);
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

    test('RCT EBM score classifies as a trial rather than a review', () => {
        expect(classifyArchetype({
            title: 'Treatment effect in a randomized trial',
            abstract: 'Patients received therapy and outcomes were measured.',
            pubdate: '2020',
            pubtype: ['Randomized Controlled Trial'],
            _ebmScore: 6,
        })).toBe('management_trial');
    });

    test('high-signal trial aliases boost landmark trial ranking', () => {
        const landmark = {
            uid: 'landmark',
            title: 'Dapagliflozin in patients with heart failure and reduced ejection fraction',
            abstract: 'Patients were enrolled with heart failure and reduced ejection fraction.',
            authors: [{ name: 'DAPA-HF Trial Committees and Investigators' }],
            pubdate: '2019',
            journal: 'N Engl J Med',
            pubtype: ['Randomized Controlled Trial'],
            _ebmScore: 6,
        };
        const secondary = {
            uid: 'secondary',
            title: 'Dapagliflozin and kidney outcomes in patients with heart failure',
            abstract: 'A recent secondary analysis of a randomized trial in patients with heart failure.',
            pubdate: '2024',
            journal: 'JAMA',
            pmcrefcount: 40,
            pubtype: ['Randomized Controlled Trial'],
            _ebmScore: 6,
        };

        expect(queryAliasMatchScore(landmark, ['DAPA-HF', 'dapagliflozin'])).toBeGreaterThan(0);
        expect(queryAliasMatchScore(secondary, ['DAPA-HF', 'dapagliflozin'])).toBe(0);

        const bouquet = buildEvidenceBouquet(
            [secondary, landmark],
            'SGLT2 inhibitors heart failure reduced ejection fraction randomized trial',
            { count: 2, specificity: 'moderate', queryAliases: ['DAPA-HF', 'dapagliflozin'] }
        );

        expect(bouquet.topPapers[0].uid).toBe('landmark');
        expect(bouquet.ranking[0].reasons).toContain('Trial alias match');
        expect(bouquet.ranking[0].reasons).toContain('Top-tier journal');
    });

    test('bouquet keeps alias-matched landmark titles that differ from modern drug names', () => {
        const bouquet = buildEvidenceBouquet([
            {
                uid: 'paradigm',
                title: 'Angiotensin-neprilysin inhibition versus enalapril in heart failure',
                authors: [{ name: 'PARADIGM-HF Investigators and Committees' }],
                pubdate: '2014',
                journal: 'N Engl J Med',
                pubtype: ['Randomized Controlled Trial'],
                _ebmScore: 6,
            },
        ], 'sacubitril valsartan heart failure reduced ejection fraction mortality', {
            count: 1,
            queryAliases: ['PARADIGM-HF'],
        });

        expect(bouquet.topPapers.map((a) => a.uid)).toEqual(['paradigm']);
    });
});

describe('rank metadata annotation', () => {
    test('attaches evidence rank, learning rank, and rank reasons to returned articles', () => {
        const articles = [
            { uid: 'b', title: 'Second article', _learningBoost: 1.2 },
            { uid: 'a', title: 'First article' },
        ];
        const ranking = [
            { uid: 'a', compositeScore: 91, archetype: 'guideline', citations: 500, year: 2024, reasons: ['Clinical guideline'] },
            { uid: 'b', compositeScore: 88, archetype: 'rct', citations: 120, year: 2023, reasons: ['Well cited'] },
        ];

        const annotated = annotateSearchRankMetadata(articles, ranking);

        expect(annotated[0]).toMatchObject({
            uid: 'b',
            _evidenceRank: 2,
            _learningRank: 1,
            _rankMovedByLearning: true,
        });
        expect(annotated[0]._rankReasons).toContain('Well cited');
        expect(annotated[0]._rankReasons).toContain('Personalized for your learning gaps');
        expect(annotated[1]._rankMovedByLearning).toBe(true);
        expect(annotated[1]._ranking.archetype).toBe('guideline');
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
