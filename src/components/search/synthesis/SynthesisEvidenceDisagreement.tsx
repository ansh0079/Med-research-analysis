import React from 'react';
import type { SynthesisResult } from '@types';
import type { Article } from '@types';
import { ArticleLink } from './ArticleLink';
import { CitationWarning } from './CitationWarning';

interface Props {
  disagreement: NonNullable<SynthesisResult['synthesis']['evidenceDisagreement']>;
  articles: Article[];
  citationIssuePaths: Set<string>;
  citationIssueErrors: Map<string, string[]>;
}

export const SynthesisEvidenceDisagreement: React.FC<Props> = ({
  disagreement,
  articles,
  citationIssuePaths,
  citationIssueErrors,
}) => (
  <div className={`rounded-2xl border overflow-hidden ${disagreement.hasMaterialDisagreement ? 'border-amber-400 dark:border-amber-600/50 bg-amber-500/[0.06]' : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30'}`}>
    <div className={`px-4 py-2 border-b flex items-center gap-2 ${disagreement.hasMaterialDisagreement ? 'bg-amber-100/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50' : 'bg-slate-100/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
      <i className={`fas fa-scale-balanced text-xs ${disagreement.hasMaterialDisagreement ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}`} />
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">Evidence disagreement</span>
      {disagreement.hasMaterialDisagreement ? (
        <span className="ml-auto text-[9px] font-black uppercase text-amber-700 dark:text-amber-400">Material tension</span>
      ) : (
        <span className="ml-auto text-[9px] font-bold uppercase text-slate-400">Broadly aligned</span>
      )}
    </div>
    <div className="p-4 space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Guideline position</p>
        <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{disagreement.guidelineRecommendation}</p>
        {citationIssuePaths.has('evidenceDisagreement.guidelineRecommendation') && (
          <CitationWarning field="Guideline position" errors={citationIssueErrors.get('evidenceDisagreement.guidelineRecommendation') ?? []} />
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-800/40 bg-emerald-500/[0.05] p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Strongest supporting trial</p>
          <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{disagreement.strongestSupportingTrial.summary}</p>
          <div className="mt-2 flex items-center gap-2">
            {disagreement.strongestSupportingTrial.studyIndex != null && (
              <ArticleLink idx={disagreement.strongestSupportingTrial.studyIndex} articles={articles} />
            )}
          </div>
          {citationIssuePaths.has('evidenceDisagreement.strongestSupportingTrial.summary') && (
            <CitationWarning field="Supporting trial" errors={citationIssueErrors.get('evidenceDisagreement.strongestSupportingTrial.summary') ?? []} />
          )}
        </div>
        <div className="rounded-xl border border-rose-200/70 dark:border-rose-800/40 bg-rose-500/[0.05] p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-1">Strongest contradicting trial</p>
          <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{disagreement.strongestContradictingTrial.summary}</p>
          <div className="mt-2 flex items-center gap-2">
            {disagreement.strongestContradictingTrial.studyIndex != null && (
              <ArticleLink idx={disagreement.strongestContradictingTrial.studyIndex} articles={articles} />
            )}
          </div>
          {citationIssuePaths.has('evidenceDisagreement.strongestContradictingTrial.summary') && (
            <CitationWarning field="Contradicting trial" errors={citationIssueErrors.get('evidenceDisagreement.strongestContradictingTrial.summary') ?? []} />
          )}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Where the recommendation may fail</p>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{disagreement.populationsWhereFails}</p>
        {citationIssuePaths.has('evidenceDisagreement.populationsWhereFails') && (
          <CitationWarning field="Applicability limits" errors={citationIssueErrors.get('evidenceDisagreement.populationsWhereFails') ?? []} />
        )}
      </div>
      <div className="rounded-xl border border-indigo-200/60 dark:border-indigo-800/40 bg-indigo-500/[0.06] p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">What would change your practice?</p>
        <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed italic">{disagreement.whatWouldChangePractice}</p>
        {citationIssuePaths.has('evidenceDisagreement.whatWouldChangePractice') && (
          <CitationWarning field="Reflective prompt" errors={citationIssueErrors.get('evidenceDisagreement.whatWouldChangePractice') ?? []} />
        )}
      </div>
    </div>
  </div>
);
