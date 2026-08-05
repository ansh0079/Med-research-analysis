import type { SeminalPaper } from './types';

export function SeminalPapersEditor({
  papers,
  onChange,
}: {
  papers: SeminalPaper[];
  onChange: (papers: SeminalPaper[]) => void;
}) {
  const update = (i: number, field: keyof SeminalPaper, val: string) =>
    onChange(papers.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)));
  const remove = (i: number) => onChange(papers.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([...papers, { sourceIndex: papers.length + 1, title: '', clinicalPrinciple: '', year: '', doi: '' }]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Seminal Papers</span>
        <button
          type="button"
          onClick={add}
          className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-wider"
        >
          + Add Paper
        </button>
      </div>
      <div className="space-y-3">
        {papers.length === 0 && <p className="text-xs text-slate-400 italic">No seminal papers stored yet.</p>}
        {papers.map((paper, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold text-slate-400">[{paper.sourceIndex}]</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-slate-300 hover:text-red-400 dark:text-slate-600 transition-colors"
                aria-label="Remove paper"
              >
                <i className="fas fa-times text-[10px]" />
              </button>
            </div>
            <input
              value={paper.title}
              onChange={(e) => update(i, 'title', e.target.value)}
              placeholder="Paper title"
              className="mb-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
            <textarea
              value={paper.clinicalPrinciple}
              onChange={(e) => update(i, 'clinicalPrinciple', e.target.value)}
              placeholder="Clinical principle or key finding..."
              rows={2}
              className="mb-1.5 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
            />
            <div className="flex gap-2">
              <input
                value={paper.year || ''}
                onChange={(e) => update(i, 'year', e.target.value)}
                placeholder="Year"
                className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
              <input
                value={paper.doi || ''}
                onChange={(e) => update(i, 'doi', e.target.value)}
                placeholder="DOI (optional)"
                className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
