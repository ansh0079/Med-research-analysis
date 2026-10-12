import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuizMultiAnswerOptions } from './QuizMultiAnswerOptions';
import { answersMatch, normalizeAnswerSet, toggleAnswerLetter, isMultiAnswerQuestion } from '../../utils/answerSet';

const OPTIONS = ['A: Aspirin', 'B: Heparin', 'C: Warfarin', 'D: Nothing'];

describe('answer sets', () => {
    it('canonicalises order, case and separators', () => {
        expect(normalizeAnswerSet('c, A')).toBe('a,c');
        expect(normalizeAnswerSet('A and C')).toBe('a,c');
        expect(normalizeAnswerSet(' b ')).toBe('b');
    });

    it('requires the exact set, not a subset or a superset', () => {
        expect(answersMatch('A,C', 'C,A')).toBe(true);
        expect(answersMatch('A', 'A,C')).toBe(false);
        expect(answersMatch('A,B,C', 'A,C')).toBe(false);
        expect(answersMatch('', '')).toBe(false);
    });

    it('keeps single-letter answers working', () => {
        expect(answersMatch('b', 'B')).toBe(true);
        expect(answersMatch('true', 'True')).toBe(true);
    });

    it('detects multi-answer questions from the flag or the key', () => {
        expect(isMultiAnswerQuestion({ multiAnswer: true, correctAnswer: '' })).toBe(true);
        expect(isMultiAnswerQuestion({ correctAnswer: 'A,C' })).toBe(true);
        expect(isMultiAnswerQuestion({ correctAnswer: 'A' })).toBe(false);
    });

    it('toggles letters in and out of a selection', () => {
        expect(toggleAnswerLetter('', 'C')).toBe('c');
        expect(toggleAnswerLetter('c', 'A')).toBe('a,c');
        expect(toggleAnswerLetter('a,c', 'A')).toBe('c');
    });
});

describe('QuizMultiAnswerOptions', () => {
    it('submits nothing until a choice is ticked, then submits the whole set once', () => {
        const onSubmit = jest.fn();
        render(<QuizMultiAnswerOptions options={OPTIONS} isAnswered={false} submitted={null} correctAnswer="" onSubmit={onSubmit} />);
        expect(screen.getByText('Select all that apply')).toBeInTheDocument();
        const submit = screen.getByRole('button', { name: 'Submit answer' });
        expect(submit).toBeDisabled();

        fireEvent.click(screen.getByText('C: Warfarin'));
        fireEvent.click(screen.getByText('A: Aspirin'));
        expect(onSubmit).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith('a,c');
    });

    it('lets a ticked option be unticked before submitting', () => {
        const onSubmit = jest.fn();
        render(<QuizMultiAnswerOptions options={OPTIONS} isAnswered={false} submitted={null} correctAnswer="" onSubmit={onSubmit} />);
        fireEvent.click(screen.getByText('B: Heparin'));
        fireEvent.click(screen.getByText('B: Heparin'));
        expect(screen.getByRole('button', { name: 'Submit answer' })).toBeDisabled();
    });

    it('after grading, hides the submit button and shows no option as pending', () => {
        render(<QuizMultiAnswerOptions options={OPTIONS} isAnswered submitted="a,b" correctAnswer="a,c" onSubmit={jest.fn()} />);
        expect(screen.queryByRole('button', { name: 'Submit answer' })).not.toBeInTheDocument();
    });
});
