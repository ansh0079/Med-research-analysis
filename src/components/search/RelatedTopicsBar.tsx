import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@services/api';

interface RelatedTopicsBarProps {
  topic: string;
  evidenceRelatedTopics?: string[];
  onOpenTopic: (topic: string) => void;
}

export const RelatedTopicsBar: React.FC<RelatedTopicsBarProps> = ({
  topic,
  evidenceRelatedTopics = [],
  onOpenTopic,
}) => {
  const [crosslinkTopics, setCrosslinkTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = topic.trim();
    if (!trimmed) {
      setCrosslinkTopics([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void api.getTopicCrosslinks(trimmed)
      .then((r) => {
        if (cancelled) return;
        setCrosslinkTopics((r.crosslinks || []).map((c) => c.topic).filter(Boolean));
      })
      .catch(() => {
        if (!cancelled) setCrosslinkTopics([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [topic]);

  const topics = useMemo(() => {
    const seen = new Set<string>();
    const merged: string[] = [];
    const add = (value: string) => {
      const t = value.trim();
      const key = t.toLowerCase();
      if (!t || key === topic.trim().toLowerCase() || seen.has(key)) return;
      seen.add(key);
      merged.push(t);
    };
    for (const t of evidenceRelatedTopics) add(t);
    for (const t of crosslinkTopics) add(t);
    return merged.slice(0, 6);
  }, [crosslinkTopics, evidenceRelatedTopics, topic]);

  if (!loading && topics.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 dark:border-indigo-900/40 dark:bg-indigo-950/20">
      <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">
        Related topics
      </p>
      {loading && topics.length === 0 ? (
        <div className="mt-2 flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-24 animate-pulse rounded-full bg-indigo-100 dark:bg-indigo-900/40" />
          ))}
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {topics.map((related) => (
            <button
              key={related}
              type="button"
              onClick={() => onOpenTopic(related)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200 dark:hover:bg-indigo-900/50"
            >
              <i className="fas fa-compass text-[10px] opacity-70" aria-hidden />
              {related}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
