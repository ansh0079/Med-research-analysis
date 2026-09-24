'use strict';

/**
 * Parallel evidence-lane retrieval: each lane gets its own type-filtered PubMed query,
 * merged and de-duplicated with the broad query; a lane failure never fails the search.
 */

const mockPubmedSearch = jest.fn();
jest.mock('../../server/services/externalApiProxy', () => ({
    buildProxyService: () => ({
        meshSuggest: async () => [],
        pubmedSearch: (...args) => mockPubmedSearch(...args),
        pubmedFetchByIds: async () => [],
    }),
}));

const { fetchUnifiedEvidence } = require('../../server/services/unifiedEvidenceSearch/fetchOrchestrator');
const { buildLaneQueries, laneResultLimit, laneRetrievalEnabled } = require('../../server/services/unifiedEvidenceSearch/laneQueries');

const paper = (pmid, title) => ({ uid: `pubmed-${pmid}`, pmid, title, abstract: `${title} abstract`, year: 2021, source: 'pubmed' });
const BROAD = [paper('1', 'Acute kidney injury cohort study'), paper('2', 'Acute kidney injury biomarkers')];
const GUIDELINE = paper('10', 'KDIGO clinical practice guideline for acute kidney injury');
const REVIEW = paper('20', 'Acute kidney injury: a systematic review');

function stubByQuery({ guidelines = [GUIDELINE, BROAD[0]], reviews = [REVIEW], landmark = 'fail' } = {}) {
    mockPubmedSearch.mockImplementation(async (query) => {
        if (query.includes('Practice Guideline')) return guidelines;
        if (query.includes('Systematic Review')) return reviews;
        if (query.includes('Randomized Controlled Trial')) {
            if (landmark === 'fail') throw new Error('esearch throttled');
            return landmark;
        }
        return BROAD;
    });
}

const run = (overrides = {}) => {
    const telemetry = {};
    return fetchUnifiedEvidence({
        query: 'acute kidney injury', safeLimit: 20, sourceList: ['pubmed'], serverConfig: {}, fetch: jest.fn(),
        telemetry, ...overrides,
    }).then((articles) => ({ articles, telemetry }));
};

beforeEach(() => {
    mockPubmedSearch.mockReset();
    delete process.env.SEARCH_LANE_RETRIEVAL;
});

describe('lane query construction', () => {
    const on = { SEARCH_LANE_RETRIEVAL: 'on' };

    test('one type-filtered query per lane, sharing the base query', () => {
        const queries = buildLaneQueries('acute kidney injury', { env: on });
        expect(queries.map((q) => q.lane)).toEqual(['guidelines', 'reviews', 'landmark_trials']);
        expect(queries[0].query).toContain('"Practice Guideline"[Publication Type]');
        expect(queries[1].query).toContain('"Meta-Analysis"[Publication Type]');
        expect(queries[2].query).toContain('"Randomized Controlled Trial"[Publication Type]');
        for (const q of queries) expect(q.query.startsWith('acute kidney injury')).toBe(true);
    });

    test('year filters carry through to every lane', () => {
        for (const q of buildLaneQueries('aki', { parsedYearFilters: ['2020:2024[PDAT]'], env: on })) {
            expect(q.query).toContain('2020:2024[PDAT]');
        }
    });

    test('an explicit study-type filter or strict specificity already constrains type: no lane queries', () => {
        expect(buildLaneQueries('aki', { parsedStudyTypes: ['Randomized Controlled Trial'], env: on })).toEqual([]);
        expect(buildLaneQueries('aki', { specificity: 'strict', env: on })).toEqual([]);
        expect(buildLaneQueries('  ', { env: on })).toEqual([]);
    });

    test('lane retrieval is off unless SEARCH_LANE_RETRIEVAL=on', () => {
        expect(laneRetrievalEnabled({ SEARCH_LANE_RETRIEVAL: 'off' })).toBe(false);
        expect(laneRetrievalEnabled({})).toBe(false);
        expect(laneRetrievalEnabled({ SEARCH_LANE_RETRIEVAL: 'on' })).toBe(true);
        expect(buildLaneQueries('aki', {})).toEqual([]);
        expect(buildLaneQueries('aki', { env: { SEARCH_LANE_RETRIEVAL: 'OFF' } })).toEqual([]);
    });

    test('per-lane result limit is bounded', () => {
        expect(laneResultLimit(100)).toBe(8);
        expect(laneResultLimit(2)).toBe(3);
    });
});

describe('fetchUnifiedEvidence with lane retrieval', () => {
    beforeEach(() => {
        process.env.SEARCH_LANE_RETRIEVAL = 'on';
    });

    test('lane hits join the pool, de-duplicated against the broad query, tagged with their lane', async () => {
        stubByQuery();
        const { articles, telemetry } = await run();
        const uids = articles.map((a) => a.uid);
        expect(uids).toEqual(expect.arrayContaining(['pubmed-1', 'pubmed-2', 'pubmed-10', 'pubmed-20']));
        expect(new Set(uids).size).toBe(uids.length);
        expect(articles.find((a) => a.uid === 'pubmed-10')._retrievedVia).toBe('guidelines');
        expect(articles.find((a) => a.uid === 'pubmed-1')._retrievedVia).toBeUndefined(); // broad hit keeps its origin
        expect(telemetry.laneRetrieval.lanes.guidelines).toMatchObject({ fetched: 2, added: 1, failed: false });
        expect(telemetry.laneRetrieval.calls).toBe(3);
    });

    test('a failing lane forgoes only its own recall; the search and other lanes succeed', async () => {
        stubByQuery({ landmark: 'fail' });
        const { articles, telemetry } = await run();
        expect(articles.map((a) => a.uid)).toEqual(expect.arrayContaining(['pubmed-10', 'pubmed-20']));
        expect(telemetry.laneRetrieval.lanes.landmark_trials).toMatchObject({ fetched: 0, added: 0, failed: true });
        expect(telemetry.sourceFailures?.pubmed).toBeUndefined();
    });

    test('lanes fire in parallel with the broad query, not after it', async () => {
        const order = [];
        mockPubmedSearch.mockImplementation(async (query) => {
            const kind = query.includes('Publication Type') ? 'lane' : 'broad';
            order.push(`start:${kind}`);
            await new Promise((resolve) => setTimeout(resolve, 10));
            order.push(`end:${kind}`);
            return [];
        });
        await run();
        // Sequential lanes would start after an earlier query ended; parallel ones all start first.
        const firstEnd = order.findIndex((e) => e.startsWith('end:'));
        expect(order.slice(0, firstEnd).filter((e) => e === 'start:lane')).toHaveLength(3);
    });

    test('kill switch and explicit study-type filters issue no lane calls', async () => {
        stubByQuery({ landmark: [] });
        process.env.SEARCH_LANE_RETRIEVAL = 'off';
        await run();
        expect(mockPubmedSearch.mock.calls.every(([q]) => !q.includes('Practice Guideline'))).toBe(true);

        mockPubmedSearch.mockClear();
        process.env.SEARCH_LANE_RETRIEVAL = 'on';
        const { telemetry } = await run({ parsedStudyTypes: ['Randomized Controlled Trial'] });
        expect(telemetry.laneRetrieval).toBeUndefined();
    });

    test('without PubMed in the source list there are no lane calls', async () => {
        stubByQuery();
        await run({ sourceList: [] });
        expect(mockPubmedSearch).not.toHaveBeenCalled();
    });
});
