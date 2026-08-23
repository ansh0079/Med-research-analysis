'use strict';

const { validateAiOutput } = require('../../server/services/aiOutputValidation');

// Source evidence mentioning specific, checkable numbers.
const ARTICLES = [{
    title: 'Prone positioning in severe ARDS',
    abstract: 'In 466 patients, 28-day mortality was 16% in the prone group versus 32.8% in the supine group.',
}];

function quiz(explanation) {
    return {
        questions: [{
            question: 'What did the trial show about prone positioning?',
            options: ['A. Benefit', 'B. Harm', 'C. No effect', 'D. Unclear'],
            correctAnswer: 'A',
            explanation,
        }],
    };
}

describe('MCQ numeric grounding', () => {
    test('accepts an explanation whose numbers appear in the source', () => {
        const res = validateAiOutput('quiz_generation', quiz(
            'Prone positioning reduced 28-day mortality from 32.8% to 16%.'
        ), { allowDegrade: false, groundingArticles: ARTICLES });
        expect(res.ok).toBe(true);
    });

    test('rejects an explanation citing an invented trial result', () => {
        const res = validateAiOutput('quiz_generation', quiz(
            'Prone positioning reduced 28-day mortality from 41.7% to 9.2% (NNT 4).'
        ), { allowDegrade: false, groundingArticles: ARTICLES });
        expect(res.ok).toBe(false);
        expect(res.errors.join(' ')).toMatch(/numeric grounding failed/i);
        expect(res.errors.join(' ')).toMatch(/41\.7|9\.2/);
    });

    test('drops only the ungrounded question when asked to', () => {
        const mixed = {
            questions: [
                { question: 'Q1', options: ['A. a', 'B. b', 'C. c', 'D. d'], correctAnswer: 'A',
                  explanation: 'Mortality fell from 32.8% to 16%.' },
                { question: 'Q2', options: ['A. a', 'B. b', 'C. c', 'D. d'], correctAnswer: 'B',
                  explanation: 'Mortality fell from 88.1% to 2.4%.' },
            ],
        };
        const res = validateAiOutput('quiz_generation', mixed, {
            allowDegrade: false, groundingArticles: ARTICLES, dropUngroundedQuestions: true,
        });
        expect(res.ok).toBe(true);
        expect(res.data.questions).toHaveLength(1);
        expect(res.data.questions[0].explanation).toMatch(/32\.8/);
        expect(res.warnings.join(' ')).toMatch(/question 2/i);
    });

    test('is a no-op when no grounding articles are supplied', () => {
        const res = validateAiOutput('quiz_generation', quiz('Mortality fell to 9.2%.'), { allowDegrade: false });
        expect(res.ok).toBe(true);
    });
});
