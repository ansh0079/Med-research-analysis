'use strict';

const {
    parseJsonBlock,
    parseJsonArrayStrict,
    parseJsonArrayBlock,
    parseStructuredOutput,
    repairJsonCandidate,
} = require('../../server/utils/parseJson');

describe('parseJsonBlock (object extraction)', () => {
    test('parses a plain JSON object', () => {
        expect(parseJsonBlock('{"a":1,"b":2}')).toEqual({ a: 1, b: 2 });
    });

    test('strips markdown code fences', () => {
        expect(parseJsonBlock('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    });

    test('strips bare code fences', () => {
        expect(parseJsonBlock('```\n{"a":1}\n```')).toEqual({ a: 1 });
    });

    test('repairs a trailing comma before closing brace', () => {
        expect(parseJsonBlock('{"a":1,"b":2,}')).toEqual({ a: 1, b: 2 });
    });

    test('returns null (not throws) when no object braces are present', () => {
        expect(parseJsonBlock('no json here')).toBeNull();
    });

    test('returns null on truncated/malformed JSON', () => {
        expect(parseJsonBlock('{"a":1, "b":')).toBeNull();
    });

    test('returns null on empty/falsy input', () => {
        expect(parseJsonBlock('')).toBeNull();
        expect(parseJsonBlock(null)).toBeNull();
    });
});

describe('parseJsonArrayStrict (array extraction)', () => {
    test('parses a plain JSON array', () => {
        expect(parseJsonArrayStrict('[{"q":"a"},{"q":"b"}]')).toEqual([{ q: 'a' }, { q: 'b' }]);
    });

    test('strips markdown code fences', () => {
        expect(parseJsonArrayStrict('```json\n[{"q":"a"}]\n```')).toEqual([{ q: 'a' }]);
    });

    test('repairs a trailing comma before closing bracket', () => {
        expect(parseJsonArrayStrict('[{"q":"a"},{"q":"b"},]')).toEqual([{ q: 'a' }, { q: 'b' }]);
    });

    test('extracts a "questions" array from a wrapping object', () => {
        expect(parseJsonArrayStrict('{"questions":[{"q":"a"}]}')).toEqual([{ q: 'a' }]);
    });

    test('extracts an "mcqs" array from a wrapping object', () => {
        expect(parseJsonArrayStrict('{"mcqs":[{"q":"a"}]}')).toEqual([{ q: 'a' }]);
    });

    test('throws a 502 error when no array brackets are present', () => {
        let caught;
        try { parseJsonArrayStrict('no json here'); } catch (e) { caught = e; }
        expect(caught).toBeDefined();
        expect(caught.status).toBe(502);
    });

    test('throws a 502 error on truncated/malformed array JSON', () => {
        let caught;
        try { parseJsonArrayStrict('[{"q":"a"'); } catch (e) { caught = e; }
        expect(caught).toBeDefined();
        expect(caught.status).toBe(502);
    });

    test('throws a 502 error on empty input', () => {
        let caught;
        try { parseJsonArrayStrict(''); } catch (e) { caught = e; }
        expect(caught).toBeDefined();
        expect(caught.status).toBe(502);
    });
});

describe('parseJsonArrayBlock (lenient array extraction)', () => {
    test('parses a plain JSON array', () => {
        expect(parseJsonArrayBlock('[1,2,3]')).toEqual([1, 2, 3]);
    });

    test('handles markdown-fenced arrays', () => {
        expect(parseJsonArrayBlock('```json\n[{"a":1}]\n```')).toEqual([{ a: 1 }]);
    });

    test('returns null on non-array JSON', () => {
        expect(parseJsonArrayBlock('{"not":"array"}')).toBeNull();
    });

    test('returns null on malformed input', () => {
        expect(parseJsonArrayBlock('not json')).toBeNull();
    });
});

describe('repairJsonCandidate', () => {
    test('strips trailing commas', () => {
        const result = JSON.parse(repairJsonCandidate('{"a":1,}'));
        expect(result).toEqual({ a: 1 });
    });

    test('quotes unquoted keys', () => {
        const result = JSON.parse(repairJsonCandidate('{a: 1}'));
        expect(result).toEqual({ a: 1 });
    });
});

describe('parseStructuredOutput', () => {
    test('parses raw JSON', () => {
        expect(parseStructuredOutput('{"a":1}')).toEqual({ a: 1 });
    });

    test('falls back to fence-stripped parsing', () => {
        expect(parseStructuredOutput('```json\n{"b":2}\n```')).toEqual({ b: 2 });
    });

    test('throws a 502 error on unparseable input', () => {
        let caught;
        try { parseStructuredOutput('not json'); } catch (e) { caught = e; }
        expect(caught).toBeDefined();
        expect(caught.status).toBe(502);
    });

    test('throws a 502 error on empty input', () => {
        let caught;
        try { parseStructuredOutput(''); } catch (e) { caught = e; }
        expect(caught).toBeDefined();
        expect(caught.status).toBe(502);
    });
});
