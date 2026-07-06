// ==========================================
// Unit Tests for AI Routes
// ==========================================

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../server/config/logger', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

jest.mock('../../server/services/aiService', () => {
    const shared = {
        callGemini: jest.fn().mockResolvedValue('gemini result'),
        callMistralAI: jest.fn().mockResolvedValue('mistral result'),
        callText: jest.fn().mockResolvedValue('gemini result'),
        callGeminiStream: jest.fn().mockImplementation(async function* () { yield 'chunk1'; yield 'chunk2'; }),
        callMistralStream: jest.fn().mockImplementation(async function* () { yield 'chunk1'; yield 'chunk2'; }),
        callTextStream: jest.fn().mockImplementation(async function* () { yield 'chunk1'; yield 'chunk2'; }),
    };
    return {
        createAiService: jest.fn().mockReturnValue(shared),
        getSharedAiService: jest.fn().mockReturnValue(shared),
        PINNED_MODELS: { gemini: 'gemini-model', mistral: 'mistral-model' },
        TEMPERATURE: { analysis: 0.3, synthesis: 0.4, explain: 0.5 },
        AI_DISCLAIMER: 'AI-generated content.',
    };
});

jest.mock('../../server/prompts', () => ({
    buildAnalysisPrompt: jest.fn().mockReturnValue('analysis prompt'),
    buildPicoExtractionPrompt: jest.fn().mockReturnValue('pico prompt'),
    buildJournalClubPrompt: jest.fn().mockReturnValue('journal club prompt'),
    buildTopicKnowledgePrompt: jest.fn().mockReturnValue('topic prompt'),
}));

jest.mock('../../server/services/qualityService', () => ({
    batchCheckRetractions: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../server/services/citationValidator', () => ({
    validateMedicalOutputCitations: jest.fn().mockReturnValue({ valid: true, errors: [] }),
    validateSourceIndices: jest.fn().mockReturnValue({ valid: true }),
}));

jest.mock('../../server/services/synthesisGenerationCore', () => ({
    runFullSynthesisGeneration: jest.fn().mockResolvedValue({ synthesis: { summary: 'test' }, audit: { provider: 'gemini', model: 'gemini-model' } }),
    prepareSynthesisContext: jest.fn().mockResolvedValue({ prompt: 'synth prompt', topArticles: [], guidelines: [], sourceMap: {}, retractedUids: [], retractionResults: [], cacheKey: 'ck', fullTextIndexedCount: 0 }),
    parseSynthesisText: jest.fn().mockReturnValue({ summary: 'test', clinicalBottomLine: '', keyCitations: [] }),
    validateSynthesisCitations: jest.fn().mockReturnValue({ valid: true, errors: [] }),
    buildSynthesisResult: jest.fn().mockReturnValue({ summary: 'test', citations: [] }),
    persistSynthesisResult: jest.fn().mockResolvedValue(true),
    getSynthesisCacheKey: jest.fn().mockReturnValue('cache-key'),
    selectTopSynthesisArticles: jest.fn().mockImplementation((arts) => arts.slice(0, 15)),
}));

jest.mock('../../server/services/paperSynopsisCore', () => ({
    runPaperSynopsisGeneration: jest.fn().mockResolvedValue({ synopsis: {} }),
    getPaperSynopsisArticleId: jest.fn((article) => article.uid || article.pmid || article.doi || 'hashed'),
    invalidatePaperSynopsisCache: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../server/services/aiGenerationJobService', () => ({
    getOrEnqueueFullSynthesis: jest.fn().mockResolvedValue({ status: 'queued', jobKey: 'job-1' }),
    getOrEnqueuePaperSynopsis: jest.fn().mockResolvedValue({ status: 'queued', jobKey: 'job-2' }),
}));

jest.mock('../../server/services/claimMapService', () => ({
    getOrCreateClaimMap: jest.fn().mockResolvedValue({ id: 'cm1' }),
    addSourcesToClaimMap: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../server/services/teachingObjectService', () => ({
    teachingObjectsToQuizContext: jest.fn().mockReturnValue(''),
    persistPaperTeachingObject: jest.fn().mockResolvedValue(true),
    buildEvidenceMap: jest.fn().mockReturnValue({}),
    persistConsensusTeachingObject: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../server/utils/validation', () => ({
    limitBodySize: () => (req, res, next) => next(),
}));

