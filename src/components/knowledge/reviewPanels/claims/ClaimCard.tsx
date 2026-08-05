import React from 'react';
import type { TeachingClaimReviewItem } from '@types';
import { ClaimTrustLadder, trustLadderFromVerificationStatus } from '@components/learning/ClaimTrustLadder';
import { claimStatusStyle, FLAG_REASONS } from './claimStyles';

export function ClaimCard({
  claim,
  onUpdate,
  onGuidelineCheck,
  onCuratorMeta,
}: {
  claim: TeachingClaimReviewItem;
  onUpdate: (claim: TeachingClaimReviewItem, verificationStatus: string, opts?: { claimText?: string; verificationReason?: string }) => void;
  onGuidelineCheck: (claim: TeachingClaimReviewItem) => void;
  onCuratorMeta?: (claim: TeachingClaimReviewItem, patch: Record<string, boolean | string>) => void;
}) {
  const [mode, setMode] = React.useState<'idle' | 'flag' | 'edit' | 'expert'>('idle');
  const [editText, setEditText] = React.useState(claim.claimText);
  const [flagReason, setFlagReason] = React.useState(FLAG_REASONS[0].value);
  const [busy, setBusy] = React.useState(false);

  const handleApprove = async () => {
    setBusy(true);
    try { await onUpdate(claim, 'human_reviewed'); } finally { setBusy(false); setMode('idle'); }
  };

  const handleFlag = async () => {
    setBusy(true);
    try { await onUpdate(claim, flagReason, { verificationReason: `Curator flagged: ${FLAG_REASONS.find((r) => r.value === flagReason)?.label ?? flagReason}` }); }
    finally { setBusy(false); setMode('idle'); }
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || editText.trim() === claim.claimText) { setMode('idle'); return; }
    setBusy(true);
    try { await onUpdate(claim, 'human_reviewed', { claimText: editText.trim(), verificationReason: 'Curator edited claim text.' }); }
    finally { setBusy(false); setMode('idle'); }
  };

  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${claimStatusStyle(claim.verificationStatus)}`}>
          {claim.verificationStatus.replace(/_/g, ' ')}
        </span>
        <span className="text-[10px] text-slate-400">{claim.objectType || 'claim'} · {claim.topic || claim.normalizedTopic || 'no topic'}</span>
        {claim.quizAttempts ? <span className="text-[10px] text-slate-400">{claim.quizCorrect || 0}/{claim.quizAttempts} quiz correct</span> : null}
      </div>
      <ClaimTrustLadder steps={trustLadderFromVerificationStatus(claim.verificationStatus)} compact />

      {mode === 'edit' ? (
        <div className="space-y-2">
          <textarea
            aria-label="Edit claim text"
            className="w-full rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            rows={3}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => void handleSaveEdit()}
              className="rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-1.5 transition-colors">
              <i className="fas fa-save mr-1" /> Save &amp; approve
            </button>
            <button type="button" onClick={() => { setEditText(claim.claimText); setMode('idle'); }}
              className="rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 text-[11px] font-bold px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm font-semibold leading-relaxed text-slate-800 dark:text-slate-100">{claim.claimText}</p>
      )}

      {claim.evidenceQuote && mode !== 'edit' && (
        <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400 italic">&ldquo;{claim.evidenceQuote}&rdquo;</p>
      )}

      {mode !== 'edit' && (
        <p className="text-[10px] text-slate-400">
          {claim.sourcePath || 'no source path'}{claim.articleUid ? ` · ${claim.articleUid}` : ''}
          {claim.verificationReason ? ` · ${claim.verificationReason}` : ''}
        </p>
      )}

      {mode === 'flag' && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Flag reason"
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            className="rounded-lg border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-800 text-xs px-2 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
          >
            {FLAG_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <button type="button" disabled={busy} onClick={() => void handleFlag()}
            className="rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-1.5 transition-colors">
            <i className="fas fa-flag mr-1" /> Confirm flag
          </button>
          <button type="button" onClick={() => setMode('idle')}
            className="rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 text-[11px] font-bold px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Cancel
          </button>
        </div>
      )}

      {mode === 'idle' && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button type="button" disabled={busy} onClick={() => void handleApprove()}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-1.5 transition-colors">
            <i className="fas fa-check mr-1" /> Approve
          </button>
          <button type="button" onClick={() => setMode('flag')}
            className="rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-bold px-3 py-1.5 transition-colors">
            <i className="fas fa-flag mr-1" /> Flag
          </button>
          <button type="button" onClick={() => { setEditText(claim.claimText); setMode('edit'); }}
            className="rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <i className="fas fa-pencil-alt mr-1" /> Edit
          </button>
          <button type="button" onClick={() => onGuidelineCheck(claim)}
            className="rounded-lg border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[11px] font-bold px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors">
            <i className="fas fa-balance-scale mr-1" /> Guideline check
          </button>
          {onCuratorMeta && (
            <button type="button" onClick={() => setMode('expert')}
              className="rounded-lg border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-[11px] font-bold px-3 py-1.5 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors">
              <i className="fas fa-user-md mr-1" /> Expert
            </button>
          )}
        </div>
      )}

      {mode === 'expert' && onCuratorMeta && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" disabled={busy} onClick={() => { void onCuratorMeta(claim, { examRelevant: true }); setMode('idle'); }}
            className="rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold px-2.5 py-1.5">Exam-relevant</button>
          <button type="button" disabled={busy} onClick={() => { void onCuratorMeta(claim, { practiceChanging: true }); setMode('idle'); }}
            className="rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 text-[11px] font-bold px-2.5 py-1.5">Practice-changing</button>
          <button type="button" disabled={busy} onClick={() => { void onCuratorMeta(claim, { overclaimed: true }); setMode('idle'); }}
            className="rounded-lg bg-amber-50 text-amber-800 text-[11px] font-bold px-2.5 py-1.5">Mark overclaimed</button>
          <button type="button" onClick={() => setMode('idle')}
            className="rounded-lg border border-slate-200 text-[11px] font-bold px-2.5 py-1.5">Cancel</button>
        </div>
      )}
    </div>
  );
}
