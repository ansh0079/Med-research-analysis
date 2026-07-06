import React from 'react';
import { api } from '@services/api';
import { handleAsyncError } from '@utils/handleAsyncError';
import type { LearningRecommendation } from '@types';

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

export function LearningForYouPanel({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [recs, setRecs] = React.useState<LearningRecommendation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const shownLogged = React.useRef(false);

  React.useEffect(() => {
    api.learning.getLearningRecommendations(8)
      .then((r) => {
        setRecs(r.recommendations);
        if (!shownLogged.current && r.recommendations.length > 0) {
          shownLogged.current = true;
          void api.learning.logLearningEvent({
            eventType: 'recommendation_shown',
            sourceType: 'for_you_panel',
            payload: {
              count: r.recommendations.length,
              types: r.recommendations.map((rec) => rec.type),
              topics: r.recommendations.map((rec) => rec.normalizedTopic),
            },
          }).catch((err) => handleAsyncError(err, 'LearningForYouPanel/logLearningEvent'));
        }
      })
      .catch((err) => handleAsyncError(err, 'LearningForYouPanel/getLearningRecommendations'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (recs.length === 0) return null;

  const handleClick = (rec: LearningRecommendation) => {
    void api.learning.logLearningEvent({
      eventType: 'recommendation_clicked',
      topic: rec.topic,
      sourceType: 'for_you_panel',
      payload: {
        recommendationType: rec.type,
        action: rec.action,
        priority: rec.priority,
      },
    }).catch((err) => handleAsyncError(err, 'LearningForYouPanel/recommendationClicked'));

    if (rec.action === 'quiz') {
      sessionStorage.setItem('med_quiz_prefill', JSON.stringify({ topic: rec.topic }));
      onNavigate('/quiz');
    } else if (rec.action === 'case') {
      sessionStorage.setItem('med_case_prefill', JSON.stringify({ topic: rec.topic }));
      onNavigate('/case');
    } else {
      onNavigate(`/topic/${encodeURIComponent(rec.topic)}`);
    }
  };

  return (
    <div className="neo-card p-5">
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
        <i className="fas fa-magic text-indigo-500" /> For you
      </h3>
      <div className="space-y-2">
        {recs.map((rec, i) => {
          const style = REC_TYPE_STYLES[rec.type] || REC_TYPE_STYLES.start;
          return (
            <button
              key={`${rec.normalizedTopic}-${i}`}
              type="button"
              onClick={() => handleClick(rec)}
              className={`w-full text-left flex items-start gap-3 rounded-xl border ${style.border} ${style.bg} px-3 py-2.5 hover:shadow-sm transition-all group`}
            >
              <i className={`fas ${rec.icon} text-xs mt-0.5 shrink-0 text-slate-400 group-hover:text-indigo-500 transition-colors`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{rec.topic}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${style.badge}`}>
                    {REC_TYPE_LABELS[rec.type] || rec.type}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{rec.reason}</p>
              </div>
              <i className="fas fa-chevron-right text-[10px] text-slate-300 dark:text-slate-600 mt-1 shrink-0 group-hover:text-indigo-400 transition-colors" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
