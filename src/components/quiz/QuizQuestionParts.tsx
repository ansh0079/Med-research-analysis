import React, { useState } from 'react';
import type { QuestionType, QuizQuestion, UserTopicMemory } from '@types';

export const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  hard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const QTYPE_CONFIG: Record<QuestionType, { label: string; icon: string; cls: string }> = {
  recall:               { label: 'Recall',               icon: 'fa-brain',          cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  clinical_application: { label: 'Clinical Application', icon: 'fa-stethoscope',    cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  trial_interpretation: { label: 'Trial Interpretation', icon: 'fa-flask',          cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  guideline:            { label: 'Guideline',            icon: 'fa-book-medical',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  pitfall:              { label: 'Pitfall / Misconception', icon: 'fa-exclamation-triangle', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

export function parseSourceLabel(text: string): { text: string; label: string | null } {
  const match = text.match(/\s*\[(Trial|Guideline|Topic memory)\]$/i);
  if (match) {
    return { text: text.slice(0, match.index).trim(), label: match[1] };
  }
  return { text, label: null };
}

export function MemoryDetailBadge({ memory }: { memory: UserTopicMemory }) {
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
}

export function SourceBadge({ label }: { label: string }) {
  const config: Record<string, { cls: string; icon: string }> = {
    Trial: { cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300', icon: 'fa-flask' },
    Guideline: { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: 'fa-book-medical' },
    'Topic memory': { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: 'fa-memory' },
  };
  const c = config[label] || { cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', icon: 'fa-question-circle' };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${c.cls}`}>
      <i className={`fas ${c.icon} text-[9px]`} />
      {label}
    </span>
  );
}

export function QuestionTypeBadge({ type }: { type?: QuestionType }) {
  if (!type) return null;
  const cfg = QTYPE_CONFIG[type];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg ${cfg.cls}`}>
      <i className={`fas ${cfg.icon} text-[9px]`} />
      {cfg.label}
    </span>
  );
}

export function VisualExplanation({ visual }: { visual: QuizQuestion['visualExplanation'] }) {
  if (!visual) return null;
  const title = visual.title || (visual.kind === 'comparison_table' ? 'Comparison' : 'Reasoning pathway');
  if (visual.kind === 'comparison_table' && visual.columns?.length && visual.rows?.length) {
    return (
      <div className="mt-3 rounded-xl bg-white/75 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-600 overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
          <i className="fas fa-table text-indigo-500 text-[10px]" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{title}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/70">
              <tr>
                {visual.columns.map((col) => (
                  <th key={col} className="px-3 py-2 text-left font-bold text-slate-600 dark:text-slate-300">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visual.rows.map((row, rowIndex) => (
                <tr key={`${rowIndex}-${row.join('|')}`} className="border-t border-slate-100 dark:border-slate-700">
                  {visual.columns?.map((_, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2 text-slate-600 dark:text-slate-400 align-top">{row[cellIndex] || ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  if (!visual.steps?.length) return null;
  return (
    <div className="mt-3 rounded-xl bg-white/75 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-600 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1.5">
        <i className={`fas ${visual.kind === 'mechanism' ? 'fa-gears' : 'fa-diagram-project'} text-[10px]`} />
        {title}
      </p>
      <ol className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
        {visual.steps.map((step, index) => (
          <li key={`${index}-${step}`} className="flex gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[9px] font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function OptionButton({
  opt, letter: _letter, isAnswered, isCorrectLetter, isSelected, onClick,
}: {
  opt: string; letter: string; isAnswered: boolean;
  isCorrectLetter: boolean; isSelected: boolean; onClick: () => void;
}) {
  let cls = 'w-full text-left px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all duration-150 ';
  if (!isAnswered) {
    cls += 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20';
  } else if (isCorrectLetter) {
    cls += 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300';
  } else if (isSelected) {
    cls += 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300';
  } else {
    cls += 'border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500';
  }
  return (
    <button className={cls} disabled={isAnswered} onClick={onClick} type="button">
      <span className="flex items-center gap-3">
        {isAnswered && isCorrectLetter && <i className="fas fa-check-circle text-emerald-500 shrink-0" />}
        {isAnswered && isSelected && !isCorrectLetter && <i className="fas fa-times-circle text-red-500 shrink-0" />}
        {isAnswered && !isCorrectLetter && !isSelected && <i className="fas fa-circle text-slate-200 dark:text-slate-700 shrink-0 text-[10px]" />}
        {opt}
      </span>
    </button>
  );
}
