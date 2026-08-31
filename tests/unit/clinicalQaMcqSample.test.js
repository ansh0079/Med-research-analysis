const { stableQuestionId, mulberry32, buildReviewPrompt } = require('../../server/scripts/clinicalQaMcqSample');

describe('clinicalQaMcqSample helpers', () => {
    describe('stableQuestionId', () => {
        test('is deterministic for identical inputs', () => {
            const a = stableQuestionId('sepsis', 'guideline_mcq', 'What is first-line?', 'B');
            const b = stableQuestionId('sepsis', 'guideline_mcq', 'What is first-line?', 'B');
            expect(a).toBe(b);
        });

        test('differs when any input changes', () => {
            const base = stableQuestionId('sepsis', 'guideline_mcq', 'What is first-line?', 'B');
            expect(stableQuestionId('copd', 'guideline_mcq', 'What is first-line?', 'B')).not.toBe(base);
            expect(stableQuestionId('sepsis', 'paper_mcq', 'What is first-line?', 'B')).not.toBe(base);
            expect(stableQuestionId('sepsis', 'guideline_mcq', 'What is second-line?', 'B')).not.toBe(base);
            expect(stableQuestionId('sepsis', 'guideline_mcq', 'What is first-line?', 'C')).not.toBe(base);
        });
    });

    describe('mulberry32', () => {
        test('the same seed reproduces the same sequence', () => {
            const a = mulberry32(42);
            const b = mulberry32(42);
            const seqA = [a(), a(), a()];
            const seqB = [b(), b(), b()];
            expect(seqA).toEqual(seqB);
        });

        test('different seeds diverge', () => {
            const a = mulberry32(1);
            const b = mulberry32(2);
            expect(a()).not.toBe(b());
        });

        test('produces values in [0, 1)', () => {
            const rand = mulberry32(7);
            for (let i = 0; i < 20; i++) {
                const v = rand();
                expect(v).toBeGreaterThanOrEqual(0);
                expect(v).toBeLessThan(1);
            }
        });
    });

    describe('buildReviewPrompt', () => {
        test('includes the question, options, stated answer, and explanation', () => {
            const mcq = {
                question: 'What is the first-line treatment for X?',
                options: ['A: One', 'B: Two', 'C: Three'],
                correctAnswer: 'B',
                explanation: 'Because B is correct.',
            };
            const prompt = buildReviewPrompt(mcq, 'some topic');
            expect(prompt).toContain(mcq.question);
            expect(prompt).toContain('A: One');
            expect(prompt).toContain('STATED CORRECT ANSWER: B');
            expect(prompt).toContain('Because B is correct.');
            expect(prompt).toContain('some topic');
        });

        test('handles a missing explanation without throwing', () => {
            const mcq = { question: 'Q', options: ['A: x'], correctAnswer: 'A' };
            expect(() => buildReviewPrompt(mcq, 'topic')).not.toThrow();
            expect(buildReviewPrompt(mcq, 'topic')).toContain('(none provided)');
        });

        test('instructs the reviewer not to flag on style or difficulty alone', () => {
            const mcq = { question: 'Q', options: ['A: x'], correctAnswer: 'A' };
            const prompt = buildReviewPrompt(mcq, 'topic');
            expect(prompt.toLowerCase()).toContain('do not flag for style');
        });
    });
});
