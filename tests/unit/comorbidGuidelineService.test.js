'use strict';

const {
    decomposeConditions,
    detectConflicts,
    composeComorbidGuidelines,
    buildComorbidGroundingBlock,
} = require('../../server/services/evidence/comorbidGuidelineService');

// Shaped as mapGuidelineRow() returns rows: camelCase, and always carrying the
// topic the row is filed under (relevance is gated on topic, not on prose).
const rec = (text, sourceBody = 'TestBody', sourceYear = 2024, topic = 'TestTopic') => ({
    recommendationText: text, sourceBody, sourceYear, topic,
});

describe('decomposeConditions', () => {
    test('splits the motivating multi-condition presentation', () => {
        const out = decomposeConditions('sepsis with ARDS and AKI and anemia');
        expect(out).toEqual(['sepsis', 'ARDS', 'AKI', 'anemia']);
    });

    test('splits on commas and semicolons', () => {
        expect(decomposeConditions('heart failure, atrial fibrillation; CKD'))
            .toEqual(['heart failure', 'atrial fibrillation', 'CKD']);
    });

    test('keeps a single condition intact', () => {
        expect(decomposeConditions('community acquired pneumonia'))
            .toEqual(['community acquired pneumonia']);
    });

    // Splitting on "and"/"-" inside a proper name yields meaningless topics.
    test('does not split hyphenated eponyms', () => {
        const out = decomposeConditions('Guillain-Barré syndrome');
        expect(out).toHaveLength(1);
        expect(out[0]).toMatch(/Guillain/i);
    });

    test('does not split a condition name that contains a protected token', () => {
        const out = decomposeConditions('diabetes insipidus');
        expect(out).toHaveLength(1);
    });

    test('drops fragments that are only qualifiers', () => {
        const out = decomposeConditions('acute and severe pancreatitis');
        expect(out).not.toContain('acute');
        expect(out).not.toContain('severe');
        expect(out.some((c) => /pancreatitis/i.test(c))).toBe(true);
    });

    test('caps the number of conditions', () => {
        const out = decomposeConditions(
            'sepsis, pneumonia, cellulitis, endocarditis, meningitis, pyelonephritis',
            { maxConditions: 3 }
        );
        expect(out).toEqual(['sepsis', 'pneumonia', 'cellulitis']);
    });

    // Tokens too short to be a condition are dropped; if that leaves nothing,
    // fall back to treating the whole phrase as one topic rather than returning [].
    test('falls back to the whole phrase when every fragment is too short', () => {
        const out = decomposeConditions('a1, b2, c3');
        expect(out).toEqual(['a1, b2, c3']);
    });

    test('handles empty and null input', () => {
        expect(decomposeConditions('')).toEqual([]);
        expect(decomposeConditions(null)).toEqual([]);
    });
});

describe('detectConflicts', () => {
    test('flags fluid strategy when sepsis and ARDS both address it', () => {
        const byCondition = [
            { condition: 'sepsis', guidelines: [rec('Administer 30 mL/kg crystalloid bolus for hypoperfusion.')] },
            { condition: 'ARDS', guidelines: [rec('Use a conservative fluid strategy after initial resuscitation.')] },
        ];
        const conflicts = detectConflicts(byCondition);
        const axes = conflicts.map((c) => c.axis);
        expect(axes).toContain('fluid_strategy');
        const fluid = conflicts.find((c) => c.axis === 'fluid_strategy');
        expect(fluid.conditions).toEqual(['sepsis', 'ARDS']);
    });

    test('flags transfusion threshold across anemia and cardiac disease', () => {
        const conflicts = detectConflicts([
            { condition: 'anemia', guidelines: [rec('Use a restrictive transfusion threshold of hemoglobin 70 g/L.')] },
            { condition: 'acute coronary syndrome', guidelines: [rec('Consider transfusion at a higher hemoglobin in active ischemia.')] },
        ]);
        expect(conflicts.map((c) => c.axis)).toContain('transfusion_threshold');
    });

    // One guideline being detailed about its own topic is not a conflict.
    test('does not flag a single condition touching an axis alone', () => {
        const conflicts = detectConflicts([
            { condition: 'sepsis', guidelines: [
                rec('Administer crystalloid bolus.'),
                rec('Reassess fluid balance frequently.'),
            ] },
        ]);
        expect(conflicts).toHaveLength(0);
    });

    test('returns no conflicts for unrelated recommendations', () => {
        const conflicts = detectConflicts([
            { condition: 'migraine', guidelines: [rec('Offer a triptan for acute attacks.')] },
            { condition: 'eczema', guidelines: [rec('Prescribe topical emollients daily.')] },
        ]);
        expect(conflicts).toHaveLength(0);
    });
});

