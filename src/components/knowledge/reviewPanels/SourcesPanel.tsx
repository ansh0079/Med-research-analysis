import type { TopicKnowledge } from '@types';

export function SourcesPanel({ sourceArticles }: { sourceArticles: TopicKnowledge['sourceArticles'] }) {
  if (!sourceArticles?.length) {
    return <p className="text-sm text-slate-400 italic">No source articles recorded for this topic.</p>;
  }
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
        {sourceArticles.length} article{sourceArticles.length === 1 ? '' : 's'} used to build this knowledge
      </p>
      {sourceArticles.map((a, i) => (
        <div key={a.uid || i} className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
              [{a.sourceIndex}] {a.title || 'Untitled'}
            </p>
            {a.doi && (
              <a
                href={`https://doi.org/${a.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-[10px] text-indigo-500 hover:text-indigo-700 font-mono"
              >
                DOI ↗
              </a>
            )}
          </div>
          <div className="mt-1 flex gap-3 text-[10px] text-slate-400">
            {a.source && <span>{a.source}</span>}
            {a.pubdate && <span>{a.pubdate}</span>}
            {a.pmid && <span>PMID {a.pmid}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
