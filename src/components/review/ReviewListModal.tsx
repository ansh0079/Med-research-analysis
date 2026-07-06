import React, { useEffect, useState } from 'react';
import { api } from '@services/api';
import type { ReviewProject } from '@types';

interface Props {
  onSelect: (review: ReviewProject) => void;
  onClose: () => void;
}

function ago(iso?: string) {
  if (!iso) return '';
  const d = Date.now() - new Date(iso).getTime();
  const days = Math.floor(d / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export const ReviewListModal: React.FC<Props> = ({ onSelect, onClose }) => {
  const [reviews, setReviews] = useState<ReviewProject[]>([]);
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading');

  useEffect(() => {
    api.review.listReviews({ limit: 30 })
      .then((data) => { setReviews(data.reviews); setState('done'); })
      .catch(() => setState('error'));
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="relative w-full max-w-xl mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-black text-gray-900 dark:text-white">Your Reviews</h2>
            <p className="text-xs text-gray-400 mt-0.5">Select a review to resume, or close to start a new one</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors p-1">
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[65vh] overflow-y-auto custom-scrollbar divide-y divide-gray-50 dark:divide-slate-800">
          {state === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <div className="w-6 h-6 border-[3px] border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-sm">Loading your reviews…</p>
            </div>
          )}
          {state === 'error' && (
            <div className="py-12 text-center">
              <p className="text-red-500 text-sm">Could not load reviews. Are you signed in?</p>
            </div>
          )}
          {state === 'done' && reviews.length === 0 && (
            <div className="py-16 text-center">
              <i className="fas fa-folder-open text-3xl text-slate-200 dark:text-slate-700 mb-3 block" />
              <p className="text-sm text-slate-400">No saved reviews yet. Start a new one above.</p>
            </div>
          )}
          {state === 'done' && reviews.map((r) => {
            const total = r.total_articles ?? 0;
            const included = r.included_count ?? 0;
            const pct = total > 0 ? Math.round((included / total) * 100) : 0;
            return (
              <button key={r.id} type="button" onClick={() => onSelect(r)}
                className="w-full text-left px-5 py-4 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20 transition-colors group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {r.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{r.question}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] font-semibold text-slate-400">{ago(r.updated_at || r.created_at)}</span>
                      {total > 0 && (
                        <>
                          <span className="text-[10px] text-slate-400">{total} article{total !== 1 ? 's' : ''}</span>
                          <span className={`text-[10px] font-semibold ${included > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                            {included} included ({pct}%)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <i className="fas fa-chevron-right text-xs text-slate-300 group-hover:text-indigo-400 mt-1 shrink-0 transition-colors" />
                </div>
                {/* Mini progress bar */}
                {total > 0 && (
                  <div className="mt-2 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
