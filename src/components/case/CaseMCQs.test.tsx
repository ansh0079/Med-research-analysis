import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CaseMCQs } from './CaseMCQs';

const gradeQuizAnswer = jest.fn();
const submitQuizAttempt = jest.fn();

jest.mock('@contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
jest.mock('@hooks/useClientFeatures', () => ({ useClientFeatures: () => ({ betaOpenAccess: false }) }));
jest.mock('@services/api', () => ({
  api: {
    ai: { gradeQuizAnswer: (...args: unknown[]) => gradeQuizAnswer(...args) },
    learning: { submitQuizAttempt: (...args: unknown[]) => submitQuizAttempt(...args) },
  },
}));

describe('CaseMCQs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gradeQuizAnswer.mockResolvedValue({ isCorrect: true, correctAnswer: 'B' });
    submitQuizAttempt.mockResolvedValue({ saved: 1 });
  });

  test('reveals correctness only after server grading', async () => {
    render(<CaseMCQs topic="ARDS" mcqs={[{
      id: 'case-1', type: 'multiple_choice', questionType: 'clinical_application',
      question: 'What is next?', options: ['A: First', 'B: Second'], gradingToken: 'sealed',
      correctAnswer: '', explanation: 'Use the supported option.', difficulty: 'medium',
    }]} />);

    fireEvent.click(screen.getByRole('button', { name: 'B: Second' }));
    await screen.findByText('Correct!');
    expect(gradeQuizAnswer).toHaveBeenCalledWith(expect.objectContaining({ userAnswer: 'B' }));
    await waitFor(() => expect(submitQuizAttempt).toHaveBeenCalledWith(expect.objectContaining({
      attempts: [expect.objectContaining({ correctAnswer: 'B', isCorrect: true })],
    })));
  });
});
