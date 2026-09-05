'use strict';

const {
    extractSynopsisNumbers,
    sourceContainsNumber,
    applyNumericGrounding,
} = require('../../server/services/ai/numericGrounding');
const { processPaperSynopsisTrust } = require('../../server/services/paperSynopsisTrust');

describe('numericGrounding', () => {
    test('extracts effect sizes, percents, and p-values', () => {
        const numbers = extractSynopsisNumbers({
            mainFindings: 'Primary endpoint met (HR 0.82, 95% CI 0.70-0.95, p=0.03) with 18% RRR [1].',
            bottomLine: 'N=4321 adults had fewer events [1].',
        });
        const kinds = numbers.map((row) => row.kind);
        expect(kinds).toEqual(expect.arrayContaining(['effect', 'ci', 'p_value', 'percent', 'sample']));
        expect(sourceContainsNumber('Hazard ratio 0.82 (95% CI 0.70 to 0.95)', '0.82')).toBe(true);
        expect(sourceContainsNumber('Hazard ratio 0.82', '0.55')).toBe(false);
    });

    test('processPaperSynopsisTrust lowers trust when numbers are not in the paper', () => {
        const { synopsis, audit } = processPaperSynopsisTrust({
            mainFindings: 'Mortality fell (HR 0.55) [1].',
            bottomLine: 'May reduce events in selected patients [1].',
            trustRating: 'HIGH',
        }, {
            fullTextCoverageRatio: 1,
            article: {
                title: 'A trial of drug X',
                abstract: 'The primary endpoint showed HR 0.82 (95% CI 0.70-0.95).',
            },
        });

        expect(audit.numericGrounding.checked).toBe(true);
        expect(audit.numericGrounding.ungrounded.some((row) => row.value === '0.55')).toBe(true);
        expect(['LOW', 'VERY_LOW']).toContain(synopsis.trustRating);
        expect(synopsis.trustRationale).toMatch(/Numeric grounding/i);
    });

    test('keeps trust when extracted numbers appear in the source', () => {
        const result = applyNumericGrounding({
            mainFindings: 'Primary endpoint met (HR 0.82) [1].',
            trustRating: 'MODERATE',
        }, {
            title: 'Trial',
            abstract: 'Hazard ratio 0.82 versus placebo.',
        });
        expect(result.numericGrounding.ungrounded).toHaveLength(0);
        expect(result.synopsis.trustRating).toBe('MODERATE');
    });
});
