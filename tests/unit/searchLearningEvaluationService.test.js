'use strict';

const { summarizeLearningOutcomes, collectSearchLearningEvaluation, assessLearningPromotionSafety } = require('../../server/services/searchLearningEvaluationService');

test('counts each quiz attempt once and excludes conflicting arm attribution', () => {
    const row = { user_id: 'u', quiz_attempt_id: 1, bandit_arm_id: 'a', is_correct: 1 };
    const report = summarizeLearningOutcomes([row, row, { ...row, quiz_attempt_id: 2, is_correct: 0 }]);
    expect(report.arms[0]).toMatchObject({ attempts: 2, learners: 1, accuracy: 0.5 });
    expect(report.promotionEligible).toBe(false);
    expect(summarizeLearningOutcomes([row, { ...row, bandit_arm_id: 'b' }]).totalAttempts).toBe(0);
});

test('missing database evidence is unavailable rather than a passing result', async () => {
    expect(await collectSearchLearningEvaluation({ all: async () => { throw new Error('offline'); } })).toMatchObject({ available: false, totalAttempts: 0 });
});

test('promotion needs learner diversity and must not regress observed accuracy', () => {
    const arm = { attempts: 100, learners: 20, accuracy: 0.8 };
    const report = { available: true, arms: [{ ...arm, armId: 'a' }, { ...arm, armId: 'b', accuracy: 0.7 }] };
    expect(assessLearningPromotionSafety(report, 'b', 'a').pass).toBe(false);
    expect(assessLearningPromotionSafety(report, 'a', 'b').pass).toBe(true);
    expect(assessLearningPromotionSafety({ ...report, arms: report.arms.map((a) => ({ ...a, learners: 1 })) }, 'a', 'b').pass).toBe(false);
});
