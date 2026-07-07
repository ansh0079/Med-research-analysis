import React from 'react';
import { CitationWarning } from './CitationWarning';

interface Props {
  overallAnswer: string;
  citationIssuePaths: Set<string>;
  citationIssueErrors: Map<string, string[]>;
}

export const SynthesisOverallAnswer: React.FC<Props> = ({ overallAnswer, citationIssuePaths, citationIssueErrors }) => (
  <div className={`rounded-2xl p-5 shadow-lg ${citationIssuePaths.has('overallAnswer') ? 'bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700/60' : 'bg-gradient-to-br from-indigo-600 to-violet-600 shadow-indigo-500/20'}`}>
    <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${citationIssuePaths.has('overallAnswer') ? 'text-amber-600 dark:text-amber-400' : 'text-white/70'}`}>Overall Answer</p>
    <p className={`text-base font-bold leading-relaxed ${citationIssuePaths.has('overallAnswer') ? 'text-amber-900 dark:text-amber-100' : 'text-white'}`}>{overallAnswer}</p>
    {citationIssuePaths.has('overallAnswer') && (
      <CitationWarning field="Overall Answer" errors={citationIssueErrors.get('overallAnswer') ?? []} />
    )}
  </div>
);
