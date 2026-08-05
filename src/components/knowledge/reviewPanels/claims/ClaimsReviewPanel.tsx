import type { TeachingClaimReviewItem } from '@types';
import { ClaimCard } from './ClaimCard';

export function ClaimsReviewPanel({
  claims,
  loading,
  error,
  onRefresh,
  onUpdate,
  onGuidelineCheck,
  onCuratorMeta,
}: {
  claims: TeachingClaimReviewItem[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onUpdate: (claim: TeachingClaimReviewItem, verificationStatus: string, opts?: { claimText?: string; verificationReason?: string }) => void;
  onGuidelineCheck: (claim: TeachingClaimReviewItem) => void;
  onCuratorMeta: (claim: TeachingClaimReviewItem, patch: Record<string, boolean | string>) => void;
}) {
  if (loading) return <p className="text-sm text-slate-400">Loading claim review queue...</p>;
  if (error) return <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:bg-red-950/30">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Claim Review Queue</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Approve, flag, or edit teaching claims before they enter the quiz pool.</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <i className="fas fa-sync-alt mr-1" /> Refresh
        </button>
      </div>

      {claims.length === 0 && (
        <div className="rounded-xl border border-slate-100 p-6 text-center text-sm text-slate-400 dark:border-slate-800">
          No claims need review for this topic.
        </div>
      )}

      <div className="space-y-3">
        {claims.map((claim) => (
          <ClaimCard
            key={claim.claimKey}
            claim={claim}
            onUpdate={onUpdate}
            onGuidelineCheck={onGuidelineCheck}
            onCuratorMeta={onCuratorMeta}
          />
        ))}
      </div>
    </div>
  );
}
