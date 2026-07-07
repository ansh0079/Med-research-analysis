import React from 'react';
import type { SynthesisResult } from '@types';
import { ArticleLink } from './ArticleLink';
import { CitationWarning } from './CitationWarning';
import type { Article } from '@types';

interface Props {
  card: NonNullable<SynthesisResult['synthesis']['clinicalActionCard']>;
  citationIssuePaths: Set<string>;
  citationIssueErrors: Map<string, string[]>;
  articles: Article[];
}

export const SynthesisClinicalActionCard: React.FC<Props> = ({
  card,
  citationIssuePaths,
  citationIssueErrors,
  articles,
}) => (
  <div className="rounded-2xl border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/30 overflow-hidden">
    <div className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/40 border-b border-emerald-200 dark:border-emerald-800/50 flex items-center gap-2">
      <i className="fas fa-stethoscope text-emerald-600 dark:text-emerald-400 text-xs" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Clinical Bottom Line</span>
      <span className="ml-auto text-[9px] text-emerald-600/70 dark:text-emerald-500/70 italic">Not patient-specific advice — for clinical decision support</span>
    </div>
    <div className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="w-5 h-5 rounded-full bg-emerald-200 dark:bg-emerald-800/60 flex items-center justify-center shrink-0 mt-0.5">
          <i className="fas fa-check text-emerald-700 dark:text-emerald-300 text-[9px]" />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-0.5">Recommendation</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">{card.recommendation}</p>
          {citationIssuePaths.has('clinicalActionCard.recommendation') && (
            <CitationWarning field="Recommendation" errors={citationIssueErrors.get('clinicalActionCard.recommendation') ?? []} />
          )}
        </div>
      </div>
      <div className="flex items-start gap-3">
        <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0 mt-0.5">
          <i className="fas fa-chart-bar text-blue-600 dark:text-blue-400 text-[9px]" />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-0.5">Certainty</p>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{card.certainty}</p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0 mt-0.5">
          <i className="fas fa-exclamation text-amber-600 dark:text-amber-400 text-[9px]" />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-0.5">Caveat</p>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{card.caveat}</p>
          {citationIssuePaths.has('clinicalActionCard.caveat') && (
            <CitationWarning field="Caveat" errors={citationIssueErrors.get('clinicalActionCard.caveat') ?? []} />
          )}
        </div>
      </div>
    </div>
  </div>
);
