export function StringListEditor({
  label,
  items,
  placeholder,
  onChange,
}: {
  label: string;
  items: string[];
  placeholder: string;
  onChange: (items: string[]) => void;
}) {
  const update = (i: number, val: string) => onChange(items.map((item, idx) => (idx === i ? val : item)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, '']);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</span>
        <button
          type="button"
          onClick={add}
          className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-wider"
        >
          + Add
        </button>
      </div>
      <div className="space-y-1.5">
        {items.length === 0 && (
          <p className="text-xs text-slate-400 italic">None yet — click + Add</p>
        )}
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="mt-2 text-[10px] font-mono text-slate-300 dark:text-slate-600 w-4 shrink-0">{i + 1}</span>
            <input
              value={item}
              onChange={(e) => update(i, e.target.value)}
              placeholder={placeholder}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="mt-1.5 text-slate-300 hover:text-red-400 dark:text-slate-600 transition-colors"
              aria-label="Remove"
            >
              <i className="fas fa-times text-[10px]" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
