import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@services/api';

interface CrosslinkEntry {
  topic: string;
  normalizedTopic: string;
  linkType: 'shared_paper' | 'ai_inferred';
  sharedEvidence: { pmid?: string; title?: string } | null;
  strength: number;
  aiRationale: string | null;
  createdAt: string;
}

interface TopicCrosslinksProps {
  topic: string;
}

function CrosslinkSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-7 w-28 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse"
          style={{ width: `${60 + i * 20}px` }}
        />
      ))}
    </div>
  );
}

export function TopicCrosslinks({ topic }: TopicCrosslinksProps) {
  const navigate = useNavigate();
  const [crosslinks, setCrosslinks] = useState<CrosslinkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [tooltipTopic, setTooltipTopic] = useState<string | null>(null);

  useEffect(() => {
    if (!topic) { setLoading(false); return; }
    setLoading(true);
    api.getTopicCrosslinks(topic)
      .then((r) => setCrosslinks(r.crosslinks || []))
      .catch(() => setCrosslinks([]))
      .finally(() => setLoading(false));
  }, [topic]);

  if (!loading && crosslinks.length === 0) return null;

  return (
    <div className="neo-card p-4 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
        <i className="fas fa-link text-indigo-400" /> Related topics
      </p>

      {loading ? (
        <CrosslinkSkeleton />
      ) : (
        <div className="flex flex-wrap gap-2">
          {crosslinks.slice(0, 5).map((link) => (
            <div key={link.topic} className="relative">
              <button
                type="button"
                onClick={() => navigate(`/topic/${encodeURIComponent(link.topic)}`)}
                onMouseEnter={() => {
                  if (link.aiRationale || link.sharedEvidence?.title) {
                    setTooltipTopic(link.topic);
                    setTooltip(
                      link.aiRationale ||
                      (link.sharedEvidence?.title
                        ? `Shared paper: ${link.sharedEvidence.title}`
                        : null)
                    );
                  }
                }}
                onMouseLeave={() => { setTooltip(null); setTooltipTopic(null); }}
                onFocus={() => {
                  if (link.aiRationale || link.sharedEvidence?.title) {
                    setTooltipTopic(link.topic);
                    setTooltip(
                      link.aiRationale ||
                      (link.sharedEvidence?.title
                        ? `Shared paper: ${link.sharedEvidence.title}`
                        : null)
                    );
                  }
                }}
                onBlur={() => { setTooltip(null); setTooltipTopic(null); }}
                className={[
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
                  'transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400',
                  link.linkType === 'shared_paper'
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700/60 dark:text-slate-200 dark:hover:bg-slate-700'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50',
                ].join(' ')}
              >
                <i className="fas fa-link text-[10px] opacity-60" aria-hidden="true" />
                {link.topic}
              </button>

              {tooltip && tooltipTopic === link.topic && (
                <div
                  role="tooltip"
                  className={[
                    'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50',
                    'w-56 rounded-xl border border-slate-200 dark:border-slate-700',
                    'bg-white dark:bg-slate-800 shadow-lg px-3 py-2',
                    'text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed',
                    'pointer-events-none',
                  ].join(' ')}
                >
                  {tooltip}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
