'use strict';

const {
    WEAK_EVIDENCE_MAX_BOOST,
    MODERATE_EVIDENCE_MAX_BOOST,
    articleSafetyTier,
    applyBoostSafety,
    validateArmWeights,
    auditArmSafety,
    assertArmSafetyOrThrow,
} = require('../../server/services/banditSafetyGuard');

const { SEARCH_RANKING_ARMS } = require('../../server/services/personalizationBanditService');

function article(overrides = {}) {
    return { title: 'Test', ...overrides };
}

describe('articleSafetyTier', () => {
    test('retracted → retracted', () => {
        expect(articleSafetyTier(article({ _retraction: { isRetracted: true } }))).toBe('retracted');
    });
    test('EBM 1 → weak', () => {
        expect(articleSafetyTier(article({ _ebmScore: 1 }))).toBe('weak');
    });
    test('EBM 2 → weak', () => {
        expect(articleSafetyTier(article({ _ebmScore: 2 }))).toBe('weak');
    });
    test('EBM 3 → moderate', () => {
        expect(articleSafetyTier(article({ _ebmScore: 3 }))).toBe('moderate');
    });
    test('EBM 4 → moderate', () => {
        expect(articleSafetyTier(article({ _ebmScore: 4 }))).toBe('moderate');
    });
    test('EBM 5 → strong', () => {
        expect(articleSafetyTier(article({ _ebmScore: 5 }))).toBe('strong');
    });
    test('EBM 7 → strong', () => {
        expect(articleSafetyTier(article({ _ebmScore: 7 }))).toBe('strong');
    });
    test('no EBM score → unknown', () => {
        expect(articleSafetyTier(article())).toBe('unknown');
    });
    test('reads _impact.ebmScore as fallback', () => {
        expect(articleSafetyTier(article({ _impact: { ebmScore: 2 } }))).toBe('weak');
    });
});

describe('assertArmSafetyOrThrow', () => {
    test('hard-fails unsafe arm maps', () => {
        expect(() => assertArmSafetyOrThrow({
            unsafe: { impression: 3, saved: 3, misconception: 0.1, missed: 0.1 },
        }, { policyType: 'search_ranking' })).toThrow(/Unsafe personalization arm configuration/);
    });
});

describe('applyBoostSafety', () => {
    test('retracted paper: large boost clamped to 0', () => {
        const a = article({ _retraction: { isRetracted: true }, _ebmScore: 5 });
        expect(applyBoostSafety(a, 2.5)).toBe(0);
    });

    test('weak evidence: boost above cap is clamped', () => {
        const a = article({ _ebmScore: 1 });
        expect(applyBoostSafety(a, 2.0)).toBe(WEAK_EVIDENCE_MAX_BOOST);
    });

    test('weak evidence: boost below cap passes through', () => {
        const a = article({ _ebmScore: 2 });
        expect(applyBoostSafety(a, 0.3)).toBeCloseTo(0.3);
    });

    test('moderate evidence: boost above cap is clamped', () => {
        const a = article({ _ebmScore: 4 });
        expect(applyBoostSafety(a, 1.8)).toBe(MODERATE_EVIDENCE_MAX_BOOST);
    });

    test('strong evidence: large boost passes through uncapped', () => {
        const a = article({ _ebmScore: 7 });
        expect(applyBoostSafety(a, 2.5)).toBeCloseTo(2.5);
    });

    test('negative boost always passes through regardless of tier', () => {
        const weak = article({ _ebmScore: 1 });
        expect(applyBoostSafety(weak, -1.5)).toBeCloseTo(-1.5);
    });

    test('pinned landmark bypasses weak-evidence cap', () => {
        const a = article({ _ebmScore: 2, _pinnedLandmark: true });
        expect(applyBoostSafety(a, 1.8)).toBeCloseTo(1.8);
    });

    test('unknown EBM (no score): boost uncapped', () => {
        const a = article();
        expect(applyBoostSafety(a, 2.0)).toBeCloseTo(2.0);
    });
});

describe('validateArmWeights', () => {
    test('safe arm passes', () => {
        expect(validateArmWeights({ impression: 1, saved: 1.2, misconception: 1, missed: 1 })).toHaveLength(0);
    });

    test('engagement weights too high → violation', () => {
        const v = validateArmWeights({ impression: 2.5, saved: 2.5, misconception: 0.8, missed: 0.8 });
        expect(v.some((s) => s.includes('engagement weights too high'))).toBe(true);
    });

    test('safety weights too low → violation', () => {
        const v = validateArmWeights({ impression: 1, saved: 1, misconception: 0.1, missed: 0.2 });
        expect(v.some((s) => s.includes('safety weights too low'))).toBe(true);
    });

    test('unsafe combo: high engagement + low safety → violation', () => {
        const v = validateArmWeights({ impression: 1.8, saved: 1.6, misconception: 0.3, missed: 0.4 });
        expect(v.some((s) => s.includes('unsafe arm'))).toBe(true);
    });
});

describe('auditArmSafety — existing SEARCH_RANKING_ARMS', () => {
    test('all registered arms pass safety audit', () => {
        const results = auditArmSafety(SEARCH_RANKING_ARMS);
        for (const [armId, result] of Object.entries(results)) {
            expect(result.safe).toBe(true);
        }
    });
});
