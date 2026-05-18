const {
    extractCitationRefs,
    filterCitedStringList,
    validateCitationRefs,
    validateMedicalOutputCitations,
    validateSourceIndices,
} = require('../../server/services/citationValidator');

describe('citationValidator', () => {
    test('extracts paper and guideline citations', () => {
        expect(extractCitationRefs('Use norepinephrine first [1, G2].')).toEqual([
            { kind: 'source', index: 1 },
            { kind: 'guideline', index: 2 },
        ]);
    });

    test('rejects missing and out-of-range citations', () => {
        expect(validateCitationRefs('Unsupported clinical claim.', { sourceCount: 2 }).ok).toBe(false);
        expect(validateCitationRefs('Out of range [3].', { sourceCount: 2 }).errors).toContain('invalid_source_3');
        expect(validateCitationRefs('Grounded claim [2].', { sourceCount: 2 }).ok).toBe(true);
    });

    test('filters unsupported list items', () => {
        const kept = filterCitedStringList([
            'Supported agreement [1].',
            'Unsupported agreement.',
            'Invalid agreement [8].',
        ], { sourceCount: 2 });

        expect(kept).toEqual(['Supported agreement [1].']);
    });

    test('validates structured outputs and source index arrays', () => {
        const report = validateMedicalOutputCitations({
            statement: 'Reasonable consensus [1].',
            areasOfAgreement: ['Valid [2].', 'Invalid [5].'],
        }, {
            sourceCount: 2,
            requiredPaths: ['statement'],
            requiredListPaths: ['areasOfAgreement'],
        });

        expect(report.ok).toBe(false);
        expect(report.issues).toHaveLength(1);
        expect(validateSourceIndices([1, 2, 9, '3', 0], 3)).toEqual([1, 2, 3]);
    });
});
