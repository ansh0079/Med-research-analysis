import React from 'react';
import { SectionLabel } from './SectionLabel';

interface Props {
  uncertainties: string[];
}

export const SynthesisUncertainties: React.FC<Props> = ({ uncertainties }) => (
  <div>
    <SectionLabel>Still Uncertain</SectionLabel>
    <div className="space-y-1.5">
      {uncertainties.map((u, i) => (
        <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
          <i className="fas fa-question-circle text-amber-500 text-[11px] mt-0.5 shrink-0" />
          <p className="text-sm text-slate-700 dark:text-slate-300">{u}</p>
        </div>
      ))}
    </div>
  </div>
);
