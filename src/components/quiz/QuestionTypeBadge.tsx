import React from 'react';
import { QTYPE_CONFIG } from '../../utils/quizPageHelpers';
import type { QuestionType } from '@types';

export const QuestionTypeBadge: React.FC<{ type?: QuestionType }> = ({ type }) => {
  if (!type) return null;
  const cfg = QTYPE_CONFIG[type];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg ${cfg.cls}`}>
      <i className={`fas ${cfg.icon} text-[9px]`} />
      {cfg.label}
    </span>
  );
};
