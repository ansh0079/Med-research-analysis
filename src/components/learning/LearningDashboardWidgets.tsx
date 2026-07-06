import React from 'react';
import type { LearningInsight, CalibrationSummary } from '@types';

// ─────────────────────────────────────────────────────────────────────────────
// Mastery bar (average mastery by question type)
// ─────────────────────────────────────────────────────────────────────────────

// Restrict the bar keys to the numeric score fields on UserTopicMastery so
// the reduce in the consumer does not need an unsafe `as number` cast over
// keys that may be strings (e.g. `topic`, `normalizedTopic`).
export type MasteryScoreKey = 'recallScore' | 'clinicalApplicationScore' | 'trialInterpretationScore' | 'guidelineScore' | 'pitfallScore';

export const QTYPE_BARS: Array<{ key: MasteryScoreKey; label: string; color: string }> = [
  { key: 'recallScore',               label: 'Recall',          color: 'bg-slate-500' },
  { key: 'clinicalApplicationScore',  label: 'Clinical App',    color: 'bg-indigo-500' },
  { key: 'trialInterpretationScore',  label: 'Trial Interp',    color: 'bg-violet-500' },
  { key: 'guidelineScore',            label: 'Guideline',       color: 'bg-blue-500' },
  { key: 'pitfallScore',              label: 'Pitfall',         color: 'bg-red-500' },
];

export function MasteryBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-8 text-right">{score}%</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Insight card
// ─────────────────────────────────────────────────────────────────────────────

export const INSIGHT_COLORS: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
  red:    { bg: 'bg-red-50 dark:bg-red-950/30',     border: 'border-red-200 dark:border-red-800/50',    icon: 'text-red-500',    badge: 'bg-red-100 text-red-700' },
  amber:  { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800/50', icon: 'text-amber-500',  badge: 'bg-amber-100 text-amber-700' },
  emerald:{ bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800/50', icon: 'text-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800/50', icon: 'text-orange-500', badge: 'bg-orange-100 text-orange-700' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-200 dark:border-indigo-800/50', icon: 'text-indigo-500', badge: 'bg-indigo-100 text-indigo-700' },
};

export function InsightCard({ insight, onAction }: { insight: LearningInsight; onAction: (insight: LearningInsight) => void }) {
  const c = INSIGHT_COLORS[insight.color] ?? INSIGHT_COLORS.indigo;
  return (
    <div className={`rounded-xl border ${c.bg} ${c.border} px-4 py-3 flex items-start gap-3`}>
      <i className={`fas ${insight.icon} ${c.icon} mt-0.5 text-sm shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{insight.message}</p>
        {insight.detail && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{insight.detail}</p>}
      </div>
      {insight.action && (
        <button
          type="button"
          onClick={() => onAction(insight)}
          className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg ${c.badge} hover:opacity-80 transition-opacity`}
        >
          {insight.action}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Calibration summary card (reliability diagram in miniature)
// ─────────────────────────────────────────────────────────────────────────────

export const CALIBRATION_VERDICT_STYLE: Record<string, { icon: string; color: string }> = {
  overconfident: { icon: 'fa-triangle-exclamation', color: 'text-rose-500' },
  underconfident: { icon: 'fa-circle-question', color: 'text-amber-500' },
  well_calibrated: { icon: 'fa-bullseye', color: 'text-emerald-500' },
  insufficient_data: { icon: 'fa-hourglass-half', color: 'text-slate-400' },
};

/**
 * Reliability diagram in miniature: one bar per 1-5 confidence level, height =
 * observed accuracy, with a marker for what that confidence level predicts.
 * A well-calibrated learner's bars roughly track the markers; a gap between
 * a bar and its marker at high confidence is the overconfidence pattern.
 */
export function CalibrationSummaryCard({ calibration }: { calibration: CalibrationSummary }) {
  if (calibration.verdict === 'insufficient_data' || calibration.sampleSize < 5) return null;
  const style = CALIBRATION_VERDICT_STYLE[calibration.verdict] ?? CALIBRATION_VERDICT_STYLE.well_calibrated;

  return (
    <div className="neo-card p-5">
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
        <i className={`fas ${style.icon} ${style.color}`} /> Confidence calibration
      </h3>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">{calibration.message}</p>
      <div className="flex items-end gap-3 h-24">
        {calibration.curve.map((bucket) => {
          const hasData = bucket.count > 0 && bucket.observedAccuracy != null;
          const barHeightPct = hasData ? Math.round((bucket.observedAccuracy as number) * 100) : 0;
          const markerPct = Math.round(bucket.predictedProbability * 100);
          return (
            <div key={bucket.confidenceLevel} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <div className="relative w-full flex-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex flex-col justify-end">
                {hasData && (
                  <div
                    className="w-full bg-violet-500 rounded-t-lg transition-all"
                    data-pct={barHeightPct}
                    style={{ height: `${barHeightPct}%` }}
                  />
                )}
                <div
                  className="absolute w-full border-t-2 border-dashed border-slate-400 dark:border-slate-500"
                  data-marker={markerPct}
                  style={{ bottom: `${markerPct}%` }}
                  title={`Predicted: ${markerPct}%`}
                />
              </div>
              <span className="text-[9px] font-bold text-slate-400">{bucket.confidenceLevel}/5</span>
              <span className="text-[9px] text-slate-400">{hasData ? `${barHeightPct}%` : '—'}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400 mt-2">
        Bars = your actual accuracy at each confidence level. Dashed lines = what that confidence level should predict.
      </p>
    </div>
  );
}
