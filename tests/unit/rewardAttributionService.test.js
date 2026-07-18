'use strict';

const {
    REWARD_FIRST_CORRECT,
    REWARD_REPEAT_CORRECT,
    REWARD_WRONG,
    impressionEngagementReward,
    searchFeedbackReward,
    quizAttemptReward,
    combineSearchQuizReward,
    recommendationFollowThroughReward,
    explainInteractionReward,
} = require('../../server/services/rewardAttributionService');

describe('rewardAttributionService', () => {
    describe('impressionEngagementReward', () => {
        test('save yields highest reward', () => {
            expect(impressionEngagementReward({ was_saved: true })).toBe(0.4);
            expect(impressionEngagementReward({ was_saved: 1 })).toBe(0.4);
        });

        test('click without save yields small reward', () => {
            expect(impressionEngagementReward({ was_clicked: true })).toBe(0.02);
            expect(impressionEngagementReward({ was_clicked: 1 })).toBe(0.02);
        });

        test('dwell time adds incremental reward', () => {
            expect(impressionEngagementReward({ was_clicked: true, dwell_time_ms: 12000 })).toBeCloseTo(0.03);
            expect(impressionEngagementReward({ was_clicked: true, dwell_time_ms: 30000 })).toBeCloseTo(0.05);
        });

        test('save plus long dwell sums to max impression reward', () => {
            expect(impressionEngagementReward({ was_saved: true, dwell_time_ms: 30000 })).toBeCloseTo(0.43);
        });

        test('no engagement yields zero reward', () => {
            expect(impressionEngagementReward({})).toBe(0);
            expect(impressionEngagementReward(null)).toBe(0);
        });
    });

    describe('searchFeedbackReward', () => {
        test('helpful is positive', () => {
            expect(searchFeedbackReward('helpful')).toBe(0.45);
        });

        test('not helpful is negative', () => {
            expect(searchFeedbackReward('not_helpful')).toBe(-0.5);
        });

        test('unknown feedback is neutral', () => {
            expect(searchFeedbackReward('maybe')).toBe(0);
            expect(searchFeedbackReward()).toBe(0);
        });
    });

    describe('quizAttemptReward', () => {
        test('first correct answer is worth most', () => {
            expect(quizAttemptReward(true, true)).toBe(REWARD_FIRST_CORRECT);
            expect(quizAttemptReward(true, true)).toBe(1.0);
        });

        test('repeat correct answer is smaller', () => {
            expect(quizAttemptReward(true, false)).toBe(REWARD_REPEAT_CORRECT);
            expect(quizAttemptReward(true, false)).toBe(0.25);
        });

        test('wrong answer carries a small negative reward', () => {
            expect(quizAttemptReward(false, true)).toBe(REWARD_WRONG);
            expect(quizAttemptReward(false, false)).toBe(REWARD_WRONG);
            expect(REWARD_WRONG).toBeLessThan(0);
        });
    });

    describe('combineSearchQuizReward', () => {
        test('weights impression and quiz reward', () => {
            const combined = combineSearchQuizReward(0.2, 1.0);
            expect(combined).toBeCloseTo(0.92);
        });

        test('caps at 1', () => {
            expect(combineSearchQuizReward(1, 1)).toBe(1);
        });

        test('uses default weights when none provided', () => {
            expect(combineSearchQuizReward(0, 1)).toBe(0.9);
        });

        test('uses custom weights when provided', () => {
            expect(combineSearchQuizReward(0.5, 1.0, { impression: 0.5, quiz: 0.5 })).toBe(0.75);
        });
    });

    describe('recommendationFollowThroughReward', () => {
        test.each([
            ['quiz_session', 0.85],
            ['topic_open', 0.55],
            ['case_open', 0.55],
            ['recommendation_clicked', 0.4],
            ['unknown_event', 0.4],
        ])('%s -> %s', (eventType, expected) => {
            expect(recommendationFollowThroughReward(eventType)).toBe(expected);
        });
    });

    describe('explainInteractionReward', () => {
        test('explains impression-only reward', () => {
            const result = explainInteractionReward({
                interactionType: 'search_result',
                impression: { was_saved: true, dwell_time_ms: 30000 },
            });
            expect(result.interactionType).toBe('search_result');
            expect(result.totalReward).toBeCloseTo(0.43);
            expect(result.components).toContainEqual({ source: 'impression_engagement', reward: expect.closeTo(0.43) });
        });

        test('explains feedback reward', () => {
            const result = explainInteractionReward({
                interactionType: 'search_feedback',
                feedbackType: 'not_helpful',
            });
            expect(result.totalReward).toBe(-0.5);
            expect(result.components).toContainEqual({
                source: 'search_feedback',
                reward: -0.5,
                feedbackType: 'not_helpful',
            });
        });

        test('explains quiz reward with impression', () => {
            const result = explainInteractionReward({
                interactionType: 'quiz_attempt',
                impression: { was_clicked: true, dwell_time_ms: 30000 },
                quizAttempt: { isCorrect: true, isFirstAttempt: true },
            });
            expect(result.totalReward).toBeCloseTo(0.905);
            expect(result.components).toContainEqual({
                source: 'quiz_outcome',
                reward: REWARD_FIRST_CORRECT,
                isFirstAttempt: true,
            });
            expect(result.components).toContainEqual({
                source: 'search_quiz_combined',
                reward: expect.closeTo(0.905),
            });
        });

        test('explains quiz reward without impression', () => {
            const result = explainInteractionReward({
                interactionType: 'quiz_attempt',
                quizAttempt: { isCorrect: true, isFirstAttempt: false },
            });
            expect(result.totalReward).toBe(REWARD_REPEAT_CORRECT);
            expect(result.components).toContainEqual({
                source: 'quiz_outcome',
                reward: REWARD_REPEAT_CORRECT,
                isFirstAttempt: false,
            });
        });

        test('explains recommendation follow-through reward', () => {
            const result = explainInteractionReward({
                interactionType: 'recommendation',
                recommendationEventType: 'quiz_session',
            });
            expect(result.totalReward).toBe(0.85);
            expect(result.components).toContainEqual({
                source: 'recommendation_follow_through',
                reward: 0.85,
                eventType: 'quiz_session',
            });
        });

        test('caps negative total reward at -1', () => {
            const result = explainInteractionReward({
                interactionType: 'search_feedback',
                feedbackType: 'not_helpful',
                impression: {},
                quizAttempt: { isCorrect: false, isFirstAttempt: true },
            });
            expect(result.totalReward).toBeGreaterThanOrEqual(-1);
        });

        test('includes interaction_type component at start', () => {
            const result = explainInteractionReward({ interactionType: 'search' });
            expect(result.components[0]).toEqual({ source: 'interaction_type', value: 'search' });
        });
    });
});
