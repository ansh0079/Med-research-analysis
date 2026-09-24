'use strict';

/**
 * Search pipeline integration test with mocked external APIs.
 * Exercises fetch → filter → bouquet → (optional) learning annotation
 * without hitting live PubMed/OpenAlex.
 */

jest.mock('../../server/services/unifiedEvidenceSearch', () => {
    const actual = jest.requireActual('../../server/services/unifiedEvidenceSearch');
    return {
        ...actual,
        fetchUnifiedEvidence: jest.fn(),
        decomposePico: jest.fn(async () => null),
    };
});

jest.mock('../../server/services/articleReranker', () => ({
    rerankArticlesByPico: jest.fn(async (articles) => articles.map((article) => ({
        ...article,
        _rerank: { overallScore: article.uid === 'pubmed-3' ? 1 : 0 },
    })).sort((a, b) => b._rerank.overallScore - a._rerank.overallScore)),
    selectTopRerankedArticles: jest.fn((articles) => articles.slice(0, 10)),
}));

const { fetchUnifiedEvidence, decomposePico } = require('../../server/services/unifiedEvidenceSearch');
const { fetchAndRankSearchArticles } = require('../../server/services/searchPipeline');

function article({ uid, title, pmid, ebm = 6, pubtype = ['Randomized Controlled Trial'], journal = 'N Engl J Med', citations = 200 }) {
    return {
        uid: `pubmed-${uid}`,
        pmid: String(pmid || uid),
        title,
        abstract: `${title}. Patients were enrolled and outcomes measured.`,
        pubdate: '2020',
        year: 2020,
        journal,
        pubtype,
        _source: 'pubmed',
        _ebmScore: ebm,
        _isPreprint: false,
        pmcrefcount: citations,
        citationCount: citations,
    };
}

describe('searchPipeline integration (mocked APIs)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.SEARCH_PICO_RERANK_ENABLED = 'false';
    });

    test('ranks topical landmark RCT above off-topic review through full pipeline', async () => {
        const landmark = article({
            uid: '31535829',
            pmid: '31535829',
            title: 'Dapagliflozin in patients with heart failure and reduced ejection fraction',
            citations: 1200,
            journal: 'N Engl J Med',
        });
        landmark._pinnedLandmark = true;
        const offTopic = article({
            uid: '999',
            pmid: '999',
            title: 'Global burden of bacterial antimicrobial resistance',
            ebm: 7,
            pubtype: ['Journal Article', 'Meta-Analysis'],
            citations: 5000,
            journal: 'The Lancet',
        });

        fetchUnifiedEvidence.mockImplementation(async ({ telemetry }) => {
            if (telemetry && typeof telemetry === 'object') {
                telemetry.clinicalAliases = ['DAPA-HF', 'dapagliflozin'];
                telemetry.meshExpansions = [];
            }
            return [offTopic, landmark];
        });

        const db = {
            normalizeTopic: (t) => String(t || '').toLowerCase(),
            listTeachingObjectsForTopic: jest.fn(async () => []),
            listTeachingObjectClaimsForTopic: jest.fn(async () => []),
            listPersonalizationArmStates: jest.fn(async () => []),
        };

        const result = await fetchAndRankSearchArticles({
            query: 'SGLT2 inhibitors heart failure reduced ejection fraction randomized trial',
            safeLimit: 5,
            sourceList: ['pubmed'],
            serverConfig: { keys: {} },
            fetchImpl: jest.fn(),
            db,
            userId: null,
            sessionId: 'test-session',
            previousQueries: [],
            specificity: 'moderate',
        });

        expect(fetchUnifiedEvidence).toHaveBeenCalled();
        expect(result.articles.length).toBeGreaterThan(0);
        expect(result.articles[0].pmid).toBe('31535829');
        expect(result.queryIntent).toBeTruthy();
        expect(Array.isArray(result.bouquetRanking)).toBe(true);
    });

    test('returns empty articles when fetch yields none', async () => {
        fetchUnifiedEvidence.mockImplementation(async ({ telemetry }) => {
            if (telemetry && typeof telemetry === 'object') {
                telemetry.clinicalAliases = [];
                telemetry.meshExpansions = [];
            }
            return [];
        });

        const result = await fetchAndRankSearchArticles({
            query: 'unlikely empty topic xyzzy',
            safeLimit: 5,
            sourceList: ['pubmed'],
            serverConfig: { keys: {} },
            fetchImpl: jest.fn(),
            db: {
                listTeachingObjectsForTopic: jest.fn(async () => []),
                listTeachingObjectClaimsForTopic: jest.fn(async () => []),
                listPersonalizationArmStates: jest.fn(async () => []),
            },
            userId: null,
            sessionId: null,
            previousQueries: [],
            specificity: 'moderate',
        });

        expect(result.articles).toEqual([]);
    });

    test('PICO can promote a candidate outside the first-pass display cutoff', async () => {
        process.env.SEARCH_PICO_RERANK_ENABLED = 'true';
        decomposePico.mockResolvedValue({ population: 'heart failure', intervention: '', confidence: 0.9 });
        fetchUnifiedEvidence.mockResolvedValue([
            article({ uid: '1', title: 'SGLT2 therapy for heart failure outcomes', citations: 1000 }),
            article({ uid: '2', title: 'ARNI treatment for chronic heart failure', citations: 500 }),
            article({ uid: '3', title: 'Mechanical support therapy in advanced heart failure', citations: 1 }),
        ]);
        const result = await fetchAndRankSearchArticles({
            query: 'heart failure therapy', safeLimit: 2, sourceList: ['pubmed'],
            serverConfig: { keys: {} }, fetchImpl: jest.fn(),
            db: {
                listTeachingObjectsForTopic: jest.fn(async () => []),
                listTeachingObjectClaimsForTopic: jest.fn(async () => []),
                listPersonalizationArmStates: jest.fn(async () => []),
            },
            userId: null, sessionId: null, previousQueries: [], specificity: 'moderate',
        });
        expect(result.telemetry.picoRerank.candidateCount).toBe(3);
        expect(result.articles).toHaveLength(2);
        expect(result.articles.map((row) => row.uid)).toContain('pubmed-3');
    });
});
