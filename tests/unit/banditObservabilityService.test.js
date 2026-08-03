'use strict';

const {
    collectBanditObservability,
    mapArmRow,
    clampDays,
} = require('../../server/services/banditObservabilityService');

describe('banditObservabilityService', () => {
    test('clampDays bounds the window', () => {
        expect(clampDays(0)).toBe(7); // falsy → default 7 (matches productionObservabilityService)
        expect(clampDays(7)).toBe(7);
        expect(clampDays(120)).toBe(90);
        expect(clampDays('bad')).toBe(7);
    });

    test('mapArmRow normalizes snake_case rows and computes means', () => {
        const mapped = mapArmRow({
            policy_type: 'search_ranking',
            arm_id: 'heuristic_default',
            scope_key: 'global',
            alpha: 3,
            beta: 1,
            pulls: 4,
            total_reward: 2,
            updated_at: '2026-08-01T00:00:00.000Z',
        });
        expect(mapped).toMatchObject({
            policyType: 'search_ranking',
            armId: 'heuristic_default',
            scopeKey: 'global',
            alpha: 3,
            beta: 1,
            pulls: 4,
            totalReward: 2,
            meanReward: 0.5,
            thompsonMean: 0.75,
        });
    });

    test('collectBanditObservability returns arm states and decision density', async () => {
        const db = {
            listPersonalizationArmStates: jest.fn().mockResolvedValue([
                {
                    policy_type: 'search_ranking',
                    arm_id: 'misconception_heavy',
                    scope_key: 'global',
                    alpha: 2,
                    beta: 2,
                    pulls: 10,
                    total_reward: 1,
                    updated_at: '2026-08-02T12:00:00.000Z',
                },
                {
                    policy_type: 'search_ranking',
                    arm_id: 'heuristic_default',
                    scope_key: 'global',
                    alpha: 5,
                    beta: 1,
                    pulls: 20,
                    total_reward: 8,
                    updated_at: '2026-08-02T13:00:00.000Z',
                },
            ]),
            get: jest.fn().mockResolvedValue({
                total: 40,
                with_reward: 28,
                with_propensity: 30,
            }),
        };

        const result = await collectBanditObservability(db, {
            policyType: 'search_ranking',
            scopeKey: 'global',
            days: 7,
        });

        expect(db.listPersonalizationArmStates).toHaveBeenCalledWith('search_ranking', 'global');
        expect(db.get).toHaveBeenCalled();
        expect(result.policyType).toBe('search_ranking');
        expect(result.scopeKey).toBe('global');
        expect(result.days).toBe(7);
        expect(result.arms).toHaveLength(2);
        expect(result.arms[0].armId).toBe('heuristic_default');
        expect(result.arms[1].armId).toBe('misconception_heavy');
        expect(result.decisions).toEqual({
            total: 40,
            withReward: 28,
            withPropensity: 30,
            rewardDensity: 0.7,
        });
        expect(result.generatedAt).toEqual(expect.any(String));
    });

    test('collectBanditObservability tolerates missing db methods', async () => {
        const result = await collectBanditObservability({}, { days: 3 });
        expect(result.arms).toEqual([]);
        expect(result.decisions).toEqual({
            total: 0,
            withReward: 0,
            withPropensity: 0,
            rewardDensity: 0,
        });
        expect(result.days).toBe(3);
    });

    test('collectBanditObservability defaults policy and scope', async () => {
        const db = {
            listPersonalizationArmStates: jest.fn().mockResolvedValue([]),
            get: jest.fn().mockResolvedValue({ total: 0, with_reward: 0, with_propensity: 0 }),
        };
        const result = await collectBanditObservability(db);
        expect(db.listPersonalizationArmStates).toHaveBeenCalledWith('search_ranking', 'global');
        expect(result.policyType).toBe('search_ranking');
        expect(result.scopeKey).toBe('global');
    });
});
