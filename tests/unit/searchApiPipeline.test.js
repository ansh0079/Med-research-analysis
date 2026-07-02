const { fetchAndRankSearchArticles, candidateFetchLimit } = require('../../server/services/searchPipeline');
const { clearInFlightRequests } = require('../../server/services/externalApiProxy');

const mockFetch = jest.fn();
const db = {
  listTeachingObjectsForTopic: jest.fn().mockResolvedValue([]),
  listTeachingObjectClaimsForTopic: jest.fn().mockResolvedValue([]),
  getUserTopicMemory: jest.fn().mockResolvedValue(null),
  getRecentImpressions: jest.fn().mockResolvedValue([]),
  listSearchResultFeedbackForUser: jest.fn().mockResolvedValue([]),
  getUserInteractions: jest.fn().mockResolvedValue([]),
  getQuizAttempts: jest.fn().mockResolvedValue([]),
};
const cache = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
};

function mockPubMed({ pmids, summary }) {
  mockFetch.mockImplementation((url) => {
    const target = String(url);
    if (target.includes('id.nlm.nih.gov/mesh')) {
      return Promise.resolve({ ok: true, json: async () => [] });
    }
    if (target.includes('esearch.fcgi')) {
      return Promise.resolve({ ok: true, json: async () => ({ esearchresult: { idlist: pmids } }) });
    }
    if (target.includes('esummary.fcgi')) {
      return Promise.resolve({ ok: true, json: async () => ({ result: summary }) });
    }
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  });
}

describe('fetchAndRankSearchArticles (no Express)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    clearInFlightRequests();
    cache.get.mockResolvedValue(null);
  });

  test('completes with safeFetch wrapper under 2s', async () => {
    const { safeFetch } = require('../../server/utils/fetch');
    global.fetch = mockFetch;
    mockPubMed({
      pmids: ['9001'],
      summary: {
        '9001': {
          title: 'Diabetes management review',
          pubdate: '2024',
          source: 'Lancet',
          pmcrefcount: 12,
          pubtype: ['Journal Article'],
        },
      },
    });
    const { serverConfig } = require('../../config');
    const started = Date.now();
    const result = await fetchAndRankSearchArticles({
      db,
      cache,
      serverConfig,
      fetchImpl: safeFetch,
      query: 'diabetes',
      safeLimit: 2,
      sourceList: ['pubmed'],
      specificity: 'moderate',
      parsedStudyTypes: [],
      previousQueries: [],
      vectorList: [],
      userId: null,
      sessionId: 'sess-test',
    });
    expect(Date.now() - started).toBeLessThan(2000);
    expect(result.articles.length).toBeGreaterThanOrEqual(1);
  });

  test('completes PubMed fetch and rank under 2s', async () => {
    mockPubMed({
      pmids: ['9001'],
      summary: {
        '9001': {
          title: 'Diabetes management review',
          pubdate: '2024',
          source: 'Lancet',
          pmcrefcount: 12,
          pubtype: ['Journal Article'],
        },
      },
    });

    const { serverConfig } = require('../../config');
    const started = Date.now();
    const result = await fetchAndRankSearchArticles({
      db,
      cache,
      serverConfig,
      fetchImpl: mockFetch,
      query: 'diabetes',
      safeLimit: 2,
      sourceList: ['pubmed'],
      specificity: 'moderate',
      parsedStudyTypes: [],
      previousQueries: [],
      vectorList: [],
      userId: null,
      sessionId: 'sess-test',
    });
    expect(Date.now() - started).toBeLessThan(2000);
    expect(result.articles.length).toBeGreaterThanOrEqual(1);
    const esearchUrl = mockFetch.mock.calls.map(([url]) => String(url)).find((url) => url.includes('esearch.fcgi'));
    expect(esearchUrl).toContain('retmax=20');
  });
});

describe('candidateFetchLimit', () => {
  test('fetches a deeper candidate pool for top-k ranking without shrinking large requests', () => {
    expect(candidateFetchLimit(2)).toBe(20);
    expect(candidateFetchLimit(10)).toBe(50);
    expect(candidateFetchLimit(20)).toBe(50);
    expect(candidateFetchLimit(75)).toBe(75);
  });
});
