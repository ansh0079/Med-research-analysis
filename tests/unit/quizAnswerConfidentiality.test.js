'use strict';

/**
 * Quiz answers must not be readable before the learner commits to one.
 *
 * The API used to send `correctAnswer` inline with every question, and v1 of the
 * grading token carried the answer as plain base64url -- so the answer key was
 * readable in the network tab. Server-side grading was already authoritative
 * (gradeQuizAttempts recomputes from the token and keeps the client's claim only
 * as clientReportedIsCorrect), so nobody could forge a grade; but they could
 * simply read the answer and then submit it, which makes the assessment
 * meaningless rather than merely insecure.
 */

const {
    createQuizGradingToken,
    verifyQuizGradingToken,
    attachQuizGradingTokens,
    attachLearningRoundGradingTokens,
    sealAnswer,
    openAnswer,
    commitQuizAnswer,
    verifyQuizAnswerCommitment,
    TOKEN_VERSION,
} = require('../../server/services/quizGradingToken');

const QUESTION = {
    id: 'q1',
    question: 'Which agent is first-line in vasopressor-dependent septic shock?',
    correctAnswer: 'B',
    options: ['A: Dopamine', 'B: Hydrocortisone', 'C: Dobutamine', 'D: Nothing'],
    explanation: 'Hydrocortisone is indicated once vasopressors are required [1].',
};

/** What a browser can actually see: the decoded token payload. */
function decodePayload(token) {
    return Buffer.from(String(token).split('.')[0], 'base64url').toString('utf8');
}

describe('quiz answer confidentiality', () => {
    describe('the grading token', () => {
        test('does not expose the answer to anyone who decodes it', () => {
            const token = createQuizGradingToken(QUESTION);
            const payload = decodePayload(token);
            expect(payload).not.toContain('"answer":"B"');
            expect(payload).not.toMatch(/"answer"\s*:\s*"B"/);
        });

        test('still lets the server recover the answer', () => {
            const token = createQuizGradingToken(QUESTION);
            const result = verifyQuizGradingToken(token, {
                questionId: 'q1', questionText: QUESTION.question,
            });
            expect(result).toEqual({
                valid: true,
                correctAnswer: 'B',
                lineage: expect.any(Object),
            });
        });

        test('is version 3, so earlier tokens without signed lineage are refused', () => {
            expect(TOKEN_VERSION).toBe(3);
            const v1Payload = Buffer.from(JSON.stringify({
                v: 1, qid: 'q1', answer: 'B', qh: 'x', exp: Math.floor(Date.now() / 1000) + 600,
            })).toString('base64url');
            const result = verifyQuizGradingToken(`${v1Payload}.notasignature`, {
                questionId: 'q1', questionText: QUESTION.question,
            });
            expect(result.valid).toBe(false);
        });

        test('rejects a token whose sealed answer was tampered with', () => {
            const token = createQuizGradingToken(QUESTION);
            const payload = JSON.parse(decodePayload(token));
            payload.answer = sealAnswer('A'); // resealed, but the outer HMAC no longer matches
            const forged = Buffer.from(JSON.stringify(payload)).toString('base64url');
            const result = verifyQuizGradingToken(`${forged}.${String(token).split('.')[1]}`, {
                questionId: 'q1', questionText: QUESTION.question,
            });
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('signature');
        });

        test('a corrupted seal fails closed rather than returning a wrong answer', () => {
            expect(openAnswer('not~a~seal')).toBeNull();
            expect(openAnswer('')).toBeNull();
            expect(openAnswer(null)).toBeNull();
        });

        test('seals the same answer differently each time, so tokens are not comparable', () => {
            // A fixed ciphertext would let someone group questions by answer
            // without ever decrypting one.
            expect(sealAnswer('B')).not.toBe(sealAnswer('B'));
        });
    });

    describe('answer commitment', () => {
        test('locks the first answer before revealing the key', async () => {
            const values = new Map();
            const cache = {
                setIfAbsent: jest.fn(async (key, value) => {
                    if (values.has(key)) return false;
                    values.set(key, value);
                    return true;
                }),
                getAsync: jest.fn(async (key) => values.get(key)),
            };
            const token = createQuizGradingToken(QUESTION);

            await expect(commitQuizAnswer(cache, token, 'B')).resolves.toMatchObject({ valid: true });
            await expect(commitQuizAnswer(cache, token, 'A')).resolves.toMatchObject({
                valid: false, reason: 'answer_already_committed',
            });
            await expect(verifyQuizAnswerCommitment(cache, token, 'B')).resolves.toEqual({ valid: true });
            await expect(verifyQuizAnswerCommitment(cache, token, 'A')).resolves.toMatchObject({
                valid: false, reason: 'answer_commitment_mismatch',
            });
        });
    });

    describe('what goes over the wire', () => {
        test('questions are sent without correctAnswer', () => {
            const body = attachQuizGradingTokens({ questions: [QUESTION] });
            expect(body.questions[0]).not.toHaveProperty('correctAnswer');
            expect(JSON.stringify(body)).not.toContain('"correctAnswer"');
        });

        test('everything the learner legitimately needs is still present', () => {
            const body = attachQuizGradingTokens({ questions: [QUESTION] });
            const q = body.questions[0];
            expect(q.question).toBe(QUESTION.question);
            expect(q.options).toEqual(QUESTION.options);
            expect(q.explanation).toBe(QUESTION.explanation);
            expect(typeof q.gradingToken).toBe('string');
        });

        test('learning-round items are stripped the same way', () => {
            const result = attachLearningRoundGradingTokens({
                round: { items: [{ id: 'i1', questionText: 'Q?', correctAnswer: 'C' }] },
            });
            const item = result.round.items[0];
            expect(item).not.toHaveProperty('correctAnswer');
            expect(typeof item.gradingToken).toBe('string');
        });

        test('a full response body carries no answer letter anywhere', () => {
            const body = attachQuizGradingTokens({ questions: [QUESTION, { ...QUESTION, id: 'q2', correctAnswer: 'D' }] });
            const wire = JSON.stringify(body);
            expect(wire).not.toContain('correctAnswer');
            // The sealed blobs are ciphertext, so the plain letters must not appear
            // as answer values anywhere in the serialised payload.
            expect(wire).not.toMatch(/"answer"\s*:\s*"[A-D]"/);
        });
    });
});
