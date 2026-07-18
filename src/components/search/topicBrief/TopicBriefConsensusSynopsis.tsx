import React from 'react';
import type { TopicIntelligence } from '@types';
import { EVIDENCE_STRENGTH_CLASS } from './topicBriefUtils';

interface Props {
  consensusSynopsis: NonNullable<TopicIntelligence['consensusSynopsis']>;
}

export const TopicBriefConsensusSynopsis: React.FC<Props> = ({ consensusSynopsis }) => {
  const strengthClass = EVIDENCE_STRENGTH_CLASS[consensusSynopsis.evidenceStrength] ?? EVIDENCE_STRENGTH_CLASS.LOW;
  const includedCount = consensusSynopsis.includedArticles.length;
  const fullTextCount = typeof consensusSynopsis.fullTextIndexedCount === 'number'
    ? consensusSynopsis.fullTextIndexedCount
    : consensusSynopsis.includedArticles.filter((article) => article.fullTextIndexed).length;
  const coverageRatio = typeof consensusSynopsis.fullTextCoverageRatio === 'number'
    ? consensusSynopsis.fullTextCoverageRatio
    : (includedCount > 0 ? fullTextCount / includedCount : 0);
  const coveragePct = Math.round(Math.max(0, Math.min(1, coverageRatio)) * 100);

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
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
              coveragePct > 0
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
            }`}>
              {coveragePct}% full text ({fullTextCount}/{includedCount || 0})
            </span>
            {Number(consensusSynopsis.abstractPaperCount || 0) > 0 && consensusSynopsis.freePaperCount === 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                Abstract-only evidence
              </span>
            )}
            {consensusSynopsis.reviewState && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {consensusSynopsis.reviewState.replace(/_/g, ' ')}
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

      {(consensusSynopsis.areasOfAgreement.length > 0 || consensusSynopsis.areasOfUncertainty.length > 0 || consensusSynopsis.conflictingSignals.length > 0 || consensusSynopsis.quizFocusPoints.length > 0) && (
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
          {consensusSynopsis.conflictingSignals.length > 0 && (
            <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/20">
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">Conflicting Signals</p>
              <ul className="space-y-1 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
                {consensusSynopsis.conflictingSignals.slice(0, 3).map((item, i) => <li key={i}>{item}</li>)}
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

      {(['LOW', 'VERY_LOW'].includes(consensusSynopsis.evidenceStrength) || consensusSynopsis.conflictingSignals.length > 0) && consensusSynopsis.includedArticles.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-[11px] text-amber-900 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
          <p className="font-semibold">Evidence strength is limited — review primary sources before acting on this synopsis.</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {consensusSynopsis.includedArticles.slice(0, 4).map((article) => (
              <a
                key={article.uid || article.sourceIndex}
                href={article.freeFullTextUrl || (article.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/` : undefined) || (article.doi ? `https://doi.org/${article.doi}` : '#')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 font-semibold text-amber-800 hover:underline dark:bg-amber-950/40 dark:text-amber-100"
              >
                <i className="fas fa-arrow-up-right-from-square text-[9px]" />
                Review source {article.sourceIndex}
              </a>
            ))}
          </div>
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
