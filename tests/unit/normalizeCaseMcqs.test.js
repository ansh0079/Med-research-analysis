'use strict';

const { normalizeCaseMcqList, normalizeCorrectLetter } = require('../../server/utils/normalizeCaseMcqs');

describe('normalizeCaseMcqs', () => {
    test('assigns ids and normalizes A-D options', () => {
        const rows = normalizeCaseMcqList([{
            question: 'Test?',
            options: ['First', 'B: Second', 'Third', 'Fourth'],
            correctAnswer: 'Second',
        }], { prefix: 'case' });
        expect(rows).toHaveLength(1);
        expect(rows[0].id).toBe('case-1');
        expect(rows[0].options[0]).toMatch(/^A:/);
        expect(rows[0].correctAnswer).toBe('B');
    });

    test('normalizeCorrectLetter maps full option text', () => {
        expect(normalizeCorrectLetter('A', ['A: yes', 'B: no'])).toBe('A');
        expect(normalizeCorrectLetter('yes', ['A: yes', 'B: no'])).toBe('A');
    });
});
