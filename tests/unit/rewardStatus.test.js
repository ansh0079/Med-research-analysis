'use strict';

const { resolveRewardStatus, isClosedRewardStatus, buildSelectionContext } = require('../../server/services/bandit/logSelection');
const { applyDecisionReward } = require('../../server/services/search/searchLearningOutcomeService');
const { reconcileImpressionRewards } = require('../../server/services/bandit/rewards');

describe('reward_status lifecycle', () => {
    test('resolveRewardStatus defaults pending → partial, delayed → final', () => {
        expect(resolveRewardStatus({ currentStatus: 'pending' })).toBe('partial');
        expect(resolveRewardStatus({ currentStatus: 'partial', delayedReward: 0.4 })).toBe('final');
        expect(resolveRewardStatus({ currentStatus: 'final' })).toBe('final');
        expect(resolveRewardStatus({ currentStatus: 'superseded', requestedStatus: 'partial' })).toBe('partial');
        expect(isClosedRewardStatus('final')).toBe(true);
        expect(isClosedRewardStatus('pending')).toBe(false);
    });

    test('applyDecisionReward skips closed rows', async () => {
        const db = {
            updatePersonalizationDecisionReward: jest.fn().mockResolvedValue({ updated: false, reason: 'closed' }),
            recordPersonalizationArmPull: jest.fn(),
        };
        const applied = await applyDecisionReward(db, 'u1', {
            id: 9,
            arm_id: 'engagement_heavy',
            reward_status: 'final',
            total_reward: 0.4,
        }, { immediateReward: 0.8, totalReward: 0.8 });
        expect(applied).toBe(false);
        expect(db.updatePersonalizationDecisionReward).not.toHaveBeenCalled();
        expect(db.recordPersonalizationArmPull).not.toHaveBeenCalled();
    });

    test('applyDecisionReward writes partial status for immediate rewards', async () => {
        const db = {
            updatePersonalizationDecisionReward: jest.fn().mockResolvedValue({ updated: true, rewardStatus: 'partial' }),
            recordPersonalizationArmPull: jest.fn().mockResolvedValue(true),
        };
        await applyDecisionReward(db, 'u1', {
            id: 3,
            arm_id: 'quiz_gap_heavy',
            total_reward: 0,
        }, { immediateReward: 0.2, totalReward: 0.2 });
        expect(db.updatePersonalizationDecisionReward).toHaveBeenCalledWith(3, expect.objectContaining({
            rewardStatus: 'partial',
            totalReward: 0.2,
        }));
    });

    test('reconcile skips final and superseded rows', async () => {
        const db = {
            listPersonalizationDecisionsPendingReward: jest.fn().mockResolvedValue([
                { id: 1, policy_type: 'search_ranking', reward_status: 'final', article_uid: 'a1', arm_id: 'heuristic_default' },
                { id: 2, policy_type: 'search_ranking', reward_status: 'superseded', article_uid: 'a2', arm_id: 'heuristic_default' },
            ]),
            updatePersonalizationDecisionReward: jest.fn(),
            findRecentSearchImpressionsForAttribution: jest.fn(),
        };
        const result = await reconcileImpressionRewards(db, { days: 14 });
        expect(result.updated).toBe(0);
        expect(db.updatePersonalizationDecisionReward).not.toHaveBeenCalled();
    });

    test('buildSelectionContext always logs propensity fields', () => {
        const ctx = buildSelectionContext({
            armId: 'direct',
            propensity: 0.4,
            selectionSource: 'argmax_thompson',
            policy: 'agent_teaching_strategy',
        });
        expect(ctx.propensity).toBeCloseTo(0.4);
        expect(ctx.selectionSource).toBe('argmax_thompson');
        expect(ctx.policy).toBe('agent_teaching_strategy');
        expect(ctx.loggedAt).toBeTruthy();
    });
});
