'use strict';

jest.mock('../../database', () => ({ connect: jest.fn(), runMigrations: jest.fn(), close: jest.fn() }));
jest.mock('../../config', () => ({ loadEnv: jest.fn(), serverConfig: {} }));

const { structuralIssues } = require('../../server/scripts/runFullQuestionAudit');

describe('full question audit structural checks', () => {
    test('accepts a complete letter-keyed question', () => {
        expect(structuralIssues({
            question: 'Which intervention is recommended for this patient?',
            options: ['First', 'Second', 'Third', 'Fourth'],
            correctAnswer: 'B',
            explanation: 'The cited recommendation supports the second option.',
        })).toEqual([]);
    });

    test('accepts a uniquely text-keyed answer', () => {
        expect(structuralIssues({
            question: 'Which intervention is recommended for this patient?',
            options: { A: 'First', B: 'Second', C: 'Third' },
            correctAnswer: 'Second',
            explanation: 'The evidence supports Second.',
        })).toEqual([]);
    });

    test('flags invalid structure and a key outside the options', () => {
        expect(structuralIssues({ question: 'Short?', options: ['Same', 'Same'], correctAnswer: 'D' })).toEqual(expect.arrayContaining([
            'missing_or_short_stem', 'invalid_options', 'duplicate_options', 'key_does_not_identify_one_option', 'missing_explanation',
        ]));
    });
});
