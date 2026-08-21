'use strict';

const {
    extractNumericTokens,
    validateAiOutput,
    validateNumericGrounding,
} = require('../../server/services/aiOutputValidation');

describe('AI output numeric grounding', () => {
    const article = {
        title: 'Trial of Example Therapy',
        abstract: 'Example therapy reduced admissions by 25% with HR 0.82 in 1,200 patients.',
    };

    test('ignores citation markers while extracting synopsis numbers', () => {
        expect(extractNumericTokens('Improved outcomes by 25% [1, 2] with HR 0.82.')).toEqual(['25', '0.82']);
    });

    test('passes when main findings and bottom line numbers appear in source text', () => {
        const result = validateNumericGrounding({
            mainFindings: 'Admissions fell by 25% [1].',
            bottomLine: 'The HR was 0.82 in 1200 patients.',
        }, [article]);
        expect(result.ok).toBe(true);
    });

    test('fails paper synopsis validation when headline fields invent numbers', () => {
        const result = validateAiOutput('paper_synopsis', {
            mainFindings: 'Admissions fell by 40% [1].',
            bottomLine: 'Treat 30 patients to avoid one admission.',
            trustRating: 'MODERATE',
        }, {
            allowDegrade: false,
            groundingArticles: [article],
        });
        expect(result.ok).toBe(false);
        expect(result.errors.join(' ')).toMatch(/ungrounded numeric value/i);
    });
});
