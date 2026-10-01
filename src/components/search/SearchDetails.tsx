import React from 'react';
import type { SearchPack } from '@types';

type SourceEntry = {
  ms?: number;
  cached?: boolean;
  shared?: boolean;
  failed?: boolean;
  error?: string;
  resultCount?: number;
};

type SourceFailures = Record<string, { failed?: boolean; error?: string }> | null | undefined;

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

export interface ActiveSearchFilters {
  specificity?: string;
  studyTypeLabels?: string[];
  yearRange?: [number, number];
}

function failedSourceNames(sourceTelemetry?: Record<string, SourceEntry> | null, sourceFailures?: SourceFailures): string[] {
  const fromFailures = Object.entries(sourceFailures || {}).filter(([, info]) => info?.failed !== false).map(([src]) => src);
  if (fromFailures.length > 0) return fromFailures;
  return Object.entries(sourceTelemetry || {}).filter(([, info]) => info.failed).map(([src]) => src);
}

/** Stays visible outside "Search details": incomplete results change how a clinician should read the page. */
export const SourceFailureNotice: React.FC<{ sourceTelemetry?: Record<string, SourceEntry> | null; sourceFailures?: SourceFailures }> = ({
  sourceTelemetry,
  sourceFailures,
}) => {
  const failed = failedSourceNames(sourceTelemetry, sourceFailures);
  if (failed.length === 0) return null;
  return (
    <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300" role="status">
      Some sources failed ({failed.join(', ')}). Results may be incomplete.
    </p>
  );
};

export function hasSearchDetails({ sourceTelemetry, queryIntent, searchPack, activeFilters }: {
  sourceTelemetry?: Record<string, SourceEntry> | null;
  queryIntent?: string | null;
  searchPack?: SearchPack | null;
  activeFilters?: ActiveSearchFilters | null;
}): boolean {
  return Boolean(
    searchPack?.cascadeNote
    || queryIntent
    || activeFilters?.studyTypeLabels?.length
    || activeFilters?.yearRange
    || (activeFilters?.specificity && activeFilters.specificity !== 'moderate')
    || Object.keys(sourceTelemetry || {}).length
  );
}

export const SearchDetails: React.FC<{
  sourceTelemetry?: Record<string, SourceEntry> | null;
  queryIntent?: string | null;
  searchPack?: SearchPack | null;
  activeFilters?: ActiveSearchFilters | null;
}> = ({ sourceTelemetry, queryIntent = null, searchPack = null, activeFilters = null }) => {
  const intentLabel = queryIntent ? (INTENT_LABEL[queryIntent] || queryIntent) : null;
  const emptyLanes = searchPack
    ? Object.values(searchPack.lanes).filter((lane) => lane && lane.count === 0 && lane.emptyState)
    : [];
  const sourceEntries = Object.entries(sourceTelemetry || {});

  return (
    <div className="space-y-2 text-[11px] text-slate-500 dark:text-slate-400">
      {searchPack?.cascadeNote && <p className="font-medium text-slate-600 dark:text-slate-300">{searchPack.cascadeNote}</p>}
      {emptyLanes.map((lane) => (
        <p key={lane.key}><span className="font-semibold">{lane.label}:</span> {lane.emptyState}</p>
      ))}
      <div className="flex flex-wrap items-center gap-1.5">
        {intentLabel && (
          <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" title="Detected clinical question intent from your query">
            Intent · {intentLabel}
          </span>
        )}
        {activeFilters?.specificity && activeFilters.specificity !== 'moderate' && (
          <span className="rounded-md bg-violet-50 px-2 py-0.5 font-bold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
            Focus · {activeFilters.specificity}
          </span>
        )}
        {(activeFilters?.studyTypeLabels || []).map((label) => (
          <span key={label} className="rounded-md bg-indigo-50 px-2 py-0.5 font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
            {label}
          </span>
        ))}
        {activeFilters?.yearRange && (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {activeFilters.yearRange[0]}–{activeFilters.yearRange[1]}
          </span>
        )}
      </div>
      {sourceEntries.length > 0 && (
        <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-400 dark:text-slate-500">
          {sourceEntries.map(([src, info]) => (
            <span key={src} className={info.failed ? 'text-amber-600 dark:text-amber-400' : undefined}>
              <span className="capitalize">{src}</span>
              {info.failed ? (
                <span className="ml-0.5">·failed</span>
              ) : (
                <>
                  {info.ms != null && <span className="ml-0.5 opacity-70">{info.ms}ms</span>}
                  {info.resultCount != null && <span className="ml-0.5 opacity-70">·{info.resultCount}</span>}
                  {info.cached && <span className="ml-0.5 text-emerald-500">·cached</span>}
                </>
              )}
            </span>
          ))}
        </p>
      )}
    </div>
  );
};
