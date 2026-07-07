import React from 'react';
import { api } from '@services/api';
import type { LearningRecommendation } from '@types';
import { REC_TYPE_LABELS, REC_TYPE_STYLES } from '../../../utils/learningDashboardConstants';

export function ForYouPanel({ onNavigate }: { onNavigate: (path: string) => void }) {
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
          }).catch(() => {});
        }
      })
      .catch(() => {})
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
    }).catch(() => {});

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
