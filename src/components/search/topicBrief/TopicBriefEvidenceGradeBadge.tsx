import React from 'react';
import type { EvidenceGrade } from '@types';
import { EVIDENCE_GRADE_META } from './topicBriefUtils';

interface Props {
  grade?: EvidenceGrade;
}

export const TopicBriefEvidenceGradeBadge: React.FC<Props> = ({ grade }) => {
  if (!grade) return null;
  const meta = EVIDENCE_GRADE_META[grade];
  if (!meta) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.classes}`}>
      <i className={`fas ${meta.icon} text-[9px]`} />
      {meta.label}
    </span>
  );
};
