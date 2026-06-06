import React from 'react';
import type { Article, ConflictItem, TrialGuidelineAlignmentSummary } from '@types';

const LEVEL_STYLES: Record<string, { border: string; badge: string; label: string }> = {
  major: {
    border: 'border-red-500/40 dark:border-red-500/30',
    badge: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
    label: 'Major',
  },
  minor: {
    border: 'border-amber-500/40 dark:border-amber-500/30',
    badge: 'bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/20',
    label: 'Minor',
  },
  nuanced: {
    border: 'border-blue-500/40 dark:border-blue-500/30',
    badge: 'bg-blue-500/10 text-blue-800 dark:text-blue-200 border-blue-500/20',
    label: 'Nuanced',
  },
};

interface ConflictMatrixPanelProps {
  conflictMatrix: ConflictItem[];
  guidelineAlignment?: TrialGuidelineAlignmentSummary | null;
  articles?: Article[];
  id?: string;
  className?: string;
}

export const ConflictMatrixPanel: React.FC<ConflictMatrixPanelProps> = ({
  conflictMatrix,
  guidelineAlignment,
  articles = [],
  id = 'synthesis-conflict-matrix',
  className = '',
}) => {
  if (!conflictMatrix.length) return null;

  return (
    <div id={id} className={`rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden ${className}`}>
      <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-2 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Trial vs guideline matrix</p>
          {guidelineAlignment?.summary && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{guidelineAlignment.summary}</p>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
          <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-300">
            {conflictMatrix.filter((c) => c.level === 'major').length} major
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-200">
            {conflictMatrix.filter((c) => c.level === 'minor').length} minor
          </span>
          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-200">
            {conflictMatrix.filter((c) => c.level === 'nuanced').length} nuanced
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {conflictMatrix.map((item, index) => {
          const style = LEVEL_STYLES[item.level] || LEVEL_STYLES.nuanced;
          const trialTitle = articles[item.trialIndex - 1]?.title;
          return (
            <div
              key={`${item.trialIndex}-${item.guidelineIndex}-${index}`}
              className={`rounded-xl border-2 p-4 ${style.border} bg-white/60 dark:bg-slate-900/40`}
            >
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${style.badge}`}>
                  {style.label}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Trial [{item.trialIndex}]{trialTitle ? ` · ${trialTitle.slice(0, 48)}${trialTitle.length > 48 ? '…' : ''}` : ''}
                </span>
                <span className="text-[10px] font-mono text-slate-500">Guideline [G{item.guidelineIndex}]</span>
              </div>

              <div className="grid gap-3 md:grid-cols-2 text-xs">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-1">Trial suggests</p>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{item.trialClaim}</p>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Guideline states</p>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{item.guidelineClaim}</p>
                </div>
              </div>

              <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <p><span className="font-semibold text-slate-700 dark:text-slate-300">Population gap:</span> {item.populationGap}</p>
                <p><span className="font-semibold text-slate-700 dark:text-slate-300">Clinical nuance:</span> {item.clinicalNuance}</p>
                <p className="italic text-slate-700 dark:text-slate-300">{item.recommendation}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
