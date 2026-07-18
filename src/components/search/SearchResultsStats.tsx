import React from 'react';

type SourceEntry = {
  ms?: number;
  cached?: boolean;
  shared?: boolean;
  failed?: boolean;
  error?: string;
  resultCount?: number;
};

const INTENT_LABEL: Record<string, string> = {
  therapeutic: 'Management',
  management: 'Management',
  diagnostic: 'Diagnosis',
  diagnosis: 'Diagnosis',
  guideline: 'Guideline',
  prognostic: 'Prognosis',
  epidemiological: 'Epidemiology',
  mechanistic: 'Mechanism',
  general: 'General',
};

interface SearchResultsStatsProps {
  totalCount: number;
  openAccessCount: number;
  highQualityCount: number;
  retractedCount: number;
  sourceTelemetry?: Record<string, SourceEntry> | null;
  sourceFailures?: Record<string, { failed?: boolean; error?: string }> | null;
  queryIntent?: string | null;
  activeFilters?: {
    specificity?: string;
    studyTypeLabels?: string[];
    yearRange?: [number, number];
  } | null;
}

export const SearchResultsStats: React.FC<SearchResultsStatsProps> = ({
  totalCount,
  openAccessCount,
  highQualityCount,
  retractedCount,
  sourceTelemetry,
  sourceFailures,
  queryIntent = null,
  activeFilters = null,
}) => {
  const sourceEntries = sourceTelemetry ? Object.entries(sourceTelemetry) : [];
  const failureEntries = Object.entries(sourceFailures || {}).filter(([, info]) => info?.failed !== false);
  const failedFromTelemetry = sourceEntries.filter(([, info]) => info.failed);
  const failedSources = failureEntries.length > 0
    ? failureEntries
    : failedFromTelemetry.map(([src, info]) => [src, { failed: true, error: info.error }]);

  const intentLabel = queryIntent ? (INTENT_LABEL[queryIntent] || queryIntent) : null;
  const hasActiveFilters = Boolean(
    (activeFilters?.specificity && activeFilters.specificity !== 'moderate')
    || (activeFilters?.studyTypeLabels && activeFilters.studyTypeLabels.length > 0)
    || activeFilters?.yearRange
  );

  return (
    <div className="mb-4">
      {(intentLabel || hasActiveFilters) && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {intentLabel && (
            <span
              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
              title="Detected clinical question intent from your query"
            >
              Intent · {intentLabel}
            </span>
          )}
          {activeFilters?.specificity && activeFilters.specificity !== 'moderate' && (
            <span className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300">
              Focus · {activeFilters.specificity}
            </span>
          )}
          {(activeFilters?.studyTypeLabels || []).map((label) => (
            <span
              key={label}
              className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
            >
              {label}
            </span>
          ))}
          {activeFilters?.yearRange && (
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {activeFilters.yearRange[0]}–{activeFilters.yearRange[1]}
            </span>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
        {[
          { label: 'Evidence found', value: totalCount, icon: 'fa-layer-group', tone: 'text-indigo-500' },
          { label: 'Open access', value: openAccessCount, icon: 'fa-unlock', tone: 'text-emerald-500' },
          { label: 'A/B quality', value: highQualityCount, icon: 'fa-shield-alt', tone: 'text-blue-500' },
          {
            label: 'Retracted flags',
            value: retractedCount,
            icon: 'fa-triangle-exclamation',
            tone: retractedCount ? 'text-red-500' : 'text-slate-400',
          },
        ].map((item) => (
          <div key={item.label} className="neo-card p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className={`w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${item.tone}`}>
              <i className={`fas ${item.icon} text-xs`} />
            </div>
            <div>
              <p className="font-mono text-base sm:text-lg font-black text-slate-900 dark:text-white">{item.value}</p>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
      {sourceEntries.length > 0 && (
        <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
          {sourceEntries.map(([src, info]) => (
            <span key={src} className={info.failed ? 'text-amber-600 dark:text-amber-400' : undefined}>
              <span className="capitalize">{src}</span>
              {info.failed ? (
                <span className="ml-0.5 opacity-90">·failed</span>
              ) : (
                <>
                  {info.ms != null && <span className="ml-0.5 opacity-70">{info.ms}ms</span>}
                  {info.resultCount != null && <span className="ml-0.5 opacity-70">·{info.resultCount}</span>}
                  {info.cached && <span className="ml-0.5 text-emerald-500 opacity-80">·cached</span>}
                </>
              )}
            </span>
          ))}
        </p>
      )}
      {failedSources.length > 0 && (
        <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300" role="status">
          Some sources failed ({failedSources.map(([src]) => src).join(', ')}). Results may be incomplete.
        </p>
      )}
    </div>
  );
};
