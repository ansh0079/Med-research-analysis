// ==========================================
// Unit Tests for API Layer
// Jest + Supertest
// ==========================================

const request = require('supertest');
const jwt = require('jsonwebtoken');

function authToken(payload = {}) {
  const defaults = { id: 'u1', name: 'Test User', email: 't@test.com', emailVerified: true };
  return jwt.sign({ ...defaults, ...payload }, 'test-jwt-secret', { expiresIn: '1h' });
}

function adminToken(extra = {}) {
  return authToken({ id: 'admin1', name: 'Admin User', email: 'admin@test.com', role: 'admin', emailVerified: true, ...extra });
}

// Mock fetch before importing server
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock the database and cache before importing server
jest.mock('../../database', () => ({
  connect: jest.fn().mockResolvedValue(true),
  getSearchHistory: jest.fn(),
  logSearch: jest.fn().mockResolvedValue({ id: 1 }),
  logEvent: jest.fn().mockResolvedValue({ id: 1 }),
  getCachedArticle: jest.fn(),
  cacheArticle: jest.fn(),
  getSavedArticles: jest.fn(),
  saveArticle: jest.fn().mockResolvedValue({ id: 1 }),
  unsaveArticle: jest.fn().mockResolvedValue({ changes: 1 }),
  saveArticleToUser: jest.fn().mockResolvedValue({ id: 1 }),
  unsaveArticleFromUser: jest.fn().mockResolvedValue({ changes: 1 }),
  getUserSavedArticles: jest.fn().mockResolvedValue([]),
  saveArticleToTeam: jest.fn().mockResolvedValue({ id: 1 }),
  unsaveArticleFromTeam: jest.fn().mockResolvedValue({ changes: 1 }),
  getTeamSavedArticles: jest.fn().mockResolvedValue([]),
  getTeamRoleForUser: jest.fn().mockResolvedValue('member'),
  createAuditLog: jest.fn().mockResolvedValue({ id: 1 }),
  getAuditLogs: jest.fn().mockResolvedValue([]),
  logBillingEvent: jest.fn().mockResolvedValue({ id: '1', changes: 1 }),
  listBillingAuditLog: jest.fn().mockResolvedValue([]),
  createSession: jest.fn().mockResolvedValue({ id: 1 }),
  updateSessionActivity: jest.fn().mockResolvedValue({ changes: 1 }),
  getSession: jest.fn(),
  getPopularSearches: jest.fn(),
  getDailyStats: jest.fn(),
  getCachedAnalysis: jest.fn(),
  cacheAnalysis: jest.fn().mockResolvedValue({ id: 1 }),
  saveSynthesisSnapshot: jest.fn().mockResolvedValue(undefined),
  getLatestSynthesisSnapshots: jest.fn().mockResolvedValue([]),
  createReviewProject: jest.fn(),
  getReviewProject: jest.fn(),
  addReviewArticles: jest.fn(),
  listReviewArticles: jest.fn(),
  updateReviewScreening: jest.fn(),
  getReviewPrismaCounts: jest.fn(),
  upsertPicoExtraction: jest.fn(),
  getPicoExtraction: jest.fn().mockResolvedValue(null),
  getReviewExtractionRows: jest.fn(),
  cleanExpiredCache: jest.fn().mockResolvedValue(0),
  getAnnotationsByArticle: jest.fn().mockImplementation((_articleId, userId) => {
    if (!userId) return Promise.resolve([]);
    return Promise.resolve([]);
  }),
  createAnnotation: jest.fn().mockResolvedValue({ id: 99, changes: 1 }),
  get: jest.fn(),
  isVectorSearchAvailable: jest.fn().mockReturnValue(false),
  searchSimilarArticlesCache: jest.fn(),
  upsertArticleCacheVector: jest.fn(),
  getTopicKnowledge: jest.fn(),
  mapTopicKnowledgeRow: jest.fn((row) => row),
  getGuidelinesByTopic: jest.fn().mockResolvedValue([]),
  getLearningProfile: jest.fn().mockResolvedValue(null),
  getUserTopicMastery: jest.fn().mockResolvedValue(null),
  upsertLearningProfile: jest.fn().mockResolvedValue({ id: 1, userId: 'u1', persona: 'student' }),
  createQuizAttempt: jest.fn().mockResolvedValue({ id: 1 }),
  getQuizAttempts: jest.fn().mockResolvedValue([]),
  getQuizAttemptStats: jest.fn().mockResolvedValue([]),
  getEvidenceJudgementProfile: jest.fn().mockResolvedValue({ topic: null, totalTaggedAttempts: 0, tags: [], generatedAt: '2026-05-18T00:00:00.000Z' }),
  listPracticeChangingTeachingObjects: jest.fn().mockResolvedValue([]),
  createStudyRun: jest.fn(),
  getStudyRun: jest.fn(),
  getActiveStudyRun: jest.fn(),
  listStudyRuns: jest.fn().mockResolvedValue([]),
  updateStudyRun: jest.fn(),
  createAgentConversation: jest.fn().mockResolvedValue({ id: 1, userId: 'u1', topic: 'ARDS', messages: [] }),
  getAgentConversation: jest.fn().mockResolvedValue({ id: 1, userId: 'u1', topic: 'ARDS', messages: [] }),
  listAgentConversations: jest.fn().mockResolvedValue([]),
  appendAgentMessages: jest.fn().mockResolvedValue({ id: 1, messages: [] }),
  deleteAgentConversation: jest.fn().mockResolvedValue({ deleted: true }),
  listUserTopicMastery: jest.fn().mockResolvedValue([]),
  upsertUserTopicMastery: jest.fn().mockResolvedValue({ id: 1 }),
  createCaseAttempt: jest.fn().mockResolvedValue({ id: 1 }),
  getCaseAttempts: jest.fn().mockResolvedValue([]),
  getPicoExtractionByArticle: jest.fn().mockResolvedValue(null),
  createTopicKnowledgeProposal: jest.fn().mockResolvedValue({ id: 1, topic: 'Test Topic', status: 'pending_review' }),
  recordUserInteraction: jest.fn().mockResolvedValue({ id: 1 }),
  recordLearningEvent: jest.fn().mockResolvedValue({ id: 1 }),
  recordLowRecallSearch: jest.fn().mockResolvedValue({ id: 1 }),
  mergeTopicKnowledgeAliases: jest.fn().mockResolvedValue({ id: 1 }),
  getLearningObservability: jest.fn().mockResolvedValue({
    generatedAt: '2026-05-16T00:00:00.000Z',
    topBouquetTopics: [],
    lowRecall: { days: 7, items: [] },
    aliasSeededTopics: [],
    vectorUsage: { windowDays: 7, used: 0, notUsed: 0, total: 0, usageRate: 0 },
    refreshCandidates: [],
    schedulerRuns: [],
  }),
  importCurriculumSeedTopics: jest.fn().mockResolvedValue({ importedCount: 0, topics: [] }),
  listCurriculumSeedTopics: jest.fn().mockResolvedValue([]),
  listCurriculumSeedCandidates: jest.fn().mockResolvedValue([]),
  getCurriculumSeedStatusCounts: jest.fn().mockResolvedValue([]),
  listLearningSchedulerRuns: jest.fn().mockResolvedValue([]),
  getAdminRuntimeSetting: jest.fn().mockResolvedValue(null),
  setAdminRuntimeSetting: jest.fn(),
  getCurriculumSeedUsageForDate: jest.fn().mockResolvedValue({
    date: '2026-05-19',
    topicsAttempted: 0,
    topicsSeeded: 0,
    topicsFailed: 0,
    synopsesGenerated: 0,
    estimatedCostUsd: 0,
  }),
  incrementCurriculumSeedUsage: jest.fn(),
  getCurriculumSeedTopic: jest.fn().mockResolvedValue(null),
  updateCurriculumSeedStatus: jest.fn().mockResolvedValue(null),
  getUserTopicMemory: jest.fn().mockResolvedValue(null),
  getGlobalEngagedArticles: jest.fn().mockResolvedValue([]),
  listTeachingObjectsForTopic: jest.fn().mockResolvedValue([]),
  listTeachingObjectClaimsForTopic: jest.fn().mockResolvedValue([]),
  listTeachingObjectClaimsByObjectKey: jest.fn().mockResolvedValue([]),
  getTeachingObjectForArticle: jest.fn().mockResolvedValue(null),
  upsertTeachingObject: jest.fn().mockImplementation(async (object) => ({ id: 1, ...object })),
  getTeachingObjectStats: jest.fn().mockResolvedValue({ total: 0, byType: [], recent: [], topTopics: [] }),
  getUserClaimMastery: jest.fn().mockResolvedValue([]),
  listTeachingClaimsForReview: jest.fn().mockResolvedValue([]),
  getTeachingClaimByKey: jest.fn(),
  updateTeachingClaimVerification: jest.fn(),
  getRelatedBouquetTopicsForTopic: jest.fn().mockResolvedValue([]),
  getClusterBouquetArticlesForTopic: jest.fn().mockResolvedValue([]),
  getStaleTopicsForRefresh: jest.fn().mockResolvedValue([]),
  getStrongMemoryTopicsForRefresh: jest.fn().mockResolvedValue([]),
  findSynapseTopicsForArticleUids: jest.fn().mockResolvedValue([]),
  recordTopicDemandSignal: jest.fn().mockResolvedValue(null),
  maybeRegisterTopicAlias: jest.fn().mockResolvedValue(null),
  normalizeTopic: jest.fn((t) => String(t || '').toLowerCase().trim()),
  mergeUserTopicWeakOutlineNodes: jest.fn().mockResolvedValue(null),
  touchCurriculumTopicProgress: jest.fn().mockResolvedValue(null),
  listCurricula: jest.fn().mockResolvedValue([]),
  getCurriculumExamSummaryForUser: jest.fn().mockResolvedValue(null),
  getUserCurriculumProgressMap: jest.fn().mockResolvedValue({}),
  listTopicKnowledgeProposalsForUser: jest.fn().mockResolvedValue({ proposals: [], total: 0 }),
  listUserTopicMemory: jest.fn().mockResolvedValue([]),
  recordUserTopicSavedArticleSignal: jest.fn().mockResolvedValue(null),
  recordUserTopicSearchSignal: jest.fn().mockResolvedValue(null),
  dbPath: './test.db'
}));

jest.mock('../../cache', () => ({
  connect: jest.fn().mockResolvedValue(true),
  close: jest.fn().mockResolvedValue(true),
  get: jest.fn(),
  set: jest.fn(),
  getAsync: jest.fn().mockResolvedValue(null),
  setAsync: jest.fn().mockResolvedValue(true),
  delAsync: jest.fn().mockResolvedValue(true),
  getSearchResults: jest.fn(),
  setSearchResults: jest.fn(),
  getSession: jest.fn(),
  setSession: jest.fn(),
  getAnalysis: jest.fn(),
  setAnalysis: jest.fn(),
  getAnalysisAsync: jest.fn().mockResolvedValue(null),
  setAnalysisAsync: jest.fn().mockResolvedValue(true),
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 29, resetTime: Date.now() + 60000 }),
  getStats: jest.fn().mockReturnValue({ keys: 0, hitRate: '0%', hits: 0, misses: 0, redisEnabled: false }),
  flush: jest.fn()
}));

jest.mock('../../config', () => ({
  loadEnv: jest.fn(),
  serverConfig: {
    ports: { node: 3002, python: 8000 },
    keys: {
      huggingface: 'test-hf-key',
      biogpt: 'test-biogpt-key',
      semantic: 'test-semantic-key',
      openalex: 'test-openalex-key',
      openai: 'test-openai-key',
      ncbi: 'test-ncbi-key',
      gemini: 'test-gemini-key',
      mistral: 'test-mistral-key'
    },
    features: {
      enableLocalAI: true,
      enableCloudAI: true,
      enableSemanticRanking: true
    }
  },
  clientConfig: {
    apiEndpoints: {
      proxy: 'http://localhost:3002',
      localAI: 'http://localhost:8000'
    },
    features: {
      enableLocalAI: true,
      enableCloudAI: true,
      enableSemanticRanking: true
    },
    defaultProvider: 'algorithm'
  }
}));

jest.mock('../../server/services/vectorSearchService', () => ({
  createVectorSearchService: jest.fn(() => ({
    searchVector: jest.fn().mockResolvedValue({
      articles: [
        {
          uid: 'vector-heart-attack-1',
          title: 'Heart attack and myocardial infarction treatment outcomes',
          abstract: 'Semantic match for heart attack and MI terminology.',
          pubdate: '2024',
          source: 'Vector Cache',
          pmcrefcount: 25,
          _source: 'vector',
        },
      ],
      scores: [0.82],
    }),
  })),
}));

jest.mock('../../server/services/curriculumSeedService', () => ({
  seedCurriculumTopic: jest.fn().mockResolvedValue({
    topic: { id: 1, displayName: 'Hypertension', seedStatus: 'seeded', claimCount: 9 },
    articleCount: 24,
    selectedArticleCount: 8,
    synthesisJobKey: 'syn:test',
    synopsisCount: 3,
    synopsisFailures: [],
    claimCount: 9,
  }),
  reviewDueForVolatility: jest.fn(),
}));

