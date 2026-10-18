import React from 'react';
import type { Article } from '@types';
import { getEvidenceTypeDisplay } from '@utils/evidenceTypeDisplay';

export function selectLearningRecommendations(articles: Article[], limit = 3): Article[] {
  const candidates = articles
    .filter((article) => article._rankMovedByLearning && Number(article._learningBoost || 0) > 0)
    .filter((article) => !article._retraction?.isRetracted && !article._isPreprint)
    .sort((left, right) => Number(left._learningRank || 999) - Number(right._learningRank || 999));
  return candidates.slice(0, Math.max(0, limit));
}

export function LearningRecommendationsRail({
  articles,
  onOpen,
}: {
  articles: Article[];
  onOpen: (article: Article) => void;
}) {
  if (!articles.length) return null;
  return (
    <section aria-labelledby="learning-recommendations-heading" className="mb-6 rounded-2xl border border-violet-200 bg-violet-50/70 p-4 dark:border-violet-900/70 dark:bg-violet-950/20">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 id="learning-recommendations-heading" className="text-sm font-black text-slate-900 dark:text-white">
            For your learning
          </h2>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
            Selected from this evidence set for your learning gaps. The main results remain in clinical evidence order.
          </p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {articles.map((article) => {
          const evidenceType = getEvidenceTypeDisplay(article);
          return (
            <button
              key={article.uid}
              type="button"
              onClick={() => onOpen(article)}
              className="rounded-xl border border-violet-100 bg-white p-3 text-left shadow-sm transition hover:border-violet-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-violet-900 dark:bg-slate-900"
            >
              <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                <span>{evidenceType.short}</span>
                {article.year || article.pubdate ? <span className="text-slate-400">{article.year || String(article.pubdate).slice(0, 4)}</span> : null}
              </div>
              <div className="line-clamp-3 text-sm font-bold leading-snug text-slate-900 dark:text-white">{article.title}</div>
              <div className="mt-2 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                {article._learnerAdaptationReason || 'Recommended from your recent learning activity'}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
