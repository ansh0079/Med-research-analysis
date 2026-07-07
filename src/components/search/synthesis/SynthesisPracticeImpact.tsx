import React from 'react';
import type { SynthesisResult } from '@types';
import { CitationWarning } from './CitationWarning';
import { PRACTICE_IMPACT_CARD, PRACTICE_IMPACT_LABEL } from './synthesisPanelConfig';

interface Props {
  practiceImpact: NonNullable<SynthesisResult['synthesis']['practiceImpact']>;
  citationIssuePaths: Set<string>;
  citationIssueErrors: Map<string, string[]>;
}

export const SynthesisPracticeImpact: React.FC<Props> = ({
  practiceImpact,
  citationIssuePaths,
  citationIssueErrors,
}) => {
  const card = PRACTICE_IMPACT_CARD[practiceImpact.classification] ?? PRACTICE_IMPACT_CARD.not_clinically_actionable_yet;
  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${card.border}`}>
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-center gap-2">
        <i className="fas fa-bolt text-amber-500 text-xs" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">Practice impact</span>
        <span className={`ml-auto text-[10px] font-black uppercase tracking-wider rounded-full px-2.5 py-0.5 ${card.chip}`}>
          {PRACTICE_IMPACT_LABEL[practiceImpact.classification] ?? practiceImpact.classification.replace(/_/g, ' ')}
        </span>
      </div>
      <div className="p-4 space-y-3 bg-white/40 dark:bg-slate-900/20">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Monday morning</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">{practiceImpact.mondayMorningLine}</p>
          {citationIssuePaths.has('practiceImpact.mondayMorningLine') && (
            <CitationWarning field="Practice impact — Monday morning" errors={citationIssueErrors.get('practiceImpact.mondayMorningLine') ?? []} />
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Why this tier</p>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{practiceImpact.rationale}</p>
          {citationIssuePaths.has('practiceImpact.rationale') && (
            <CitationWarning field="Practice impact — rationale" errors={citationIssueErrors.get('practiceImpact.rationale') ?? []} />
          )}
        </div>
      </div>
    </div>
  );
};
