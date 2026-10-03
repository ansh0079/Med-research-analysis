import React from 'react';
import { render, screen } from '@testing-library/react';
import { QuizActiveQuestionPanel } from '../../src/components/quiz/QuizActiveQuestionPanel';
import type { QuizQuestion, QuizState } from '../../src/types';

describe('Quiz reveal renders correct answer', () => {
  const QUESTION: QuizQuestion = {
    id: 'q1',
    type: 'multiple_choice',
    question: 'Which is recommended?',
    options: ['A: Alpha', 'B: Beta', 'C: Gamma', 'D: Delta', 'E: Epsilon'],
    correctAnswer: 'C',
    explanation: 'Gamma is correct.',
    difficulty: 'medium',
  } as QuizQuestion;

  const QUIZ: QuizState = {
    questions: [QUESTION],
    currentIndex: 0,
    answers: { q1: 'B' },
    showExplanation: true,
    score: 0,
    complete: false,
  };

  it('shows the correct answer letter on reveal', () => {
    render(
      <QuizActiveQuestionPanel
        quiz={QUIZ}
        currentQ={QUESTION}
        isAnswered={true}
        isCorrect={false}
        selected={'B'}
        answerConfidence={3}
        adaptiveNotice={null}
        gradeError={null}
        onRetryGrade={() => {}}
        effectiveExplanationDepth="foundation"
        disclaimer={null}
        quizEvidenceAudit={null}
        isAuthenticated={false}
        feedbackSentIds={new Set()}
        onAnswerConfidenceChange={() => {}}
        onAnswer={() => {}}
        onNext={() => {}}
        onExplanationFeedback={() => {}}
        resolveSourceArticle={() => null}
      />
    );
    expect(screen.getByText(/Correct answer:/i)).toHaveTextContent('Correct answer: C');
    expect(screen.getByText(/Gamma is correct/)).toBeInTheDocument();
  });
});

