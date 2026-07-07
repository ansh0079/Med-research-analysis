import React from 'react';
import { FollowUpQuestionsPanel } from '@components/search/FollowUpQuestionsPanel';
import type { FollowUpQuestion } from '@types';

interface Props {
  questions: FollowUpQuestion[];
  onSearch: (query: string) => void;
  onClose: () => void;
}

export const SynthesisFollowUpQuestions: React.FC<Props> = ({ questions, onSearch, onClose }) => (
  <FollowUpQuestionsPanel
    questions={questions}
    onSearch={(q) => { onSearch(q); onClose(); }}
  />
);
