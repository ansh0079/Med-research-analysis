'use strict';

const { normalizeAnswerSet, answersMatch, isMultiAnswer } = require('./answerSet');
const { createQuizGradingToken, verifyQuizGradingToken, attachQuizGradingTokens, commitQuizAnswer } = require('../services/quizGradingToken');

describe('answerSet', () => {
    test('canonicalises letter sets', () => {
        expect(normalizeAnswerSet('C, a')).toBe('a,c');
        expect(normalizeAnswerSet('A and C')).toBe('a,c');
    });

    test('requires the exact set', () => {
        expect(answersMatch('c,a', 'A,C')).toBe(true);
        expect(answersMatch('A', 'A,C')).toBe(false);
        expect(answersMatch('A,B,C', 'A,C')).toBe(false);
        expect(answersMatch('A', '')).toBe(false);
    });

    test('single answers keep their old behaviour', () => {
        expect(answersMatch(' b ', 'B')).toBe(true);
        expect(answersMatch('false', 'True')).toBe(false);
    });

    test('isMultiAnswer', () => {
        expect(isMultiAnswer('A,C')).toBe(true);
        expect(isMultiAnswer('A')).toBe(false);
    });
});

describe('grading tokens for select-all questions', () => {
    const question = { id: 'q1', question: 'Which two apply?', correctAnswer: 'A,C' };

    test('the token round-trips the keyed set and grades by set', () => {
        const token = createQuizGradingToken(question);
        const verified = verifyQuizGradingToken(token, { questionId: 'q1', questionText: question.question });
        expect(verified.valid).toBe(true);
        expect(answersMatch('C,A', verified.correctAnswer)).toBe(true);
        expect(answersMatch('A', verified.correctAnswer)).toBe(false);
    });

    test('the wire payload flags multiAnswer without leaking the key', () => {
        const body = attachQuizGradingTokens({ questions: [question, { id: 'q2', question: 'One?', correctAnswer: 'B' }] });
        expect(body.questions[0].multiAnswer).toBe(true);
        expect(body.questions[0].correctAnswer).toBeUndefined();
        expect(body.questions[1].multiAnswer).toBeUndefined();
        expect(JSON.stringify(body)).not.toMatch(/"correctAnswer"/);
    });

    test('a re-sent answer in a different order is the same committed answer', async () => {
        const store = new Map();
        const cache = {
            setIfAbsent: async (k, v) => (store.has(k) ? false : (store.set(k, v), true)),
            getAsync: async (k) => store.get(k),
        };
        const first = await commitQuizAnswer(cache, 'tok', 'A,C');
        const again = await commitQuizAnswer(cache, 'tok', 'c, a');
        const different = await commitQuizAnswer(cache, 'tok', 'A');
        expect(first.valid).toBe(true);
        expect(again.valid).toBe(true);
        expect(different.valid).toBe(false);
    });
});
