const {
    inferMisconceptionCategory,
    groupMisconceptionsByCategory,
    formatCategoryMisconceptionSummary,
} = require('../../server/services/misconceptionCategoryService');

describe('misconceptionCategoryService', () => {
    test('maps question types to categories', () => {
        expect(inferMisconceptionCategory({ questionType: 'pitfall' })).toBe('pitfall');
        expect(inferMisconceptionCategory({ questionType: 'guideline' })).toBe('guideline');
    });

    test('reasoning tags override generic mapping', () => {
        expect(inferMisconceptionCategory({
            questionType: 'clinical_application',
            reasoningTags: ['dosing_error'],
        })).toBe('dosing');
    });

    test('groups misconceptions by category with counts', () => {
        const grouped = groupMisconceptionsByCategory([
            { claimKey: 'c1', wrongOptionText: 'A', count: 2, misconceptionCategory: 'pitfall' },
            { claimKey: 'c2', wrongOptionText: 'B', count: 1, misconceptionCategory: 'pitfall' },
            { claimKey: 'c3', wrongOptionText: 'C', count: 3, misconceptionCategory: 'guideline' },
        ]);
        expect(grouped.find((g) => g.category === 'pitfall').count).toBe(3);
        expect(grouped.find((g) => g.category === 'guideline').count).toBe(3);
    });

    test('formatCategoryMisconceptionSummary renders typed lines', () => {
        const text = formatCategoryMisconceptionSummary([
            { label: 'Clinical pitfall / trap', count: 4, examples: [{ wrongOptionText: 'wrong dose' }] },
        ]);
        expect(text).toContain('MISCONCEPTION CATEGORIES');
        expect(text).toContain('Clinical pitfall');
    });
});
