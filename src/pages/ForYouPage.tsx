import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@services/api';
import type { LearningRecommendation } from '@types';

const QUIZ_PREFILL_KEY = 'med_quiz_prefill';
const CASE_PREFILL_KEY = 'med_case_prefill';

const REC_TYPE_STYLES: Record<string, { bg: string; border: string; badge: string }> = {
  review:     { bg: 'bg-rose-50/60 dark:bg-rose-950/20', border: 'border-rose-200 dark:border-rose-800/40', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
  strengthen: { bg: 'bg-amber-50/60 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-800/40', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  explore:    { bg: 'bg-blue-50/60 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-800/40', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  calibrate:  { bg: 'bg-orange-50/60 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-800/40', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  discover:   { bg: 'bg-violet-50/60 dark:bg-violet-950/20', border: 'border-violet-200 dark:border-violet-800/40', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  refresh:    { bg: 'bg-slate-50/60 dark:bg-slate-800/30', border: 'border-slate-200 dark:border-slate-700', badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  case:       { bg: 'bg-emerald-50/60 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-800/40', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  start:      { bg: 'bg-indigo-50/60 dark:bg-indigo-950/20', border: 'border-indigo-200 dark:border-indigo-800/40', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
};

const REC_TYPE_LABELS: Record<string, string> = {
  review: 'Due for review',
  strengthen: 'Weak area',
  explore: 'Searched — not tested',
  calibrate: 'Calibration gap',
  discover: 'Related topic',
  refresh: 'Getting stale',
  case: 'Try a case',
  start: 'Get started',
};

const REC_TYPE_DESCRIPTIONS: Record<string, string> = {
  review: 'Spaced repetition cards that are due. Review now to prevent knowledge decay.',
  strengthen: 'Topics where your score is below 60%. Targeted practice will help.',
  explore: 'Topics you searched recently but haven\'t tested your knowledge on yet.',
  calibrate: 'Questions where you were confident but wrong. Re-test to calibrate.',
  discover: 'Related topics adjacent to areas you\'re strong in.',
  refresh: 'Topics you haven\'t revisited in 14+ days.',
  case: 'Clinical cases to apply your knowledge in practice.',
  start: 'Popular topics to begin exploring.',
};

function groupByType(recs: LearningRecommendation[]): Map<string, LearningRecommendation[]> {
  const groups = new Map<string, LearningRecommendation[]>();
  for (const rec of recs) {
    const existing = groups.get(rec.type) || [];
    existing.push(rec);
    groups.set(rec.type, existing);
  }
  return groups;
}

// Priority order for displaying groups
const TYPE_PRIORITY = ['review', 'calibrate', 'strengthen', 'explore', 'discover', 'refresh', 'case', 'start'];

export const ForYouPage: React.FC = () => {
  const navigate = useNavigate();
  const [recs, setRecs] = useState<LearningRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getLearningRecommendations(20)
      .then((r) => setRecs(r.recommendations))
      .catch((err) => setError(err.message || 'Failed to load recommendations'))
      .finally(() => setLoading(false));
  }, []);

  const handleClick = useCallback((rec: LearningRecommendation) => {
    if (rec.action === 'quiz') {
      sessionStorage.setItem(QUIZ_PREFILL_KEY, JSON.stringify({ topic: rec.topic }));
      navigate('/quiz');
    } else if (rec.action === 'case') {
      sessionStorage.setItem(CASE_PREFILL_KEY, JSON.stringify({ topic: rec.topic }));
      navigate('/case');
    } else {
      navigate(`/topic/${encodeURIComponent(rec.topic)}`);
    }
  }, [navigate]);

  const grouped = groupByType(recs);
  const sortedTypes = TYPE_PRIORITY.filter((t) => grouped.has(t));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Building your personalised recommendations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <i className="fas fa-exclamation-triangle text-3xl text-amber-500 mb-4" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Could not load recommendations</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => { setError(null); setLoading(true); api.getLearningRecommendations(20).then((r) => setRecs(r.recommendations)).catch((e) => setError(e.message)).finally(() => setLoading(false)); }}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (recs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <i className="fas fa-compass text-4xl text-indigo-400 mb-4 opacity-60" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">No recommendations yet</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Search for medical topics, take quizzes, and explore clinical evidence to get personalised learning recommendations.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate('/search')}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors"
            >
              <i className="fas fa-search mr-1.5" /> Search topics
            </button>
            <button
              type="button"
              onClick={() => navigate('/learning')}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <i className="fas fa-graduation-cap mr-1.5" /> Learning dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <i className="fas fa-magic text-xl text-indigo-500" />
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">For you</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Personalised recommendations based on your search history, quiz performance, and spaced repetition schedule.
        </p>
      </div>

      {/* Quick stats bar */}
      <div className="flex flex-wrap gap-2 mb-8">
        {sortedTypes.map((type) => {
          const count = grouped.get(type)?.length ?? 0;
          const style = REC_TYPE_STYLES[type] || REC_TYPE_STYLES.start;
          return (
            <a
              key={type}
              href={`#rec-${type}`}
              className={`text-xs font-bold px-3 py-1.5 rounded-full ${style.badge} hover:opacity-80 transition-opacity`}
            >
              {REC_TYPE_LABELS[type] || type} ({count})
            </a>
          );
        })}
      </div>

      {/* Grouped recommendation sections */}
      <div className="space-y-8">
        {sortedTypes.map((type) => {
          const items = grouped.get(type) || [];
          const style = REC_TYPE_STYLES[type] || REC_TYPE_STYLES.start;
          return (
            <section key={type} id={`rec-${type}`}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
                  {REC_TYPE_LABELS[type] || type}
                </h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                  {items.length}
                </span>
              </div>
              {REC_TYPE_DESCRIPTIONS[type] && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-3 -mt-1">
                  {REC_TYPE_DESCRIPTIONS[type]}
                </p>
              )}
              <div className="space-y-2">
                {items.map((rec, i) => (
                  <button
                    key={`${rec.normalizedTopic}-${i}`}
                    type="button"
                    onClick={() => handleClick(rec)}
                    className={`w-full text-left flex items-start gap-3 rounded-xl border ${style.border} ${style.bg} px-4 py-3 hover:shadow-md transition-all group`}
                  >
                    <i className={`fas ${rec.icon} text-sm mt-0.5 shrink-0 text-slate-400 group-hover:text-indigo-500 transition-colors`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 capitalize">{rec.topic}</span>
                        {rec.sourceTopic && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            via {rec.sourceTopic}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{rec.reason}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                      <span className="text-[10px] font-medium text-slate-300 dark:text-slate-600 uppercase">
                        {rec.action === 'quiz' ? 'Quiz' : rec.action === 'case' ? 'Case' : 'Explore'}
                      </span>
                      <i className="fas fa-chevron-right text-xs text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Footer links */}
      <div className="mt-12 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 justify-center">
        <button
          type="button"
          onClick={() => navigate('/learning')}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <i className="fas fa-graduation-cap mr-1" /> Learning dashboard
        </button>
        <button
          type="button"
          onClick={() => navigate('/quiz')}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <i className="fas fa-brain mr-1" /> Quick quiz
        </button>
        <button
          type="button"
          onClick={() => navigate('/search')}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <i className="fas fa-search mr-1" /> Search topics
        </button>
      </div>
    </div>
  );
};
