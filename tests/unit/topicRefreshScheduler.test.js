describe('topicRefreshScheduler', () => {
    let runStrongMemoryRefresh;
    let runStaleTopicRefresh;
    let extractAndUpsertTopicKnowledge;
    let refineSeminalKnowledgeFromCommunity;

    beforeEach(() => {
        jest.resetModules();
        extractAndUpsertTopicKnowledge = jest.fn();
        refineSeminalKnowledgeFromCommunity = jest.fn();
        jest.doMock('../../server/services/topicKnowledgeExtraction', () => ({
            extractAndUpsertTopicKnowledge,
        }));
        jest.doMock('../../server/services/communitySeminalRefinementService', () => ({
            refineSeminalKnowledgeFromCommunity,
        }));
        const scheduler = require('../../server/services/topicRefreshScheduler');
        runStrongMemoryRefresh = scheduler.runStrongMemoryRefresh;
        runStaleTopicRefresh = scheduler.runStaleTopicRefresh;
    });

    afterEach(() => {
        jest.dontMock('../../server/services/topicKnowledgeExtraction');
        jest.dontMock('../../server/services/communitySeminalRefinementService');
    });

    describe('runStaleTopicRefresh', () => {
        test('short-circuits when getStaleTopicsForRefresh is missing', async () => {
            const db = {};
            await expect(runStaleTopicRefresh({ db, serverConfig: {}, fetchImpl: () => {}, logger: null }))
                .resolves.toBeUndefined();
        });

        test('completes with zero candidates when no stale topics', async () => {
            const db = {
                getStaleTopicsForRefresh: jest.fn().mockResolvedValue([]),
                createLearningSchedulerRun: jest.fn().mockResolvedValue({ id: 1 }),
                finishLearningSchedulerRun: jest.fn().mockResolvedValue({}),
            };
            await runStaleTopicRefresh({ db, serverConfig: {}, fetchImpl: () => {}, logger: null });
            expect(db.finishLearningSchedulerRun).toHaveBeenCalledWith(1, expect.objectContaining({
                status: 'completed',
                candidatesCount: 0,
            }));
        });
    });

    describe('runStrongMemoryRefresh', () => {
        test('short-circuits when getStrongMemoryTopicsForRefresh is missing', async () => {
            const db = {};
            await expect(runStrongMemoryRefresh({ db, serverConfig: {}, fetchImpl: () => {}, logger: null }))
                .resolves.toBeUndefined();
        });

        test('completes with zero candidates when no strong-memory topics', async () => {
            const db = {
                getStrongMemoryTopicsForRefresh: jest.fn().mockResolvedValue([]),
                createLearningSchedulerRun: jest.fn().mockResolvedValue({ id: 2 }),
                finishLearningSchedulerRun: jest.fn().mockResolvedValue({}),
            };
            await runStrongMemoryRefresh({ db, serverConfig: {}, fetchImpl: () => {}, logger: null });
            expect(db.finishLearningSchedulerRun).toHaveBeenCalledWith(2, expect.objectContaining({
                status: 'completed',
                candidatesCount: 0,
            }));
        });

        test('refines strong-memory seminal knowledge with community-engaged article UIDs', async () => {
            const db = {
                getStrongMemoryTopicsForRefresh: jest.fn().mockResolvedValue([
                    {
                        normalizedTopic: 'ards-ventilation',
                        displayTopic: 'ARDS ventilation',
                        memoryTier: 'high_confidence',
                        confidence: 0.9,
                        communityEngagementScore: 12,
                        totalDwellMs: 300000,
                    },
                ]),
                getCommunityEngagedArticlesForTopic: jest.fn().mockResolvedValue([
                    { uid: 'pmid-ards-1', engagement_score: 7 },
                    { uid: 'pmid-ards-2', engagement_score: 5 },
                ]),
                getTopicIntentDistribution: jest.fn().mockResolvedValue([{ intent: 'mechanism', count: 3 }]),
                createLearningSchedulerRun: jest.fn().mockResolvedValue({ id: 3 }),
                finishLearningSchedulerRun: jest.fn().mockResolvedValue({}),
            };

            refineSeminalKnowledgeFromCommunity.mockResolvedValue({
                selectedArticleCount: 6,
                communitySeedCount: 2,
                provider: 'gemini',
            });

            await runStrongMemoryRefresh({ db, serverConfig: {}, fetchImpl: () => {}, logger: null });

            expect(refineSeminalKnowledgeFromCommunity).toHaveBeenCalledTimes(1);
            const callArgs = refineSeminalKnowledgeFromCommunity.mock.calls[0][0];
            expect(callArgs.topic).toBe('ARDS ventilation');
            expect(callArgs.normalizedTopic).toBe('ards-ventilation');
            expect(callArgs.communityArticles).toEqual([
                { uid: 'pmid-ards-1', engagement_score: 7 },
                { uid: 'pmid-ards-2', engagement_score: 5 },
            ]);

            expect(db.finishLearningSchedulerRun).toHaveBeenCalledWith(3, expect.objectContaining({
                status: 'completed',
                candidatesCount: 1,
                refreshedCount: 1,
            }));
        });

        test('skips protected topics (409) without counting as error', async () => {
            const db = {
                getStrongMemoryTopicsForRefresh: jest.fn().mockResolvedValue([
                    {
                        normalizedTopic: 'protected-topic',
                        displayTopic: 'Protected Topic',
                        memoryTier: 'human_reviewed',
                        confidence: 0.95,
                        communityEngagementScore: 20,
                        totalDwellMs: 500000,
                    },
                ]),
                getCommunityEngagedArticlesForTopic: jest.fn().mockResolvedValue([]),
                getTopicIntentDistribution: jest.fn().mockResolvedValue([]),
                createLearningSchedulerRun: jest.fn().mockResolvedValue({ id: 4 }),
                finishLearningSchedulerRun: jest.fn().mockResolvedValue({}),
            };

            const err = new Error('Protected');
            err.statusCode = 409;
            refineSeminalKnowledgeFromCommunity.mockRejectedValue(err);

            await runStrongMemoryRefresh({ db, serverConfig: {}, fetchImpl: () => {}, logger: null });

            expect(db.finishLearningSchedulerRun).toHaveBeenCalledWith(4, expect.objectContaining({
                status: 'completed',
                refreshedCount: 0,
                skippedCount: 1,
                errorCount: 0,
            }));
        });
    });
});
