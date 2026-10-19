import React from 'react';

type Proposal = import('@types').TopicKnowledgeProposal;

export function ProposalsTable({
  proposals,
  loading,
  error,
  onApprove,
  onReject,
  actionBusyId,
}: {
  proposals: Proposal[];
  loading: boolean;
  error?: string;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  actionBusyId: number | null;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <i className="fas fa-circle-notch fa-spin" /> Loading proposals…
      </div>
    );
  }
  if (error) {
    return <div className="text-red-600 text-sm">{error}</div>;
  }
  if (!proposals.length) {
    return <div className="text-slate-400 text-sm">No pending proposals for this topic.</div>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900/40">
          <tr>
            <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">ID</th>
            <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Confidence</th>
            <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Proposed Status</th>
            <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Reason</th>
            <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Created</th>
            <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {proposals.map((p) => (
            <tr key={p.id} className="bg-white/60 dark:bg-slate-900/30">
              <td className="px-4 py-2 text-sm font-mono text-slate-700 dark:text-slate-200">#{p.id}</td>
              <td className="px-4 py-2 text-sm text-slate-700 dark:text-slate-200">{Math.round((p.confidence || 0) * 100)}%</td>
              <td className="px-4 py-2 text-xs">
                <span className="rounded-full bg-violet-100 px-2 py-0.5 font-bold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                  {(p.proposedStatus || 'draft_pending_clinician_review').replace(/_/g, ' ')}
                </span>
              </td>
              <td className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 max-w-[36rem]">
                <span className="line-clamp-2">{p.reason || '—'}</span>
              </td>
              <td className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400">
                {new Date(p.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-2">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={actionBusyId === p.id}
                    onClick={() => onApprove(p.id)}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {actionBusyId === p.id ? '…' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    disabled={actionBusyId === p.id}
                    onClick={() => onReject(p.id)}
                    className="rounded-lg bg-slate-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-700 hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-200"
                  >
                    Reject
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

