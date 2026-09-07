'use strict';

const {
    hourlyModelKey,
    createMemoryBackend,
    createSharedLinearModelStore,
} = require('../../server/services/bandit/sharedLinearModelStore');
const { fitLinearValueModel, selectArmByLinearValue } = require('../../server/services/contextualValueModel');
const { maybeSelectArmViaLinearValue } = require('../../server/services/bandit/searchRankingPolicy');

function labelledDecisions(n = 48) {
    const arms = ['heuristic_default', 'engagement_heavy', 'misconception_heavy', 'quiz_gap_heavy'];
    return Array.from({ length: n }, (_, i) => ({
        armId: arms[i % arms.length],
        totalReward: arms[i % arms.length] === 'engagement_heavy' ? 0.8 : 0.2,
        context: {
            masteryBand: 'strong',
            streakBand: 'active',
            hasDangerousMisconception: false,
        },
    }));
}

function sharedRedis(map) {
    return {
        async get(key) {
            return map.has(key) ? map.get(key) : null;
        },
        async set(key, value) {
            map.set(key, value);
            return 'OK';
        },
    };
}

describe('shared linear model store', () => {
    const frozen = new Date('2026-08-23T13:40:00.000Z');

    test('hourly key is deterministic per UTC hour', () => {
        expect(hourlyModelKey('search_ranking', frozen)).toBe('bandit:linear:search_ranking:2026-08-23T13');
        expect(hourlyModelKey('search_ranking', new Date('2026-08-23T13:59:59.000Z')))
            .toBe(hourlyModelKey('search_ranking', frozen));
        expect(hourlyModelKey('search_ranking', new Date('2026-08-23T14:00:00.000Z')))
            .not.toBe(hourlyModelKey('search_ranking', frozen));
    });

    test('two instances sharing Redis select the same arm', async () => {
        const remote = new Map();
        const storeA = createSharedLinearModelStore({
            redis: sharedRedis(remote),
            memory: createMemoryBackend(),
        });
        const storeB = createSharedLinearModelStore({
            redis: sharedRedis(remote),
            memory: createMemoryBackend(),
        });

        const model = fitLinearValueModel(labelledDecisions());
        expect(model.ok).toBe(true);
        const saved = await storeA.save('search_ranking', model, frozen);
        expect(saved.ok).toBe(true);

        const loadedB = await storeB.load('search_ranking', frozen);
        expect(loadedB.ok).toBe(true);
        expect(loadedB.weights).toEqual(model.weights);

        const ctx = { masteryBand: 'strong', streakBand: 'active', hasDangerousMisconception: false };
        const pickA = selectArmByLinearValue(model, ctx, { epsilon: 0 });
        const pickB = selectArmByLinearValue(loadedB, ctx, { epsilon: 0 });
        expect(pickA.armId).toBe(pickB.armId);
        expect(pickA.armId).toBe('engagement_heavy');
    });

    test('maybeSelectArmViaLinearValue reads the shared hourly model', async () => {
        const prev = process.env.BANDIT_LINEAR_VALUE_ENABLED;
        process.env.BANDIT_LINEAR_VALUE_ENABLED = 'true';
        const remote = new Map();
        const store = createSharedLinearModelStore({
            redis: sharedRedis(remote),
            memory: createMemoryBackend(),
        });
        const model = fitLinearValueModel(labelledDecisions());
        await store.save('search_ranking', model, frozen);

        const pick = await maybeSelectArmViaLinearValue(
            { all: async () => [] },
            { masteryBand: 'strong', streakBand: 'active', hasDangerousMisconception: false },
            { store, now: frozen, random: () => 0.99 }
        );
        process.env.BANDIT_LINEAR_VALUE_ENABLED = prev;
        expect(pick.armId).toBe('engagement_heavy');
        expect(pick.source).toBe('linear');
        expect(pick.modelKey).toBe('bandit:linear:search_ranking:2026-08-23T13');
    });
});
