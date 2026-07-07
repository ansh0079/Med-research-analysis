import React from 'react';
import type { QuizQuestion } from '@types';

export const VisualExplanation: React.FC<{ visual: QuizQuestion['visualExplanation'] }> = ({ visual }) => {
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
};
