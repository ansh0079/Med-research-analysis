'use strict';

jest.mock('../../server/services/aiService', () => ({
    getSharedAiService: jest.fn(),
}));
jest.mock('../../server/utils/aiProvider', () => ({
    resolveProvider: jest.fn(() => ({ provider: 'claude', model: 'test' })),
}));
jest.mock('../../server/services/aiOutputValidation', () => ({
    validateAiOutput: jest.fn((profile, raw) => ({ ok: true, data: raw, errors: [] })),
}));
jest.mock('../../server/services/mcqGeneratorService', () => ({
    generateAndStoreMCQs: jest.fn(async () => ({ count: 2 })),
}));
jest.mock('../../server/services/enrichmentJobService', () => ({
    getOrEnqueueGuidelineAlign: jest.fn(async () => ({ status: 'queued' })),
}));
jest.mock('../../server/saved-embedding-worker', () => ({
    enqueueArticleForEmbedding: jest.fn(() => true),
}));
jest.mock('../../server/services/personalizationBanditService', () => ({
    POLICY_RECOMMENDATION: 'recommendation_strategy',
    recordBanditReward: jest.fn(async () => true),
}));

const { getSharedAiService } = require('../../server/services/aiService');
const { recordBanditReward } = require('../../server/services/personalizationBanditService');
const {
    evolveTopicKnowledge,
    scoreEvolutionConfidence,
} = require('../../server/services/topicEvolutionService');

describe('topicEvolutionService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        getSharedAiService.mockReturnValue({
            callText: jest.fn(async () => JSON.stringify({
                mentorMessage: 'PRESS is a clinico-radiological syndrome; treat blood pressure carefully with guidelines in mind.',
                seminalPapers: [
                    { sourceIndex: 1, title: 'Paper A', whySeminal: 'Defined imaging criteria', clinicalPrinciple: 'MRI diagnosis', evidenceStrength: 'HIGH' },
                    { sourceIndex: 2, title: 'Paper B', whySeminal: 'Outcome data', clinicalPrinciple: 'BP control', evidenceStrength: 'MODERATE' },
                ],
                teachingPoints: [
                    { claim: 'Avoid rapid BP drops [1][G1]', sourceIndices: [1], guidelineIndices: [1], confidence: 'HIGH' },
                    { claim: 'MRI is preferred imaging [2]', sourceIndices: [2], confidence: 'HIGH' },
                    { claim: 'Eclampsia overlap requires obstetrics input', sourceIndices: [1], confidence: 'MODERATE' },
                    { claim: 'Seizure prophylaxis when indicated', sourceIndices: [2], confidence: 'MODERATE' },
                ],
                caseGenerationHooks: ['32yo postpartum seizure with vasogenic oedema'],
                mcqAngles: ['Rate of BP reduction', 'MRI vs CT'],
                verifiedAnchors: [],
                sourceArticles: [],
            })),
        });
    });

    it('scores higher confidence when guidelines and papers are present', () => {
        const low = scoreEvolutionConfidence({
            articles: [{ title: 'a' }, { title: 'b' }, { title: 'c' }],
            guidelines: [],
            knowledge: { teachingPoints: [{}, {}], mentorMessage: 'short' },
        });
        const high = scoreEvolutionConfidence({
            articles: new Array(8).fill({ title: 'x' }),
            guidelines: [{}, {}, {}],
            knowledge: {
                teachingPoints: [{}, {}, {}, {}],
                seminalPapers: [{}, {}],
                mentorMessage: 'A longer mentor message that is clinically useful for learners.',
            },
        });
        expect(high).toBeGreaterThan(low);
        expect(high).toBeGreaterThanOrEqual(0.7);
    });

    it('commits live memory when confidence is high and guidelines exist', async () => {
        const db = {
            getGuidelinesByTopic: jest.fn(async () => ([
                {
                    sourceBody: 'ESC/ESH',
                    sourceYear: 2018,
                    recommendationText: 'Manage severe hypertension carefully',
                    sourceUrl: 'https://example.org/g',
                },
            ])),
            getTopicKnowledge: jest.fn(async () => null),
            upsertTopicKnowledge: jest.fn(async (topic, knowledge) => ({
                topic,
                knowledge,
                status: 'ai_generated',
                confidence: 0.8,
            })),
            createTopicKnowledgeProposal: jest.fn(),
            recordLearningEvent: jest.fn(async () => ({ id: 1 })),
        };

        const articles = [
            { uid: '1', title: 'Paper 1', abstract: 'Abstract one about PRES management and MRI.' },
            { uid: '2', title: 'Paper 2', abstract: 'Abstract two about blood pressure control.' },
            { uid: '3', title: 'Paper 3', abstract: 'Abstract three about seizures in PRES.' },
            { uid: '4', title: 'Paper 4', abstract: 'Abstract four about eclampsia overlap.' },
            { uid: '5', title: 'Paper 5', abstract: 'Abstract five about prognosis.' },
        ];

        const result = await evolveTopicKnowledge({
            topic: 'management of PRESS',
            articles,
            serverConfig: { keys: { anthropic: 'x' } },
            fetchImpl: jest.fn(),
            db,
            userId: 'u1',
            sessionId: 's1',
        });

        expect(result.commitMode).toBe('live');
        expect(result.guidelineCount).toBe(1);
        expect(db.upsertTopicKnowledge).toHaveBeenCalled();
        expect(db.createTopicKnowledgeProposal).not.toHaveBeenCalled();
        expect(result.knowledge.guidelineAnchors).toHaveLength(1);
        expect(result.jobs.embeddings).toBeGreaterThan(0);
        expect(recordBanditReward).toHaveBeenCalledWith(
            db,
            'recommendation_strategy',
            'refresh',
            expect.any(Number),
            'u1'
        );
        expect(recordBanditReward).toHaveBeenCalledWith(
            db,
            'recommendation_strategy',
            'calibrate',
            expect.any(Number),
            'u1'
        );
    });

    it('creates a proposal when forceProposal is set', async () => {
        const db = {
            getGuidelinesByTopic: jest.fn(async () => []),
            getTopicKnowledge: jest.fn(async () => null),
            upsertTopicKnowledge: jest.fn(),
            createTopicKnowledgeProposal: jest.fn(async () => ({ id: 9, status: 'pending_review' })),
            recordLearningEvent: jest.fn(async () => ({ id: 1 })),
        };

        const result = await evolveTopicKnowledge({
            topic: 'rare topic',
            articles: [
                { uid: '1', title: 'A', abstract: 'enough text for paper A abstract content here' },
                { uid: '2', title: 'B', abstract: 'enough text for paper B abstract content here' },
                { uid: '3', title: 'C', abstract: 'enough text for paper C abstract content here' },
            ],
            serverConfig: { keys: { anthropic: 'x' } },
            fetchImpl: jest.fn(),
            db,
            forceProposal: true,
        });

        expect(result.commitMode).toBe('proposal');
        expect(db.createTopicKnowledgeProposal).toHaveBeenCalled();
        expect(db.upsertTopicKnowledge).not.toHaveBeenCalled();
    });
});
