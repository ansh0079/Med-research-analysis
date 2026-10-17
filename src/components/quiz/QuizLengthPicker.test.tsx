import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuizLengthPicker, QUIZ_LENGTH_STEPS } from './QuizLengthPicker';

describe('QuizLengthPicker', () => {
  it('offers questions in steps of 5', () => {
    expect([...QUIZ_LENGTH_STEPS]).toEqual([5, 10, 15, 20, 25, 30]);
    render(<QuizLengthPicker value={10} onChange={() => {}} />);
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['5', '10', '15', '20', '25', '30']);
  });

  it('marks the current choice and reports a new one', () => {
    const onChange = jest.fn();
    render(<QuizLengthPicker value={10} onChange={onChange} />);
    expect(screen.getByText('10')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByText('25'));
    expect(onChange).toHaveBeenCalledWith(25);
  });
});
