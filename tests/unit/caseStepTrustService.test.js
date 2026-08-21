'use strict';

const {
    validateCaseStep,
    generateCaseStepWithRetry,
} = require('../../server/services/caseStepTrustService');

describe('caseStepTrustService', () => {
    test('accepts a well-formed step', () => {
        const check = validateCaseStep({
            options: ['A: Fluid bolus', 'B: Vasopressors', 'C: Observation', 'D: Imaging'],
            correctAnswer: 'A',
        });
        expect(check.ok).toBe(true);
    });

    test('rejects missing correct answer and duplicate options', () => {
        expect(validateCaseStep({
            options: ['A', 'B'],
            correctAnswer: 'C',
        }).ok).toBe(false);
        expect(validateCaseStep({
            options: ['A: Same', 'A: Same'],
            correctAnswer: 'A',
        }).reason).toBe('duplicate_options');
    });

    test('retries then fails closed without inventing a step', async () => {
        let calls = 0;
        const result = await generateCaseStepWithRetry({
            callProvider: async () => {
                calls += 1;
                throw new Error('llm down');
            },
            parseJsonBlock: () => null,
            buildPrompt: () => 'prompt',
            maxAttempts: 2,
        });
        expect(calls).toBe(2);
        expect(result.step).toBeNull();
        expect(result.error).toMatch(/llm down|generation_failed/);
    });

    test('returns validated step on success', async () => {
        const result = await generateCaseStepWithRetry({
            callProvider: async () => ({ text: '{}' }),
            parseJsonBlock: () => ({
                step: {
                    options: ['A: One', 'B: Two', 'C: Three', 'D: Four'],
                    correctAnswer: 'B',
                    question: 'What next?',
                },
                title: 'Case',
            }),
            buildPrompt: () => 'prompt',
        });
        expect(result.step.correctAnswer).toBe('B');
        expect(result.parsed.title).toBe('Case');
    });
});
