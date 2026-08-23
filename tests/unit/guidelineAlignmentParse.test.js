'use strict';

const { parseAlignmentResponse } = require('../../server/services/guidelineService');

describe('guideline alignment response parsing', () => {
    test('parses a well-formed response', () => {
        const r = parseAlignmentResponse(JSON.stringify({
            aligned: true, alignmentScore: 82,
            contradictions: [], supportsGuidelines: ['ESC 2023'],
            gaps: [], summary: 'Consistent with guidance.',
        }), 3);
        expect(r.aligned).toBe(true);
        expect(r.alignmentScore).toBe(82);
        expect(r.guidelinesFound).toBe(3);
    });

    test('parses a fenced code block', () => {
        const r = parseAlignmentResponse('```json\n{"aligned":false,"alignmentScore":10,"summary":"Diverges."}\n```', 1);
        expect(r.aligned).toBe(false);
        expect(r.summary).toBe('Diverges.');
    });

    test('coerces a numeric string score', () => {
        const r = parseAlignmentResponse('{"aligned":true,"alignmentScore":"75"}', 1);
        expect(r.alignmentScore).toBe(75);
    });

    // The regression: previously these parsed fine and flowed straight through.
    test('does not let a wrong-typed field through unchecked', () => {
        const r = parseAlignmentResponse('{"aligned":"very much","alignmentScore":"high","contradictions":"none"}', 2);
        expect(r.aligned).toBeNull();
        expect(r.alignmentScore).toBe(0);
        expect(Array.isArray(r.contradictions)).toBe(true);
        expect(r.guidelinesFound).toBe(2);
    });

    test('falls back cleanly on unparseable text', () => {
        const r = parseAlignmentResponse('The guidelines broadly agree, I think.', 4);
        expect(r.aligned).toBeNull();
        expect(r.gaps.join(' ')).toMatch(/could not parse/i);
        expect(r.guidelinesFound).toBe(4);
    });

    test('never throws on hostile input', () => {
        for (const v of [null, undefined, '', '[]', '{', '{"a":', 'null']) {
            expect(() => parseAlignmentResponse(v, 0)).not.toThrow();
        }
    });
});
