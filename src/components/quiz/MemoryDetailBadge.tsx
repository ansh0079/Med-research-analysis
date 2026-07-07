import React, { useState } from 'react';
import type { UserTopicMemory } from '@types';

export const MemoryDetailBadge: React.FC<{ memory: UserTopicMemory }> = ({ memory }) => {
  const [open, setOpen] = useState(false);
  const tierLabel = memory.memoryTier === 'strong' ? 'strong' : memory.memoryTier === 'building' ? 'building' : 'sparse';
  const tierCls =
    memory.memoryTier === 'strong'
      ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/25'
      : memory.memoryTier === 'building'
        ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/25'
        : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80';

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${tierCls}`}
        title="Click for topic memory details"
      >
        Topic memory: {tierLabel} <i className={`fas fa-chevron-${open ? 'up' : 'down'} text-[8px] ml-0.5`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1.5 left-0 w-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Memory breakdown</p>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Searches</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{memory.searchCount}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Tracked papers</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{memory.topPaperCount}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Saved papers</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{memory.savedPaperCount}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Weak nodes</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{memory.weakOutlineNodeIds.length}</span>
          </div>
          <div className="flex justify-between text-xs border-t border-slate-100 dark:border-slate-700 pt-1.5">
            <span className="text-slate-500 dark:text-slate-400">Memory score</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.round(memory.memoryScore * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
};
