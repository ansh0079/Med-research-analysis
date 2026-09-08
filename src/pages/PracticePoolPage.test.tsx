import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PracticePoolPage } from './PracticePoolPage';

const gradeQuizAnswer = jest.fn();
const submitQuizAttempt = jest.fn();
const fetchPracticePool = jest.fn();

jest.mock('@services/api', () => ({
  api: {
    ai: { gradeQuizAnswer: (...args: unknown[]) => gradeQuizAnswer(...args) },
    learning: { submitQuizAttempt: (...args: unknown[]) => submitQuizAttempt(...args) },
    collaboration: { fetchPracticePool: (...args: unknown[]) => fetchPracticePool(...args) },
  },
}));

describe('PracticePoolPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchPracticePool.mockResolvedValue({
      total: 1,
      questions: [{
        id: 'q1', topic: 'ARDS', source: 'evidence', type: 'multiple_choice', questionType: 'recall',
        question: 'Which option is supported?', options: ['A: First', 'B: Second'], gradingToken: 'sealed',
        explanation: 'Second is supported.', guidelineRef: null, difficulty: 'easy',
      }],
    });
    gradeQuizAnswer.mockResolvedValue({ isCorrect: true, correctAnswer: 'B' });
    submitQuizAttempt.mockResolvedValue({ saved: 1, persisted: true });
  });

  test('grades a withheld-answer question on the server without crashing', async () => {
    render(<PracticePoolPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));
    fireEvent.click(await screen.findByRole('button', { name: 'B: Second' }));

    await screen.findByText('Correct');
    expect(screen.getByText('Second is supported.')).toBeInTheDocument();
    expect(gradeQuizAnswer).toHaveBeenCalledWith(expect.objectContaining({ userAnswer: 'B', gradingToken: 'sealed' }));
    await waitFor(() => expect(submitQuizAttempt).toHaveBeenCalled());
  });
});
