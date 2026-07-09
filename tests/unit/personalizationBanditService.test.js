const {
    sampleBeta,
    immediateImpressionReward,
    SEARCH_RANKING_ARMS,
    RECOMMENDATION_ARM_BY_TYPE,
    applyRecommendationBandit,
    recommendationContextFeatures,
    selectSynopsisStyleArm,
    recordBanditReward,
    reconcileImpressionRewards,
    hierarchicalUserWeight,
    blendedArmSample,
} = require('../../server/services/personalizationBanditService');

describe('personalizationBanditService', () => {
    test('sampleBeta returns values between 0 and 1', () => {
        for (let i = 0; i < 20; i++) {
            const value = sampleBeta(2, 5);
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(1);
        }
    });

    test('sampleBeta roughly follows the expected mean', () => {
        const draws = Array.from({ length: 4000 }, () => sampleBeta(2, 5));
        const mean = draws.reduce((sum, value) => sum + value, 0) / draws.length;
        expect(mean).toBeGreaterThan(0.25);
        expect(mean).toBeLessThan(0.33);
    });

    test('immediateImpressionReward weights save above click', () => {
        const save = immediateImpressionReward({ was_saved: 1 });
        const click = immediateImpressionReward({ was_clicked: 1 });
        expect(save).toBeGreaterThan(click);
    });

    test('search ranking arms define component weights', () => {
        expect(SEARCH_RANKING_ARMS.misconception_heavy.misconception).toBeGreaterThan(
            SEARCH_RANKING_ARMS.heuristic_default.misconception
        );
    });

    test('recommendationContextFeatures derives time, streak, and mastery bands', () => {
        expect(recommendationContextFeatures(
            { overallScore: 82 },
            { now: new Date('2026-07-07T09:00:00.000Z'), profile: { currentStreak: 5 } }
        )).toMatchObject({
            timeOfDay: 'morning',
            streakBand: 'active',
            masteryBand: 'strong',
        });
    });

    test('applyRecommendationBandit re-ranks with bandit metadata', async () => {
        const db = {
            ensurePersonalizationArms: jest.fn().mockResolvedValue(true),
            listPersonalizationArmStates: jest.fn().mockResolvedValue([
                { arm_id: 'review', alpha: 4, beta: 1, pulls: 10 },
                { arm_id: 'explore', alpha: 1, beta: 3, pulls: 10 },
            ]),
            insertPersonalizationDecision: jest.fn().mockResolvedValue({ id: 1 }),
        };
        const recs = [
            { type: 'explore', topic: 'ARDS', normalizedTopic: 'ards', priority: 70, action: 'topic' },
            { type: 'review', topic: 'Sepsis', normalizedTopic: 'sepsis', priority: 68, action: 'quiz' },
        ];
        const adjusted = await applyRecommendationBandit(db, 'u1', recs);
        expect(adjusted[0].banditArmId).toBeDefined();
        expect(RECOMMENDATION_ARM_BY_TYPE.review).toBe('review');
        expect(db.insertPersonalizationDecision).toHaveBeenCalled();
    });

    test('selectSynopsisStyleArm uses user scope only after the cold-start pull threshold', async () => {
        const db = {
            ensurePersonalizationArms: jest.fn().mockResolvedValue(true),
            listPersonalizationArmStates: jest.fn(async (_policyType, scopeKey) => {
                if (scopeKey === 'user:u1') {
                    return [{ arm_id: 'teaching_points', alpha: 6, beta: 1, pulls: 8 }];
                }
                return [{ arm_id: 'bottom_line_first', alpha: 2, beta: 1, pulls: 20 }];
            }),
        };

        const selected = await selectSynopsisStyleArm(db, 'u1');

        expect(selected.scopeKey).toBe('user:u1');
    });

    test('hierarchicalUserWeight keeps cold-start users global and gradually trusts user scope', () => {
        expect(hierarchicalUserWeight(7)).toBe(0);
        expect(hierarchicalUserWeight(8)).toBeGreaterThan(0);
        expect(hierarchicalUserWeight(30)).toBe(1);
        expect(blendedArmSample(0.2, 0.9, 8)).toBeLessThan(0.9);
        expect(blendedArmSample(0.2, 0.9, 30)).toBeCloseTo(0.9, 5);
    });

    test('reconcileImpressionRewards propagates quiz outcomes into synopsis and teaching decisions', async () => {
        const pending = [
            {
                id: 1,
                user_id: 'u1',
                policy_type: 'synopsis_style',
                arm_id: 'pico_structured',
                topic: 'ARDS',
                normalized_topic: 'ards',
                article_uid: 'pmid-1',
                created_at: '2026-07-01T00:00:00.000Z',
            },
            {
                id: 2,
                user_id: 'u1',
                policy_type: 'agent_teaching_strategy',
                arm_id: 'socratic',
                topic: 'ARDS',
                normalized_topic: 'ards',
                article_uid: null,
                created_at: '2026-07-01T00:00:00.000Z',
            },
        ];
        const db = {
            listPersonalizationDecisionsPendingReward: jest.fn().mockResolvedValue(pending),
            findRecentSearchImpressionsForAttribution: jest.fn().mockResolvedValue([]),
            updatePersonalizationDecisionReward: jest.fn().mockResolvedValue(true),
            recordPersonalizationArmPull: jest.fn().mockResolvedValue(true),
            all: jest.fn(async (sql, params) => {
                if (sql.includes('FROM quiz_attempts') && params.includes('pmid-1')) {
                    return [{ is_correct: 1 }, { is_correct: 1 }];
                }
                if (sql.includes('FROM quiz_attempts')) {
                    return [{ is_correct: 0 }, { is_correct: 0 }];
                }
                return [];
            }),
        };

        const result = await reconcileImpressionRewards(db, { days: 14 });

        expect(result.updated).toBe(2);
        expect(db.updatePersonalizationDecisionReward).toHaveBeenCalledWith(1, expect.objectContaining({
            delayedReward: 0.7,
            totalReward: 0.7,
        }));
        expect(db.updatePersonalizationDecisionReward).toHaveBeenCalledWith(2, expect.objectContaining({
            delayedReward: -0.15,
            totalReward: -0.15,
        }));
        expect(db.recordPersonalizationArmPull).toHaveBeenCalledWith('synopsis_style', 'pico_structured', 0.7, 'user:u1');
        expect(db.recordPersonalizationArmPull).toHaveBeenCalledWith('agent_teaching_strategy', 'socratic', -0.15, 'user:u1');
    });

    test('recordBanditReward with no userId writes to global exactly once', async () => {
        const db = {
            recordPersonalizationArmPull: jest.fn().mockResolvedValue(true),
        };
        await recordBanditReward(db, 'search_ranking', 'heuristic_default', 0.5, null);
        expect(db.recordPersonalizationArmPull).toHaveBeenCalledTimes(1);
        expect(db.recordPersonalizationArmPull).toHaveBeenCalledWith('search_ranking', 'heuristic_default', 0.5, 'global');
    });

    test('recordBanditReward with a userId writes to both user and global scope', async () => {
        const db = {
            recordPersonalizationArmPull: jest.fn().mockResolvedValue(true),
        };
        await recordBanditReward(db, 'search_ranking', 'heuristic_default', 0.5, 'u1');
        expect(db.recordPersonalizationArmPull).toHaveBeenCalledTimes(2);
        expect(db.recordPersonalizationArmPull).toHaveBeenCalledWith('search_ranking', 'heuristic_default', 0.5, 'user:u1');
        expect(db.recordPersonalizationArmPull).toHaveBeenCalledWith('search_ranking', 'heuristic_default', 0.5, 'global');
    });
});
