const {
    quizAttemptReward,
    attributeAgentQuizOutcomeReward,
    attributeQuizAttemptRewards,
    attributeSearchInteractionReward,
    getQuizAttributionCoverage,
} = require('../../server/services/searchLearningOutcomeService');

describe('searchLearningOutcomeService', () => {
    test('quizAttemptReward prefers first-attempt correctness', () => {
        expect(quizAttemptReward(true, true)).toBe(1);
        expect(quizAttemptReward(true, false)).toBe(0.25);
        expect(quizAttemptReward(false, true)).toBe(-0.1);
    });

    test('passive click updates decision reward without pulling the bandit arm', async () => {
        const db = {
            all: jest.fn().mockResolvedValue([{ id: 7, arm_id: 'engagement_heavy', delayed_reward: null }]),
            updatePersonalizationDecisionReward: jest.fn().mockResolvedValue(true),
            recordPersonalizationArmPull: jest.fn().mockResolvedValue(true),
        };

        const result = await attributeSearchInteractionReward(db, 'u1', {
            decisionId: 7,
            interactionType: 'click',
            wasClicked: true,
        });

        expect(result).toMatchObject({ rewarded: true, armPullRecorded: false });
        expect(db.updatePersonalizationDecisionReward).toHaveBeenCalled();
        expect(db.recordPersonalizationArmPull).not.toHaveBeenCalled();
    });

    test('explicit helpful feedback pulls the bandit arm immediately', async () => {
        const db = {
            all: jest.fn().mockResolvedValue([{ id: 7, arm_id: 'misconception_heavy', delayed_reward: null }]),
            updatePersonalizationDecisionReward: jest.fn().mockResolvedValue(true),
            recordPersonalizationArmPull: jest.fn().mockResolvedValue(true),
        };

        const result = await attributeSearchInteractionReward(db, 'u1', {
            decisionId: 7,
            feedbackType: 'helpful',
        });

        expect(result).toMatchObject({ rewarded: true, armPullRecorded: true });
        expect(db.recordPersonalizationArmPull).toHaveBeenCalled();
    });

    test('anonymous decisionId reward requires matching session context', async () => {
        const db = {
            all: jest.fn().mockResolvedValue([]),
            updatePersonalizationDecisionReward: jest.fn().mockResolvedValue(true),
            recordPersonalizationArmPull: jest.fn().mockResolvedValue(true),
            recordLearningEvent: jest.fn().mockResolvedValue({ id: 1 }),
        };

        const result = await attributeSearchInteractionReward(db, null, {
            decisionId: 7,
            feedbackType: 'helpful',
        });

        expect(result).toMatchObject({ rewarded: false, reason: 'missing_context' });
        expect(db.all).not.toHaveBeenCalled();
        expect(db.updatePersonalizationDecisionReward).not.toHaveBeenCalled();
    });

    test('anonymous decisionId reward joins through search session when session is present', async () => {
        const db = {
            all: jest.fn().mockResolvedValue([{ id: 7, arm_id: 'organic', delayed_reward: null }]),
            updatePersonalizationDecisionReward: jest.fn().mockResolvedValue(true),
            recordPersonalizationArmPull: jest.fn().mockResolvedValue(true),
            recordLearningEvent: jest.fn().mockResolvedValue({ id: 1 }),
        };

        const result = await attributeSearchInteractionReward(db, null, {
            decisionId: 7,
            feedbackType: 'helpful',
            sessionId: 'sess-1',
        });

        expect(result).toMatchObject({ rewarded: true, armPullRecorded: true });
        expect(db.all.mock.calls[0][0]).toContain('JOIN searches');
        expect(db.all.mock.calls[0][1]).toContain('sess-1');
        expect(db.recordLearningEvent).toHaveBeenCalledWith(expect.objectContaining({
            eventType: 'search_reward_attributed',
            sourceId: 'decision:7',
        }));
    });

    test('attributeQuizAttemptRewards links quiz attempts to recent impressions', async () => {
        const db = {
            normalizeTopic: (t) => String(t).toLowerCase().replace(/\s+/g, '-'),
            findRecentSearchImpressionsForAttribution: jest.fn().mockResolvedValue([
                {
                    impression_id: 9,
                    search_id: 42,
                    article_uid: 'pmid-1',
                    was_clicked: 1,
                    dwell_time_ms: 0,
                    normalized_topic: 'ards',
                },
            ]),
            countPriorQuizAttemptsOnClaim: jest.fn().mockResolvedValue(0),
            insertSearchLearningOutcome: jest.fn().mockResolvedValue({ id: 1 }),
            all: jest.fn().mockResolvedValue([{ id: 7, arm_id: 'quiz_gap_heavy' }]),
            updatePersonalizationDecisionReward: jest.fn().mockResolvedValue(true),
            recordPersonalizationArmPull: jest.fn().mockResolvedValue(true),
        };

        const result = await attributeQuizAttemptRewards(db, 'u1', [{
            id: 100,
            isCorrect: true,
            claimKey: 'ck-1',
            sourceArticleUid: 'pmid-1',
        }], 'ARDS');

        expect(result.attributed).toBe(1);
        expect(db.insertSearchLearningOutcome).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'u1',
            searchId: 42,
            reward: 1,
            firstAttemptCorrect: true,
        }));
        expect(db.recordPersonalizationArmPull).toHaveBeenCalledWith(
            'search_ranking',
            'quiz_gap_heavy',
            expect.any(Number),
            'user:u1'
        );
    });

    test('attributeQuizAttemptRewards uses decisionId when no impression match exists', async () => {
        const db = {
            normalizeTopic: (t) => String(t).toLowerCase().replace(/\s+/g, '-'),
            findRecentSearchImpressionsForAttribution: jest.fn().mockResolvedValue([]),
            all: jest.fn().mockResolvedValue([{ id: 12, arm_id: 'misconception_heavy', delayed_reward: null }]),
            updatePersonalizationDecisionReward: jest.fn().mockResolvedValue(true),
            recordPersonalizationArmPull: jest.fn().mockResolvedValue(true),
        };

        const result = await attributeQuizAttemptRewards(db, 'u1', [{
            id: 101,
            isCorrect: true,
            decisionId: 12,
        }], 'Sepsis');

        expect(result.attributed).toBe(1);
        expect(db.updatePersonalizationDecisionReward).toHaveBeenCalledWith(
            12,
            expect.objectContaining({
                delayedReward: 1,
                totalReward: 0.9,
            })
        );
        expect(db.recordPersonalizationArmPull).toHaveBeenCalled();
    });

    test('attributeQuizAttemptRewards attributes via session when userId is absent', async () => {
        const db = {
            normalizeTopic: (t) => String(t).toLowerCase().replace(/\s+/g, '-'),
            findRecentSearchImpressionsForAttribution: jest.fn().mockResolvedValue([
                {
                    impression_id: 9,
                    search_id: 3,
                    article_uid: 'pmid:1',
                    was_clicked: 1,
                    was_saved: 0,
                    dwell_time_ms: 0,
                    normalized_topic: 'sepsis',
                },
            ]),
            insertSearchLearningOutcome: jest.fn().mockResolvedValue({ id: 1 }),
            all: jest.fn().mockResolvedValue([]),
            updatePersonalizationDecisionReward: jest.fn().mockResolvedValue(true),
            recordPersonalizationArmPull: jest.fn().mockResolvedValue(true),
        };

        const result = await attributeQuizAttemptRewards(db, null, [{
            id: null,
            isCorrect: true,
            sourceArticleUid: 'pmid:1',
            banditArmId: 'quiz_gap_heavy',
        }], 'Sepsis', { sessionId: 'sess-beta-1' });

        expect(result.attributed).toBe(1);
        expect(db.findRecentSearchImpressionsForAttribution).toHaveBeenCalledWith(
            null,
            expect.objectContaining({ sessionId: 'sess-beta-1' }),
        );
        expect(db.insertSearchLearningOutcome).toHaveBeenCalledWith(
            expect.objectContaining({ userId: 'session:sess-beta-1' }),
        );
    });

    test('getQuizAttributionCoverage reports source and attribution rates', async () => {
        const db = {
            get: jest.fn().mockResolvedValue({
                total_attempts: 10,
                attempts_with_source: 8,
                attributed_attempts: 6,
            }),
        };

        const result = await getQuizAttributionCoverage(db, { days: 14 });

        expect(result).toMatchObject({
            days: 14,
            totalAttempts: 10,
            attemptsWithSource: 8,
            attributedAttempts: 6,
            sourceCoverageRate: 0.8,
            attributionRate: 0.75,
        });
    });

    test('attributeAgentQuizOutcomeReward rewards recent agent strategy after strong quiz outcome', async () => {
        const db = {
            normalizeTopic: (t) => String(t).toLowerCase(),
            all: jest.fn().mockResolvedValue([
                { payload_json: JSON.stringify({ banditMeta: { armId: 'socratic' } }) },
            ]),
            recordPersonalizationArmPull: jest.fn().mockResolvedValue(true),
            recordLearningEvent: jest.fn().mockResolvedValue({ id: 1 }),
        };

        const result = await attributeAgentQuizOutcomeReward(db, 'u1', [
            { isCorrect: true },
            { isCorrect: true },
            { isCorrect: true },
        ], 'Sepsis');

        expect(result).toMatchObject({ rewarded: 1, reward: 0.7 });
        expect(db.recordPersonalizationArmPull).toHaveBeenCalledWith(
            'agent_teaching_strategy',
            'socratic',
            0.7,
            'user:u1'
        );
        expect(db.recordLearningEvent).toHaveBeenCalledWith(expect.objectContaining({
            eventType: 'agent_quiz_reward_attributed',
        }));
    });
});
