import React from 'react';

interface Props {
  limitations?: string | null;
  researchGaps?: string | null;
}

export const SynthesisLimitationsGaps: React.FC<Props> = ({ limitations, researchGaps }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {limitations && (
      <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Key Limitations</p>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{limitations}</p>
      </div>
    )}
    {researchGaps && (
      <div className="p-4 rounded-xl bg-amber-500/[0.05] dark:bg-amber-500/[0.08] border border-amber-500/15">
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-2">Research Gaps</p>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{researchGaps}</p>
      </div>
    )}
  </div>
);
