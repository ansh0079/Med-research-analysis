'use strict';

const { validateSourceReferences } = require('../../server/services/learning/mcqValidationService');

const q = (sourceIndices) => ({ question: 'Q', sourceIndices });

describe('MCQ source reference validation', () => {
    test('accepts citations inside the supplied range', () => {
        const r = validateSourceReferences([q([1]), q([2, 3])], 5, 0);
        expect(r.ok).toBe(true);
        expect(r.issues).toHaveLength(0);
    });

    // The regression: an index the model invented renders as a real citation downstream.
    test('rejects a citation beyond the supplied sources', () => {
        const r = validateSourceReferences([q([1]), q([7])], 5, 0);
        expect(r.ok).toBe(false);
        expect(r.issues).toEqual([
            { mcqIndex: 2, reason: 'cites source(s) 7 outside the supplied range 1-5' },
        ]);
    });

    test('rejects citations when no sources were supplied at all', () => {
        const r = validateSourceReferences([q([1])], 0, 0);
        expect(r.ok).toBe(false);
        expect(r.issues[0].reason).toMatch(/no sources were supplied/);
    });

    test('counts guidelines toward the valid range', () => {
        expect(validateSourceReferences([q([4])], 2, 4).ok).toBe(true);
        expect(validateSourceReferences([q([5])], 2, 4).ok).toBe(false);
    });

    test('rejects zero, negative and fractional indices', () => {
        const r = validateSourceReferences([q([0]), q([-1]), q([1.5])], 3, 0);
        expect(r.issues).toHaveLength(3);
    });

    test('flags non-numeric entries', () => {
        const r = validateSourceReferences([q(['ESC 2023'])], 3, 0);
        expect(r.ok).toBe(false);
        expect(r.issues[0].reason).toMatch(/non-numeric/);
    });

    test('allows an uncited question by default, rejects it when required', () => {
        expect(validateSourceReferences([q([])], 3, 0).ok).toBe(true);
        const strict = validateSourceReferences([q([])], 3, 0, { requireCitation: true });
        expect(strict.ok).toBe(false);
        expect(strict.issues[0].reason).toMatch(/cites no source/);
    });

    test('never throws on malformed input', () => {
        for (const v of [null, undefined, [], [{}], [{ sourceIndices: null }]]) {
            expect(() => validateSourceReferences(v, 3, 0)).not.toThrow();
        }
    });
});
