'use strict';

const {
    checkApplicability,
    detectStructuredConflicts,
    composeComorbidGuidelines,
} = require('../../server/services/evidence/comorbidGuidelineService');

// ─── checkApplicability ───────────────────────────────────────────────────────

describe('checkApplicability', () => {
    test('no exclusions → applicable', () => {
        const rec = { recExclusions: null };
        expect(checkApplicability(rec, ['aki'])).toEqual({ applicable: true, exclusionHit: null });
    });

    test('exclusion names patient condition → inapplicable', () => {
        const rec = { recExclusions: 'patients with pre-existing acute kidney injury' };
        const { applicable, exclusionHit } = checkApplicability(rec, ['aki']);
        expect(applicable).toBe(false);
        expect(exclusionHit).toBe('aki');
    });

    test('exclusion names expanded form → inapplicable', () => {
        const rec = { recExclusions: 'patients with chronic kidney disease were excluded' };
        const { applicable, exclusionHit } = checkApplicability(rec, ['ckd']);
        expect(applicable).toBe(false);
        expect(exclusionHit).toBe('ckd');
    });

    test('exclusion does not match patient conditions → applicable', () => {
        const rec = { recExclusions: 'paediatric patients (< 18 years)' };
        const { applicable } = checkApplicability(rec, ['aki', 'ards']);
        expect(applicable).toBe(true);
    });

    test('empty patient conditions → always applicable', () => {
        const rec = { recExclusions: 'patients with AKI excluded' };
        expect(checkApplicability(rec, [])).toEqual({ applicable: true, exclusionHit: null });
    });

    test('UK spelling variant matched from US abbreviation', () => {
        const rec = { recExclusions: 'anaemia excluded' };
        const { applicable } = checkApplicability(rec, ['anemia']);
        expect(applicable).toBe(false);
    });
});

// ─── detectStructuredConflicts ────────────────────────────────────────────────

function makeRec(intervention, direction, condition, text = 'recommendation text') {
    return { intervention, recDirection: direction, recommendationText: text, sourceBody: 'Test', sourceYear: 2024, _applicable: true };
}

describe('detectStructuredConflicts', () => {
    test('same intervention, different directions, different conditions → conflict', () => {
        const byCondition = [
            { condition: 'sepsis', guidelines: [makeRec('intravenous fluid resuscitation', 'recommend', 'sepsis', '30 mL/kg crystalloid')] },
            { condition: 'ards', guidelines: [makeRec('intravenous fluid', 'recommend_against', 'ards', 'conservative fluid strategy')] },
        ];
        const conflicts = detectStructuredConflicts(byCondition);
        expect(conflicts.length).toBeGreaterThanOrEqual(1);
        expect(conflicts[0].structured).toBe(true);
    });

    test('same intervention, same direction → no conflict', () => {
        const byCondition = [
            { condition: 'sepsis', guidelines: [makeRec('vasopressor', 'recommend', 'sepsis')] },
            { condition: 'ards', guidelines: [makeRec('vasopressor', 'recommend', 'ards')] },
        ];
        const conflicts = detectStructuredConflicts(byCondition);
        const structuredConflicts = conflicts.filter((c) => c.structured);
        expect(structuredConflicts.length).toBe(0);
    });

    test('different interventions → no conflict', () => {
        const byCondition = [
            { condition: 'aki', guidelines: [makeRec('contrast avoidance', 'recommend', 'aki')] },
            { condition: 'sepsis', guidelines: [makeRec('vasopressor', 'recommend', 'sepsis')] },
        ];
        const conflicts = detectStructuredConflicts(byCondition);
        expect(conflicts.filter((c) => c.structured).length).toBe(0);
    });

    test('single condition → no conflict even with contradictory directions', () => {
        const byCondition = [
            { condition: 'sepsis', guidelines: [
                makeRec('fluid resuscitation', 'recommend', 'sepsis'),
                makeRec('fluid resuscitation', 'recommend_against', 'sepsis'),
            ]},
        ];
        const conflicts = detectStructuredConflicts(byCondition);
        expect(conflicts.filter((c) => c.structured).length).toBe(0);
    });

    test('unstructured recs fall back to regex axis detection', () => {
        const byCondition = [
            { condition: 'sepsis', guidelines: [{ intervention: null, recDirection: null, recommendationText: 'administer 30 mL/kg crystalloid bolus', sourceBody: 'SSC' }] },
            { condition: 'ards', guidelines: [{ intervention: null, recDirection: null, recommendationText: 'conservative fluid strategy to restrict fluid', sourceBody: 'ARDSnet' }] },
        ];
        const conflicts = detectStructuredConflicts(byCondition);
        // regex axis should still catch this as a fluid_strategy conflict
        expect(conflicts.length).toBeGreaterThanOrEqual(1);
        expect(conflicts[0].structured).toBeUndefined(); // legacy axis entry has no structured flag
    });
});

// ─── inapplicable recs excluded from grounding ───────────────────────────────

describe('composeComorbidGuidelines — applicability integration', () => {
    test('flags inapplicable recommendations on composed guidelines', async () => {
        const db = {
            getGuidelinesByTopic: async (topic) => {
                if (topic === 'sepsis') return [{
                    id: 1,
                    topic: 'Sepsis',
                    normalizedTopic: 'sepsis',
                    recommendationText: '30 mL/kg crystalloid bolus',
                    recExclusions: 'patients with AKI should use reduced volumes',
                    recDirection: 'recommend',
                    intervention: 'intravenous fluid resuscitation',
                    sourceBody: 'SSC',
                    sourceYear: 2021,
                    evidenceTier: 'guideline',
                    status: 'ai_extracted',
                }];
                return [];
            },
            normalizeTopic: (s) => String(s).toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').trim(),
            all: async () => [],
            mapGuidelineRow: (r) => r,
        };

        const result = await composeComorbidGuidelines(db, 'sepsis and AKI');
        const sepsisCond = result.byCondition.find((c) => c.condition.toLowerCase() === 'sepsis');
        if (sepsisCond) {
            const rec = sepsisCond.guidelines[0];
            // The AKI condition is in otherConditions, rec exclusions mention AKI → inapplicable
            expect(rec._applicable).toBe(false);
            expect(rec._exclusionHit).toBeTruthy();
        }
    });
});
