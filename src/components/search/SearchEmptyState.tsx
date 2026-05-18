import React from 'react';

export const SearchEmptyState: React.FC = () => {
  return (
    <div className="text-center py-32">
      <div className="inline-flex flex-col items-center gap-6">
        {/* Animated concentric rings */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-indigo-200/30 dark:border-indigo-800/30 ring-pulse-slow" />
          <div className="absolute inset-2 rounded-full border border-indigo-300/20 dark:border-indigo-700/20 ring-pulse-mid" />
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/15 dark:to-violet-500/15 border border-indigo-200/40 dark:border-indigo-700/40 flex items-center justify-center">
            <i className="fas fa-dna text-2xl text-indigo-400 dark:text-indigo-500" />
          </div>
        </div>
        <div>
          <p className="text-base font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase font-mono mb-2">
            Ready for Query
          </p>
          <p className="text-sm text-slate-300 dark:text-slate-600 max-w-xs">
            Search PubMed, Semantic Scholar & OpenAlex simultaneously
          </p>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono text-slate-300 dark:text-slate-700 uppercase tracking-wider">
          <span>Multi-source</span>
          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
          <span>GRADE synthesis</span>
          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
          <span>Impact ranking</span>
        </div>
      </div>
    </div>
  );
};
