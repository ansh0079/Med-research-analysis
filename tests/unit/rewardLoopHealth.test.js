'use strict';

const { checkRewardLoopHealth } = require('../../server/services/learning/rewardLoopHealth');

function stubDb(rows) {
    return {
        get: jest.fn(async (sql) => {
            if (/COUNT\(\*\) AS n FROM personalization_decisions WHERE policy_type = 'search_ranking'$/.test(sql)) {
                return { n: rows.total };
            }
            if (/total_reward IS NULL$/.test(sql)) {
                return { n: rows.unrewarded };
            }
            if (/reward_computed_at IS NULL/.test(sql)) {
                return { n: rows.stalled };
            }
            return { n: 0 };
        }),
    };
}

describe('rewardLoopHealth', () => {
    test('reports ok when nothing is stalled past the grace period', async () => {
        const health = await checkRewardLoopHealth(stubDb({ total: 100, unrewarded: 40, stalled: 0 }));
        expect(health.ok).toBe(true);
        expect(health.decisionsStalled).toBe(0);
        expect(health.decisionsUnrewarded).toBe(40);
    });

    test('reports not-ok when unrewarded decisions pass the grace period', async () => {
        const health = await checkRewardLoopHealth(stubDb({ total: 100, unrewarded: 12, stalled: 12 }), { graceDays: 2 });
        expect(health.ok).toBe(false);
        expect(health.decisionsStalled).toBe(12);
    });

    test('handles a missing db gracefully', async () => {
        const health = await checkRewardLoopHealth(null);
        expect(health.ok).toBe(false);
        expect(health.reason).toBe('no_db');
    });
});
