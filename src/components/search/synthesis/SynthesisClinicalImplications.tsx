import React from 'react';
import { CitationWarning } from './CitationWarning';

interface Props {
  clinicalImplications: string;
  citationIssuePaths: Set<string>;
  citationIssueErrors: Map<string, string[]>;
}

export const SynthesisClinicalImplications: React.FC<Props> = ({
  clinicalImplications,
  citationIssuePaths,
  citationIssueErrors,
}) => (
  <div className="rounded-2xl p-4 border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20">
    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">Clinical Implications</p>
    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{clinicalImplications}</p>
    {citationIssuePaths.has('clinicalImplications') && (
      <CitationWarning field="Clinical Implications" errors={citationIssueErrors.get('clinicalImplications') ?? []} />
    )}
  </div>
);
