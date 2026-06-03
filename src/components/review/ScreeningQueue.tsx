import React from 'react';
import { Button } from '@components/ui/Button';
import type { ReviewArticle } from '@types';

interface Props {
  rows: ReviewArticle[];
  activeUsers?: string[];
  onDecision: (
    articleId: string,
    decision: 'included' | 'excluded' | 'maybe',
    payload?: { exclusionReason?: string; notes?: string }
  ) => Promise<void>;
}

export const ScreeningQueue: React.FC<Props> = ({ rows, activeUsers = [], onDecision }) => {
  const [drafts, setDrafts] = React.useState<Record<string, { exclusionReason: string; notes: string }>>({});

  const updateDraft = (articleId: string, field: 'exclusionReason' | 'notes', value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [articleId]: {
        exclusionReason: prev[articleId]?.exclusionReason ?? '',
        notes: prev[articleId]?.notes ?? '',
        [field]: value,
      },
    }));
  };

  const decide = (articleId: string, decision: 'included' | 'excluded' | 'maybe') => {
    const draft = drafts[articleId];
    return onDecision(articleId, decision, {
      exclusionReason: draft?.exclusionReason?.trim() || undefined,
      notes: draft?.notes?.trim() || undefined,
    });
  };

  return (
    <div className="neo-card rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-lg font-black text-gray-900 dark:text-white">Screening Queue</h3>
        {activeUsers.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            {activeUsers.length} reviewer{activeUsers.length === 1 ? '' : 's'} online
          </div>
        )}
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.article_id} className="rounded-xl border border-gray-100 dark:border-slate-700 p-3">
            <p className="font-semibold text-gray-900 dark:text-white">{row.article_data?.title || row.article_id}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Status: <span className="font-semibold">{row.screening_status}</span></span>
              {row.article_data?._quality?.grade && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                  Quality {row.article_data._quality.grade}
                </span>
              )}
              {row.article_data?._retraction?.isRetracted && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">
                  Retracted
                </span>
              )}
            </div>
            {row.article_data?.abstract && (
              <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                {row.article_data.abstract}
              </p>
            )}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input
                value={drafts[row.article_id]?.exclusionReason ?? row.exclusion_reason ?? ''}
                onChange={(event) => updateDraft(row.article_id, 'exclusionReason', event.target.value)}
                placeholder="Exclusion reason, if excluded"
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <input
                value={drafts[row.article_id]?.notes ?? row.notes ?? ''}
                onChange={(event) => updateDraft(row.article_id, 'notes', event.target.value)}
                placeholder="Reviewer notes / uncertainty"
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" variant="secondary" onClick={() => decide(row.article_id, 'included')}>
                Include
              </Button>
              <Button size="sm" variant="ghost" onClick={() => decide(row.article_id, 'excluded')}>
                Exclude
              </Button>
              <Button size="sm" variant="ghost" onClick={() => decide(row.article_id, 'maybe')}>
                Maybe
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
