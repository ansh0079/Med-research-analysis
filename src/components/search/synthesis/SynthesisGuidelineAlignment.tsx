import React from 'react';
import type { GuidelineAlignment } from '@types';

interface Props {
  alignment: GuidelineAlignment | null;
  alignmentLoading: boolean;
  alignmentError: string | null;
  onCheck: () => void;
}

export const SynthesisGuidelineAlignment: React.FC<Props> = ({
  alignment,
  alignmentLoading,
  alignmentError,
  onCheck,
}) => (
  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
    <div className="px-5 py-4 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Guideline Alignment</p>
      {!alignment && !alignmentLoading && (
        <button
          type="button"
          onClick={onCheck}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Check vs Guidelines
        </button>
      )}
    </div>
    <div className="p-5">
      {!alignment && !alignmentLoading && !alignmentError && (
        <p className="text-xs text-slate-400 dark:text-slate-500">Compare this evidence against NICE, AHA, WHO, and SIGN guidelines.</p>
      )}
      {alignmentLoading && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="spinner" /> Checking NICE · AHA · WHO · SIGN…
        </div>
      )}
      {alignmentError && (
        <p className="text-xs text-red-500">{alignmentError}</p>
      )}
      {alignment && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className={`impact-bar-fill ${
                  alignment.alignmentScore >= 70 ? '[background:theme(colors.emerald.500)]' : alignment.alignmentScore >= 40 ? '[background:theme(colors.amber.500)]' : '[background:theme(colors.red.500)]'
                }`}
                data-pct={String(Math.round(alignment.alignmentScore / 10) * 10)}
              />
            </div>
            <span className="text-sm font-black text-slate-700 dark:text-slate-200 shrink-0 w-12 text-right font-mono">{alignment.alignmentScore}%</span>
            <span className="text-xs text-slate-400 shrink-0">{alignment.guidelinesFound} guideline{alignment.guidelinesFound !== 1 ? 's' : ''}</span>
          </div>
          {alignment.summary && (
            <p className="text-sm text-slate-600 dark:text-slate-400 italic">{alignment.summary}</p>
          )}
          {alignment.contradictions?.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">{alignment.contradictions.length} Contradiction{alignment.contradictions.length !== 1 ? 's' : ''}</p>
              {alignment.contradictions.map((c, i) => (
                <div key={i} className={`p-3 rounded-xl border text-xs ${
                  c.severity === 'major'
                    ? 'bg-red-500/[0.07] border-red-500/20 text-red-700 dark:text-red-400'
                    : c.severity === 'nuanced'
                      ? 'bg-blue-500/[0.07] border-blue-500/20 text-blue-700 dark:text-blue-400'
                      : 'bg-amber-500/[0.07] border-amber-500/20 text-amber-700 dark:text-amber-400'
                }`}>
                  <span className="font-bold">{c.guideline}</span> — {c.explanation}
                </div>
              ))}
            </div>
          )}

          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 px-3 py-2 text-[10px] text-slate-500 dark:text-slate-400">
            <i className="fas fa-info-circle mr-1 text-slate-400" />
            Always verify against your local hospital policy and national formulary before applying any recommendation.
          </div>
        </div>
      )}
    </div>
  </div>
);
