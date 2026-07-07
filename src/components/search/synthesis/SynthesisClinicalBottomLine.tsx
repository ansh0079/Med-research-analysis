import React from 'react';
import { CitationWarning } from './CitationWarning';

interface Props {
  clinicalBottomLine: string;
  citationIssuePaths: Set<string>;
  citationIssueErrors: Map<string, string[]>;
}

export const SynthesisClinicalBottomLine: React.FC<Props> = ({
  clinicalBottomLine,
  citationIssuePaths,
  citationIssueErrors,
}) => (
  <div className="rounded-2xl p-5 border bg-indigo-500/[0.07] dark:bg-indigo-500/10 border-indigo-500/20">
    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-3">Clinical Bottom Line</p>
    <p className="font-bold text-slate-900 dark:text-white leading-relaxed">{clinicalBottomLine}</p>
    {citationIssuePaths.has('clinicalBottomLine') && (
      <CitationWarning field="Clinical Bottom Line" errors={citationIssueErrors.get('clinicalBottomLine') ?? []} />
    )}
  </div>
);
