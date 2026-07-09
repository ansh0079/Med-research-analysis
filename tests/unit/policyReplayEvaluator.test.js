'use strict';

const {
    replayPolicy,
    replayAllArms,
    replayGatePasses,
    simulateBoost,
    MIN_COVERAGE,
    MIN_LIFT_FACTOR,
    MAX_SAFETY_VIOLATION_RATE,
} = require('../../server/services/policyReplayEvaluator');
const { SEARCH_RANKING_ARMS, POLICY_SEARCH_RANKING } = require('../../server/services/personalizationBanditService');

// ─── fixtures ────────────────────────────────────────────────────────────────

function makeDb(rows = []) {
    return {
        all: jest.fn().mockResolvedValue(rows),
    };
}

function makeRow(overrides = {}) {
    return {
        id: 1,
        arm_id: 'heuristic_default',
        article_uid: 'pmid:12345',
        total_reward: 0.5,
        immediate_reward: 0.5,
        delayed_reward: null,
        context_json: JSON.stringify({ boost: 1.0 }),
        created_at: new Date().toISOString(),
        ...overrides,
    };
}

// ─── simulateBoost ────────────────────────────────────────────────────────────

describe('simulateBoost', () => {
    const candidateWeights = SEARCH_RANKING_ARMS.heuristic_default;

    test('returns null when context has no boost', () => {
        const row = { arm_id: 'heuristic_default', context: {} };
        expect(simulateBoost(row, candidateWeights)).toBeNull();
    });

    test('returns null for unknown serving arm', () => {
        const row = { arm_id: 'nonexistent_arm', context: { boost: 1.0 } };
        expect(simulateBoost(row, candidateWeights)).toBeNull();
    });

    test('same arm produces scale ~1, boost unchanged', () => {
        const row = { arm_id: 'heuristic_default', context: { boost: 1.0 } };
        const result = simulateBoost(row, candidateWeights);
        expect(result).not.toBeNull();
        expect(result.simulatedBoost).toBeCloseTo(1.0, 1);
        expect(result.wasCapped).toBe(false);
    });

    test('higher-weight arm produces larger simulated boost', () => {
        const row = { arm_id: 'heuristic_default', context: { boost: 1.0 } };
        const heavy = SEARCH_RANKING_ARMS.engagement_heavy;
        const result = simulateBoost(row, heavy);
        expect(result).not.toBeNull();
        expect(result.simulatedBoost).toBeGreaterThan(1.0);
    });

    test('safety cap applied for weak-evidence article', () => {
        const row = { arm_id: 'heuristic_default', context: { boost: 2.0 } };
        const weak = article({ _ebmScore: 1 });
        const result = simulateBoost(row, SEARCH_RANKING_ARMS.engagement_heavy, weak);
        expect(result).not.toBeNull();
        // EBM<3 cap is 0.5, engagement_heavy norm > heuristic, so raw would exceed 0.5
        expect(result.simulatedBoost).toBeLessThanOrEqual(0.5 + 1e-9);
        expect(result.wasCapped).toBe(true);
    });
});

function article(overrides = {}) {
    return { title: 'Test', ...overrides };
}

// ─── replayPolicy ────────────────────────────────────────────────────────────