describe('composeComorbidGuidelines', () => {
    const dbWith = (map) => ({
        getGuidelinesByTopic: jest.fn(async (topic) => map[topic.toLowerCase()] || []),
    });

    test('resolves each condition separately and reports uncovered ones', async () => {
        const db = dbWith({
            sepsis: [rec('Give crystalloid bolus.', 'SSC', 2021, 'Sepsis and septic shock')],
            ards: [rec('Use conservative fluid strategy.', 'ARDSnet', 2006, 'ARDS')],
        });
        const out = await composeComorbidGuidelines(db, 'sepsis with ARDS and unobtainium');
        expect(out.conditions).toEqual(['sepsis', 'ARDS', 'unobtainium']);
        expect(out.byCondition).toHaveLength(2);
        expect(out.uncovered).toEqual(['unobtainium']);
        expect(out.totalRecommendations).toBe(2);
        expect(out.conflicts.map((c) => c.axis)).toContain('fluid_strategy');
    });

    test('returns empty structure for an empty presentation', async () => {
        const out = await composeComorbidGuidelines(dbWith({}), '');
        expect(out).toEqual({
            conditions: [], byCondition: [], conflicts: [], totalRecommendations: 0, uncovered: [],
        });
    });

    test('survives a failing lookup without throwing', async () => {
        const db = { getGuidelinesByTopic: jest.fn(async () => { throw new Error('db down'); }) };
        const out = await composeComorbidGuidelines(db, 'sepsis and AKI');
        expect(out.byCondition).toHaveLength(0);
        expect(out.uncovered).toEqual(['sepsis', 'AKI']);
    });

    // The lexical fallback matches substrings of stored topic names, which can drag
    // in a neighbouring topic. Observed on prod: widening for "anaemia" reached rows
    // filed under unrelated topics. Those must be dropped, not reported as covered.
    test('lexical fallback discards rows filed under an unrelated topic', async () => {
        const db = {
            getGuidelinesByTopic: jest.fn(async () => []),
            mapGuidelineRow: (r) => r,
            all: jest.fn(async () => [
                rec('Iron supplementation improves cognition.', 'NICE', 2026, 'anaemia of chronic disease'),
                rec('Pharmacist review reduces incidence.', 'WHO', 2026, 'medication safety in hospital'),
            ]),
        };
        const out = await composeComorbidGuidelines(db, 'anaemia and unobtainium');
        const anaemia = out.byCondition.find((e) => e.condition === 'anaemia');
        expect(anaemia).toBeDefined();
        expect(anaemia.matchedVia).toMatch(/^lexical:/);
        // Only the correctly-filed row survives.
        expect(anaemia.guidelines).toHaveLength(1);
        expect(anaemia.guidelines[0].topic).toBe('anaemia of chronic disease');
    });

    // Guideline prose does not restate the disease in every sentence. Gating on
    // recommendation text would discard exactly the recommendations we most want.
    test('keeps a correctly-filed recommendation that never names the condition', async () => {
        const db = dbWith({
            sepsis: [rec('Administer 30 mL/kg crystalloid within the first hour.', 'SSC', 2021, 'Sepsis and septic shock')],
        });
        const out = await composeComorbidGuidelines(db, 'sepsis');
        expect(out.byCondition).toHaveLength(1);
        expect(out.byCondition[0].guidelines).toHaveLength(1);
    });
});

describe('buildComorbidGroundingBlock', () => {
    test('names conflicts and forbids averaging them', async () => {
        const db = {
            getGuidelinesByTopic: jest.fn(async (t) => ({
                sepsis: [rec('Administer 30 mL/kg crystalloid bolus.', 'SSC', 2021, 'Sepsis and septic shock')],
                ards: [rec('Use a conservative fluid strategy.', 'ARDSnet', 2006, 'ARDS')],
            }[t.toLowerCase()] || [])),
        };
        const composition = await composeComorbidGuidelines(db, 'sepsis with ARDS');
        const block = buildComorbidGroundingBlock(composition);

        expect(block).toContain('MULTI-CONDITION GUIDELINE EVIDENCE');
        expect(block).toContain('SSC');
        expect(block).toContain('ARDSnet');
        expect(block).toContain('CONFLICTING RECOMMENDATIONS');
        expect(block).toContain('Do not');
        expect(block).toMatch(/precedence/i);
    });

    test('states uncovered conditions explicitly', () => {
        const block = buildComorbidGroundingBlock({
            byCondition: [{ condition: 'sepsis', guidelines: [rec('Give fluids.', 'SSC', 2021, 'Sepsis')], sourceBodies: ['SSC'] }],
            conflicts: [],
            uncovered: ['rare-disease-x'],
        });
        expect(block).toContain('NO GUIDELINE FOUND for: rare-disease-x');
    });

    test('returns empty string when nothing was found', () => {
        expect(buildComorbidGroundingBlock({ byCondition: [], conflicts: [], uncovered: [] })).toBe('');
        expect(buildComorbidGroundingBlock(null)).toBe('');
    });
});
