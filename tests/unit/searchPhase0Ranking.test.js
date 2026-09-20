'use strict';

/**
 * Phase 0 gaps from the search rebuild plan:
 *   - acute/chronic must stay as condition terms (AKI vs CKD)
 *   - unrecognised short tokens (as, gi, ca) are weak anchors, never discarded
 *   - all / ed only count with a clinical companion, not ordinary English
 */

const {
    queryMatchScore,
    isOffTopic,
} = require('../../server/services/evidenceBouquet/queryRelevance');
const {
    originalConditionTerms,
    originalWeakAnchorTerms,
    GENERIC_CLINICAL_TERMS,
} = require('../../server/utils/conditionQuery');

const akiPaper = {
    uid: 'aki',
    title: 'KDIGO clinical practice guideline for acute kidney injury',
    abstract: 'Staging and management of acute kidney injury in hospitalised adults.',
};

const ckdPaper = {
    uid: 'ckd',
    title: 'KDIGO 2024 clinical practice guideline for the evaluation and management of chronic kidney disease',
    abstract: 'Chronic kidney disease classification, GFR, and albuminuria.',
};

const asPaper = {
    uid: 'as-spa',
    title: 'ASAS-EULAR recommendations for the management of axial spondyloarthritis',
    abstract: 'Treatment of ankylosing spondylitis and non-radiographic axial spondyloarthritis.',
};

const backPain = {
    uid: 'back-pain',
    title: 'Noninvasive treatments for acute, subacute, and chronic low back pain',
    abstract: 'All patients with lumbar pain should be offered exercise and education.',
};

const allLeukemia = {
    uid: 'all-leuk',
    title: 'Induction therapy for acute lymphoblastic leukemia in adults',
    abstract: 'Hyper-CVAD and paediatric-inspired induction regimens for ALL.',
};

describe('Phase 0: acute and chronic stay as condition terms', () => {
    test('are not stripped as generic scaffolding', () => {
        expect(GENERIC_CLINICAL_TERMS.has('acute')).toBe(false);
        expect(GENERIC_CLINICAL_TERMS.has('chronic')).toBe(false);
        expect(originalConditionTerms('acute kidney injury')).toEqual(
            expect.arrayContaining(['acute', 'kidney', 'injury'])
        );
        expect(originalConditionTerms('chronic kidney disease')).toEqual(
            expect.arrayContaining(['chronic', 'kidney'])
        );
        expect(originalConditionTerms('chronic kidney disease')).not.toContain('disease');
    });

    test('AKI and CKD queries no longer collapse onto the same tokens', () => {
        const akiTerms = originalConditionTerms('acute kidney injury');
        const ckdTerms = originalConditionTerms('chronic kidney disease');
        expect(akiTerms).toContain('acute');
        expect(akiTerms).not.toContain('chronic');
        expect(ckdTerms).toContain('chronic');
        expect(ckdTerms).not.toContain('acute');
    });

    test('spelled-out AKI keeps the AKI paper and gates the CKD paper', () => {
        expect(isOffTopic(akiPaper, 'acute kidney injury')).toBe(false);
        expect(isOffTopic(ckdPaper, 'acute kidney injury')).toBe(true);
        expect(queryMatchScore(akiPaper, 'acute kidney injury'))
            .toBeGreaterThan(queryMatchScore(ckdPaper, 'acute kidney injury'));
    });
});

describe('Phase 0: unrecognised short tokens are weak anchors', () => {
    test('AS is kept as a weak anchor instead of being discarded', () => {
        expect(originalConditionTerms('AS severity')).toEqual(['severity']);
        expect(originalWeakAnchorTerms('AS severity')).toEqual(['as']);
    });

    test('ankylosing spondylitis is not gated out of AS severity', () => {
        expect(isOffTopic(asPaper, 'AS severity')).toBe(false);
        expect(queryMatchScore(asPaper, 'AS severity')).toBeGreaterThan(0);
        expect(isOffTopic(backPain, 'AS severity')).toBe(true);
    });
});

describe('Phase 0: ALL and ED need a clinical companion', () => {
    test('ALL induction does not score a back-pain paper on the English word all', () => {
        expect(originalConditionTerms('ALL induction')).toEqual(expect.arrayContaining(['all', 'induction']));
        expect(queryMatchScore(backPain, 'ALL induction')).toBe(0);
        expect(isOffTopic(backPain, 'ALL induction')).toBe(true);
    });

    test('ALL induction keeps the leukaemia induction paper', () => {
        expect(isOffTopic(allLeukemia, 'ALL induction')).toBe(false);
        expect(queryMatchScore(allLeukemia, 'ALL induction')).toBeGreaterThan(
            queryMatchScore(backPain, 'ALL induction')
        );
    });
});
