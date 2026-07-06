import React from 'react';
import type { Article, QuizQuestion } from '@types';
import { CaseMCQs } from '@components/case/CaseMCQs';
import { ClinicalSafetyNotice } from '@components/ui/ClinicalSafetyNotice';
import { VerificationBadge } from '@components/ui/VerificationBadge';

export type CaseEvidenceBrief = {
  bestEvidence?: string;
  applicabilityLimits?: string[];
  guidelinePosition?: string;
  practicalDecisionPoint?: string;
  keyUncertainty?: string;
  quizQuestion?: {
    question?: string;
    options?: string[];
    correctAnswer?: string;
    explanation?: string;
  };
};

export type CaseToEvidenceResult = {
  topic: string;
  clinicalQuestion: string;
  articles: Article[];
  brief: CaseEvidenceBrief;
  relatedClaims?: Array<{
    claimKey?: string;
    claimText?: string;
    verificationStatus?: string;
    guidelineAlignment?: string | null;
  }>;
};

export function CaseEvidenceBriefPanel({
  result,
  quizMcqs,
  topicFallback,
}: {
  result: CaseToEvidenceResult;
  quizMcqs: QuizQuestion[];
  topicFallback: string | null;
}) {
  return (
    <div className="neo-card rounded-2xl p-5 space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/60">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">Case-to-evidence brief</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{result.topic}</p>
        </div>
        <ClinicalSafetyNotice status="synthesis_inferred" showDisclaimer={false} />
      </div>

      {result.brief.bestEvidence && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-2">Best evidence</p>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{result.brief.bestEvidence}</p>
        </div>
      )}

      {result.brief.applicabilityLimits && result.brief.applicabilityLimits.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">Applicability limits</p>
          <ul className="space-y-1.5">
            {result.brief.applicabilityLimits.map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                <i className="fas fa-triangle-exclamation text-amber-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.brief.guidelinePosition && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">Guideline position</p>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{result.brief.guidelinePosition}</p>
        </div>
      )}

      {result.brief.practicalDecisionPoint && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">Practical decision point</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{result.brief.practicalDecisionPoint}</p>
        </div>
      )}

      {result.brief.keyUncertainty && (
        <p className="text-xs text-slate-500 dark:text-slate-400 italic border-l-2 border-amber-400 pl-3">
          Key uncertainty: {result.brief.keyUncertainty}
        </p>
      )}

      {result.relatedClaims && result.relatedClaims.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Related teaching claims</p>
          <ul className="space-y-2">
            {result.relatedClaims.slice(0, 4).map((claim) => (
              <li key={claim.claimKey} className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-start gap-2">
                <span className="flex-1">{claim.claimText}</span>
                {claim.verificationStatus && <VerificationBadge status={claim.verificationStatus} />}
              </li>
            ))}
          </ul>
        </div>
      )}

      {quizMcqs.length > 0 && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60">
          <CaseMCQs mcqs={quizMcqs} topic={result.topic || topicFallback || 'Clinical case'} />
        </div>
      )}

      {result.articles.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Literature ({result.articles.length})</p>
          <ol className="space-y-1.5">
            {result.articles.slice(0, 6).map((cite, index) => (
              <li key={cite.uid ?? index} className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                <span className="font-mono text-indigo-500 mr-1">{index + 1}.</span>
                {cite.title}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
