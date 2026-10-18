'use strict';

const { checkRewardLoopHealth } = require('../../server/services/learning/rewardLoopHealth');

function stubDb(values) {
    return {
        get: jest.fn(async (sql) => {
            if (sql.includes('total_reward IS NOT NULL')) return { n: values.rewarded };
            if (sql.includes('reward_computed_at IS NOT NULL')) return { n: values.censored };
            if (sql.includes('created_at <')) return { n: values.stalled };
            if (sql.includes('created_at >=') && sql.includes('reward_computed_at IS NULL')) return { n: values.pending };
            return { n: values.total };
        }),
    };
}

describe('rewardLoopHealth', () => {
    test('separates rewarded, pending, stalled and censored decisions', async () => {
        const health = await checkRewardLoopHealth(stubDb({
            total: 100,
            rewarded: 60,
            pending: 20,
            stalled: 5,
            censored: 15,
        }));
        expect(health).toMatchObject({
            ok: false,
            decisionsTotal: 100,
            decisionsRewarded: 60,
            decisionsPending: 20,
            decisionsStalled: 5,
            decisionsCensored: 15,
        });
    });

    test('is healthy when no reachable decision is stalled', async () => {
        const health = await checkRewardLoopHealth(stubDb({
            total: 10, rewarded: 8, pending: 2, stalled: 0, censored: 0,
        }));
        expect(health.ok).toBe(true);
    });
});