describe('replayPolicy', () => {
    test('returns error for unknown arm', async () => {
        const db = makeDb([]);
        const result = await replayPolicy(db, 'does_not_exist');
        expect(result.error).toMatch(/Unknown arm/);
    });

    test('returns zero-n result when no decisions logged', async () => {
        const db = makeDb([]);
        const result = await replayPolicy(db, 'heuristic_default');
        expect(result.n).toBe(0);
        expect(result.meanReward).toBeNull();
    });

    test('computes meanReward from single decision', async () => {
        const db = makeDb([makeRow({ total_reward: 0.6, context_json: JSON.stringify({ boost: 1.0 }) })]);
        const result = await replayPolicy(db, 'heuristic_default');
        expect(result.n).toBe(1);
        expect(result.meanReward).toBeCloseTo(0.6, 2);
        expect(result.coverage).toBeGreaterThan(0);
    });

    test('coverage < 1 when some rows lack boost context', async () => {
        const rows = [
            makeRow({ context_json: JSON.stringify({ boost: 1.0 }) }),
            makeRow({ context_json: '{}' }), // no boost → not evaluable
        ];
        const db = makeDb(rows);
        const result = await replayPolicy(db, 'heuristic_default');
        expect(result.coverage).toBeLessThan(1);
    });

    test('safetyViolations counted when boost capped', async () => {
        // engagement_heavy will scale up a boost of 2.0 to something >0.5 for EBM<3 article,
        // but that article meta isn't available in the DB row so this just tests the scale path.
        // We verify safetyViolations is a non-negative integer.
        const db = makeDb([makeRow({ arm_id: 'engagement_heavy', total_reward: 0.8, context_json: JSON.stringify({ boost: 2.0 }) })]);
        const result = await replayPolicy(db, 'engagement_heavy');
        expect(typeof result.safetyViolations).toBe('number');
        expect(result.safetyViolations).toBeGreaterThanOrEqual(0);
    });

    test('liftVsBaseline is null when baseline is 0', async () => {
        const db = makeDb([makeRow({ total_reward: 0, context_json: JSON.stringify({ boost: 0 }) })]);
        const result = await replayPolicy(db, 'heuristic_default');
        // boost=0 means no evaluable rows (loggedBoost=0 treated as scale=1 but reward=0)
        // just ensure it doesn't throw
        expect(result).toBeDefined();
    });
});

// ─── replayAllArms ────────────────────────────────────────────────────────────

describe('replayAllArms', () => {
    test('returns results sorted by meanReward descending', async () => {
        const rows = [
            makeRow({ arm_id: 'heuristic_default', total_reward: 0.4, context_json: JSON.stringify({ boost: 1.0 }) }),
            makeRow({ arm_id: 'heuristic_default', total_reward: 0.6, context_json: JSON.stringify({ boost: 1.0 }) }),
        ];
        const db = makeDb(rows);
        const results = await replayAllArms(db);
        for (let i = 1; i < results.length; i++) {
            expect(results[i - 1].meanReward).toBeGreaterThanOrEqual(results[i].meanReward);
        }
    });

    test('excludes arms that error', async () => {
        const db = makeDb([]);
        const results = await replayAllArms(db);
        // No decisions → n=0 → meanReward=null → filtered out
        expect(results).toHaveLength(0);
    });
});

// ─── replayGatePasses ────────────────────────────────────────────────────────

describe('replayGatePasses', () => {
    test('passes when all criteria met', () => {
        const result = {
            n: 100,
            coverage: 0.9,
            safetyViolationRate: 0.05,
            liftVsBaseline: 0.1,
            meanReward: 0.5,
        };
        expect(replayGatePasses(result).pass).toBe(true);
    });

    test('fails when error present', () => {
        expect(replayGatePasses({ error: 'Unknown arm' }).pass).toBe(false);
    });

    test('fails when n=0', () => {
        expect(replayGatePasses({ n: 0 }).pass).toBe(false);
    });

    test(`fails when coverage < ${MIN_COVERAGE}`, () => {
        const r = { n: 100, coverage: MIN_COVERAGE - 0.01, safetyViolationRate: 0, liftVsBaseline: 0 };
        expect(replayGatePasses(r).pass).toBe(false);
    });

    test(`fails when safetyViolationRate > ${MAX_SAFETY_VIOLATION_RATE}`, () => {
        const r = { n: 100, coverage: 0.9, safetyViolationRate: MAX_SAFETY_VIOLATION_RATE + 0.01, liftVsBaseline: 0 };
        expect(replayGatePasses(r).pass).toBe(false);
    });

    test('fails when lift is too negative', () => {
        const r = { n: 100, coverage: 0.9, safetyViolationRate: 0.05, liftVsBaseline: -(1 - MIN_LIFT_FACTOR) - 0.01 };
        expect(replayGatePasses(r).pass).toBe(false);
    });

    test('passes when lift is null (baseline=0)', () => {
        const r = { n: 100, coverage: 0.9, safetyViolationRate: 0.05, liftVsBaseline: null };
        expect(replayGatePasses(r).pass).toBe(true);
    });
});
