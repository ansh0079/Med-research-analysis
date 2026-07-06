import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@services/api';
import { useAuth } from '@contexts/AuthContext';
import type { TeachingClaimReviewItem } from '@types';
import { VerificationBadge } from '@components/ui/VerificationBadge';
import { ClaimTrustLadder, trustLadderFromVerificationStatus } from '@components/learning/ClaimTrustLadder';

type QueueId = 'overclaimed' | 'guideline_conflicts' | 'stale' | 'abstract_only' | 'low_confidence';

type QueueMeta = { id: string; label: string; description: string; tone: string };

const QUEUE_STYLE: Record<string, string> = {
  danger: 'border-rose-200 bg-rose-50/60 dark:border-rose-900/40 dark:bg-rose-950/20',
  warning: 'border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20',
  neutral: 'border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/30',
};

export function ClinicalQualityQueuePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isStaff = user?.role === 'admin' || user?.role === 'curator';

  const [queues, setQueues] = useState<QueueMeta[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [activeQueue, setActiveQueue] = useState<QueueId>('guideline_conflicts');
  const [claims, setClaims] = useState<TeachingClaimReviewItem[]>([]);
  const [topicFilter, setTopicFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.knowledge.getClinicalQualityQueue({
        queue: activeQueue,
        topic: topicFilter.trim() || undefined,
        limit: 50,
      });
      setQueues(data.queues);
      setCounts(data.counts);
      setClaims(data.claims);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load quality queue');
    } finally {
      setLoading(false);
    }
  }, [activeQueue, topicFilter]);

  useEffect(() => {
    if (!isStaff) {
      navigate('/search');
      return;
    }
    void load();
  }, [isStaff, load, navigate]);

  const updateClaim = async (claim: TeachingClaimReviewItem, status: string) => {
    try {
      const { claim: updated } = await api.knowledge.updateTeachingClaimVerification(claim.claimKey, {
        verificationStatus: status,
        verificationReason: `Clinical quality review (${activeQueue}).`,
      });
      setClaims((prev) => prev.filter((c) => c.claimKey !== claim.claimKey).concat(updated ? [updated] : []));
      setNotice(`Claim updated to ${status.replace(/_/g, ' ')}.`);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const markOverclaimed = async (claim: TeachingClaimReviewItem) => {
    try {
      await api.knowledge.updateTeachingClaimCuratorMetadata(claim.claimKey, { overclaimed: true });
      setNotice('Marked overclaimed — claim queued for refresh.');
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Metadata update failed');
    }
  };

  if (!isStaff) return null;

  return (
    <div className="min-h-screen bg-[var(--c-bg)] px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Clinical quality review</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Curator queues for overclaimed, conflicting, stale, abstract-only, and low-confidence claims.
            </p>
          </div>
          <button type="button" onClick={() => navigate('/admin/observability')} className="neo-btn text-xs">
            Admin observability
          </button>
        </div>

        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-xs text-slate-500">
            Topic filter
            <input
              type="text"
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              placeholder="Optional topic"
              className="mt-1 block rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
            />
          </label>
          <button type="button" onClick={() => void load()} className="neo-btn text-xs">Apply</button>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        {notice && <p className="text-sm text-emerald-600">{notice}</p>}

        <div className="flex flex-wrap gap-2">
          {(queues.length ? queues : [
            { id: 'overclaimed', label: 'Overclaimed', tone: 'warning' },
            { id: 'guideline_conflicts', label: 'Guideline conflicts', tone: 'danger' },
            { id: 'stale', label: 'Stale', tone: 'warning' },
            { id: 'abstract_only', label: 'Abstract only', tone: 'neutral' },
            { id: 'low_confidence', label: 'Low confidence', tone: 'neutral' },
          ]).map((q) => {
            const id = q.id as QueueId;
            const count = counts[id] ?? 0;
            const active = activeQueue === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveQueue(id)}
                className={`rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                  active ? 'border-indigo-400 ring-2 ring-indigo-200 dark:ring-indigo-800' : QUEUE_STYLE[q.tone] || QUEUE_STYLE.neutral
                }`}
              >
                <span className="font-bold text-slate-800 dark:text-slate-100">{q.label}</span>
                <span className="ml-2 font-mono text-slate-500">{count}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="spinner" /></div>
        ) : claims.length === 0 ? (
          <p className="text-sm text-slate-500">No claims in this queue{topicFilter ? ` for "${topicFilter}"` : ''}.</p>
        ) : (
          <ul className="space-y-4">
            {claims.map((claim) => (
              <li key={claim.claimKey} className="neo-card p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <VerificationBadge status={claim.verificationStatus} />
                  <span className="text-[10px] text-slate-400">{claim.topic || claim.normalizedTopic}</span>
                  {claim.confidence != null && (
                    <span className="text-[10px] font-mono text-slate-500">conf {(claim.confidence * 100).toFixed(0)}%</span>
                  )}
                </div>
                <ClaimTrustLadder steps={trustLadderFromVerificationStatus(claim.verificationStatus)} compact />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">{claim.claimText}</p>
                {claim.curatorMetadata?.overclaimed && (
                  <p className="text-xs text-amber-700 dark:text-amber-300">Curator: overclaimed</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void updateClaim(claim, 'human_reviewed')}
                    className="rounded-lg bg-emerald-600 text-white text-[11px] font-bold px-3 py-1.5">
                    Approve
                  </button>
                  <button type="button" onClick={() => void markOverclaimed(claim)}
                    className="rounded-lg border border-amber-200 text-amber-800 text-[11px] font-bold px-3 py-1.5">
                    Overclaimed
                  </button>
                  <button type="button" onClick={() => void updateClaim(claim, 'stale_needs_refresh')}
                    className="rounded-lg border border-slate-200 text-slate-600 text-[11px] font-bold px-3 py-1.5">
                    Mark stale
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
