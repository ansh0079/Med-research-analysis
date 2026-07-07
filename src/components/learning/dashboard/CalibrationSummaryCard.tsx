import React from 'react';
import type { CalibrationSummary } from '@types';
import { CALIBRATION_VERDICT_STYLE } from '../../../utils/learningDashboardConstants';

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
                    ref={(el) => { if (el) el.style.height = `${barHeightPct}%`; }}
                  />
                )}
                <div
                  className="absolute w-full border-t-2 border-dashed border-slate-400 dark:border-slate-500"
                  data-marker={markerPct}
                  ref={(el) => { if (el) el.style.bottom = `${markerPct}%`; }}
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
