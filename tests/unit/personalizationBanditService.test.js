const {
    sampleBeta,
    immediateImpressionReward,
    SEARCH_RANKING_ARMS,
    RECOMMENDATION_ARM_BY_TYPE,
    applyRecommendationBandit,
    recommendationContextFeatures,
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
});
