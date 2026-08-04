import React from 'react';
import type { CaseRecommendation } from '@types';

export function RecommendationCard({ rec, onSelect }: { rec: CaseRecommendation; onSelect: (topic: string) => void }) {
  const weakAreas = [];
  if (rec.recallScore < 60) weakAreas.push('Recall');
  if (rec.clinicalApplicationScore < 60) weakAreas.push('Clinical');
  if (rec.guidelineScore < 60) weakAreas.push('Guidelines');
  if (rec.pitfallScore < 60) weakAreas.push('Pitfalls');
  const scoreColor = rec.overallScore < 40 ? 'text-red-500' : rec.overallScore < 60 ? 'text-amber-500' : 'text-emerald-500';

  return (
    <button
      type="button"
      onClick={() => onSelect(rec.topic)}
      className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
            {rec.displayName || rec.topic}
          </p>
          {rec.specialty && (
            <p className="text-[10px] text-slate-400 mt-0.5">{rec.specialty}</p>
          )}
        </div>
        <span className={`text-lg font-bold ${scoreColor}`}>{Math.round(rec.overallScore)}%</span>
      </div>
      {weakAreas.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {weakAreas.map(area => (
            <span key={area} className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300 font-medium">
              {area}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
