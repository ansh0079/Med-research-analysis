import React from 'react';
import type { Article, CaseLearningMode } from '@types';
import { MODES } from '@components/case/CaseModeUtils';

export function CaseModeSetupPanel({
  mode,
  prefillTopic,
  seedArticles,
  workflowContext,
  onModeChange,
  onBack,
}: {
  mode: CaseLearningMode;
  prefillTopic: string | null;
  seedArticles: Partial<Article>[] | null;
  workflowContext: Record<string, unknown>;
  onModeChange: (mode: CaseLearningMode) => void;
  onBack: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Clinical Case Scenario</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Evidence-backed case-based learning - research assistant only</p>
        </div>
        <button type="button" onClick={onBack}
          className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors flex items-center gap-1.5">
          <i className="fas fa-arrow-left" /> Back
        </button>
      </div>

      {prefillTopic && (
        <div className="flex items-start gap-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 px-4 py-3 text-sm">
          <i className="fas fa-search text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold text-indigo-700 dark:text-indigo-300">Pre-populated from your search: </span>
            <span className="text-indigo-600 dark:text-indigo-400">{prefillTopic}</span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Add patient-specific details below, then run analysis.</p>
            {seedArticles && seedArticles.length > 0 && (
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-2 font-medium">
                <i className="fas fa-layer-group mr-1" />
                Evidence retrieval prioritises your top {seedArticles.length} papers from this topic, then fills with live literature search.
              </p>
            )}
          </div>
        </div>
      )}

      {typeof workflowContext.originalPresentation === 'string' && workflowContext.originalPresentation.trim() && (
        <div className="rounded-xl border border-cyan-200 bg-cyan-50/80 px-4 py-3 text-sm dark:border-cyan-900/60 dark:bg-cyan-950/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">Shift review context</p>
          <p className="mt-1 text-xs leading-relaxed text-cyan-950/80 dark:text-cyan-100/80 line-clamp-3">
            {workflowContext.originalPresentation}
          </p>
        </div>
      )}

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Learner Level</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MODES.map((item) => (
            <button key={item.id} type="button" onClick={() => onModeChange(item.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                mode === item.id
                  ? item.activeColor + ' shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600'
              }`}>
              <i className={`fas ${item.icon} text-base`} />
              <span className="text-[11px] font-bold leading-tight">{item.label}</span>
              <span className="text-[9px] opacity-70 leading-tight hidden sm:block">{item.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
