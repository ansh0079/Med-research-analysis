import React from 'react';
import { SectionLabel } from './SectionLabel';

interface Props {
  studyDesigns: Record<string, number>;
  totalDesigns: number;
}

export const SynthesisStudyDesigns: React.FC<Props> = ({ studyDesigns, totalDesigns }) => (
  <div>
    <SectionLabel>Study Design Breakdown</SectionLabel>
    <div className="flex flex-wrap gap-2">
      {(Object.entries(studyDesigns ?? {}) as [string, number][])
        .filter(([, n]) => n > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([key, n]) => (
          <span key={key} className="badge badge-source font-mono">
            <span className="font-black text-indigo-500">{n}×</span>
            {' '}{key.replace(/([A-Z])/g, ' $1').trim()}
          </span>
        ))}
    </div>
  </div>
);
