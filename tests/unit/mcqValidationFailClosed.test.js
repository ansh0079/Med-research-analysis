'use strict';

const { validateMcqBatch } = require('../../server/services/quizGeneration/mcqValidation');

describe('validateMcqBatch fail-closed', () => {
    const logger = { warn: jest.fn() };
    const baseArgs = {
        logger,
        topic: 'ARDS',
        normalizedTopic: 'ards',
        raw: [{ question: 'Q1', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A', explanation: 'e' }],
        provider: 'claude',
        model: 'm',
        articles: [],
        guidelines: [],
    };

    test('returns 503 when reviewer throws (does not serve unvalidated MCQs)', async () => {
        const prev = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        try {
            const mcqValidator = {
                validateBatch: async () => { throw new Error('reviewer down'); },
                recordValidationResult: jest.fn(),
            };
            const result = await validateMcqBatch({ ...baseArgs, mcqValidator, allowSkipOnFailure: false });
            expect(result.error).toBeDefined();
            expect(result.error.status).toBe(503);
            expect(result.error.body.code).toBe('MCQ_VALIDATION_FAILED');
            expect(result.error.body.validation.failClosed).toBe(true);
        } finally {
            process.env.NODE_ENV = prev;
        }
    });

    test('returns 503 when reviewer returns empty', async () => {
        const mcqValidator = {
            validateBatch: async () => null,
            recordValidationResult: jest.fn(),
        };
        const result = await validateMcqBatch({ ...baseArgs, mcqValidator, allowSkipOnFailure: false });
        expect(result.error.status).toBe(503);
        expect(result.error.body.code).toBe('MCQ_VALIDATION_EMPTY');
    });

    test('NODE_ENV=test defaults to skip-on-failure for harnesses without a live reviewer', async () => {
        const prev = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';
        try {
            const mcqValidator = {
                validateBatch: async () => { throw new Error('down'); },
                recordValidationResult: jest.fn(),
            };
            const result = await validateMcqBatch({ ...baseArgs, mcqValidator });
            expect(result.error).toBeUndefined();
            expect(result.validationSummary.skipped).toBe(true);
        } finally {
            process.env.NODE_ENV = prev;
        }
    });

    test('keeps only validIndices on success', async () => {
        const mcqValidator = {
            validateBatch: async () => ({
                reviewed: 2,
                rejections: [{ mcqIndex: 2, reason: 'bad', issues: ['x'] }],
                validIndices: new Set([1]),
                modelsUsed: ['claude'],
            }),
            recordValidationResult: jest.fn(),
        };
        const result = await validateMcqBatch({
            ...baseArgs,
            raw: [
                { question: 'Q1', options: ['A', 'B'], correctAnswer: 'A' },
                { question: 'Q2', options: ['A', 'B'], correctAnswer: 'B' },
            ],
            mcqValidator,
        });
        expect(result.error).toBeUndefined();
        expect(result.validatedRaw).toHaveLength(1);
        expect(result.validationSummary.rejected).toBe(1);
    });
});
