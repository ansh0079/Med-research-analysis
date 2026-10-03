import React from 'react';
import { api } from '@services/api';

export const McqsTopicsPage: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [topics, setTopics] = React.useState<Array<{
    topicKey: string;
    displayName: string;
    count: number;
    storedRowCount?: number;
    coverageNote?: string | null;
  }>>([]);
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.mcqs.listCuratedTopics()
      .then((r) => { if (!cancelled) setTopics(r.topics || []); })
      .catch(() => { if (!cancelled) setError('Failed to load topics'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = topics.filter((t) => t.count > 0);
    if (!q) return base;
    return base.filter(t =>
      t.displayName.toLowerCase().includes(q) || t.topicKey.toLowerCase().includes(q)
    );
  }, [topics, query]);

  return (
    <div className="min-h-screen aurora-bg">
      <div className="max-w-3xl mx-auto px-4 pt-8 pb-20">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Curated MCQs</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Hand-written, source-grounded MCQs linked to each topic. Choose a topic to start.
        </p>

        <div className="mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter topics…"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
          />
        </div>

        {loading && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 p-4 text-sm text-slate-500 dark:text-slate-400">
            <i className="fas fa-spinner fa-spin mr-2" /> Loading…
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 p-4 text-sm text-slate-500 dark:text-slate-400">
            No topics match your filter.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          {filtered.map((t) => (
            <a
              key={t.topicKey}
              href={`/mcqs/${encodeURIComponent(t.topicKey)}`}
              className="block rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 hover:shadow transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">
                    {t.displayName}
                  </p>
                  {t.coverageNote && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-2">{t.coverageNote}</p>
                  )}
                </div>
                <span className="shrink-0 inline-flex items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold px-2 py-1">
                  {t.count}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default McqsTopicsPage;

