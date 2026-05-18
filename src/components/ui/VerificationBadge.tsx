import React from 'react';

// teaching_object_claims.verification_status values
// ai_generation_claims.validation_status values (mapped below)
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  // teaching_object verification statuses
  source_verified:       { label: 'Source Verified',       cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  guideline_supported:   { label: 'Guideline Supported',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  human_reviewed:        { label: 'Human Reviewed',        cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  abstract_only:         { label: 'Abstract Only',         cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  synthesis_inferred:    { label: 'Synthesis Inferred',    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  agent_draft:           { label: 'Agent Draft',           cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400' },
  guideline_conflict:    { label: 'Guideline Conflict',    cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
  stale_needs_refresh:   { label: 'Stale',                 cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  unverified:            { label: 'Unverified',            cls: 'bg-slate-100 text-slate-400 dark:bg-slate-800/60 dark:text-slate-500' },
  // ai_generation_claims validation statuses
  citations_ok:          { label: 'Citations OK',          cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  citation_issue:        { label: 'Citation Issue',        cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
  unvalidated:           { label: 'Unvalidated',           cls: 'bg-slate-100 text-slate-400 dark:bg-slate-800/60 dark:text-slate-500' },
  uncertainty:           { label: 'Uncertain',             cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  // synthesis_excerpt is an inline placeholder, show nothing
  synthesis_excerpt:     { label: '',                      cls: '' },
};

const FALLBACK = { label: 'Unverified', cls: 'bg-slate-100 text-slate-400 dark:bg-slate-800/60 dark:text-slate-500' };

interface VerificationBadgeProps {
  status?: string | null;
  className?: string;
}

export function VerificationBadge({ status, className = '' }: VerificationBadgeProps) {
  if (!status) return null;
  const entry = STATUS_MAP[status] ?? FALLBACK;
  if (!entry.label) return null;
  return (
    <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider rounded-full px-1.5 py-0.5 ${entry.cls} ${className}`}>
      {entry.label}
    </span>
  );
}
