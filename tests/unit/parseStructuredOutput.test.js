'use strict';

const { parseStructuredOutput } = require('../../server/utils/parseJson');

describe('parseStructuredOutput', () => {
    test('parses raw JSON', () => {
        expect(parseStructuredOutput('{"a":1}')).toEqual({ a: 1 });
    });

    test('falls back to parseJsonBlock for fenced JSON', () => {
        expect(parseStructuredOutput('```json\n{"b":2}\n```')).toEqual({ b: 2 });
    });

    test('throws on invalid JSON', () => {
        expect(() => parseStructuredOutput('not json')).toThrow('AI did not return valid JSON');
    });
});
