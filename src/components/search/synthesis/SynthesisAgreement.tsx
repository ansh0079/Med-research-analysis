import React from 'react';
import { SectionLabel } from './SectionLabel';

interface Props {
  agreement: string[];
}

export const SynthesisAgreement: React.FC<Props> = ({ agreement }) => (
  <div>
    <SectionLabel>What the Evidence Agrees On</SectionLabel>
    <div className="space-y-1.5">
      {agreement.map((point, i) => (
        <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
          <i className="fas fa-check-circle text-emerald-500 text-[11px] mt-0.5 shrink-0" />
          <p className="text-sm text-slate-700 dark:text-slate-300">{point}</p>
        </div>
      ))}
    </div>
  </div>
);
