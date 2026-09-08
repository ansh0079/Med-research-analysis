import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
// quizService reads import.meta.env, which Jest cannot parse. Mock it before
// importing the panel so the module graph stays loadable under the test runner.
jest.mock('@services/quizService', () => ({
    QuizGenerationError: class QuizGenerationError extends Error {},
}));
jest.mock('@services/api', () => ({ api: {} }));

import { QuizActiveQuestionPanel } from './QuizActiveQuestionPanel';
import type { QuizQuestion, QuizState } from '@types';

/**
 * Answers are graded server-side, so a failed /api/quiz/grade call left
 * useQuizPage with nothing to render: it set saveStatus to 'error' and returned,
 * but only QuizCompletePanel reads saveStatus -- and the learner never reaches
 * the completion screen if they cannot answer. Tapping an option simply did
 * nothing, with no explanation and no way to retry.
 *
 * That mattered in production: grading returned 503 for every question while
 * the grade route was missing its commitment cache, and the UI gave no clue.
 */

const QUESTION: QuizQuestion = {
    id: 'q1',
    type: 'multiple_choice',
    question: 'First-line vasopressor in septic shock?',
    options: ['A: Dopamine', 'B: Norepinephrine', 'C: Phenylephrine'],
    correctAnswer: '',
    explanation: '',
    difficulty: 'medium',
} as QuizQuestion;

const QUIZ: QuizState = {
    questions: [QUESTION],
    currentIndex: 0,
    answers: {},
    showExplanation: false,
    score: 0,
    complete: false,
};

function renderPanel(over: Partial<React.ComponentProps<typeof QuizActiveQuestionPanel>> = {}) {
    const onAnswer = jest.fn();
    const onRetryGrade = jest.fn();
    render(
        <QuizActiveQuestionPanel
            quiz={QUIZ}
            currentQ={QUESTION}
            isAnswered={false}
            isCorrect={false}
            selected={null}
            answerConfidence={3}
            adaptiveNotice={null}
            gradeError={null}
            onRetryGrade={onRetryGrade}
            effectiveExplanationDepth="foundation"
            disclaimer={null}
            quizEvidenceAudit={null}
            isAuthenticated={false}
            feedbackSentIds={new Set()}
            onAnswerConfidenceChange={jest.fn()}
            onAnswer={onAnswer}
            onNext={jest.fn()}
            onExplanationFeedback={jest.fn()}
            resolveSourceArticle={() => null}
            {...over}
        />,
    );
    return { onAnswer, onRetryGrade };
}

describe('QuizActiveQuestionPanel grading failure', () => {
    it('says nothing is wrong when grading is working', () => {
        renderPanel();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('tells the learner the answer could not be checked', () => {
        renderPanel({ gradeError: "We couldn't check that answer just now. Your progress is safe -- try again." });
        expect(screen.getByRole('alert')).toHaveTextContent(/couldn't check that answer/i);
    });

    it('reassures them their progress is not lost', () => {
        // A silent failure mid-quiz reads as "I just lost my session".
        renderPanel({ gradeError: "We couldn't check that answer just now. Your progress is safe -- try again." });
        expect(screen.getByRole('alert')).toHaveTextContent(/progress is safe/i);
    });

    it('offers a retry that does not require re-reading the question', () => {
        const { onRetryGrade } = renderPanel({ gradeError: 'nope' });
        fireEvent.click(screen.getByRole('button', { name: /Try again/i }));
        expect(onRetryGrade).toHaveBeenCalledTimes(1);
    });

    it('leaves the options answerable so a direct retap also works', () => {
        const { onAnswer } = renderPanel({ gradeError: 'nope' });
        fireEvent.click(screen.getByRole('button', { name: /Norepinephrine/i }));
        expect(onAnswer).toHaveBeenCalledWith('B');
    });
});
