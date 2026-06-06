import React from 'react';
import type { QualityScore } from '@types';

const GRADE_CLASS: Record<string, string> = {
  A: 'grade-A',
  B: 'grade-B',
  C: 'grade-C',
  D: 'grade-D',
};

interface Props {
  quality: QualityScore;
  /** Show tooltip with factors (default true) */
  showTooltip?: boolean;
}

export const QualityBadge: React.FC<Props> = ({ quality, showTooltip = true }) => (
  <div
    className={`grade-ring ${GRADE_CLASS[quality.grade] ?? 'grade-D'}`}
    title={showTooltip ? `Quality ${quality.grade} · ${quality.score}/100\n${quality.factors.slice(0, 3).join(' · ')}` : undefined}
    aria-label={`Quality grade ${quality.grade}`}
  >
    {quality.grade}
  </div>
);
