import React, { useState } from 'react';
import { QuizOptionButton } from '@components/quiz/QuizOptionButton';
import { answerLetters, toggleAnswerLetter } from '../../utils/answerSet';

interface QuizMultiAnswerOptionsProps {
  options: string[];
  isAnswered: boolean;
  /** Canonical answer set the learner submitted, once answered. */
  submitted: string | null;
  /** Canonical correct answer set, revealed by the server after grading. */
  correctAnswer: string;
  onSubmit: (answer: string) => void;
}

/** Select-all-that-apply options: tick any number, then submit once. */
export const QuizMultiAnswerOptions: React.FC<QuizMultiAnswerOptionsProps> = ({
  options, isAnswered, submitted, correctAnswer, onSubmit,
}) => {
  const [picked, setPicked] = useState('');
  const pickedLetters = answerLetters(isAnswered ? submitted : picked);
  const correctLetters = answerLetters(correctAnswer);
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
        Select all that apply
      </p>
      {options.map((opt) => {
        const letter = opt.split(':')[0].trim();
        const isPicked = pickedLetters.includes(letter.toLowerCase());
        return (
          <QuizOptionButton
            key={letter}
            opt={opt}
            letter={letter}
            isAnswered={isAnswered}
            isCorrectLetter={correctLetters.includes(letter.toLowerCase())}
            isSelected={isPicked}
            isPicked={!isAnswered && isPicked}
            onClick={() => setPicked((cur) => toggleAnswerLetter(cur, letter))}
          />
        );
      })}
      {!isAnswered && (
        <button
          type="button"
          disabled={pickedLetters.length === 0}
          onClick={() => onSubmit(picked)}
          className="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Submit answer
        </button>
      )}
    </div>
  );
};
