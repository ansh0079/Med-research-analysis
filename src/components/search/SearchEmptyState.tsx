import React from 'react';

interface Props {
  onExampleClick?: (query: string) => void;
}

const EXAMPLE_QUERIES = [
  {
    icon: 'fa-heart',
    color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/30',
    label: 'Cardiology',
    query: 'SGLT2 inhibitors heart failure reduced ejection fraction outcomes',
  },
  {
    icon: 'fa-brain',
    color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/30',
    label: 'Neurology',
    query: 'thrombectomy ischaemic stroke extended time window outcomes',
  },
  {
    icon: 'fa-lungs',
    color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/30',
    label: 'Critical Care',
    query: 'prone positioning ARDS mechanical ventilation mortality',
  },
  {
    icon: 'fa-pills',
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30',
    label: 'Endocrinology',
    query: 'GLP-1 receptor agonists type 2 diabetes weight loss cardiovascular',
  },
];

export const SearchEmptyState: React.FC<Props> = ({ onExampleClick }) => {
  return (
    <div className="text-center py-20 px-4">
      <div className="inline-flex flex-col items-center gap-6 max-w-xl mx-auto w-full">
        {/* Animated concentric rings */}
        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-indigo-200/30 dark:border-indigo-800/30 ring-pulse-slow" />
          <div className="absolute inset-2 rounded-full border border-indigo-300/20 dark:border-indigo-700/20 ring-pulse-mid" />
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/15 dark:to-violet-500/15 border border-indigo-200/40 dark:border-indigo-700/40 flex items-center justify-center">
            <i className="fas fa-dna text-xl text-indigo-400 dark:text-indigo-500" />
          </div>
        </div>

        <div>
          <p className="text-base font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase font-mono mb-1.5">
            Ready for Query
          </p>
          <p className="text-sm text-slate-300 dark:text-slate-600 max-w-xs mx-auto">
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

        {/* Example queries */}
        {onExampleClick && (
          <div className="w-full mt-2">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-wider mb-3">
              Try an example
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EXAMPLE_QUERIES.map((ex) => (
                <button
                  key={ex.query}
                  type="button"
                  onClick={() => onExampleClick(ex.query)}
                  className="group flex items-start gap-3 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/30 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all text-left"
                >
                  <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs ${ex.color}`}>
                    <i className={`fas ${ex.icon}`} />
                  </span>
                  <span className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {ex.label}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-300 leading-snug line-clamp-2 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                      {ex.query}
                    </span>
                  </span>
                  <i className="fas fa-arrow-right text-[10px] text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 shrink-0 mt-1 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
