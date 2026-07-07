import React from 'react';
import { SectionLabel } from './SectionLabel';
import type { SynthesisResult } from '@types';

interface Props {
  conflicts: NonNullable<SynthesisResult['synthesis']['conflicts']>;
}

export const SynthesisConflicts: React.FC<Props> = ({ conflicts }) => (
  <div>
    <SectionLabel>Conflicting Evidence</SectionLabel>
    <div className="space-y-2">
      {conflicts.map((c, i) => (
        <div key={i} className="p-4 rounded-xl bg-amber-500/[0.07] dark:bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm text-slate-800 dark:text-slate-200 mb-2">{c.description}</p>
          <div className="flex gap-4 text-[10px] font-bold">
            {c.studiesFor?.length > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400">For: Studies {c.studiesFor.join(', ')}</span>
            )}
            {c.studiesAgainst?.length > 0 && (
              <span className="text-red-500 dark:text-red-400">Against: Studies {c.studiesAgainst.join(', ')}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);
