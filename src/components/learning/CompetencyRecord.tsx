import React, { useEffect, useState } from 'react';
import { api } from '@services/api';

type CompetencyData = Awaited<ReturnType<typeof api.learning.getCompetencyRecord>>;

const QTYPE_LABEL: Record<string, string> = {
  recall: 'Recall',
  clinical_application: 'Clinical application',
  trial_interpretation: 'Trial interpretation',
  guideline: 'Guideline',
  pitfall: 'Pitfall avoidance',
};

const MEMORY_TIER_META: Record<string, { label: string; classes: string }> = {
  strong:   { label: 'Strong memory',   classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
  building: { label: 'Building memory', classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' },
  sparse:   { label: 'Sparse memory',   classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  none:     { label: 'No memory yet',   classes: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

interface Props {
  topic: string;
}

export function CompetencyRecord({ topic }: Props) {
  const [data, setData] = useState<CompetencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!topic) return;
    setLoading(true);
    setError(null);
    api.learning.getCompetencyRecord(topic)
      .then(setData)
      .catch((e) => setError(e?.message || 'Failed to load competency record'))
      .finally(() => setLoading(false));
  }, [topic]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-slate-400">
        <i className="fas fa-spinner fa-spin" /> Loading competency record…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
        {error || 'No competency data available.'}
      </div>
    );
  }

  if (data.totalAttempts === 0) {
    return (
      <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 px-5 py-6 text-center">
        <i className="fas fa-circle-question text-3xl text-slate-300 dark:text-slate-600 mb-3 block" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No quiz history for this topic yet.</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Search for this topic and take a quiz to start building your competency record.</p>
      </div>
    );
  }

  const tierMeta = MEMORY_TIER_META[data.topicMemoryTier] ?? MEMORY_TIER_META.none;
  const accuracyColor = (data.overallAccuracy ?? 0) >= 80
    ? 'text-emerald-600 dark:text-emerald-400'
    : (data.overallAccuracy ?? 0) >= 60
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-500 dark:text-red-400';

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Overall accuracy', value: data.overallAccuracy != null ? `${data.overallAccuracy}%` : '—', color: accuracyColor, icon: 'fa-bullseye' },
          { label: 'Quiz sessions', value: String(data.sessionCount), color: 'text-indigo-600 dark:text-indigo-400', icon: 'fa-brain' },
          { label: 'Questions attempted', value: String(data.totalAttempts), color: 'text-slate-700 dark:text-slate-200', icon: 'fa-list-check' },
          { label: 'Topic searches', value: String(data.searchCount), color: 'text-slate-700 dark:text-slate-200', icon: 'fa-magnifying-glass' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-4 py-3 text-center">
            <i className={`fas ${icon} text-slate-400 mb-1 text-sm`} />
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Evidence staleness warning */}
      {data.evidenceUpdatedSinceLastQuiz && (
        <div className="rounded-xl border border-violet-200 dark:border-violet-700/40 bg-violet-50 dark:bg-violet-950/20 px-4 py-3 flex items-start gap-3">
          <i className="fas fa-circle-exclamation text-violet-500 dark:text-violet-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-violet-800 dark:text-violet-200">Evidence updated since your last session</p>
            <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">
              The evidence base for this topic has been refreshed
              {data.knowledgeUpdatedAt ? ` on ${data.knowledgeUpdatedAt.slice(0, 10)}` : ''}.
              Re-quiz to verify your knowledge is current.
            </p>
          </div>
        </div>
      )}

      {/* Verification line */}
      <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 px-4 py-3 flex flex-wrap items-center gap-3 text-xs">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tierMeta.classes}`}>{tierMeta.label}</span>
        {data.firstQuizDate && (
          <span className="text-slate-500 dark:text-slate-400">
            <i className="fas fa-calendar-plus mr-1" />First quiz: {data.firstQuizDate}
          </span>
        )}
        {data.lastQuizDate && (
          <span className="text-slate-500 dark:text-slate-400">
            <i className="fas fa-calendar-check mr-1" />Last verified: {data.lastQuizDate}
          </span>
        )}
      </div>

      {/* Weak areas */}
      {data.weakAreas.length > 0 && (
        <div className="rounded-xl border border-amber-100 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/10 px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
            <i className="fas fa-triangle-exclamation text-[10px]" />Weak areas — needs review
          </p>
          <div className="space-y-1.5">
            {data.weakAreas.map(({ type, accuracyPct, attempted }) => (
              <div key={type} className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 w-40 shrink-0">
                  {QTYPE_LABEL[type] ?? type}
                </span>
                <div className="flex-1 h-1.5 bg-amber-100 dark:bg-amber-900/40 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${accuracyPct}%` }} />
                </div>
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 w-10 text-right">{accuracyPct}%</span>
                <span className="text-[10px] text-slate-400">({attempted}q)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session accuracy trend */}
      {data.sessionSummaries.length > 1 && (
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">Accuracy trend (last {data.sessionSummaries.length} sessions)</p>
          <div className="flex items-end gap-1.5 h-12">
            {data.sessionSummaries.map((s, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${s.date}: ${s.accuracyPct}% (${s.correct}/${s.total})`}>
                <div
                  className={`w-full rounded-sm ${s.accuracyPct >= 80 ? 'bg-emerald-400 dark:bg-emerald-500' : s.accuracyPct >= 60 ? 'bg-amber-400 dark:bg-amber-500' : 'bg-red-400 dark:bg-red-500'}`}
                  style={{ height: `${Math.max(8, s.accuracyPct * 0.44)}px` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>{data.sessionSummaries[0]?.date}</span>
            <span>{data.sessionSummaries[data.sessionSummaries.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Evidence basis */}
      {data.evidenceBasis.length > 0 && (
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
            <i className="fas fa-book-open text-[10px]" />Evidence basis of your knowledge
          </p>
          <ul className="space-y-2">
            {data.evidenceBasis.map((p, i) => (
              <li key={i} className="flex gap-2 text-xs">
                <span className="shrink-0 font-bold text-slate-400">{i + 1}.</span>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100 leading-snug">{p.title}</p>
                  {p.whySeminal && <p className="text-slate-500 dark:text-slate-400 mt-0.5">{p.whySeminal}</p>}
                  {p.evidenceStrength && (
                    <span className={`inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      p.evidenceStrength === 'HIGH' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : p.evidenceStrength === 'MODERATE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}>{p.evidenceStrength}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
