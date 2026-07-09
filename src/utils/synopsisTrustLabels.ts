export type SynopsisSourceMode = 'full_text_used' | 'abstract_only';
export type SynopsisReviewState = 'unreviewed' | 'machine_checked' | 'human_reviewed' | 'needs_revision';

const REVIEW_LABELS: Record<SynopsisReviewState, string> = {
  unreviewed: 'Unreviewed',
  machine_checked: 'Machine checked',
  human_reviewed: 'Human reviewed',
  needs_revision: 'Needs revision',
};

export function formatReviewStateLabel(state?: string | null) {
  const key = String(state || 'unreviewed') as SynopsisReviewState;
  return REVIEW_LABELS[key] || 'Unreviewed';
}

export function synopsisTrustExportLines({
  sourceMode,
  reviewState,
  citationOk,
  trustRating,
  abstractOnly,
}: {
  sourceMode?: SynopsisSourceMode | null;
  reviewState?: string | null;
  citationOk?: boolean | null;
  trustRating?: string | null;
  abstractOnly?: boolean | null;
} = {}) {
  const lines: string[] = [];
  const isAbstractOnly = abstractOnly === true || sourceMode === 'abstract_only';
  if (isAbstractOnly) {
    lines.push('⚠ ABSTRACT-ONLY SYNOPSIS — full text was not used during generation.');
  }
  if (trustRating) lines.push(`Trust rating: ${trustRating}`);
  if (reviewState) lines.push(`Review state: ${formatReviewStateLabel(reviewState)}`);
  if (citationOk === true) lines.push('Citation validation: pass');
  if (citationOk === false) lines.push('Citation validation: issues detected');
  return lines;
}
