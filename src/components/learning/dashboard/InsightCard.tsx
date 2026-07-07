import React from 'react';
import type { LearningInsight } from '@types';
import { INSIGHT_COLORS } from '../../../utils/learningDashboardConstants';

export function InsightCard({ insight, onAction }: { insight: LearningInsight; onAction: (insight: LearningInsight) => void }) {
  const c = INSIGHT_COLORS[insight.color] ?? INSIGHT_COLORS.indigo;
  return (
    <div className={`rounded-xl border ${c.bg} ${c.border} px-4 py-3 flex items-start gap-3`}>
      <i className={`fas ${insight.icon} ${c.icon} mt-0.5 text-sm shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{insight.message}</p>
        {insight.detail && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{insight.detail}</p>}
      </div>
      {insight.action && (
        <button
          type="button"
          onClick={() => onAction(insight)}
          className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg ${c.badge} hover:opacity-80 transition-opacity`}
        >
          {insight.action}
        </button>
      )}
    </div>
  );
}
