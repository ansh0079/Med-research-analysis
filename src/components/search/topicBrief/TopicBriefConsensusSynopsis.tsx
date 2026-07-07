import React from 'react';
import type { TopicIntelligence } from '@types';
import { EVIDENCE_STRENGTH_CLASS } from './topicBriefUtils';

interface Props {
  consensusSynopsis: NonNullable<TopicIntelligence['consensusSynopsis']>;
}

export const TopicBriefConsensusSynopsis: React.FC<Props> = ({ consensusSynopsis }) => {
  const strengthClass = EVIDENCE_STRENGTH_CLASS[consensusSynopsis.evidenceStrength] ?? EVIDENCE_STRENGTH_CLASS.LOW;
  return (
    <div className="border-b border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-violet-700 dark:text-violet-300">
              <i className="fas fa-scale-balanced text-[10px]" />
              Consensus Synopsis
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${strengthClass}`}>
              {consensusSynopsis.evidenceStrength}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              {consensusSynopsis.freePaperCount} free paper{consensusSynopsis.freePaperCount === 1 ? '' : 's'}
            </span>
            {consensusSynopsis.includedArticles.some((article) => article.fullTextIndexed) && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                Full text used
              </span>
            )}
            {consensusSynopsis.citationValidation && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                consensusSynopsis.citationValidation.ok
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              }`}>
                {consensusSynopsis.citationValidation.ok ? 'Citations checked' : 'Citation warning'}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {consensusSynopsis.statement}
          </p>
          {consensusSynopsis.clinicalBottomLine && (
            <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold leading-relaxed text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200">
              {consensusSynopsis.clinicalBottomLine}
            </p>
          )}
          {consensusSynopsis.guidelineAlignment?.summary && (
            <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-[11px] font-semibold leading-relaxed text-blue-800 dark:bg-blue-950/20 dark:text-blue-200">
              <span className="font-black uppercase">
                {consensusSynopsis.guidelineAlignment.status.replace(/_/g, ' ')}
              </span>
              {' '}{consensusSynopsis.guidelineAlignment.summary}
            </p>
          )}
        </div>
        {consensusSynopsis.status !== 'generated' && (
          <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            {consensusSynopsis.status.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {(consensusSynopsis.areasOfAgreement.length > 0 || consensusSynopsis.areasOfUncertainty.length > 0 || consensusSynopsis.quizFocusPoints.length > 0) && (
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {consensusSynopsis.areasOfAgreement.length > 0 && (
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50">
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Agreement</p>
              <ul className="space-y-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {consensusSynopsis.areasOfAgreement.slice(0, 3).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          )}
          {consensusSynopsis.areasOfUncertainty.length > 0 && (
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50">
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Uncertainty</p>
              <ul className="space-y-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {consensusSynopsis.areasOfUncertainty.slice(0, 3).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          )}
          {consensusSynopsis.quizFocusPoints.length > 0 && (
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50">
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Quiz Focus</p>
              <ul className="space-y-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {consensusSynopsis.quizFocusPoints.slice(0, 3).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {consensusSynopsis.whatNotToOverclaim.length > 0 && (
        <p className="mt-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
          <span className="font-black">Do not overclaim:</span> {consensusSynopsis.whatNotToOverclaim.slice(0, 2).join(' ')}
        </p>
      )}
    </div>
  );
};