jest.mock('../../server/utils/aiProvider', () => ({
    resolveProvider: jest.fn().mockImplementation(({ provider }) => {
        if (provider === 'auto' || provider === 'gemini') return { provider: 'gemini', model: 'gemini-model' };
        if (provider === 'mistral') return { provider: 'mistral', model: 'mistral-model' };
        return null;
    }),
}));

jest.mock('../../server/utils/parseJson', () => ({
    parseJsonArrayStrict: jest.fn().mockReturnValue([]),
    parseJsonBlock: jest.fn().mockReturnValue({}),
    parseJsonArrayBlock: jest.fn().mockReturnValue([]),
}));

jest.mock('../../server/services/llmUsageService', () => ({
    createLlmUsageLogger: jest.fn().mockReturnValue(jest.fn()),
    buildUsageEntry: jest.fn().mockReturnValue({}),
}));

const { registerAiRoutes } = require('../../server/routes/ai');

function authToken(payload = { id: 'u1', name: 'Test User', email: 't@test.com', role: 'researcher' }) {
    return jwt.sign(payload, 'test-jwt-secret', { expiresIn: '1h' });
}

function adminToken() {
    return authToken({ id: 'admin1', name: 'Admin', email: 'admin@test.com', role: 'admin' });
}

describe('aiRoutes', () => {
    let app;
    const mockDb = {
        getCachedAnalysis: jest.fn().mockResolvedValue(null),
        cacheAnalysis: jest.fn().mockResolvedValue({ id: 1 }),
        logEvent: jest.fn().mockResolvedValue({ id: 1 }),
        getTopicKnowledge: jest.fn().mockResolvedValue(null),
        saveSynthesisSnapshot: jest.fn().mockResolvedValue(undefined),
        listTeachingObjectsForTopic: jest.fn().mockResolvedValue([]),
        listTeachingObjectClaimsForTopic: jest.fn().mockResolvedValue([]),
        getGuidelinesByTopic: jest.fn().mockResolvedValue([]),
        getAnnotationsByArticle: jest.fn().mockResolvedValue([]),
        createAnnotation: jest.fn().mockResolvedValue({ id: 1 }),
        getLearningProfile: jest.fn().mockResolvedValue({ trainingStage: 'foundation_doctor' }),
        recordSynopsisFeedback: jest.fn().mockResolvedValue({ id: 1 }),
    };

    const mockCache = {
        getAnalysisAsync: jest.fn().mockResolvedValue(null),
        setAnalysisAsync: jest.fn().mockResolvedValue(true),
        getAsync: jest.fn().mockResolvedValue(null),
        setAsync: jest.fn().mockResolvedValue(true),
        delAsync: jest.fn().mockResolvedValue(true),
    };

    const deps = {
        serverConfig: { keys: { gemini: 'gk', mistral: 'mk' } },
        db: mockDb,
        cache: mockCache,
        rateLimit: () => (req, res, next) => next(),
        userRateLimit: () => (req, res, next) => next(),
        requireJson: (req, res, next) => next(),
        requireAuthJwt: (req, res, next) => {
            req.user = { id: 'u1', role: 'researcher' };
            req.sessionId = 's1';
            next();
        },
        requireRole: (...roles) => (req, res, next) => {
            if (roles.includes(req.user?.role)) return next();
            return res.status(403).json({ error: 'Forbidden' });
        },
        validateAnalysisBody: () => [],
        validateBody: () => (req, res, next) => next(),
        schemas: {},
        fetch: jest.fn(),
        requireMonthlyLimit: () => (_req, _res, next) => next(),
        requirePaidFeature: () => (_req, _res, next) => next(),
        requireVerifiedEmail: (_req, _res, next) => next(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        app = express();
        app.use(express.json());
        app.use((req, res, next) => {
            req.log = { debug: jest.fn(), error: jest.fn(), warn: jest.fn() };
            next();
        });
        registerAiRoutes(app, deps);
    });

    describe('POST /api/ai/analyze', () => {
        test('returns 400 when validation fails', async () => {
            const customDeps = {
                ...deps,
                validateAnalysisBody: () => ['Text is required'],
            };
            const customApp = express();
            customApp.use(express.json());
            registerAiRoutes(customApp, customDeps);
            const res = await request(customApp)
                .post('/api/ai/analyze')
                .set('Authorization', `Bearer ${authToken()}`)
                .send({ text: '', analysisType: 'summary' });
            expect(res.status).toBe(400);
        });

        test('returns 200 with analysis result', async () => {
            const res = await request(app)
                .post('/api/ai/analyze')
                .set('Authorization', `Bearer ${authToken()}`)
                .send({ text: 'Patient has diabetes.', analysisType: 'summary', provider: 'gemini' });
            expect(res.status).toBe(200);
            expect(res.body.result).toBe('gemini result');
            expect(mockDb.cacheAnalysis).toHaveBeenCalled();
        });
    });

    describe('POST /api/ai/synthesize', () => {
        test('defaults to async and returns 202', async () => {
            const { getOrEnqueueFullSynthesis } = require('../../server/services/aiGenerationJobService');
            const res = await request(app)
                .post('/api/ai/synthesize')
                .set('Authorization', `Bearer ${adminToken()}`)
                .send({ articles: [{ title: 'A', _impact: { score: 1 } }], topic: 'Test' });
            expect(res.status).toBe(202);
            expect(getOrEnqueueFullSynthesis).toHaveBeenCalled();
        });

        test('returns 200 with inline result when async:false', async () => {
            const { runFullSynthesisGeneration } = require('../../server/services/synthesisGenerationCore');
            const res = await request(app)
                .post('/api/ai/synthesize')
                .set('Authorization', `Bearer ${adminToken()}`)
                .send({ articles: [{ title: 'A', _impact: { score: 1 } }], topic: 'Test', async: false });
            expect(res.status).toBe(200);
            expect(runFullSynthesisGeneration).toHaveBeenCalled();
        });
    });

    describe('POST /api/ai/synopsis', () => {
        test('passes learner training stage into inline synopsis generation', async () => {
            const { runPaperSynopsisGeneration } = require('../../server/services/paperSynopsisCore');
            const res = await request(app)
                .post('/api/ai/synopsis')
                .set('Authorization', `Bearer ${authToken()}`)
                .send({ article: { uid: 'a1', title: 'A' }, topic: 'Sepsis', async: false });
            expect(res.status).toBe(200);
            expect(runPaperSynopsisGeneration).toHaveBeenCalledWith(expect.objectContaining({
                topic: 'Sepsis',
                trainingStage: 'foundation_doctor',
            }));
        });

        test('records not-helpful synopsis feedback and invalidates cache', async () => {
            const { invalidatePaperSynopsisCache } = require('../../server/services/paperSynopsisCore');
            const res = await request(app)
                .post('/api/ai/synopsis/feedback')
                .set('Authorization', `Bearer ${authToken()}`)
                .send({
                    article: { uid: 'a1', title: 'A' },
                    articleUid: 'a1',
                    feedbackType: 'not_helpful',
                    reason: 'too vague',
                    model: 'gemini-model',
                    trainingStage: 'finals',
                });
            expect(res.status).toBe(200);
            expect(mockDb.recordSynopsisFeedback).toHaveBeenCalledWith(expect.objectContaining({
                articleUid: 'a1',
                feedbackType: 'not_helpful',
                reason: 'too vague',
            }));
            expect(invalidatePaperSynopsisCache).toHaveBeenCalledWith(expect.objectContaining({
                article: expect.objectContaining({ uid: 'a1' }),
                selectedModel: 'gemini-model',
                trainingStage: 'finals',
            }));
        });
    });

    describe('POST /api/ai/analyze/stream', () => {
        test('streams chunks via SSE', (done) => {
            request(app)
                .post('/api/ai/analyze/stream')
                .set('Authorization', `Bearer ${authToken()}`)
                .set('Accept', 'text/event-stream')
                .send({ text: 'Diabetes overview.', analysisType: 'summary', provider: 'gemini' })
                .buffer(true)
                .parse((res, callback) => {
                    res.text = '';
                    res.on('data', (chunk) => {
                        res.text += chunk;
                    });
                    res.on('end', () => callback(null, res.text));
                })
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.status).toBe(200);
                    expect(res.text).toContain('event: chunk');
                    expect(res.text).toContain('chunk1');
                    expect(res.text).toContain('event: done');
                    done();
                });
        });
    });
});
