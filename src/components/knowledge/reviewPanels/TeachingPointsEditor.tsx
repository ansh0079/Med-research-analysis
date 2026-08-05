import type { TeachingPointDraft } from './types';

export function TeachingPointsEditor({
  points,
  onChange,
}: {
  points: TeachingPointDraft[];
  onChange: (points: TeachingPointDraft[]) => void;
}) {
  const update = (i: number, patch: Partial<TeachingPointDraft>) =>
    onChange(points.map((point, idx) => (idx === i ? { ...point, ...patch } : point)));
  const remove = (i: number) => onChange(points.filter((_, idx) => idx !== i));
  const add = () => onChange([...points, { claim: '', sourceIndices: [], confidence: 'LOW' }]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Core Teaching Points</span>
        <button
          type="button"
          onClick={add}
          className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-wider"
        >
          + Add
        </button>
      </div>
      <div className="space-y-2">
        {points.length === 0 && <p className="text-xs text-slate-400 italic">No teaching points stored yet.</p>}
        {points.map((point, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">{i + 1}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-slate-300 hover:text-red-400 dark:text-slate-600 transition-colors"
                aria-label="Remove teaching point"
              >
                <i className="fas fa-times text-[10px]" />
              </button>
            </div>
            <textarea
              value={point.claim}
              onChange={(e) => update(i, { claim: e.target.value })}
              placeholder="Evidence-grounded teaching point..."
              rows={2}
              className="mb-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
            />
            <div className="grid gap-2 sm:grid-cols-[1fr_10rem]">
              <input
                value={point.sourceIndices.join(', ')}
                onChange={(e) => update(i, {
                  sourceIndices: e.target.value
                    .split(',')
                    .map((part) => Number(part.trim()))
                    .filter((n) => Number.isInteger(n) && n > 0),
                })}
                placeholder="Source indices, e.g. 1, 3"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
              <select
                value={point.confidence}
                onChange={(e) => update(i, { confidence: e.target.value as TeachingPointDraft['confidence'] })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              >
                <option value="HIGH">HIGH</option>
                <option value="MODERATE">MODERATE</option>
                <option value="LOW">LOW</option>
                <option value="VERY_LOW">VERY_LOW</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
