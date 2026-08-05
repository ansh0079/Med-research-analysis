'use strict';

const { normalizeBanditArmId, recordBanditReward } = require('../../server/services/bandit/rewards');
const { POLICY_SEARCH_RANKING } = require('../../server/services/bandit/constants');

describe('bandit reward normalization', () => {
    test('maps legacy organic arm to heuristic_default for search ranking', () => {
        expect(normalizeBanditArmId(POLICY_SEARCH_RANKING, 'organic')).toBe('heuristic_default');
        expect(normalizeBanditArmId(POLICY_SEARCH_RANKING, 'engagement_heavy')).toBe('engagement_heavy');
    });

    test('recordBanditReward writes normalized arm id', async () => {
        const db = {
            recordPersonalizationArmPull: jest.fn().mockResolvedValue(true),
        };
        await recordBanditReward(db, POLICY_SEARCH_RANKING, 'organic', 0.5, 'user-1');
        expect(db.recordPersonalizationArmPull).toHaveBeenCalledWith(
            POLICY_SEARCH_RANKING,
            'heuristic_default',
            0.5,
            expect.any(String),
            expect.any(Number)
        );
    });
});
