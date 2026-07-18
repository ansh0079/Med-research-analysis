const {
    applySearchLearningBoost,
    articleLearningBoost,
    buildSearchLearningContext,
    interactionWeight,
    publicLearningContext,
} = require('../../server/services/searchLearningService');

describe('searchLearningService', () => {
    test('buildSearchLearningContext returns compact defaults without a user', async () => {
        const context = await buildSearchLearningContext({ db: {}, userId: null, query: 'ARDS' });

        expect(context.shouldPersonalize).toBe(false);
        expect(publicLearningContext(context)).toEqual({
            memoryTier: 'none',
            searchCount: 0,
            topPaperCount: 0,
            savedPaperCount: 0,
            weakOutlineNodeCount: 0,
            helpfulFeedbackCount: 0,
            notHelpfulFeedbackCount: 0,
            interactionCount: 0,
            impressionCount: 0,
            missedPaperCount: 0,
            weakArticleCount: 0,
            trajectoryTermCount: 0,
            profileWeakTopicCount: 0,
            hasTrajectoryHints: false,
            personalized: false,
            banditArmId: null,
            banditContext: null,
            misconceptionTargets: 0,
            calibrationOverride: null,
            hasDangerousMisconception: false,
        });
    });

    test('buildSearchLearningContext reads existing topic memory for authenticated users', async () => {
        const db = {
            getUserTopicMemory: jest.fn().mockResolvedValue({
                memoryTier: 'building',
                searchCount: 6,
                topPaperCount: 2,
                savedPaperCount: 1,
                topArticles: [{ uid: 'pubmed-1', w: 3 }, { uid: 'pubmed-2', w: 1 }],
                savedArticles: [{ uid: 'pubmed-3', w: 2 }],
                weakOutlineNodeIds: ['tp-1'],
            }),
            listSearchResultFeedbackForUser: jest.fn().mockResolvedValue([
                { article_uid: 'pubmed-4', feedback_type: 'helpful' },
                { article_uid: 'pubmed-5', feedback_type: 'not_helpful' },
            ]),
            getUserInteractions: jest.fn().mockResolvedValue([
                { article_id: 'pubmed-6', interaction_type: 'save', dwell_time_ms: 0 },
                { article_id: 'pubmed-7', interaction_type: 'click', dwell_time_ms: 45000 },
            ]),
        };

        const context = await buildSearchLearningContext({ db, userId: 'u1', query: 'ARDS' });

        expect(db.getUserTopicMemory).toHaveBeenCalledWith('u1', 'ARDS');
        expect(context.shouldPersonalize).toBe(true);
        expect(context.preferredArticleUids.get('pubmed-1')).toBe(3);
        expect(context.savedArticleUids.get('pubmed-3')).toBe(2);
        expect(context.helpfulArticleUids.get('pubmed-4')).toBe(1);
        expect(context.notHelpfulArticleUids.get('pubmed-5')).toBe(1);
        expect(context.interactionArticleUids.get('pubmed-6')).toBeGreaterThan(2);
        expect(context.interactionArticleUids.get('pubmed-7')).toBeGreaterThan(1);
        expect(publicLearningContext(context)).toMatchObject({
            memoryTier: 'building',
            searchCount: 6,
            helpfulFeedbackCount: 1,
            notHelpfulFeedbackCount: 1,
            interactionCount: 2,
            personalized: true,
        });
    });

    test('articleLearningBoost only applies once memory is building or strong', () => {
        const sparse = {
            shouldPersonalize: false,
            preferredArticleUids: new Map([['pubmed-2', 5]]),
            savedArticleUids: new Map(),
        };
        const building = {
            shouldPersonalize: true,
            preferredArticleUids: new Map([['pubmed-2', 5]]),
            savedArticleUids: new Map(),
        };

        expect(articleLearningBoost({ uid: 'pubmed-2' }, sparse)).toBe(0);
        expect(articleLearningBoost({ uid: 'pubmed-2' }, building)).toBeGreaterThan(0);
    });

    test('applySearchLearningBoost gently promotes remembered and saved papers', () => {
        const context = {
            shouldPersonalize: true,
            preferredArticleUids: new Map([['pubmed-3', 4]]),
            savedArticleUids: new Map([['pubmed-4', 5]]),
        };
        const articles = [
            { uid: 'pubmed-1', title: 'First' },
            { uid: 'pubmed-2', title: 'Second' },
            { uid: 'pubmed-3', title: 'Remembered' },
            { uid: 'pubmed-4', title: 'Saved' },
        ];

        const boosted = applySearchLearningBoost(articles, context);

        expect(boosted.map((a) => a.uid)).toEqual(['pubmed-1', 'pubmed-3', 'pubmed-4', 'pubmed-2']);
        expect(boosted.find((a) => a.uid === 'pubmed-4')._learningBoost).toBeGreaterThan(0);
        expect(boosted.find((a) => a.uid === 'pubmed-3')._learningBoost).toBeGreaterThan(0);
    });

    test('applySearchLearningBoost promotes helpful feedback and demotes not helpful feedback', () => {
        const context = {
            shouldPersonalize: true,
            preferredArticleUids: new Map(),
            savedArticleUids: new Map(),
            helpfulArticleUids: new Map([['pubmed-3', 1]]),
            notHelpfulArticleUids: new Map([['pubmed-1', 1]]),
        };
        const articles = [
            { uid: 'pubmed-1', title: 'Not helpful' },
            { uid: 'pubmed-2', title: 'Neutral' },
            { uid: 'pubmed-3', title: 'Helpful' },
        ];

        const boosted = applySearchLearningBoost(articles, context);

        expect(boosted.map((a) => a.uid)).toEqual(['pubmed-3', 'pubmed-2', 'pubmed-1']);
        expect(boosted.find((a) => a.uid === 'pubmed-3')._learningBoost).toBeGreaterThan(0);
        expect(boosted.find((a) => a.uid === 'pubmed-1')._learningBoost).toBeLessThan(0);
    });

    test('applySearchLearningBoost promotes strong implicit interactions', () => {
        const context = {
            shouldPersonalize: true,
            preferredArticleUids: new Map(),
            savedArticleUids: new Map(),
            helpfulArticleUids: new Map(),
            notHelpfulArticleUids: new Map(),
            interactionArticleUids: new Map([['pubmed-3', 6]]),
        };
        const articles = [
            { uid: 'pubmed-1', title: 'First' },
            { uid: 'pubmed-2', title: 'Second' },
            { uid: 'pubmed-3', title: 'Interacted' },
        ];

        const boosted = applySearchLearningBoost(articles, context);

        expect(boosted.map((a) => a.uid)).toEqual(['pubmed-1', 'pubmed-3', 'pubmed-2']);
        expect(boosted.find((a) => a.uid === 'pubmed-3')._learningBoost).toBeGreaterThan(0);
    });

    test('interactionWeight ranks saves and analysis above passive views', () => {
        expect(interactionWeight({ interaction_type: 'save' })).toBeGreaterThan(interactionWeight({ interaction_type: 'click' }));
        expect(interactionWeight({ interaction_type: 'analyze' })).toBeGreaterThan(interactionWeight({ interaction_type: 'view' }));
        expect(interactionWeight({ interaction_type: 'view', dwell_time_ms: 120000 })).toBeGreaterThan(interactionWeight({ interaction_type: 'view' }));
    });

    test('articleLearningBoost promotes articles linked to weak outline nodes', () => {
        const context = {
            shouldPersonalize: true,
            preferredArticleUids: new Map(),
            savedArticleUids: new Map(),
            helpfulArticleUids: new Map(),
            notHelpfulArticleUids: new Map(),
            interactionArticleUids: new Map(),
            impressionArticleUids: new Map(),
            missedPaperUids: new Map(),
            weakArticleUids: new Set(['pmid-weak-1']),
        };
        expect(articleLearningBoost({ uid: 'pmid-weak-1' }, context)).toBeGreaterThan(0);
        expect(articleLearningBoost({ uid: 'pmid-other' }, context)).toBe(0);
    });

    test('buildSearchLearningContext extracts weak article UIDs from topic knowledge', async () => {
        const db = {
            getUserTopicMemory: jest.fn().mockResolvedValue({
                memoryTier: 'building',
                searchCount: 3,
                weakOutlineNodeIds: ['tp-1', 'src-2'],
            }),
            getTopicKnowledge: jest.fn().mockResolvedValue({
                knowledge: {
                    teachingPoints: [
                        { claim: 'Point 1', sourceIndices: [1] },
                        { claim: 'Point 2', sourceIndices: [2, 3] },
                    ],
                },
                sourceArticles: [
                    { sourceIndex: 1, uid: 'pmid-a' },
                    { sourceIndex: 2, uid: 'pmid-b' },
                    { sourceIndex: 3, uid: 'pmid-c' },
                ],
            }),
            listSearchResultFeedbackForUser: jest.fn().mockResolvedValue([]),
            getUserInteractions: jest.fn().mockResolvedValue([]),
        };

        const context = await buildSearchLearningContext({ db, userId: 'u1', query: 'heart failure' });

        expect(context.weakArticleUids.has('pmid-a')).toBe(true); // tp-1 -> sourceIndex 1
        expect(context.weakArticleUids.has('pmid-b')).toBe(true); // src-2 -> sourceIndex 2
        expect(context.weakArticleUids.has('pmid-c')).toBe(false); // not linked to weak nodes
        expect(publicLearningContext(context).weakArticleCount).toBe(2);
    });

    test('buildSearchLearningContext can personalize from feedback even when topic memory is sparse', async () => {
        const db = {
            getUserTopicMemory: jest.fn().mockResolvedValue({
                memoryTier: 'sparse',
                searchCount: 1,
                topArticles: [],
                savedArticles: [],
                weakOutlineNodeIds: [],
            }),
            listSearchResultFeedbackForUser: jest.fn().mockResolvedValue([
                { article_uid: 'pubmed-9', feedback_type: 'not_helpful' },
            ]),
            getUserInteractions: jest.fn().mockResolvedValue([]),
        };

        const context = await buildSearchLearningContext({ db, userId: 'u1', query: 'sepsis' });

        expect(context.memoryTier).toBe('sparse');
        expect(context.shouldPersonalize).toBe(true);
        expect(context.notHelpfulArticleUids.get('pubmed-9')).toBe(1);
    });

    test('buildSearchLearningContext overrides bandit to misconception_heavy when user has dangerous misconception on topic', async () => {
        const db = {
            getUserTopicMemory: jest.fn().mockResolvedValue({ memoryTier: 'building', searchCount: 5 }),
            listSearchResultFeedbackForUser: jest.fn().mockResolvedValue([]),
            getUserInteractions: jest.fn().mockResolvedValue([]),
            getQuizAttempts: jest.fn().mockResolvedValue([
                // Wrong answer with high confidence (dangerous misconception)
                { source_article_uid: 'pmid-a', is_correct: 0, confidence: 5, created_at: new Date().toISOString() },
            ]),
        };

        const context = await buildSearchLearningContext({ db, userId: 'u1', query: 'SGLT2 heart failure' });

        expect(context.hasDangerousMisconception).toBe(true);
        expect(context.banditSelection.armId).toBe('misconception_heavy');
        expect(context.banditSelection.calibrationOverride).toBe('dangerous_misconception');
        expect(publicLearningContext(context).calibrationOverride).toBe('dangerous_misconception');
        expect(publicLearningContext(context).hasDangerousMisconception).toBe(true);
    });

    test('buildSearchLearningContext does NOT override bandit when user is wrong with LOW confidence (knowledge gap, not misconception)', async () => {
        const db = {
            getUserTopicMemory: jest.fn().mockResolvedValue({ memoryTier: 'building', searchCount: 5 }),
            listSearchResultFeedbackForUser: jest.fn().mockResolvedValue([]),
            getUserInteractions: jest.fn().mockResolvedValue([]),
            getQuizAttempts: jest.fn().mockResolvedValue([
                // Wrong answer with LOW confidence — knowledge gap, not dangerous
                { source_article_uid: 'pmid-b', is_correct: 0, confidence: 2, created_at: new Date().toISOString() },
            ]),
        };

        const context = await buildSearchLearningContext({ db, userId: 'u1', query: 'SGLT2 heart failure' });

        expect(context.hasDangerousMisconception).toBe(false);
        expect(context.banditSelection?.calibrationOverride).toBeUndefined();
    });

    test('applySearchLearningBoost attaches _missedQuizCount to articles promoted by missed quiz signal', () => {
        const context = {
            shouldPersonalize: true,
            preferredArticleUids: new Map(),
            savedArticleUids: new Map(),
            helpfulArticleUids: new Map(),
            notHelpfulArticleUids: new Map(),
            interactionArticleUids: new Map(),
            impressionArticleUids: new Map(),
            missedPaperUids: new Map([['pmid-missed', 3]]),
            weakArticleUids: new Set(),
            trajectoryTerms: new Set(),
            profileWeakTopics: [],
        };
        const articles = [
            { uid: 'pmid-1', title: 'First' },
            { uid: 'pmid-2', title: 'Second' },
            { uid: 'pmid-missed', title: 'Missed quiz paper' },
        ];

        const result = applySearchLearningBoost(articles, context);
        const missed = result.find((a) => a.uid === 'pmid-missed');

        expect(missed._missedQuizCount).toBe(3);
        expect(missed._learningBoost).toBeGreaterThan(0);
        expect(missed._learnerAdaptationReason).toMatch(/Boosted — 3 quiz misses/i);
    });

    test('buildLearnerAdaptationReason includes misconception gap text', () => {
        const { buildLearnerAdaptationReason } = require('../../server/services/searchLearningService');
        const reason = buildLearnerAdaptationReason(
            {
                uid: 'pubmed-1',
                title: 'SGLT2 inhibitors in heart failure with reduced ejection fraction',
                abstract: 'Dapagliflozin reduced worsening heart failure events.',
                _learningBoost: 1.2,
            },
            {
                misconceptionBoost: {
                    misconceptionPhrases: ['SGLT2 inhibitors only for diabetes not heart failure'],
                    correctiveArticleUids: new Map([['pubmed-1', 1]]),
                },
            },
            2
        );
        expect(reason).toMatch(/missed quiz/i);
        expect(reason).toMatch(/SGLT2/i);
    });
});
