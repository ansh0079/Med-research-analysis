import React from 'react';
import { ClinicalSafetyNotice } from '@components/ui/ClinicalSafetyNotice';
import { VerificationBadge } from '@components/ui/VerificationBadge';
import type { CaseToEvidenceResult } from './caseModeUtils';
import { CaseMCQs } from './CaseMCQs';

interface Props {
  result: CaseToEvidenceResult;
  evidenceQuizMcqs: import('@types').QuizQuestion[];
}

export const CaseModeEvidenceBriefPanel: React.FC<Props> = ({ result, evidenceQuizMcqs }) => {
  const { brief, relatedClaims, articles, topic } = result;

  return (
    <div className="neo-card rounded-2xl p-5 space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/60">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">Case-to-evidence brief</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{topic}</p>
        </div>
        <ClinicalSafetyNotice status="synthesis_inferred" showDisclaimer={false} />
      </div>

      {brief.bestEvidence && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-2">Best evidence</p>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{brief.bestEvidence}</p>
        </div>
      )}

      {brief.applicabilityLimits && brief.applicabilityLimits.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">Applicability limits</p>
          <ul className="space-y-1.5">
            {brief.applicabilityLimits.map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                <i className="fas fa-triangle-exclamation text-amber-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {brief.guidelinePosition && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">Guideline position</p>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{brief.guidelinePosition}</p>
        </div>
      )}

      {brief.practicalDecisionPoint && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">Practical decision point</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{brief.practicalDecisionPoint}</p>
        </div>
      )}

      {brief.keyUncertainty && (
        <p className="text-xs text-slate-500 dark:text-slate-400 italic border-l-2 border-amber-400 pl-3">
          Key uncertainty: {brief.keyUncertainty}
        </p>
      )}

      {relatedClaims && relatedClaims.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Related teaching claims</p>
          <ul className="space-y-2">
            {relatedClaims.slice(0, 4).map((c) => (
              <li key={c.claimKey} className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-start gap-2">
                <span className="flex-1">{c.claimText}</span>
                {c.verificationStatus && <VerificationBadge status={c.verificationStatus} />}
              </li>
            ))}
          </ul>
        </div>
      )}

      {evidenceQuizMcqs.length > 0 && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60">
          <CaseMCQs mcqs={evidenceQuizMcqs} topic={topic || 'Clinical case'} />
        </div>
      )}

      {articles.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Literature ({articles.length})</p>
          <ol className="space-y-1.5">
            {articles.slice(0, 6).map((cite, i) => (
              <li key={cite.uid ?? i} className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                <span className="font-mono text-indigo-500 mr-1">{i + 1}.</span>
                {cite.title}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};
