'use strict';

const { parseStructuredQuizArray } = require('../../server/utils/parseJson');

describe('parseStructuredQuizArray', () => {
    test('accepts raw array', () => {
        expect(parseStructuredQuizArray([{ question: 'q1' }])).toHaveLength(1);
    });

    test('accepts questions wrapper', () => {
        expect(parseStructuredQuizArray({ questions: [{ question: 'q1' }] })).toHaveLength(1);
    });

    test('accepts mcqs wrapper', () => {
        expect(parseStructuredQuizArray({ mcqs: [{ question: 'q1' }] })).toHaveLength(1);
    });

    test('throws when no array found', () => {
        expect(() => parseStructuredQuizArray({ foo: [] })).toThrow('quiz questions array');
    });
});
