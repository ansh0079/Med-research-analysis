import React from 'react';
import type {
  ProductionObservability,
  ProductionObservabilityStatus,
} from '@services/api/knowledgeAdmin';

const statusStyles: Record<ProductionObservabilityStatus, string> = {
  healthy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  watch: 'bg-amber-100 text-amber-700 border-amber-200',
  degraded: 'bg-rose-100 text-rose-700 border-rose-200',
  insufficient_data: 'bg-slate-100 text-slate-600 border-slate-200',
};

function formatStatus(status: string) {
  return status.replace(/_/g, ' ');
}

function formatMetricValue(value: unknown) {
  if (typeof value === 'number') {
    if (value >= 0 && value <= 1) return `${Math.round(value * 100)}%`;
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  if (value == null) return '-';
  return String(value);
}

export function ProductionObservabilityPanel({ observability }: { observability: ProductionObservability }) {
  const sections = Object.entries(observability.sections);
  const badgeClass = statusStyles[observability.status] || statusStyles.insufficient_data;

  return (
    <section className="neo-card p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Phase 7 production loop</h2>
          <p className="text-xs text-slate-500 mt-1">
            Live readiness across search quality, RL reward attribution, synopsis trust, AI jobs, and SLO burn.
          </p>
        </div>
        <div className="text-right">
          <span className={`inline-flex rounded border px-2 py-1 text-[10px] font-bold uppercase ${badgeClass}`}>
            {formatStatus(observability.status)}
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{observability.score}</p>
          <p className="text-[10px] text-slate-500">readiness score</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {sections.map(([name, section]) => (
          <div key={name} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{name}</p>
              <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${statusStyles[section.status]}`}>
                {formatStatus(section.status)}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-3">
              {section.checks[0]?.message || 'No checks reported.'}
            </p>
            {section.checks[0] && (
              <p className="text-[10px] text-slate-400 mt-2">
                {section.checks[0].label}: {formatMetricValue(section.checks[0].value)}
              </p>
            )}
          </div>
        ))}
      </div>

      {observability.alerts.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Alerts</p>
            <ul className="space-y-2">
              {observability.alerts.slice(0, 5).map((alert, index) => (
                <li key={`${alert.area}-${index}`} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                      alert.severity === 'critical' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {alert.area}
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{alert.message}</span>
                  </div>
                  {alert.action && <p className="text-slate-500 mt-1">{alert.action}</p>}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Next actions</p>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              {observability.actions.slice(0, 5).map((action, index) => (
                <li key={`${action}-${index}`} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
                  {action}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          All Phase 7 operating checks are healthy for the last {observability.windowDays} days.
        </p>
      )}
    </section>
  );
}