jest.mock('../../server/services/curriculumSeedScheduler', () => ({
  runCurriculumSeedBatch: jest.fn().mockResolvedValue({
    candidatesCount: 2,
    refreshedCount: 2,
    skippedCount: 0,
    errorCount: 0,
    details: { topics: [] },
  }),
  loadGuardrailState: jest.fn().mockResolvedValue({
    settings: { enabled: true, maxTopicsPerDay: 10, maxSynopsesPerDay: 30, maxEstimatedCostUsdPerDay: 1 },
    usage: { topicsAttempted: 0, topicsSeeded: 0, topicsFailed: 0, synopsesGenerated: 0, estimatedCostUsd: 0 },
    blockedReason: null,
  }),
  updateCurriculumSeedSchedulerSettings: jest.fn().mockResolvedValue({ enabled: false, maxTopicsPerDay: 10 }),
  scheduleCurriculumSeed: jest.fn(),
  stopCurriculumSeed: jest.fn(),
}));

describe('API Endpoints', () => {
  let app;
  let db;
  let cache;

  beforeAll(async () => {
    // Set admin token for admin endpoint tests; JWT for annotation routes
    process.env.ADMIN_TOKEN = 'test-admin-token';
    process.env.JWT_SECRET = 'test-jwt-secret';

    // Import server after mocks are set up
    const serverModule = require('../../server');
    app = serverModule.app;
    db = require('../../database');
    cache = require('../../cache');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    global.fetch = mockFetch;
    db.getTopicKnowledge.mockResolvedValue(null);
    db.mapTopicKnowledgeRow.mockImplementation((row) => row);
    db.getGuidelinesByTopic.mockResolvedValue([]);
    db.getLearningProfile.mockResolvedValue(null);
    db.getUserTopicMastery.mockResolvedValue(null);
    db.upsertLearningProfile.mockResolvedValue({ id: 1, userId: 'u1', persona: 'student' });
    db.createQuizAttempt.mockResolvedValue({ id: 1 });
    db.getQuizAttempts.mockResolvedValue([]);
    db.getQuizAttemptStats.mockResolvedValue([]);
    db.getEvidenceJudgementProfile.mockResolvedValue({ topic: null, totalTaggedAttempts: 0, tags: [], generatedAt: '2026-05-18T00:00:00.000Z' });
    db.listPracticeChangingTeachingObjects.mockResolvedValue([]);
    db.saveSynthesisSnapshot.mockResolvedValue(undefined);
    db.getLatestSynthesisSnapshots.mockResolvedValue([]);
    db.createStudyRun.mockResolvedValue({ id: 1, userId: 'u1', topic: 'ARDS', progress: {}, nodeCoverage: {} });
    db.getStudyRun.mockResolvedValue(null);
    db.getActiveStudyRun.mockResolvedValue(null);
    db.listStudyRuns.mockResolvedValue([]);
    db.updateStudyRun.mockImplementation((_id, patch) => Promise.resolve({ id: _id, userId: 'u1', topic: 'ARDS', ...patch }));
    db.createAgentConversation.mockResolvedValue({ id: 1, userId: 'u1', topic: 'ARDS', messages: [] });
    db.getAgentConversation.mockResolvedValue({ id: 1, userId: 'u1', topic: 'ARDS', messages: [] });
    db.listAgentConversations.mockResolvedValue([]);
    db.appendAgentMessages.mockResolvedValue({ id: 1, messages: [] });
    db.deleteAgentConversation.mockResolvedValue({ deleted: true });
    db.listUserTopicMastery.mockResolvedValue([]);
    db.upsertUserTopicMastery.mockResolvedValue({ id: 1 });
    db.createCaseAttempt.mockResolvedValue({ id: 1 });
    db.getCaseAttempts.mockResolvedValue([]);
    db.getPicoExtraction.mockResolvedValue(null);
    db.getLearningObservability.mockResolvedValue({
      generatedAt: '2026-05-16T00:00:00.000Z',
      topBouquetTopics: [],
      lowRecall: { days: 7, items: [] },
      aliasSeededTopics: [],
      vectorUsage: { windowDays: 7, used: 0, notUsed: 0, total: 0, usageRate: 0 },
      refreshCandidates: [],
      schedulerRuns: [],
    });
    db.importCurriculumSeedTopics.mockResolvedValue({ importedCount: 0, topics: [] });
    db.listCurriculumSeedTopics.mockResolvedValue([]);
    db.listCurriculumSeedCandidates.mockResolvedValue([]);
    db.getCurriculumSeedStatusCounts.mockResolvedValue([]);
    db.listLearningSchedulerRuns.mockResolvedValue([]);
    db.getAdminRuntimeSetting.mockResolvedValue(null);
    db.setAdminRuntimeSetting.mockImplementation(async (_key, value) => value);
    db.getCurriculumSeedUsageForDate.mockResolvedValue({
      date: '2026-05-19',
      topicsAttempted: 0,
      topicsSeeded: 0,
      topicsFailed: 0,
      synopsesGenerated: 0,
      estimatedCostUsd: 0,
    });
    db.incrementCurriculumSeedUsage.mockResolvedValue({});
    // Reset rate limit mock to allowed by default
    cache.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 29, resetTime: Date.now() + 60000 });
    db.isVectorSearchAvailable.mockReturnValue(false);
  });

  // ==========================================
  // 1. Health Endpoint Tests
  // ==========================================
  describe('Health Endpoint', () => {
    test('GET /health should return status ok', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('version', '2.0.0');
      expect(response.body).toHaveProperty('features');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('GET /health should include feature flags', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.features).toHaveProperty('localAI', true);
      expect(response.body.features).toHaveProperty('cloudAI', true);
      expect(response.body.features).toHaveProperty('semanticScholar', true);
      expect(response.body.features).toHaveProperty('openAlex', true);
      expect(response.body.features).toHaveProperty('database', true);
      expect(response.body.features).toHaveProperty('caching', true);
    });

    test('GET /health should include cache stats', async () => {
      cache.getStats.mockReturnValueOnce({ keys: 5, hitRate: '75%', hits: 15, misses: 5 });

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('cache');
      expect(response.body.cache).toHaveProperty('keys', 5);
      expect(response.body.cache).toHaveProperty('hitRate', '75%');
    });
  });

  // ==========================================
  // 2. Config Endpoint Tests
  // ==========================================
  describe('Config Endpoint', () => {
    test('GET /api/config should return client-safe config', async () => {
      const response = await request(app)
        .get('/api/config')
        .expect(200);

      expect(response.body).toHaveProperty('apiEndpoints');
      expect(response.body).toHaveProperty('features');
      expect(response.body).toHaveProperty('defaultProvider', 'algorithm');
    });

    test('GET /api/config should NOT expose API keys', async () => {
      const response = await request(app)
        .get('/api/config')
        .expect(200);

      expect(response.body).not.toHaveProperty('huggingface');
      expect(response.body).not.toHaveProperty('semantic');
      expect(response.body).not.toHaveProperty('openalex');
      expect(response.body).not.toHaveProperty('openai');
      expect(response.body).not.toHaveProperty('ncbi');
    });

    test('GET /api/config should expose correct API endpoints', async () => {
      const response = await request(app)
        .get('/api/config')
        .expect(200);

      expect(response.body.apiEndpoints).toHaveProperty('proxy');
      expect(response.body.apiEndpoints).toHaveProperty('localAI');
    });
  });

  // ==========================================
  // 3. Rate Limiting Tests
  // ==========================================
  describe('Rate Limiting', () => {
    test('Should return 429 when rate limit exceeded', async () => {
      cache.checkRateLimit.mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000
      });

      const response = await request(app)
        .get('/api/pubmed/search?query=test')
        .expect(429);

      expect(response.body).toHaveProperty('error', 'Rate limit exceeded');
      expect(response.body).toHaveProperty('retryAfter');
    });

    test('Should include rate limit headers on success', async () => {
      // Ensure cache is hit so fetch is not called
      cache.getSearchResults.mockReturnValueOnce({
        results: [{ uid: '1', title: 'Test' }],
        cachedAt: new Date().toISOString()
      });

      const response = await request(app)
        .get('/api/pubmed/search?query=test')
        .expect(200);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });

    test('Should include correct rate limit values', async () => {
      cache.checkRateLimit.mockResolvedValueOnce({
        allowed: true,
        remaining: 15,
        resetTime: 1234567890000
      });
      cache.getSearchResults.mockReturnValueOnce({
        results: [{ uid: '1', title: 'Test' }],
        cachedAt: new Date().toISOString()
      });

      const response = await request(app)
        .get('/api/pubmed/search?query=test')
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBe('30');
      expect(response.headers['x-ratelimit-remaining']).toBe('15');
      expect(response.headers['x-ratelimit-reset']).toBe('1234567890000');
    });
  });

  // ==========================================
  // 4. Search Endpoints Tests
  // ==========================================
  describe('Search Endpoints', () => {
    describe('GET /api/pubmed/search', () => {
      test('Should require query parameter', async () => {
        const response = await request(app)
          .get('/api/pubmed/search')
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('Query is required');
      });

      test('Should accept valid query and return articles', async () => {
        cache.getSearchResults.mockReturnValueOnce(null);
        
        // Mock PubMed search response
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              esearchresult: { idlist: ['12345', '67890'] }
            })
          })
          // Mock PubMed details response
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              result: {
                '12345': { uid: '12345', title: 'Test Article 1', _source: 'pubmed' },
                '67890': { uid: '67890', title: 'Test Article 2', _source: 'pubmed' }
              }
            })
          });

        const response = await request(app)
          .get('/api/pubmed/search?query=diabetes&max=5')
          .expect(200);

        expect(response.body).toHaveProperty('articles');
        expect(response.body).toHaveProperty('count');
        expect(Array.isArray(response.body.articles)).toBe(true);
        expect(response.body.count).toBe(2);
      });

      test('Should return cached results when available', async () => {
        const cachedResults = [
          { uid: '1', title: 'Cached Article', _source: 'pubmed' }
        ];
        cache.getSearchResults.mockReturnValueOnce({
          results: cachedResults,
          cachedAt: new Date().toISOString()
        });

        const response = await request(app)
          .get('/api/pubmed/search?query=diabetes&max=5')
          .expect(200);

        expect(response.body).toHaveProperty('cached', true);
        expect(response.body.articles).toHaveLength(1);
        expect(response.body.articles[0].uid).toBe('1');
        expect(response.body.articles[0]._impact).toBeDefined();
        expect(response.body.articles[0]._quality).toBeDefined();
        expect(response.body.count).toBe(1);
        // Should not call fetch when cached
        expect(mockFetch).not.toHaveBeenCalled();
      });

      test('Should return empty array when no results found', async () => {
        cache.getSearchResults.mockReturnValueOnce(null);
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            esearchresult: { idlist: [] }
          })
        });

        const response = await request(app)
          .get('/api/pubmed/search?query=xyznonexistent')
          .expect(200);

        expect(response.body).toHaveProperty('articles');
        expect(response.body.articles).toEqual([]);
        expect(response.body.count).toBe(0);
      });

      test('Should handle PubMed API errors gracefully', async () => {
        cache.getSearchResults.mockReturnValueOnce(null);
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const response = await request(app)
          .get('/api/pubmed/search?query=diabetes')
          .expect(500);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/search flagship topic intelligence', () => {
      test('Should use vector fusion by default when vector search is available', async () => {
        db.isVectorSearchAvailable.mockReturnValueOnce(true);
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ esearchresult: { idlist: ['111'] } }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              result: {
                '111': {
                  title: 'Heart attack treatment outcomes',
                  pubdate: '2024',
                  source: 'JAMA',
                  pmcrefcount: 10,
                  pubtype: ['Journal Article'],
                },
              },
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ([]),
          });

        const response = await request(app)
          .get('/api/search?q=heart%20attack&limit=5&sources=pubmed')
          .expect(200);

        expect(response.body.vectorFusion).toMatchObject({
          used: true,
          available: true,
          count: 1,
        });
        expect(db.logSearch).toHaveBeenCalledWith(
          expect.any(String),
          'heart attack',
          ['pubmed'],
          expect.objectContaining({ vector: true }),
          expect.any(Number),
          expect.any(Number),
          expect.any(String),
          expect.objectContaining({ sessionSequenceIndex: expect.any(Number), previousQueries: expect.any(Array) })
        );
      });

      test('Should allow explicit vector=0 opt-out', async () => {
        db.isVectorSearchAvailable.mockReturnValueOnce(true);
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ esearchresult: { idlist: ['222'] } }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              result: {
                '222': {
                  title: 'Heart attack treatment outcomes',
                  pubdate: '2024',
                  source: 'JAMA',
                  pmcrefcount: 10,
                  pubtype: ['Journal Article'],
                },
              },
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ([]),
          });

        const response = await request(app)
          .get('/api/search?q=heart%20attack&limit=5&sources=pubmed&vector=0')
          .expect(200);

        expect(response.body.vectorFusion).toMatchObject({
          used: false,
          available: true,
          count: 0,
        });
        expect(db.logSearch).toHaveBeenCalledWith(
          expect.any(String),
          'heart attack',
          ['pubmed'],
          expect.objectContaining({ vector: false }),
          expect.any(Number),
          expect.any(Number),
          expect.any(String),
          expect.objectContaining({ sessionSequenceIndex: expect.any(Number), previousQueries: expect.any(Array) })
        );
      });

      test('Should capture low-recall searches and merge MeSH aliases', async () => {
        // Phase 1: proactive MeSH lookup fires before PubMed esearch
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ([{ label: 'Rare Syndrome' }, { label: 'Rare Disease' }]),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ esearchresult: { idlist: [] } }),
          });

        const response = await request(app)
          .get('/api/search?q=rare%20syndrome%20treatment&limit=5&sources=pubmed')
          .expect(200);

        expect(response.body.articles).toHaveLength(0);
        expect(response.body.lowRecallLearning).toMatchObject({
          query: 'rare syndrome treatment',
          resultCount: 0,
          aliasCount: 2,
        });
        expect(db.recordLowRecallSearch).toHaveBeenCalledWith(expect.objectContaining({
          query: 'rare syndrome treatment',
          resultCount: 0,
          expandedAliases: ['Rare Syndrome', 'Rare Disease'],
        }));
        expect(db.mergeTopicKnowledgeAliases).toHaveBeenCalledWith(
          'rare syndrome treatment',
          ['Rare Syndrome', 'Rare Disease'],
          expect.objectContaining({ reason: 'low_recall_mesh' })
        );
      });

      test('Should return ARDS flagship topic intelligence when knowledge and guidelines exist', async () => {
        db.getTopicKnowledge.mockResolvedValueOnce({
          topic: 'ARDS',
          status: 'ai_generated',
          confidence: 0.78,
          lastRefreshedAt: '2026-05-11T00:00:00.000Z',
          knowledge: {
            mentorMessage: 'ARDS mentor baseline.',
            seminalPapers: [
              { sourceIndex: 1, title: 'Berlin Definition', evidenceStrength: 'HIGH' },
              { sourceIndex: 2, title: 'Low tidal volume ventilation', evidenceStrength: 'HIGH' },
              { sourceIndex: 3, title: 'Prone positioning', evidenceStrength: 'HIGH' },
            ],
            teachingPoints: [
              { claim: 'Recognize ARDS using Berlin criteria.', sourceIndices: [1], confidence: 'HIGH' },
              { claim: 'Use low tidal volume ventilation.', sourceIndices: [2], confidence: 'HIGH' },
              { claim: 'Prone selected severe ARDS patients.', sourceIndices: [3], confidence: 'HIGH' },
            ],
            caseGenerationHooks: ['Severe hypoxemia after pneumonia'],
            mcqAngles: ['PaO2/FiO2 calculation'],
          },
          sourceArticles: [
            { sourceIndex: 1, title: 'Berlin Definition', pmcid: 'PMC1', isFree: true },
            { sourceIndex: 2, title: 'Low tidal volume ventilation', pmcid: 'PMC2', isFree: true },
            { sourceIndex: 3, title: 'Prone positioning', pmcid: 'PMC3', isFree: true },
          ],
        });
        db.getGuidelinesByTopic.mockResolvedValueOnce([
          {
            id: 1,
            topic: 'ARDS',
            sourceBody: 'ESICM',
            sourceYear: 2023,
            recommendationText: 'Use lung-protective ventilation.',
            status: 'ai_extracted',
          },
        ]);

        mockFetch
          .mockImplementation((url) => {
            if (String(url).includes('generativelanguage.googleapis.com')) {
              return Promise.resolve({
                ok: true,
                json: async () => ({
                  candidates: [{
                    content: {
                      parts: [{
                        text: JSON.stringify({
                          statement: 'The supplied free ARDS papers support Berlin criteria, lung-protective ventilation, and prone positioning in selected severe ARDS patients [1, 2, 3].',
                          clinicalBottomLine: 'Use the free evidence as discussion support for ARDS recognition and evidence-based ventilatory strategies [1, 2, 3].',
                          areasOfAgreement: ['ARDS care requires syndrome recognition and lung-protective ventilation [1, 2].'],
                          areasOfUncertainty: ['Patient selection remains central when applying prone positioning evidence [3].'],
                          conflictingSignals: [],
                          evidenceStrength: 'HIGH',
                          strengthRationale: 'The set includes landmark definition and randomized trial evidence.',
                          whatNotToOverclaim: ['Do not present this synopsis as a complete guideline.'],
                          quizFocusPoints: ['Berlin criteria', 'Tidal volume strategy', 'Prone positioning selection'],
                        }),
                      }],
                    },
                  }],
                }),
              });
            }
            return Promise.resolve(undefined);
          })
          .mockResolvedValueOnce({ ok: true, json: async () => [] }) // MeSH Phase 1
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ esearchresult: { idlist: ['1', '2', '3', '4', '5'] } }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              result: {
                '1': {
                  title: 'Acute respiratory distress syndrome: the Berlin Definition',
                  pubdate: '2012',
                  source: 'JAMA',
                  pmcrefcount: 1200,
                  pubtype: ['Journal Article'],
                  articleids: [{ idtype: 'doi', value: '10.1001/jama.2012.5669' }, { idtype: 'pmc', value: 'PMC1' }],
                  abstract: 'Berlin definition criteria for acute respiratory distress syndrome.',
                },
                '2': {
                  title: 'Ventilation with lower tidal volumes for ARDS',
                  pubdate: '2000',
                  source: 'N Engl J Med',
                  pmcrefcount: 5000,
                  pubtype: ['Randomized Controlled Trial'],
                  articleids: [{ idtype: 'doi', value: '10.1056/NEJM200005043421801' }, { idtype: 'pmc', value: 'PMC2' }],
                  abstract: 'Lower tidal volume ventilation improved outcomes in acute lung injury and ARDS.',
                },
                '3': {
                  title: 'Prone positioning in severe ARDS',
                  pubdate: '2013',
                  source: 'N Engl J Med',
                  pmcrefcount: 3000,
                  pubtype: ['Randomized Controlled Trial'],
                  articleids: [{ idtype: 'doi', value: '10.1056/NEJMoa1214103' }, { idtype: 'pmc', value: 'PMC3' }],
                  abstract: 'Prone positioning improved survival in selected severe ARDS patients.',
                },
                '4': {
                  title: 'Conservative fluid strategy in acute lung injury',
                  pubdate: '2006',
                  source: 'N Engl J Med',
                  pmcrefcount: 1800,
                  pubtype: ['Randomized Controlled Trial'],
                },
                '5': {
                  title: 'ECMO for severe ARDS',
                  pubdate: '2018',
                  source: 'N Engl J Med',
                  pmcrefcount: 900,
                  pubtype: ['Randomized Controlled Trial'],
                },
              },
            }),
          });

        const response = await request(app)
          .get('/api/search?q=ARDS&limit=5&sources=pubmed')
          .expect(200);

        expect(response.body).toHaveProperty('topicIntelligence');
        expect(response.body.learningContext).toMatchObject({
          memoryTier: 'none',
          personalized: false,
        });
        expect(response.body.knowledgeAvailable).toBe(true);
        expect(response.body.agentGuidance.seminalPapers).toHaveLength(3);
        expect(response.body.topicIntelligence.evidenceBouquet.count).toBe(5);
        expect(response.body.topicIntelligence.guidelineSnapshot.count).toBe(1);
        // consensusSynopsis is now populated via background enrichment polling, not in the sync response
        expect(response.body.topicIntelligence.consensusSynopsis).toBeNull();
        expect(response.body.aiEnrichmentKey).toBeDefined();
        expect(response.body.aiEnrichmentStatus).toBe('pending');
        expect(response.body.topicIntelligence.actions).toMatchObject({
          canSynthesizeTop5: true,
          canGenerateConsensusSynopsis: true,
          canGenerateMcqs: true,
          canGenerateCase: true,
          canExportBrief: true,
          canSaveTopic: true,
        });
      });
    });

    describe('POST /api/search/:topic/propose-knowledge', () => {
      test('Should require authentication', async () => {
        const response = await request(app)
          .post('/api/search/ARDS/propose-knowledge')
          .send({ articles: [{ uid: '1', title: 'Test' }, { uid: '2', title: 'Test 2' }, { uid: '3', title: 'Test 3' }] })
          .expect(401);
        expect(response.body).toHaveProperty('error');
      });

      test('Should validate minimum articles', async () => {
        const response = await request(app)
          .post('/api/search/ARDS/propose-knowledge')
          .set('Cookie', `med_auth_token=${authToken()}`)
          .send({ articles: [{ uid: '1', title: 'Test' }] })
          .expect(400);
        expect(response.body.error).toContain('At least 3 articles');
      });

      test('Should return 503 when AI service not configured', async () => {
        const config = require('../../config');
        const originalGemini = config.serverConfig.keys.gemini;
        const originalMistral = config.serverConfig.keys.mistral;
        config.serverConfig.keys.gemini = null;
        config.serverConfig.keys.mistral = null;

        const response = await request(app)
          .post('/api/search/ARDS/propose-knowledge')
          .set('Cookie', `med_auth_token=${authToken()}`)
          .send({ articles: [{ uid: '1', title: 'A' }, { uid: '2', title: 'B' }, { uid: '3', title: 'C' }] })
          .expect(503);

        expect(response.body.error).toContain('No AI provider configured');

        config.serverConfig.keys.gemini = originalGemini;
        config.serverConfig.keys.mistral = originalMistral;
      });

      test('Should create topic knowledge proposal from articles', async () => {
        const config = require('../../config');
        const originalGemini = config.serverConfig.keys.gemini;
        config.serverConfig.keys.gemini = 'test-gemini-key';

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [{
              content: {
                parts: [{
                  text: JSON.stringify({
                    mentorMessage: 'ARDS is a life-threatening condition.',
                    seminalPapers: [{ sourceIndex: 1, title: 'Berlin Definition', whySeminal: 'Defined ARDS', clinicalPrinciple: 'Use Berlin criteria', evidenceStrength: 'HIGH' }],
                    teachingPoints: [{ claim: 'Recognize ARDS', sourceIndices: [1], confidence: 'HIGH' }],
                    caseGenerationHooks: ['Severe ARDS case'],
                    mcqAngles: ['PaO2/FiO2'],
                    sourceArticles: [{ sourceIndex: 1, title: 'Berlin Definition' }],
                  })
                }]
              }
            }]
          })
        });

        const response = await request(app)
          .post('/api/search/ARDS/propose-knowledge')
          .set('Cookie', `med_auth_token=${authToken()}`)
          .send({ articles: [
            { uid: '1', title: 'Berlin Definition', pubdate: '2012', journal: 'JAMA', abstract: 'ARDS definition' },
            { uid: '2', title: 'Low tidal volume', pubdate: '2000', journal: 'NEJM', abstract: 'Ventilation strategy' },
            { uid: '3', title: 'Prone positioning', pubdate: '2013', journal: 'NEJM', abstract: 'Positioning helps' },
          ]})
          .expect(200);

        expect(response.body).toHaveProperty('proposal');
        expect(response.body).toHaveProperty('agentGuidance');
        expect(response.body.agentGuidance.mentorMessage).toBe('ARDS is a life-threatening condition.');
        expect(response.body.agentGuidance.seminalPapers).toHaveLength(1);

        config.serverConfig.keys.gemini = originalGemini;
      });
    });

    describe('GET /api/semantic-scholar/search', () => {
      test('Should require query parameter', async () => {
        const response = await request(app)
          .get('/api/semantic-scholar/search')
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      test('Should search Semantic Scholar and return articles', async () => {
        cache.getSearchResults.mockReturnValueOnce(null);
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                paperId: 'abc123',
                title: 'Semantic Scholar Test',
                authors: [{ name: 'John Doe' }],
                year: 2023,
                citationCount: 42,
                abstract: 'Test abstract',
                journal: { name: 'Test Journal' }
              }
            ]
          })
        });

        const response = await request(app)
          .get('/api/semantic-scholar/search?query=machine+learning&limit=10')
          .expect(200);

        expect(response.body).toHaveProperty('articles');
        expect(response.body).toHaveProperty('count');
        expect(Array.isArray(response.body.articles)).toBe(true);
        expect(response.body.articles[0]).toHaveProperty('uid', 'abc123');
        expect(response.body.articles[0]).toHaveProperty('title', 'Semantic Scholar Test');
      });

      test('Should return cached results when available', async () => {
        const cachedResults = [
          { uid: 'cached1', title: 'Cached Semantic Article', _source: 'semantic' }
        ];
        cache.getSearchResults.mockReturnValueOnce({
          results: cachedResults,
          cachedAt: new Date().toISOString()
        });

        const response = await request(app)
          .get('/api/semantic-scholar/search?query=ai')
          .expect(200);

        expect(response.body).toHaveProperty('cached', true);
        expect(mockFetch).not.toHaveBeenCalled();
      });

      test('Should handle Semantic Scholar API errors', async () => {
        cache.getSearchResults.mockReturnValueOnce(null);
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable'
        });

        const response = await request(app)
          .get('/api/semantic-scholar/search?query=test')
          .expect(500);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/openalex/search', () => {
      test('Should require query parameter', async () => {
        const response = await request(app)
          .get('/api/openalex/search')
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      test('Should search OpenAlex and return works', async () => {
        cache.getSearchResults.mockReturnValueOnce(null);
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            results: [
              {
                id: 'openalex1',
                display_name: 'OpenAlex Test Work',
                authorships: [{ author: { display_name: 'Jane Smith' } }],
                publication_year: 2023,
                cited_by_count: 100,
                abstract: 'Test abstract',
                primary_location: { source: { display_name: 'OpenAlex Journal' } },
                open_access: { is_oa: true, oa_url: 'http://example.com' }
              }
            ],
            meta: { count: 1 }
          })
        });

        const response = await request(app)
          .get('/api/openalex/search?query=open+science')
          .expect(200);

        expect(response.body).toHaveProperty('articles');
        expect(response.body).toHaveProperty('count');
        expect(Array.isArray(response.body.articles)).toBe(true);
        expect(response.body.articles[0]).toHaveProperty('uid', 'openalex1');
      });

      test('Should return cached results when available', async () => {
        const cachedResults = [
          { uid: 'cached-oa', title: 'Cached OpenAlex Article', _source: 'openalex' }
        ];
        cache.getSearchResults.mockReturnValueOnce({
          results: cachedResults,
          cachedAt: new Date().toISOString()
        });

        const response = await request(app)
          .get('/api/openalex/search?query=data')
          .expect(200);

        expect(response.body).toHaveProperty('cached', true);
        expect(mockFetch).not.toHaveBeenCalled();
      });

      test('Should handle OpenAlex API errors', async () => {
        cache.getSearchResults.mockReturnValueOnce(null);
        mockFetch.mockRejectedValueOnce(new Error('API Error'));

        const response = await request(app)
          .get('/api/openalex/search?query=test')
          .expect(500);

        expect(response.body).toHaveProperty('error');
      });
    });
  });

  // ==========================================
  // 5. AI Endpoints Tests
  // ==========================================
  describe('AI Endpoints', () => {
    describe('POST /api/ai/analyze', () => {
      test('Should require text parameter', async () => {
        const response = await request(app)
          .post('/api/ai/analyze')
          .set('Cookie', `med_auth_token=${authToken()}`)
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('Validation error');
      });

      test('Should return 503 when AI service not configured', async () => {
        // Temporarily remove AI keys
        const config = require('../../config');
        const originalGemini = config.serverConfig.keys.gemini;
        const originalMistral = config.serverConfig.keys.mistral;
        config.serverConfig.keys.gemini = null;
        config.serverConfig.keys.mistral = null;

        const response = await request(app)
          .post('/api/ai/analyze')
          .set('Cookie', `med_auth_token=${authToken()}`)
          .send({ text: 'Test text', analysisType: 'quick' })
          .expect(503);

        expect(response.body).toHaveProperty('error', 'No AI service configured. Add GEMINI_API_KEY or MISTRAL_API_KEY to .env');

        // Restore keys
        config.serverConfig.keys.gemini = originalGemini;
        config.serverConfig.keys.mistral = originalMistral;
      });

      test('Should analyze text and return results', async () => {
        db.getCachedAnalysis.mockResolvedValueOnce(null);
        cache.getAnalysis.mockReturnValueOnce(null);
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: 'This is a test analysis result' }] } }]
          })
        });

        const response = await request(app)
          .post('/api/ai/analyze')
          .set('Cookie', `med_auth_token=${authToken()}`)
          .send({ 
            text: 'This is a medical research text about diabetes treatment.',
            analysisType: 'quick',
            model: 'mistralai/Mistral-7B-Instruct-v0.2'
          })
          .expect(200);

        expect(response.body).toHaveProperty('result');
        expect(response.body).toHaveProperty('model');
        expect(response.body).toHaveProperty('type', 'quick');
        expect(response.body).toHaveProperty('timestamp');
      });

      test('Should return cached analysis from database', async () => {
        const cachedResult = {
          result: 'Cached analysis result',
          model: 'test-model',
          type: 'quick',
          _cached: true
        };
        db.getCachedAnalysis.mockResolvedValueOnce(cachedResult);

        const response = await request(app)
          .post('/api/ai/analyze')
          .set('Cookie', `med_auth_token=${authToken()}`)
          .send({ text: 'Test text', analysisType: 'quick' })
          .expect(200);

        expect(response.body).toHaveProperty('cached', true);
        expect(response.body.result).toBe('Cached analysis result');
        expect(mockFetch).not.toHaveBeenCalled();
      });

      test('Should return cached analysis from memory cache', async () => {
        db.getCachedAnalysis.mockResolvedValueOnce(null);
        cache.getAnalysisAsync.mockResolvedValueOnce({
          result: 'Memory cached result'
        });

        const response = await request(app)
          .post('/api/ai/analyze')
          .set('Cookie', `med_auth_token=${authToken()}`)
          .send({ text: 'Test text', analysisType: 'quick' })
          .expect(200);

        expect(response.body).toHaveProperty('cached', true);
        expect(response.body.result).toBe('Memory cached result');
        expect(mockFetch).not.toHaveBeenCalled();
      });

      test('Should handle AI API errors', async () => {
        db.getCachedAnalysis.mockResolvedValueOnce(null);
        cache.getAnalysisAsync.mockResolvedValueOnce(null);
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        });

        const response = await request(app)
          .post('/api/ai/analyze')
          .set('Cookie', `med_auth_token=${authToken()}`)
          .send({ text: 'Test text', analysisType: 'quick' })
          .expect(500);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('POST /api/ai/explain', () => {
      test('Should require text parameter', async () => {
        const response = await request(app)
          .post('/api/ai/explain')
          .set('Cookie', `med_auth_token=${authToken()}`)
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      test('Should explain text in layperson terms', async () => {
        db.getCachedAnalysis.mockResolvedValueOnce(null);
        cache.getAnalysis.mockReturnValueOnce(null);
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: 'This means that diabetes is a condition where...' }] } }]
          })
        });

        const response = await request(app)
          .post('/api/ai/explain')
          .set('Cookie', `med_auth_token=${authToken()}`)
          .send({ 
            text: 'Diabetes mellitus is a metabolic disorder characterized by hyperglycemia.',
            model: 'mistralai/Mistral-7B-Instruct-v0.2'
          })
          .expect(200);

        expect(response.body).toHaveProperty('result');
        expect(response.body).toHaveProperty('model');
        expect(response.body).toHaveProperty('timestamp');
      });
    });
  });

  // ==========================================
  // 6. Analytics Endpoints Tests
  // ==========================================
  describe('Analytics Endpoints', () => {
    describe('GET /api/analytics/summary', () => {
      test('Should return analytics summary', async () => {
        db.getDailyStats.mockResolvedValueOnce([
          { date: '2024-01-01', searches: 10, analyses: 5, saves: 3 }
        ]);
        db.getPopularSearches.mockResolvedValueOnce([
          { query: 'covid', count: 100, avg_results: 50 }
        ]);

        const response = await request(app)
          .get('/api/analytics/summary')
          .set('Cookie', `med_auth_token=${adminToken()}`)
          .expect(200);

        expect(response.body).toHaveProperty('dailyStats');
        expect(response.body).toHaveProperty('popularSearches');
        expect(response.body.dailyStats).toHaveLength(1);
        expect(response.body.popularSearches).toHaveLength(1);
      });

      test('Should handle database errors', async () => {
        db.getDailyStats.mockRejectedValueOnce(new Error('DB Error'));

        const response = await request(app)
          .get('/api/analytics/summary')
          .set('Cookie', `med_auth_token=${adminToken()}`)
          .expect(500);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('POST /api/analytics/event', () => {
      test('Should log analytics event', async () => {
        db.logEvent.mockResolvedValueOnce({ id: 123 });

        const response = await request(app)
          .post('/api/analytics/event')
          .set('X-Session-Id', 'test-session')
          .send({
            eventType: 'search',
            metadata: { query: 'diabetes', source: 'pubmed' }
          })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('eventId', 123);
      });

      test('Should require eventType', async () => {
        const response = await request(app)
          .post('/api/analytics/event')
          .send({ metadata: {} })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      test('Should handle database errors', async () => {
        db.logEvent.mockRejectedValueOnce(new Error('DB Error'));

        const response = await request(app)
          .post('/api/analytics/event')
          .send({ eventType: 'test', metadata: {} })
          .expect(500);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/analytics/popular', () => {
      test('Should return popular searches', async () => {
        const mockPopular = [
          { query: 'covid', count: 100, avg_results: 50 },
          { query: 'diabetes', count: 75, avg_results: 40 }
        ];
        db.getPopularSearches.mockResolvedValueOnce(mockPopular);

        const response = await request(app)
          .get('/api/analytics/popular')
          .set('Cookie', `med_auth_token=${adminToken()}`)
          .expect(200);

        expect(response.body).toHaveProperty('searches');
        expect(response.body.searches).toHaveLength(2);
        expect(response.body.searches[0]).toHaveProperty('query', 'covid');
      });

      test('Should handle database errors', async () => {
        db.getPopularSearches.mockRejectedValueOnce(new Error('DB Error'));

        const response = await request(app)
          .get('/api/analytics/popular')
          .set('Cookie', `med_auth_token=${adminToken()}`)
          .expect(500);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/analytics/daily', () => {
      test('Should return daily stats', async () => {
        const mockStats = [
          { date: '2024-01-01', searches: 10, analyses: 5, saves: 3 },
          { date: '2024-01-02', searches: 15, analyses: 8, saves: 5 }
        ];
        db.getDailyStats.mockResolvedValueOnce(mockStats);

        const response = await request(app)
          .get('/api/analytics/daily?days=7')
          .set('Cookie', `med_auth_token=${adminToken()}`)
          .expect(200);

        expect(response.body).toHaveProperty('stats');
        expect(response.body.stats).toHaveLength(2);
        expect(response.body.stats[0]).toHaveProperty('searches');
      });

      test('Should use default days parameter', async () => {
        db.getDailyStats.mockResolvedValueOnce([]);

        await request(app)
          .get('/api/analytics/daily')
          .set('Cookie', `med_auth_token=${adminToken()}`)
          .expect(200);

        expect(db.getDailyStats).toHaveBeenCalledWith(30);
      });
    });

    describe('Role-based access control on analytics', () => {
      test('Non-admin user is denied summary (403)', async () => {
        await request(app)
          .get('/api/analytics/summary')
          .set('Cookie', `med_auth_token=${authToken()}`)
          .expect(403);
      });

      test('Non-admin user is denied popular searches (403)', async () => {
        await request(app)
          .get('/api/analytics/popular')
          .set('Cookie', `med_auth_token=${authToken()}`)
          .expect(403);
      });

      test('Unauthenticated request is denied summary (401)', async () => {
        await request(app)
          .get('/api/analytics/summary')
          .expect(401);
      });
    });
  });

  // ==========================================
  // 7. Cache Behavior Tests
  // ==========================================
  describe('Cache Behavior', () => {
    test('Should check cache before fetching from external API', async () => {
      cache.getSearchResults.mockReturnValueOnce(null);
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ esearchresult: { idlist: ['1'] } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ result: { '1': { uid: '1', title: 'Test' } } })
        });

      await request(app)
        .get('/api/pubmed/search?query=test')
        .expect(200);

      expect(cache.getSearchResults).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalled();
    });

    test('Should store results in cache after fetching', async () => {
      cache.getSearchResults.mockReturnValueOnce(null);
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ esearchresult: { idlist: ['1'] } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ result: { '1': { uid: '1', title: 'Test' } } })
        });

      await request(app)
        .get('/api/pubmed/search?query=test')
        .expect(200);

      expect(cache.setSearchResults).toHaveBeenCalled();
    });

    test('Should return cached flag for cache hits', async () => {
      cache.getSearchResults.mockReturnValueOnce({
        results: [{ uid: '1', title: 'Cached' }],
        cachedAt: new Date().toISOString()
      });

      const response = await request(app)
        .get('/api/pubmed/search?query=test')
        .expect(200);

      expect(response.body.cached).toBe(true);
    });
  });

  // ==========================================
  // 8. Error Handling Tests
  // ==========================================
  describe('Error Handling', () => {
    test('Should handle 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/api/unknown-endpoint')
        .expect(404);

      // Express default 404 doesn't have body, just verify status code
      expect(response.status).toBe(404);
    });

    test('Should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/ai/analyze')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('Should handle database connection errors gracefully', async () => {
      db.getSearchHistory.mockRejectedValueOnce(new Error('Connection failed'));

      const response = await request(app)
        .get('/api/user/history')
        .set('X-Session-Id', 'test-session')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    test('Should handle external API timeouts', async () => {
      cache.getSearchResults.mockReturnValueOnce(null);
      mockFetch.mockRejectedValueOnce(new Error('ETIMEDOUT'));

      const response = await request(app)
        .get('/api/pubmed/search?query=test')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    test('Should include proper error messages', async () => {
      cache.getSearchResults.mockReturnValueOnce(null);
      mockFetch.mockRejectedValueOnce(new Error('External API Error'));

      const response = await request(app)
        .get('/api/pubmed/search?query=test')
        .expect(500);

      expect(String(response.body.error)).toMatch(/Internal Server Error|External API Error/);
    });
  });

  // ==========================================
  // 9. User Data Endpoints Tests
  // ==========================================
  describe('User Data Endpoints', () => {
    describe('GET /api/user/history', () => {
      test('Should return search history for session', async () => {
        const mockHistory = [
          { id: 1, query: 'diabetes', results_count: 50, created_at: new Date().toISOString() },
          { id: 2, query: 'cancer', results_count: 30, created_at: new Date().toISOString() }
        ];
        db.getSearchHistory.mockResolvedValueOnce(mockHistory);

        const response = await request(app)
          .get('/api/user/history')
          .set('X-Session-Id', 'test-session')
          .expect(200);

        expect(response.body).toHaveProperty('history');
        expect(response.body.history).toHaveLength(2);
        expect(response.body.history[0]).toHaveProperty('query', 'diabetes');
      });

      test('Should create session if not exists', async () => {
        cache.getSession.mockReturnValueOnce(null);
        db.getSearchHistory.mockResolvedValueOnce([]);

        const response = await request(app)
          .get('/api/user/history')
          .expect(200);

        expect(response.headers).toHaveProperty('x-session-id');
        expect(db.createSession).toHaveBeenCalled();
      });
    });

    describe('POST /api/user/save', () => {
      test('Should save article', async () => {
        const article = {
          uid: '12345',
          title: 'Test Article',
          abstract: 'Test abstract'
        };

        const response = await request(app)
          .post('/api/user/save')
          .set('Cookie', `med_auth_token=${authToken()}`)
          .set('X-Session-Id', 'test-session')
          .send({ article })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(db.saveArticleToUser).toHaveBeenCalledWith('u1', article);
        expect(db.recordUserInteraction).toHaveBeenCalledWith(expect.objectContaining({
          userId: 'u1',
          sessionId: 'test-session',
          articleId: '12345',
          interactionType: 'save',
        }));
      });

      test('Should validate article data', async () => {
        const response = await request(app)
          .post('/api/user/save')
          .set('Cookie', `med_auth_token=${authToken()}`)
          .set('X-Session-Id', 'test-session')
          .send({ article: null })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      test('Should require article.uid', async () => {
        const response = await request(app)
          .post('/api/user/save')
          .set('Cookie', `med_auth_token=${authToken()}`)
          .set('X-Session-Id', 'test-session')
          .send({ article: { title: 'No ID' } })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      test('Should save article to a team when teamId is provided', async () => {
        const article = {
          uid: 'team-article-1',
          title: 'Team Article'
        };

        const response = await request(app)
          .post('/api/user/save')
          .set('Cookie', `med_auth_token=${authToken()}`)
          .set('X-Session-Id', 'test-session')
          .send({ article, teamId: 'team-1' })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(db.getTeamRoleForUser).toHaveBeenCalledWith('team-1', 'u1');
        expect(db.saveArticleToTeam).toHaveBeenCalledWith('team-1', 'u1', article);
      });
    });

    describe('POST /api/user/unsave', () => {
      test('Should unsave article', async () => {
        const response = await request(app)
          .post('/api/user/unsave')
          .set('Cookie', `med_auth_token=${authToken()}`)
          .set('X-Session-Id', 'test-session')
          .send({ articleId: '12345' })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(db.unsaveArticleFromUser).toHaveBeenCalledWith('u1', '12345');
      });

      test('Should handle unsave errors', async () => {
        db.unsaveArticleFromUser.mockRejectedValueOnce(new Error('DB Error'));

        const response = await request(app)
          .post('/api/user/unsave')
          .set('Cookie', `med_auth_token=${authToken()}`)
          .set('X-Session-Id', 'test-session')
          .send({ articleId: '12345' })
          .expect(500);

        expect(response.body).toHaveProperty('error');
      });

      test('Should unsave article from a team when teamId is provided', async () => {
        const response = await request(app)
          .post('/api/user/unsave')
          .set('Cookie', `med_auth_token=${authToken()}`)
          .set('X-Session-Id', 'test-session')
          .send({ articleId: '12345', teamId: 'team-1' })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(db.unsaveArticleFromTeam).toHaveBeenCalledWith('team-1', '12345');
      });
    });

    describe('GET /api/user/saved', () => {
      test('Should return saved articles', async () => {
        const mockArticles = [
          { uid: '1', title: 'Saved Article 1', _savedAt: new Date().toISOString() },
          { uid: '2', title: 'Saved Article 2', _savedAt: new Date().toISOString() }
        ];
        db.getUserSavedArticles.mockResolvedValueOnce(mockArticles);

        const response = await request(app)
          .get('/api/user/saved')
          .set('Cookie', `med_auth_token=${authToken()}`)
          .set('X-Session-Id', 'test-session')
          .expect(200);

        expect(response.body).toHaveProperty('articles');
        expect(response.body.articles).toHaveLength(2);
      });

      test('Should handle database errors', async () => {
        db.getUserSavedArticles.mockRejectedValueOnce(new Error('DB Error'));

        const response = await request(app)
          .get('/api/user/saved')
          .set('Cookie', `med_auth_token=${authToken()}`)
          .set('X-Session-Id', 'test-session')
          .expect(500);

        expect(response.body).toHaveProperty('error');
      });

      test('Should return team saved articles when teamId is provided', async () => {
        db.getTeamSavedArticles.mockResolvedValueOnce([
          { uid: 'team-article-1', title: 'Team Article', _ownerType: 'team', _teamId: 'team-1' }
        ]);

        const response = await request(app)
          .get('/api/user/saved?teamId=team-1')
          .set('Cookie', `med_auth_token=${authToken()}`)
          .set('X-Session-Id', 'test-session')
          .expect(200);

        expect(response.body.articles).toHaveLength(1);
        expect(db.getTeamSavedArticles).toHaveBeenCalledWith('team-1');
      });
    });
  });

  // ==========================================
  // 10. Export, synthesis, and annotations (regression: must register before 404)
  // ==========================================
  describe('BibTeX, synthesis, and article annotations', () => {
    test('POST /api/user/export/bibtex returns text/plain body', async () => {
      const response = await request(app)
        .post('/api/user/export/bibtex')
        .set('Cookie', `med_auth_token=${authToken()}`)
        .set('Content-Type', 'application/json')
        .send({
          articles: [
            {
              uid: '12345678',
              title: 'Test Title',
              authors: [{ name: 'Jane Doe' }],
              source: 'Test Journal',
              pubdate: '2024'
            }
          ]
        })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/plain/);
      expect(response.text).toContain('@article{');
      expect(response.text).toContain('Test Title');
    });

    test('POST /api/ai/synthesize returns synthesis from Gemini (mocked fetch)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Synthesized GRADE summary for tests.' }] } }]
        })
      });

      const response = await request(app)
        .post('/api/ai/synthesize')
        .set('Cookie', `med_auth_token=${authToken({ role: 'pro' })}`)
        .set('Content-Type', 'application/json')
        .send({
          articles: [
            { title: 'A', abstract: 'Abstract one', pubtype: ['Research Support'] },
            { title: 'B', abstract: 'Abstract two' }
          ],
          topic: 'diabetes',
          provider: 'gemini'
        })
        .expect(200);

      expect(response.body).toHaveProperty('synthesis');
      expect(response.body.synthesis).toHaveProperty('consensus', 'Synthesized GRADE summary for tests.');
      expect(response.body).toHaveProperty('articleCount', 2);
    });

    test('POST /api/ai/synthesize/stream persists synthesis snapshot and audit metadata', async () => {
      const synthesis = {
        consensus: 'Streamed GRADE summary for tests [1].',
        evidenceGrade: 'MODERATE',
        keyFindings: ['Finding anchored to the streamed source [1].'],
        clinicalBottomLine: 'Use the result as educational evidence only [1].',
        limitations: 'Small evidence bundle [1].',
        researchGaps: 'More trials are needed [1].',
      };
      const geminiSse = `data: ${JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(synthesis) }] } }],
      })}\n\n`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: (async function* streamGemini() {
          yield Buffer.from(geminiSse);
        })(),
      });

      const response = await request(app)
        .post('/api/ai/synthesize/stream')
        .set('Cookie', `med_auth_token=${authToken({ role: 'pro' })}`)
        .set('Content-Type', 'application/json')
        .send({
          articles: [
            { uid: 'stream-1', title: 'Stream Article', abstract: 'Abstract one', pubtype: ['Randomized Controlled Trial'], _pdfIndexed: true },
          ],
          topic: 'streamed diabetes',
          provider: 'gemini',
        })
        .expect(200);

      expect(response.text).toContain('event: result');
      expect(response.text).toContain('Streamed GRADE summary for tests');
      expect(response.text).toContain('"fullTextCoverageRatio":1');
      expect(db.saveSynthesisSnapshot).toHaveBeenCalledWith(
        'streamed diabetes',
        expect.objectContaining({ consensus: 'Streamed GRADE summary for tests [1].' }),
        ['stream-1']
      );
    });

    test('POST /api/quiz/generate automatically anchors quizzes to weak and untested teaching claims', async () => {
      db.getUserClaimMastery.mockResolvedValueOnce([
        {
          claimKey: 'weakclaim1234567890abcdef',
          claimText: 'Low tidal volume ventilation reduces mortality in suitable ARDS patients.',
          articleUid: 'pmid-1',
          sourcePath: 'synopsis.bottomLine',
          masteryState: 'weak',
          accuracy: 50,
        },
        {
          claimKey: 'untestedclaim1234567890ab',
          claimText: 'Prone positioning is most relevant in severe ARDS with persistent hypoxaemia.',
          articleUid: 'pmid-2',
          sourcePath: 'synopsis.quizFocusPoints',
          masteryState: 'untested',
          accuracy: null,
        },
      ]);
      db.listTeachingObjectClaimsForTopic.mockResolvedValueOnce([
        {
          claimKey: 'weakclaim1234567890abcdef',
          claimText: 'Low tidal volume ventilation reduces mortality in suitable ARDS patients.',
          articleUid: 'pmid-1',
          sourcePath: 'synopsis.bottomLine',
          verificationStatus: 'source_verified',
        },
        {
          claimKey: 'untestedclaim1234567890ab',
          claimText: 'Prone positioning is most relevant in severe ARDS with persistent hypoxaemia.',
          articleUid: 'pmid-2',
          sourcePath: 'synopsis.quizFocusPoints',
          verificationStatus: 'source_verified',
        },
      ]);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify([
                  {
                    questionType: 'clinical_application',
                    question: 'Which ventilatory strategy is best supported for suitable ARDS patients?',
                    options: ['A: Low tidal volume ventilation', 'B: High tidal volume ventilation', 'C: No PEEP', 'D: Routine hyperoxia'],
                    correctAnswer: 'A',
                    explanation: 'Low tidal volume ventilation is the keyed evidence-based answer. [Trial]',
                    distractorRationale: { A: 'Correct - keyed answer.', B: 'Excess volume is harmful.', C: 'Unsupported.', D: 'Unsupported.' },
                    difficulty: 'medium',
                    sourceIndices: [1],
                    outlineNodeId: null,
                    claimKey: 'weakclaim1234567890abcdef',
                  },
                  {
                    questionType: 'pitfall',
                    question: 'What is the key applicability issue for prone positioning?',
                    options: ['A: It is most relevant in severe persistent hypoxaemia', 'B: It applies to all mild cases', 'C: It replaces ventilation strategy', 'D: It is unrelated to severity'],
                    correctAnswer: 'A',
                    explanation: 'Severity and persistent hypoxaemia matter for applicability. [Trial]',
                    distractorRationale: { A: 'Correct - keyed answer.', B: 'Overapplies the claim.', C: 'Incorrect.', D: 'Incorrect.' },
                    difficulty: 'medium',
                    sourceIndices: [1],
                    outlineNodeId: null,
                    claimKey: 'untestedclaim1234567890ab',
                  },
                ]),
              }],
            },
          }],
        }),
      });

      const response = await request(app)
        .post('/api/quiz/generate')
        .set('Cookie', `med_auth_token=${authToken()}`)
        .set('Content-Type', 'application/json')
        .send({
          topic: 'ARDS',
          count: 2,
          articles: [{ uid: 'pmid-1', title: 'ARDSNet ARMA', abstract: 'Low tidal volume ventilation in ARDS.' }],
        })
        .expect(200);

      expect(response.body.claimAnchorMode).toBe('adaptive_teaching_object');
      expect(response.body.adaptiveClaimCount).toBe(2);
      expect(response.body.questions.map((q) => q.claimKey)).toEqual([
        'weakclaim1234567890abcdef',
        'untestedclaim1234567890ab',
      ]);
      const promptBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const prompt = promptBody.contents[0].parts[0].text;
      expect(prompt).toContain('CLAIM-ANCHORED MODE');
      expect(prompt).toContain('weakclaim1234567890abcdef');
      expect(prompt).toContain('untestedclaim1234567890ab');
    });

    test('GET /api/articles/:articleId/annotations returns 401 without token', async () => {
      await request(app)
        .get('/api/articles/12345/annotations')
        .expect(401);
    });

    test('GET /api/articles/:articleId/annotations returns rows with Bearer token', async () => {
      const token = authToken();
      const rows = [
        { id: 1, article_id: '12345', user_id: 'u1', user_name: 'Test User', text: 'Note', position: null, created_at: '2026-01-01T00:00:00.000Z' }
      ];
      db.getAnnotationsByArticle.mockResolvedValueOnce(rows);

      const response = await request(app)
        .get('/api/articles/12345/annotations')
        .set('Cookie', `med_auth_token=${token}`)
        .expect(200);

      expect(response.body).toEqual(rows);
      expect(db.getAnnotationsByArticle).toHaveBeenCalledWith('12345', 'u1');
    });

    test('POST /api/articles/:articleId/annotations creates note with user id and name from JWT', async () => {
      const token = authToken({ id: 'u2', name: 'Dr Smith', email: 's@x.com' });
      const row = {
        id: 99,
        article_id: '999',
        user_id: 'u2',
        user_name: 'Dr Smith',
        text: 'Clinical note',
        position: null,
        created_at: '2026-04-26T12:00:00.000Z'
      };
      db.get.mockResolvedValueOnce(row);

      const response = await request(app)
        .post('/api/articles/999/annotations')
        .set('Cookie', `med_auth_token=${token}`)
        .set('Content-Type', 'application/json')
        .send({ text: 'Clinical note' })
        .expect(201);

      expect(response.body).toMatchObject({ text: 'Clinical note', user_name: 'Dr Smith', user_id: 'u2' });
      expect(db.createAnnotation).toHaveBeenCalledWith('999', 'u2', 'Dr Smith', 'Clinical note', null);
    });
  });

  // ==========================================
  // 10. Security Headers Tests
  // ==========================================
  describe('Security Headers', () => {
    test('Should include session ID header', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-session-id');
    });

    test('Should preserve existing session ID', async () => {
      cache.getSession.mockReturnValueOnce({ createdAt: new Date().toISOString() });
      
      const response = await request(app)
        .get('/health')
        .set('X-Session-Id', 'existing-session')
        .expect(200);

      // HTTP headers are case-insensitive, supertest lowercases them
      expect(response.headers['x-session-id']).toBeDefined();
    });

    test('Should handle session activity update', async () => {
      cache.getSession.mockReturnValueOnce({ createdAt: new Date().toISOString() });

      await request(app)
        .get('/health')
        .set('X-Session-Id', 'existing-session')
        .expect(200);

      expect(db.updateSessionActivity).toHaveBeenCalledWith('existing-session');
    });
  });

  // ==========================================
  // 11. Admin Endpoints Tests
  // ==========================================
  describe('Admin Endpoints', () => {
    describe('GET /api/admin/stats', () => {
      test('Should return admin stats', async () => {
        cache.getStats.mockReturnValueOnce({ keys: 10, hitRate: '80%' });

        const response = await request(app)
          .get('/api/admin/stats')
          .set('Cookie', `med_auth_token=${authToken({ id: 'admin-1', name: 'Admin', email: 'admin@test.com', role: 'admin' })}`)
          .expect(200);

        expect(response.body).toHaveProperty('cache');
        expect(response.body).toHaveProperty('database');
        expect(response.body.cache).toHaveProperty('keys', 10);
      });
    });

    describe('GET /api/admin/learning-health', () => {
      test('Should return learning observability for curators', async () => {
        db.getLearningObservability.mockResolvedValueOnce({
          generatedAt: '2026-05-16T12:00:00.000Z',
          topBouquetTopics: [
            { normalizedTopic: 'sepsis', displayTopic: 'Sepsis', totalSignals: 8, distinctArticles: 3, lastSeenAt: '2026-05-16T10:00:00.000Z' },
          ],
          lowRecall: {
            days: 14,
            items: [
              { normalizedTopic: 'rare vasculitis', displayQuery: 'rare vasculitis', resultCount: 2, expandedAliases: ['small vessel vasculitis'], attemptCount: 2, lastSeenAt: '2026-05-16T09:00:00.000Z' },
            ],
          },
          aliasSeededTopics: [],
          vectorUsage: { windowDays: 14, used: 9, notUsed: 1, total: 10, usageRate: 0.9 },
          refreshCandidates: [],
          schedulerRuns: [
            { id: 1, runType: 'topic_refresh', status: 'completed', candidatesCount: 1, refreshedCount: 1, skippedCount: 0, errorCount: 0, details: {}, startedAt: '2026-05-16T08:00:00.000Z', finishedAt: '2026-05-16T08:01:00.000Z' },
          ],
        });

        const response = await request(app)
          .get('/api/admin/learning-health?limit=12&days=14')
          .set('Cookie', `med_auth_token=${authToken({ id: 'curator-1', name: 'Curator', email: 'curator@test.com', role: 'curator' })}`)
          .expect(200);

        expect(response.body.health.vectorUsage.usageRate).toBe(0.9);
        expect(response.body.health.topBouquetTopics[0].displayTopic).toBe('Sepsis');
        expect(db.getLearningObservability).toHaveBeenCalledWith({ limit: 12, lowRecallDays: 14 });
      });
    });

    describe('Curriculum seed topics', () => {
      test('POST /api/admin/curriculum/import-core-topics imports bundled topic list', async () => {
        db.importCurriculumSeedTopics.mockResolvedValueOnce({
          importedCount: 103,
          topics: [{ id: 1, block: 'Cardiovascular', displayName: 'Hypertension', seedStatus: 'not_seeded' }],
        });

        const response = await request(app)
          .post('/api/admin/curriculum/import-core-topics')
          .set('Cookie', `med_auth_token=${authToken({ id: 'curator-1', name: 'Curator', email: 'curator@test.com', role: 'curator' })}`)
          .expect(200);

        expect(response.body.importedCount).toBe(103);
        expect(response.body.source).toBe('server/data/coreClinicalTopics.json');
        expect(db.importCurriculumSeedTopics).toHaveBeenCalledWith(
          expect.arrayContaining([expect.objectContaining({ displayName: 'Hypertension' })]),
          expect.objectContaining({ curriculumSlug: 'core-clinical-topics' })
        );
      });

      test('GET /api/admin/curriculum/seed-topics lists imported seed topics', async () => {
        db.listCurriculumSeedTopics.mockResolvedValueOnce([
          { id: 1, block: 'Cardiovascular', displayName: 'Hypertension', seedStatus: 'not_seeded' },
        ]);

        const response = await request(app)
          .get('/api/admin/curriculum/seed-topics?limit=25&seedStatus=not_seeded')
          .set('Cookie', `med_auth_token=${authToken({ id: 'curator-1', name: 'Curator', email: 'curator@test.com', role: 'curator' })}`)
          .expect(200);

        expect(response.body.count).toBe(1);
        expect(response.body.topics[0].displayName).toBe('Hypertension');
        expect(db.listCurriculumSeedTopics).toHaveBeenCalledWith({ seedStatus: 'not_seeded', limit: 25, offset: 0 });
      });

      test('POST /api/admin/curriculum/seed-topics/:topicId/seed seeds one topic', async () => {
        const { seedCurriculumTopic } = require('../../server/services/curriculumSeedService');

        const response = await request(app)
          .post('/api/admin/curriculum/seed-topics/1/seed')
          .send({ background: false, searchLimit: 24, synthesisArticles: 8, synopsisArticles: 3 })
          .set('Cookie', `med_auth_token=${authToken({ id: 'curator-1', name: 'Curator', email: 'curator@test.com', role: 'curator' })}`)
          .expect(200);

        expect(response.body.topic.displayName).toBe('Hypertension');
        expect(response.body.synopsisCount).toBe(3);
        expect(seedCurriculumTopic).toHaveBeenCalledWith(expect.objectContaining({
          db,
          cache,
          provider: 'auto',
          topicId: '1',
          limits: expect.objectContaining({
            searchLimit: 24,
            synthesisArticles: 8,
            synopsisArticles: 3,
          }),
        }));
      });

      test('POST /api/admin/curriculum/seed-topics/:topicId/seed queues background seeding by default', async () => {
        db.getCurriculumSeedTopic.mockResolvedValueOnce({ id: 2, displayName: 'COPD', seedStatus: 'not_seeded' });
        db.updateCurriculumSeedStatus.mockResolvedValueOnce({ id: 2, displayName: 'COPD', seedStatus: 'queued' });

        const response = await request(app)
          .post('/api/admin/curriculum/seed-topics/2/seed')
          .send({ searchLimit: 10 })
          .set('Cookie', `med_auth_token=${authToken({ id: 'curator-1', name: 'Curator', email: 'curator@test.com', role: 'curator' })}`)
          .expect(202);

        expect(response.body.accepted).toBe(true);
        expect(response.body.topic.seedStatus).toBe('queued');
        expect(db.getCurriculumSeedTopic).toHaveBeenCalledWith('2');
        expect(db.updateCurriculumSeedStatus).toHaveBeenCalledWith('2', { seedStatus: 'queued' });
      });

      test('POST /api/admin/curriculum/seed-batch runs a capped seed batch', async () => {
        const { runCurriculumSeedBatch } = require('../../server/services/curriculumSeedScheduler');

        const response = await request(app)
          .post('/api/admin/curriculum/seed-batch')
          .send({ batchSize: 2, searchLimit: 24, synthesisArticles: 8, synopsisArticles: 3 })
          .set('Cookie', `med_auth_token=${authToken({ id: 'curator-1', name: 'Curator', email: 'curator@test.com', role: 'curator' })}`)
          .expect(200);

        expect(response.body.refreshedCount).toBe(2);
        expect(runCurriculumSeedBatch).toHaveBeenCalledWith(expect.objectContaining({
          db,
          cache,
          batchSize: 2,
          limits: expect.objectContaining({
            searchLimit: 24,
            synthesisArticles: 8,
            synopsisArticles: 3,
          }),
        }));
      });

      test('GET /api/admin/curriculum/scheduler returns seed scheduler observability', async () => {
        db.listLearningSchedulerRuns.mockResolvedValueOnce([
          { id: 9, runType: 'curriculum_seed', status: 'completed', refreshedCount: 2, errorCount: 0 },
        ]);
        db.listCurriculumSeedCandidates
          .mockResolvedValueOnce([{ id: 1, displayName: 'Hypertension', seedStatus: 'not_seeded' }])
          .mockResolvedValueOnce([{ id: 2, displayName: 'COPD', seedStatus: 'failed' }]);
        db.getCurriculumSeedStatusCounts.mockResolvedValueOnce([
          { seedStatus: 'seeded', count: 10, claimCount: 80 },
        ]);

        const response = await request(app)
          .get('/api/admin/curriculum/scheduler?limit=6')
          .set('Cookie', `med_auth_token=${authToken({ id: 'curator-1', name: 'Curator', email: 'curator@test.com', role: 'curator' })}`)
          .expect(200);

        expect(response.body.scheduler.runs[0].status).toBe('completed');
        expect(response.body.scheduler.dueTopics[0].displayName).toBe('Hypertension');
        expect(response.body.scheduler.failedTopics[0].seedStatus).toBe('failed');
        expect(response.body.scheduler.guardrails.blockedReason).toBe(null);
        expect(db.listLearningSchedulerRuns).toHaveBeenCalledWith({ runType: 'curriculum_seed', limit: 6 });
        expect(db.listCurriculumSeedCandidates).toHaveBeenNthCalledWith(1, { limit: 10 });
        expect(db.listCurriculumSeedCandidates).toHaveBeenNthCalledWith(2, {
          limit: 10,
          seedStatuses: ['failed', 'failed_low_recall', 'seeded_with_warnings'],
        });
      });

      test('PATCH /api/admin/curriculum/scheduler/settings updates guardrails', async () => {
        const { updateCurriculumSeedSchedulerSettings } = require('../../server/services/curriculumSeedScheduler');

        const response = await request(app)
          .patch('/api/admin/curriculum/scheduler/settings')
          .send({ enabled: false, maxTopicsPerDay: 3 })
          .set('Cookie', `med_auth_token=${authToken({ id: 'curator-1', name: 'Curator', email: 'curator@test.com', role: 'curator' })}`)
          .expect(200);

        expect(response.body.settings.enabled).toBe(false);
        expect(updateCurriculumSeedSchedulerSettings).toHaveBeenCalledWith(db, { enabled: false, maxTopicsPerDay: 3 });
      });

      test('POST /api/admin/curriculum/retry-failed retries failed seed statuses only', async () => {
        const { runCurriculumSeedBatch } = require('../../server/services/curriculumSeedScheduler');

        await request(app)
          .post('/api/admin/curriculum/retry-failed')
          .send({ batchSize: 2 })
          .set('Cookie', `med_auth_token=${authToken({ id: 'curator-1', name: 'Curator', email: 'curator@test.com', role: 'curator' })}`)
          .expect(200);

        expect(runCurriculumSeedBatch).toHaveBeenCalledWith(expect.objectContaining({
          seedStatuses: ['failed', 'failed_low_recall', 'seeded_with_warnings'],
          batchSize: 2,
        }));
      });
    });

    describe('Teaching claim review queue', () => {
      test('GET /api/admin/teaching-claims/review returns curator claim queue', async () => {
        db.listTeachingClaimsForReview.mockResolvedValueOnce([
          {
            claimKey: 'claim-1',
            claimText: 'Draft agent claim.',
            verificationStatus: 'agent_draft',
            verificationReason: 'Generated from chat',
            topic: 'ARDS',
            objectType: 'agent_answer',
            quizAttempts: 3,
          },
        ]);

        const response = await request(app)
          .get('/api/admin/teaching-claims/review?topic=ARDS&status=agent_draft&limit=12')
          .set('Cookie', `med_auth_token=${authToken({ id: 'curator-1', name: 'Curator', email: 'curator@test.com', role: 'curator' })}`)
          .expect(200);

        expect(response.body.claims[0]).toHaveProperty('claimKey', 'claim-1');
        expect(db.listTeachingClaimsForReview).toHaveBeenCalledWith({
          topic: 'ARDS',
          status: 'agent_draft',
          limit: 12,
          offset: 0,
        });
      });

      test('PATCH /api/admin/teaching-claims/:claimKey/verification updates trust status', async () => {
        db.updateTeachingClaimVerification.mockResolvedValueOnce({
          claimKey: 'claim-1',
          claimText: 'Reviewed claim.',
          verificationStatus: 'human_reviewed',
        });

        const response = await request(app)
          .patch('/api/admin/teaching-claims/claim-1/verification')
          .set('Cookie', `med_auth_token=${authToken({ id: 'curator-1', name: 'Curator', email: 'curator@test.com', role: 'curator' })}`)
          .send({ verificationStatus: 'human_reviewed', verificationReason: 'Checked against full text.' })
          .expect(200);

        expect(response.body.claim.verificationStatus).toBe('human_reviewed');
        expect(db.updateTeachingClaimVerification).toHaveBeenCalledWith('claim-1', {
          verificationStatus: 'human_reviewed',
          verificationReason: 'Checked against full text.',
          claimText: undefined,
          reviewerId: 'curator-1',
        });
      });

      test('POST /api/admin/teaching-claims/:claimKey/guideline-check marks supported claims', async () => {
        db.getTeachingClaimByKey.mockResolvedValueOnce({
          claimKey: 'claim-2',
          claimText: 'Use low tidal volume ventilation in adults with ARDS.',
          topic: 'ARDS',
          normalizedTopic: 'ards',
          verificationStatus: 'source_verified',
        });
        db.getGuidelinesByTopic.mockResolvedValueOnce([
          {
            source_body: 'ATS',
            recommendation_text: 'Use low tidal volume ventilation for adults with ARDS.',
          },
        ]);
        db.updateTeachingClaimVerification.mockResolvedValueOnce({
          claimKey: 'claim-2',
          claimText: 'Use low tidal volume ventilation in adults with ARDS.',
          verificationStatus: 'guideline_supported',
        });

        const response = await request(app)
          .post('/api/admin/teaching-claims/claim-2/guideline-check')
          .set('Cookie', `med_auth_token=${authToken({ id: 'curator-1', name: 'Curator', email: 'curator@test.com', role: 'curator' })}`)
          .expect(200);

        expect(response.body.alignment.alignmentStatus).toMatch(/supported/);
        expect(response.body.claim.verificationStatus).toBe('guideline_supported');
        expect(db.updateTeachingClaimVerification).toHaveBeenCalledWith('claim-2', expect.objectContaining({
          verificationStatus: 'guideline_supported',
          reviewerId: 'curator-1',
        }));
      });
    });

    describe('POST /api/admin/cache/clear', () => {
      test('Should clear cache', async () => {
        db.cleanExpiredCache.mockResolvedValueOnce(5);

        const response = await request(app)
          .post('/api/admin/cache/clear')
          .set('Cookie', `med_auth_token=${authToken({ id: 'admin-1', name: 'Admin', email: 'admin@test.com', role: 'admin' })}`)
          .expect(200);

        expect(response.body).toHaveProperty('message', 'Cache cleared');
        expect(response.body).toHaveProperty('dbCleaned', 5);
        expect(cache.flush).toHaveBeenCalled();
        expect(db.cleanExpiredCache).toHaveBeenCalled();
      });

      test('Should handle cache clear errors', async () => {
        db.cleanExpiredCache.mockRejectedValueOnce(new Error('DB Error'));
        cache.flush.mockImplementationOnce(() => {}); // Don't throw here

        const response = await request(app)
          .post('/api/admin/cache/clear')
          .set('Cookie', `med_auth_token=${authToken({ id: 'admin-1', name: 'Admin', email: 'admin@test.com', role: 'admin' })}`)
          .expect(500);

        expect(response.body).toHaveProperty('error');
      }, 15000);
    });
  });

  // ==========================================
  // 12. HTTP Method Regression Tests (non-GET browser APIs)
  // ==========================================
  describe('HTTP Method Regression', () => {
    test('PATCH /api/reviews/:id/articles/:articleId/screening accepts PATCH', async () => {
      db.updateReviewScreening.mockResolvedValueOnce({ review_id: 'r-1', article_id: 'a-1', screening_status: 'included' });
      db.getReviewPrismaCounts.mockResolvedValueOnce({ total: 1, pending: 0, included: 1, excluded: 0, maybe: 0 });
      db.getReviewProject.mockResolvedValueOnce({ id: 'r-1', owner_type: 'session', owner_id: 'test-session' });

      const response = await request(app)
        .patch('/api/reviews/r-1/articles/a-1/screening')
        .set('Content-Type', 'application/json')
        .set('X-Session-Id', 'test-session')
        .send({ decision: 'included' })
        .expect(200);

      expect(response.body).toHaveProperty('article');
    });

    test('OPTIONS preflight returns allowed methods including PATCH, PUT, DELETE', async () => {
      const response = await request(app)
        .options('/api/reviews/r-1/articles/a-1/screening')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'PATCH')
        .expect(204);

      const allowMethods = response.headers['access-control-allow-methods'] || '';
      expect(allowMethods).toContain('PATCH');
      expect(allowMethods).toContain('PUT');
      expect(allowMethods).toContain('DELETE');
    });

    test('PUT request to unknown endpoint returns 404', async () => {
      const response = await request(app)
        .put('/api/unknown-endpoint')
        .set('Content-Type', 'application/json')
        .send({})
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    test('DELETE request to unknown endpoint returns 404', async () => {
      const response = await request(app)
        .delete('/api/unknown-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  // ==========================================
  // 13. Review Assistant + Case Mode Tests
  // ==========================================
  describe('Review Assistant', () => {
    test('POST /api/reviews should create a review project', async () => {
      db.createReviewProject.mockResolvedValueOnce({
        id: 'r-1',
        title: 'ARDS steroids',
        question: 'Should steroids be used in ARDS?',
        criteria: { inclusion: [], exclusion: [] },
      });

      const response = await request(app)
        .post('/api/reviews')
        .set('Cookie', `med_auth_token=${authToken()}`)
        .set('Content-Type', 'application/json')
        .send({
          question: 'Should steroids be used in ARDS?',
          criteria: { inclusion: ['adult ARDS'], exclusion: ['animal studies'] },
        })
        .expect(201);

      expect(response.body).toHaveProperty('review');
      expect(response.body.review).toHaveProperty('id', 'r-1');
    });

    test('POST /api/reviews should create a team-owned review project', async () => {
      db.createReviewProject.mockResolvedValueOnce({
        id: 'r-team',
        title: 'Team Review',
        question: 'Team question?',
        criteria: { inclusion: [], exclusion: [] },
        owner_type: 'team',
        owner_id: 'team-1',
      });

      const response = await request(app)
        .post('/api/reviews')
        .set('Cookie', `med_auth_token=${authToken()}`)
        .set('Content-Type', 'application/json')
        .send({
          question: 'Team question?',
          ownerType: 'team',
          teamId: 'team-1',
          criteria: { inclusion: [], exclusion: [] },
        })
        .expect(201);

      expect(response.body.review).toHaveProperty('owner_type', 'team');
      expect(db.getTeamRoleForUser).toHaveBeenCalledWith('team-1', 'u1');
      expect(db.createReviewProject).toHaveBeenCalledWith(expect.objectContaining({
        ownerType: 'team',
        ownerId: 'team-1',
      }));
    });

    test('GET /api/reviews/:id should allow team members to read team reviews', async () => {
      db.getReviewProject.mockResolvedValueOnce({ id: 'r-team', owner_type: 'team', owner_id: 'team-1' });
      db.listReviewArticles.mockResolvedValueOnce([]);
      db.getReviewPrismaCounts.mockResolvedValueOnce({ total: 0, pending: 0, included: 0, excluded: 0, maybe: 0 });

      const response = await request(app)
        .get('/api/reviews/r-team')
        .set('Cookie', `med_auth_token=${authToken()}`)
        .set('X-Session-Id', 'test-session')
        .expect(200);

      expect(response.body).toHaveProperty('review');
      expect(db.getTeamRoleForUser).toHaveBeenCalledWith('team-1', 'u1');
    });

    test('POST /api/reviews/:id/articles should add review articles', async () => {
      db.getReviewProject.mockResolvedValueOnce({ id: 'r-1', owner_type: 'session', owner_id: 'test-session' });
      db.listReviewArticles.mockResolvedValueOnce([]);
      db.addReviewArticles.mockResolvedValueOnce([
        {
          review_id: 'r-1',
          article_id: 'a-1',
          article_data: { uid: 'a-1', title: 'Trial A' },
          screening_status: 'pending',
        },
      ]);

      const response = await request(app)
        .post('/api/reviews/r-1/articles')
        .set('Content-Type', 'application/json')
        .set('X-Session-Id', 'test-session')
        .send({ articles: [{ uid: 'a-1', title: 'Trial A' }] })
        .expect(200);

      expect(response.body).toHaveProperty('articles');
      expect(response.body.articles[0]).toHaveProperty('article_id', 'a-1');
    });

    test('PATCH /api/reviews/:id/articles/:articleId/screening should update decision', async () => {
      db.getReviewProject.mockResolvedValueOnce({ id: 'r-1', owner_type: 'session', owner_id: 'test-session' });
      db.updateReviewScreening.mockResolvedValueOnce({
        review_id: 'r-1',
        article_id: 'a-1',
        screening_status: 'included',
      });
      db.getReviewPrismaCounts.mockResolvedValueOnce({
        total: 1,
        pending: 0,
        included: 1,
        excluded: 0,
        maybe: 0,
      });

      const response = await request(app)
        .patch('/api/reviews/r-1/articles/a-1/screening')
        .set('Content-Type', 'application/json')
        .set('X-Session-Id', 'test-session')
        .send({ decision: 'included' })
        .expect(200);

      expect(response.body).toHaveProperty('article');
      expect(response.body).toHaveProperty('prisma');
      expect(response.body.prisma).toHaveProperty('included', 1);
    });
  });

  describe('Patient Case Mode', () => {
    test('POST /api/cases/analyze should return research-assistant output', async () => {
      const geminiQuery = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    searchQuery: 'ARDS mechanical ventilation low tidal volume',
                    populationHint: 'adults',
                    interventionHint: 'ventilation',
                    outcomeHint: '',
                  }),
                },
              ],
            },
          },
        ],
      };
      const geminiSynthesis = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    caseSummary: 'ARDS case with severe hypoxemia.',
                    interventions: [
                      {
                        name: 'Low tidal volume ventilation',
                        evidenceStrength: 'HIGH',
                        rationale: 'Consistent trial evidence',
                        citations: [1],
                      },
                    ],
                    uncertainties: ['Steroid timing heterogeneity'],
                    safetyNotes: 'Research-use only.',
                  }),
                },
              ],
            },
          },
        ],
      };

      mockFetch.mockReset();
      // Order: geminiQuery → MeSH Phase 1 → [pubmed-esearch, semantic, openalex in parallel] → pubmed-esummary → geminiSynthesis
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => geminiQuery })
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ esearchresult: { idlist: ['555'] } }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              555: {
                uid: '555',
                title: 'Ventilation strategies in ARDS',
                pubdate: '2021',
                source: 'Intensive Care Med',
                pmcrefcount: 40,
                authors: [{ name: 'Jane Doe' }],
              },
            },
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => geminiSynthesis });

      const response = await request(app)
        .post('/api/cases/analyze')
        .set('Cookie', `med_auth_token=${authToken()}`)
        .set('Content-Type', 'application/json')
        .send({ caseText: '68-year-old male with ARDS on ventilation' })
        .expect(200);

      expect(response.body).toHaveProperty('caseSummary');
      expect(response.body).toHaveProperty('interventions');
      expect(Array.isArray(response.body.interventions)).toBe(true);
      expect(response.body).toHaveProperty('vectorUsed');
      expect(response.body.vectorUsed).toBe(false);
      expect(response.body).toHaveProperty('searchSources');
      expect(Array.isArray(response.body.citations)).toBe(true);
      expect(response.body.citations[0]).toMatchObject({ title: expect.stringMatching(/ARDS/i) });
    });
  });

  // ==========================================
  // 14. Learning Agent Endpoints
  // ==========================================
  describe('Learning Agent', () => {
    test('GET /api/learning/profile returns 404 when no profile exists', async () => {
      db.getLearningProfile.mockResolvedValueOnce(null);
      const response = await request(app)
        .get('/api/learning/profile')
        .set('Cookie', `med_auth_token=${authToken()}`)
        .expect(404);
      expect(response.body).toHaveProperty('error', 'Profile not found');
    });

    test('POST /api/learning/profile creates a profile', async () => {
      db.upsertLearningProfile.mockResolvedValueOnce({ id: 1, userId: 'u1', persona: 'student' });
      const response = await request(app)
        .post('/api/learning/profile')
        .set('Cookie', `med_auth_token=${authToken()}`)
        .set('Content-Type', 'application/json')
        .send({ persona: 'student', goals: ['master ARDS'] })
        .expect(200);
      expect(response.body.profile).toHaveProperty('persona', 'student');
    });

    test('POST /api/learning/quiz-attempt submits attempts and returns mastery', async () => {
      db.createQuizAttempt.mockResolvedValue({ id: 1 });
      db.getQuizAttemptStats.mockResolvedValue([
        { question_type: 'recall', is_correct: 1 },
        { question_type: 'clinical_application', is_correct: 0 },
      ]);
      const response = await request(app)
        .post('/api/learning/quiz-attempt')
        .set('Cookie', `med_auth_token=${authToken()}`)
        .set('Content-Type', 'application/json')
        .send({
          topic: 'ARDS',
          attempts: [
            { questionId: 'q1', questionType: 'recall', questionText: 'What is PEEP?', userAnswer: 'A', correctAnswer: 'A', isCorrect: true },
            { questionId: 'q2', questionType: 'clinical_application', questionText: 'Case...', userAnswer: 'B', correctAnswer: 'C', isCorrect: false },
          ],
        })
        .expect(200);
      expect(response.body).toHaveProperty('saved', 2);
      expect(response.body).toHaveProperty('mastery');
    });

    test('POST /api/learning/quiz-attempt records evidence judgement tags', async () => {
      db.getQuizAttemptStats.mockResolvedValue([{ question_type: 'trial_interpretation', is_correct: 0 }]);

      await request(app)
        .post('/api/learning/quiz-attempt')
        .set('Cookie', `med_auth_token=${authToken()}`)
        .set('Content-Type', 'application/json')
        .send({
          topic: 'Sepsis',
          attempts: [
            {
              questionId: 'q-trial',
              questionType: 'trial_interpretation',
              questionText: 'This randomised trial used a composite primary outcome and subgroup analysis. What is the main limitation?',
              userAnswer: 'It proves mortality benefit',
              correctAnswer: 'Do not overclaim; assess outcome hierarchy and applicability',
              isCorrect: false,
            },
          ],
        })
        .expect(200);

      expect(db.createQuizAttempt).toHaveBeenCalledWith(expect.objectContaining({
        reasoningTags: expect.arrayContaining(['trial_design_weakness', 'misses_outcome_hierarchy', 'overclaims_evidence']),
        reasoningNote: expect.stringContaining('Auto-classified evidence judgement signal'),
      }));
    });

    test('GET /api/learning/claim-mastery returns claim-level mastery', async () => {
      db.getUserClaimMastery.mockResolvedValueOnce([
        {
          claimKey: 'abc123',
          claimText: 'Avoid overclaiming mortality benefit.',
          evidenceQuote: 'Trial abstract snippet.',
          sourcePath: 'synopsis.whatNotToOverclaim',
          attempts: 2,
          correct: 1,
          accuracy: 50,
          masteryState: 'weak',
        },
      ]);

      const response = await request(app)
        .get('/api/learning/claim-mastery/ARDS?limit=20')
        .set('Cookie', `med_auth_token=${authToken()}`)
        .expect(200);

      expect(db.getUserClaimMastery).toHaveBeenCalledWith('u1', 'ARDS', { limit: 20 });
      expect(response.body.summary).toMatchObject({ total: 1, weak: 1, mastered: 0 });
      expect(response.body.claims[0]).toHaveProperty('claimKey', 'abc123');
    });

    test('GET /api/learning/evidence-judgement-profile returns reasoning profile', async () => {
      db.getEvidenceJudgementProfile.mockResolvedValueOnce({
        topic: 'ARDS',
        totalTaggedAttempts: 3,
        generatedAt: '2026-05-18T00:00:00.000Z',
        tags: [{ tag: 'overclaims_evidence', count: 2, wrongCount: 2, lastSeenAt: '2026-05-18T00:00:00.000Z', examples: [] }],
      });

      const response = await request(app)
        .get('/api/learning/evidence-judgement-profile?topic=ARDS&limit=5')
        .set('Cookie', `med_auth_token=${authToken()}`)
        .expect(200);

      expect(db.getEvidenceJudgementProfile).toHaveBeenCalledWith('u1', { topic: 'ARDS', limit: 5 });
      expect(response.body.profile.tags[0]).toHaveProperty('tag', 'overclaims_evidence');
    });

    test('GET /api/learning/practice-alerts returns practice-changing teaching objects', async () => {
      db.listPracticeChangingTeachingObjects.mockResolvedValueOnce([
        {
          objectKey: 'paper:123',
          objectType: 'paper',
          topic: 'COPD',
          title: 'Trial that changes practice',
          classification: 'practice_changing',
          rationale: 'This should change practice in a narrow subgroup.',
        },
      ]);

      const response = await request(app)
        .get('/api/learning/practice-alerts?topic=COPD&limit=10')
        .set('Cookie', `med_auth_token=${authToken()}`)
        .expect(200);

      expect(db.listPracticeChangingTeachingObjects).toHaveBeenCalledWith({ topic: 'COPD', limit: 10 });
      expect(response.body.alerts[0]).toHaveProperty('classification', 'practice_changing');
    });

    test('GET /api/learning/staleness detects claim-level synthesis drift', async () => {
      db.getLatestSynthesisSnapshots.mockResolvedValueOnce([
        {
          evidence_grade: 'MODERATE',
          key_finding_count: 2,
          claim_fingerprint: 'new-fingerprint',
          claim_texts_json: JSON.stringify(['New safety signal in renal impairment.', 'Benefit limited to subgroup A.']),
          generated_at: '2026-05-19T00:00:00.000Z',
        },
        {
          evidence_grade: 'MODERATE',
          key_finding_count: 2,
          claim_fingerprint: 'old-fingerprint',
          claim_texts_json: JSON.stringify(['Older broad benefit claim.', 'Benefit limited to subgroup A.']),
          generated_at: '2026-05-01T00:00:00.000Z',
        },
      ]);

      const response = await request(app)
        .get('/api/learning/staleness?topic=COPD')
        .set('Cookie', `med_auth_token=${authToken()}`)
        .expect(200);

      expect(response.body.significantChange).toBe(true);
      expect(response.body.changes).toEqual(expect.arrayContaining([
        expect.stringContaining('Clinical teaching claims changed'),
        expect.stringContaining('New/changed claim: New safety signal'),
        expect.stringContaining('Prior claim no longer prominent: Older broad benefit claim'),
      ]));
    });

    test('POST /api/learning/study-runs creates a run with outline coverage', async () => {
      db.getTopicKnowledge.mockResolvedValueOnce({
        id: 7,
        topic: 'ARDS',
        knowledge: {
          teachingPoints: [{ claim: 'Use low tidal volume ventilation', sourceIndices: [1] }],
          mcqAngles: ['Ventilation strategy'],
        },
        sourceArticles: [{ sourceIndex: 1, title: 'ARMA trial', uid: 'pmid-1' }],
      });
      db.createStudyRun.mockResolvedValueOnce({
        id: 42,
        userId: 'u1',
        topic: 'ARDS',
        outlineId: 7,
        progress: { totalNodes: 3, coveredNodes: 0 },
        nodeCoverage: {},
      });

      const response = await request(app)
        .post('/api/learning/study-runs')
        .set('Cookie', `med_auth_token=${authToken()}`)
        .set('Content-Type', 'application/json')
        .send({ topic: 'ARDS' })
        .expect(201);

      expect(db.createStudyRun).toHaveBeenCalledWith('u1', expect.objectContaining({
        topic: 'ARDS',
        outlineId: 7,
        progress: expect.objectContaining({ totalNodes: 3, coveredNodes: 0 }),
        nodeCoverage: expect.objectContaining({
          'tp-1': expect.objectContaining({ seen: false }),
          'mcq-1': expect.objectContaining({ seen: false }),
          'src-1': expect.objectContaining({ seen: false }),
        }),
      }));
      expect(response.body.outline.nodes).toHaveLength(3);
      expect(response.body).toHaveProperty('resumed', false);
    });

    test('POST /api/learning/study-runs resumes an active run for same topic', async () => {
      db.getActiveStudyRun.mockResolvedValueOnce({
        id: 43,
        userId: 'u1',
        topic: 'ARDS',
        outlineId: null,
        progress: {},
        nodeCoverage: {},
      });
      db.getTopicKnowledge.mockResolvedValueOnce({
        id: 7,
        topic: 'ARDS',
        knowledge: { teachingPoints: ['Berlin definition'] },
        sourceArticles: [],
      });

      const response = await request(app)
        .post('/api/learning/study-runs')
        .set('Cookie', `med_auth_token=${authToken()}`)
        .set('Content-Type', 'application/json')
        .send({ topic: 'ARDS' })
        .expect(200);

      expect(db.createStudyRun).not.toHaveBeenCalled();
      expect(response.body.run).toHaveProperty('id', 43);
      expect(response.body).toHaveProperty('resumed', true);
    });

    test('POST /api/learning/quiz-attempt updates study-run node coverage', async () => {
      db.getStudyRun.mockResolvedValueOnce({
        id: 99,
        userId: 'u1',
        topic: 'ARDS',
        progress: { totalNodes: 2, coveredNodes: 0, quizAttempts: 0 },
        nodeCoverage: {
          'tp-1': { seen: false, quizAttempts: 0, correct: 0, lastAttemptAt: null },
          'src-1': { seen: false, quizAttempts: 0, correct: 0, lastAttemptAt: null },
        },
      });
      db.getQuizAttemptStats.mockResolvedValueOnce([{ question_type: 'recall', is_correct: 1 }]);

      await request(app)
        .post('/api/learning/quiz-attempt')
        .set('Cookie', `med_auth_token=${authToken()}`)
        .set('Content-Type', 'application/json')
        .send({
          topic: 'ARDS',
          studyRunId: 99,
          attempts: [
            { questionId: 'q1', questionType: 'recall', questionText: 'ARDS?', userAnswer: 'A', correctAnswer: 'A', isCorrect: true, outlineNodeId: 'tp-1' },
          ],
        })
        .expect(200);

      expect(db.updateStudyRun).toHaveBeenCalledWith(99, expect.objectContaining({
        nodeCoverage: expect.objectContaining({
          'tp-1': expect.objectContaining({ seen: true, quizAttempts: 1, correct: 1 }),
        }),
        progress: expect.objectContaining({ coveredNodes: 1, totalNodes: 2, quizAttempts: 1 }),
      }));
    });

    test('POST /api/learning/agent/conversations creates a thread', async () => {
      db.createAgentConversation.mockResolvedValueOnce({ id: 5, userId: 'u1', topic: 'ARDS', messages: [] });
      const response = await request(app)
        .post('/api/learning/agent/conversations')
        .set('Cookie', `med_auth_token=${authToken()}`)
        .set('Content-Type', 'application/json')
        .send({ topic: 'ARDS' })
        .expect(201);
      expect(response.body.conversation).toHaveProperty('id', 5);
    });

    test('GET /api/learning/dashboard returns aggregated data', async () => {
      db.getLearningProfile.mockResolvedValueOnce({ currentStreak: 3, longestStreak: 5 });
      db.listUserTopicMastery.mockResolvedValueOnce([
        { topic: 'ARDS', overallScore: 75, nextReviewAt: new Date().toISOString() },
        { topic: 'Sepsis', overallScore: 45, nextReviewAt: new Date().toISOString() },
      ]);
      db.getQuizAttempts.mockResolvedValueOnce([]);
      db.listAgentConversations.mockResolvedValueOnce([]);
      db.getCaseAttempts.mockResolvedValueOnce([]);
      db.get.mockResolvedValueOnce({ count: 2 });
      const response = await request(app)
        .get('/api/learning/dashboard')
        .set('Cookie', `med_auth_token=${authToken()}`)
        .expect(200);
      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('currentStreak', 3);
      expect(response.body).toHaveProperty('weakTopics');
      expect(response.body.weakTopics.length).toBeGreaterThan(0);
    });

    test('GET /api/learning/insights returns study-run gap report', async () => {
      db.getLearningProfile.mockResolvedValueOnce(null);
      db.listUserTopicMastery.mockResolvedValueOnce([]);
      db.getQuizAttempts.mockResolvedValueOnce([{ topic: 'ARDS', questionType: 'recall', isCorrect: false }]);
      db.listStudyRuns.mockResolvedValueOnce([{
        id: 77,
        userId: 'u1',
        topic: 'ARDS',
        outlineId: null,
        progress: { totalNodes: 2, coveredNodes: 1 },
        nodeCoverage: {
          'tp-1': { seen: true, quizAttempts: 1, correct: 0, lastAttemptAt: '2026-05-13T00:00:00Z' },
          'tp-2': { seen: false, quizAttempts: 0, correct: 0, lastAttemptAt: null },
        },
      }]);
      db.getTopicKnowledge.mockResolvedValueOnce({
        id: 1,
        topic: 'ARDS',
        knowledge: { teachingPoints: ['Berlin definition', 'Low tidal volume ventilation'] },
        sourceArticles: [],
      });

      const response = await request(app)
        .get('/api/learning/insights')
        .set('Cookie', `med_auth_token=${authToken()}`)
        .expect(200);

      const gap = response.body.insights.find((item) => item.type === 'coverage_gap');
      expect(gap).toBeTruthy();
      expect(gap).toHaveProperty('studyRunId', 77);
      expect(gap.gapReport).toMatchObject({
        totalNodes: 2,
        coveredNodes: 1,
      });
      expect(gap.gapReport.weakNodes[0]).toMatchObject({ id: 'tp-1', accuracy: 0 });
      expect(gap.gapReport.uncoveredNodes[0]).toMatchObject({ id: 'tp-2' });
    });

    test('POST /api/learning/case-attempt creates a case attempt', async () => {
      db.createCaseAttempt.mockResolvedValueOnce({ id: 1, topic: 'ARDS', score: 80 });
      const response = await request(app)
        .post('/api/learning/case-attempt')
        .set('Cookie', `med_auth_token=${authToken()}`)
        .set('Content-Type', 'application/json')
        .send({
          topic: 'ARDS',
          caseText: '68-year-old with ARDS...',
          caseType: 'analysis',
          learningMode: 'resident',
          score: 80,
        })
        .expect(201);
      expect(response.body.attempt).toHaveProperty('score', 80);
    });
  });
});
