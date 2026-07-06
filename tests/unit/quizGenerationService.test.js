'use strict';

const { createQuizGenerationService, normalizeDistractorRationale } = require('../../server/services/quizGenerationService');

function createService({ coldStartMcqs = null, teachingClaims = [] } = {}) {
    const db = {
        getTopicKnowledge: jest.fn().mockResolvedValue(null),
        getGuidelinesByTopic: jest.fn().mockResolvedValue([]),
        listTeachingObjectsForTopic: jest.fn().mockResolvedValue([]),
        listTeachingObjectClaimsForTopic: jest.fn().mockResolvedValue(teachingClaims),
        normalizeTopic: jest.fn((topic) => String(topic || '').toLowerCase().trim()),
    };
    const helpers = {
        generateQuizQuestions: jest.fn(),
        serveColdStartMCQs: jest.fn().mockResolvedValue(coldStartMcqs),
        buildStudyRunOutline: jest.fn().mockReturnValue([]),
        selectStudyRunTargets: jest.fn().mockReturnValue([]),
        selectAdaptiveMemoryTargets: jest.fn().mockReturnValue([]),
        normalizeOutlineNodeId: jest.fn().mockReturnValue(null),
        normalizeClaimKey: jest.fn(),
        assignQuizPromptVariant: jest.fn().mockReturnValue('control'),
        normalizeVisualExplanation: jest.fn().mockReturnValue(null),
        selectAdaptiveClaimAnchors: jest.fn().mockReturnValue([]),
    };
    const logger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    };
    const service = createQuizGenerationService({
        db,
        serverConfig: { keys: { gemini: 'test-key' } },
        ai: {},
        mcqValidator: {},
        logger,
        helpers,
    });
    return { service, db, helpers, logger };
}

describe('quizGenerationService', () => {
    test('returns 400 when topic is missing', async () => {
        const { service } = createService();
        const result = await service.generateQuiz({ body: {}, user: {}, log: { warn: jest.fn(), error: jest.fn() } });
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('topic is required');
    });

    test('serves cold-start MCQs when a topic has no teaching claims', async () => {
        const coldStartMcqs = [{ id: 'cold-1', question: 'Q', options: ['A', 'B'], correctAnswer: 'A' }];
        const { service, helpers } = createService({ coldStartMcqs });

        const result = await service.generateQuiz({ body: { topic: 'ARDS' }, user: {}, log: { warn: jest.fn(), error: jest.fn() } });

        expect(result.status).toBe(200);
        expect(result.body.provider).toBe('cold_start_cache');
        expect(result.body.questions).toBe(coldStartMcqs);
        expect(helpers.serveColdStartMCQs).toHaveBeenCalledWith(expect.any(Object), 'ARDS', 3, undefined);
    });

    test('returns claim-required conflict when no claims or cold-start MCQs exist', async () => {
        const { service } = createService();
        const result = await service.generateQuiz({ body: { topic: 'ARDS' }, user: {}, log: { warn: jest.fn(), error: jest.fn() } });
        expect(result.status).toBe(409);
        expect(result.body.code).toBe('CLAIMS_REQUIRED');
    });

    test('normalizes distractor rationales to answer letters only', () => {
        expect(normalizeDistractorRationale({ a: 'Wrong', E: 'Ignored', B: 'Also wrong' })).toEqual({
            A: 'Wrong',
            B: 'Also wrong',
        });
    });
});
