const {
    buildLearnerContext,
    enrichLearnerContextForQuiz,
    publicLearnerContextSummary,
    compactWeakTopics,
    profileWeakTopics,
    buildMisconceptionLogFromAttempts,
    formatLearnerPromptSupplement,
} = require('../../server/services/learnerContextService');

describe('learnerContextService', () => {
    test('buildLearnerContext composes reusable learner snapshot', async () => {
        const db = {
            getLearningProfile: jest.fn().mockResolvedValue({ trainingStage: 'resident', weakTopics: ['Shock'] }),
            getUserTopicMastery: jest.fn().mockResolvedValue({ overallScore: 42 }),
            getUserTopicMemory: jest.fn().mockResolvedValue({ memoryTier: 'active', searchCount: 7 }),
            listUserTopicMastery: jest.fn().mockResolvedValue([
                { topic: 'ARDS', overallScore: 45 },
                { topic: 'Sepsis', overallScore: 75 },
            ]),
            getUserClaimMastery: jest.fn().mockResolvedValue([
                { claimKey: 'ck-1', claimText: 'Use lung protective ventilation.', masteryState: 'untested' },
            ]),
            listLearningEvents: jest.fn().mockResolvedValue([
                {
                    eventType: 'agent_message',
                    occurredAt: new Date().toISOString(),
                    payload: { role: 'user', intent: 'quiz' },
                },
                {
                    eventType: 'claim_gap',
                    claimKey: 'ck-1',
                    occurredAt: new Date().toISOString(),
                    payload: {},
                },
            ]),
        };

        const context = await buildLearnerContext(db, {
            userId: 'u1',
            topic: 'ARDS',
            previousQueries: ['ventilation', 'PEEP'],
            persistedConversation: {
                conversationSummary: '- Prior thread',
                learnerSnapshot: { focusAreas: ['plateau pressure'] },
            },
        });

        expect(context.profile.trainingStage).toBe('resident');
        expect(context.weakTopics).toHaveLength(1);
        expect(context.previousQueries).toEqual(['ventilation', 'PEEP']);
        expect(context.claimMastery[0].masteryState).toBe('weak');
        expect(context.learningTrajectory).toContain('Recent learning activity');
        expect(context.persistedConversationSummary).toContain('Prior thread');
        expect(context.hasPersonalization).toBe(true);
    });

    test('public summary exposes counts without raw learner details', () => {
        const summary = publicLearnerContextSummary({
            hasPersonalization: true,
            topicMemory: { memoryTier: 'active', searchCount: 3 },
            weakTopics: [{ topic: 'A' }],
            profileWeakTopics: ['B'],
            claimMastery: [{ masteryState: 'weak' }, { masteryState: 'untested' }],
            learningTrajectory: 'Recent',
        });

        expect(summary).toEqual(expect.objectContaining({
            hasPersonalization: true,
            memoryTier: 'active',
            searchCount: 3,
            weakTopicCount: 1,
            weakClaimCount: 1,
            hasTrajectory: true,
        }));
    });

    test('formatLearnerPromptSupplement includes claim gaps and trajectory', () => {
        const text = formatLearnerPromptSupplement({
            previousQueries: ['sepsis', 'ARDS ventilation'],
            profileWeakTopics: ['Shock'],
            claimMastery: [{ claimKey: 'ck-1', claimText: 'Low tidal volume saves lives.', masteryState: 'weak' }],
            learningTrajectory: 'Recent learning activity on this topic',
            uncoveredOutlineNodes: [{ id: 'tp-3', label: 'Driving pressure' }],
            learningVelocity: { pointsPerDay: 1.2, fromScore: 40, toScore: 46, daysSpanned: 5, trend: 'improving' },
            misconceptionCategories: [{ label: 'Clinical pitfall / trap', count: 2, examples: [] }],
        });
        expect(text).toContain('SESSION TRAJECTORY');
        expect(text).toContain('CLAIM GAPS');
        expect(text).toContain('ck-1');
        expect(text).toContain('UNCOVERED OUTLINE NODES');
        expect(text).toContain('LEARNING VELOCITY');
        expect(text).toContain('MISCONCEPTION CATEGORIES');
    });

    test('enrichLearnerContextForQuiz attaches misconception log', async () => {
        const db = {
            getLearningProfile: jest.fn().mockResolvedValue(null),
            getUserTopicMastery: jest.fn().mockResolvedValue(null),
            getUserTopicMemory: jest.fn().mockResolvedValue(null),
            listUserTopicMastery: jest.fn().mockResolvedValue([]),
            getUserClaimMastery: jest.fn().mockResolvedValue([]),
            listLearningEvents: jest.fn().mockResolvedValue([]),
            getQuizAttempts: jest.fn().mockResolvedValue([
                { question_type: 'pitfall', is_correct: 0, outline_node_id: 'tp-1' },
                { question_type: 'pitfall', is_correct: 0 },
            ]),
        };
        const ctx = await enrichLearnerContextForQuiz(db, { userId: 'u1', topic: 'ARDS' });
        expect(ctx.misconceptionLog.pitfall.count).toBe(2);
        expect(ctx.misconceptionLog.pitfall.outlineNodes).toEqual(['tp-1']);
    });

    test('buildMisconceptionLogFromAttempts groups failures', () => {
        const log = buildMisconceptionLogFromAttempts([
            { questionType: 'recall', isCorrect: false, outlineNodeId: 'tp-2' },
            { questionType: 'recall', is_correct: 0 },
        ]);
        expect(log.recall.count).toBe(2);
    });

    test('helper compacts weak topics and profile weak topics', () => {
        expect(compactWeakTopics([
            { topic: 'ok', overallScore: 80 },
            { topic: 'weak', overallScore: 30 },
        ])).toEqual([{ topic: 'weak', overallScore: 30 }]);
        expect(profileWeakTopics({ weakTopics: ['A', '', 'B'] })).toEqual(['A', 'B']);
    });
});
