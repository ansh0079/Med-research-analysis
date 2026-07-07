import React from 'react';

interface SynthesisAnswerGroundingProps {
  citedCount: number;
  sourceCoverage: number;
}

export const SynthesisAnswerGrounding: React.FC<SynthesisAnswerGroundingProps> = ({
  citedCount,
  sourceCoverage,
}) => (
  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Answer Grounding</p>
        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
          {citedCount} cited source{citedCount !== 1 ? 's' : ''} across key findings, statistics, and conflicts.
        </p>
      </div>
      <div className="w-full sm:w-40">
        <div className="mb-1 flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span>Coverage</span>
          <span>{sourceCoverage}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white dark:bg-slate-800">
          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, sourceCoverage)}%` }} />
        </div>
      </div>
    </div>
    <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
      Treat uncited statements as lower confidence. Follow numbered chips to inspect the underlying papers.
    </p>
  </div>
);
