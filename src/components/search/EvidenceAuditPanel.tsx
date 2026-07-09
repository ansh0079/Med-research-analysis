import React from 'react';

export interface EvidenceAuditSnapshot {
  jobKey?: string | null;
  jobType?: string | null;
  model?: string | null;
  provider?: string | null;
  generatedAt?: string | null;
  sourceCount?: number | null;
  /** 0–1 fraction when known */
  fullTextCoverageRatio?: number | null;
  citationOk?: boolean | null;
  citationIssueCount?: number | null;
  retractionFlagged?: boolean | null;
  retractionChecked?: boolean | null;
  humanReviewStatus?: string | null;
  claimCount?: number | null;
}

function fmt(v: unknown, fallback = '—') {
  if (v === null || v === undefined || v === '') return fallback;
  return String(v);
}

function pct(r: number | null | undefined) {
  if (r == null || Number.isNaN(r)) return '—';
  return `${Math.round(Math.min(1, Math.max(0, r)) * 100)}%`;
}

/**
 * Compact trust / provenance strip for synthesis, synopsis, and quiz surfaces.
 */
export const EvidenceAuditPanel: React.FC<{
  title?: string;
  snapshot: EvidenceAuditSnapshot;
  className?: string;
}> = ({ title = 'Evidence audit', snapshot, className = '' }) => {
  const {
    jobKey,
    jobType,
    model,
    provider,
    generatedAt,
    sourceCount,
    fullTextCoverageRatio,
    citationOk,
    citationIssueCount,
    retractionFlagged,
    retractionChecked,
    humanReviewStatus,
    claimCount,
  } = snapshot;

  const rows: Array<{ k: string; v: string }> = [
    { k: 'Model', v: fmt(model) },
    { k: 'Provider', v: fmt(provider) },
    { k: 'Generated', v: fmt(generatedAt) },
    { k: 'Sources', v: sourceCount != null ? String(sourceCount) : '—' },
    { k: 'Full-text coverage', v: pct(fullTextCoverageRatio ?? null) },
    {
      k: 'Citation validation',
      v:
        citationOk == null
          ? '—'
          : citationOk
            ? 'Pass'
            : `Issues${citationIssueCount != null ? ` (${citationIssueCount})` : ''}`,
    },
    {
      k: 'Retractions',
      v:
        retractionFlagged === true
          ? 'Flagged in bundle [verify]'
          : retractionChecked
            ? 'Checked'
            : '—',
    },
    { k: 'Human review', v: fmt(humanReviewStatus === 'none' ? 'unreviewed' : humanReviewStatus, 'unreviewed') },
    ...(claimCount != null ? [{ k: 'Claims', v: String(claimCount) }] : []),
    ...(jobKey ? [{ k: 'Job', v: jobKey.slice(0, 18) + (jobKey.length > 18 ? '…' : '') }] : []),
    ...(jobType ? [{ k: 'Job type', v: jobType }] : []),
  ];

  return (
    <div
      className={`rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-900/40 px-3 py-2.5 ${className}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
        {title}
      </p>
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5 text-[11px]">
        {rows.map(({ k, v }) => (
          <div key={k} className="min-w-0">
            <dt className="text-slate-400 dark:text-slate-500 truncate">{k}</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200 truncate" title={v}>
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
};
