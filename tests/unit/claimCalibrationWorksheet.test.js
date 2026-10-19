'use strict';

const { stratifiedClaimSample } = require('../../scripts/build-claim-calibration-worksheet');

// claimStructureFindings flags claims whose text shares no vocabulary with the quote
const FLAGGED = {
    claim_key: 'k1',
    claim_text: 'Zebra finches migrate annually across the savanna.',
    evidence_quote: 'The guideline recommends norepinephrine as first-line vasopressor for septic shock patients.',
    source_path: 'synopsis.clinicalClaims',
};
const CLEAN = {
    claim_key: 'k2',
    claim_text: 'Norepinephrine is the recommended first-line vasopressor in septic shock.',
    evidence_quote: 'The guideline recommends norepinephrine as first-line vasopressor for septic shock patients.',
    source_path: 'synopsis.clinicalClaims',
};

describe('stratifiedClaimSample', () => {
    test('over-samples structurally flagged claims and tags strata', () => {
        const rows = [CLEAN, FLAGGED, { ...CLEAN, claim_key: 'k3' }, { ...FLAGGED, claim_key: 'k4' }];
        const sampled = stratifiedClaimSample(rows, 4);
        expect(sampled).toHaveLength(3); // 1 flagged (30% of 4) + 2 clean (whole clean pool)
        const flaggedCount = sampled.filter((r) => r.stratum === 'structurally_flagged').length;
        expect(flaggedCount).toBe(1);
        for (const r of sampled) {
            expect(typeof r.samplingWeight).toBe('number');
            expect(Array.isArray(r.structuralFindings)).toBe(true);
        }
    });

    test('deterministic: same input produces the same sample', () => {
        const rows = Array.from({ length: 20 }, (_, i) => ({ ...CLEAN, claim_key: `k${i}` }));
        const a = stratifiedClaimSample(rows, 10).map((r) => r.claim_key);
        const b = stratifiedClaimSample(rows, 10).map((r) => r.claim_key);
        expect(a).toEqual(b);
    });

    test('respects the count cap when population is smaller', () => {
        const sampled = stratifiedClaimSample([CLEAN], 10);
        expect(sampled).toHaveLength(1);
    });
});
