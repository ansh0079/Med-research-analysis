import React from 'react';
import type { TopicMentorDraft, TopicMentorDraftPage } from '@services/api/knowledgeAdmin';

type Props = {
  drafts: TopicMentorDraft[];
  counts: Record<string, number>;
  loading: boolean;
  error: string;
  statusFilter: string;
  onStatusFilter: (status: string) => void;
  onRefresh: () => void;
  onReview: (topicId: string, decision: 'approved' | 'needs_changes' | 'rejected', notes?: string) => void;
  onPublish: (topicId: string) => void;
  reviewing: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  draft_pending_clinician_review: 'bg-amber-100 text-amber-700',
  needs_evidence: 'bg-rose-100 text-rose-700',
  approved: 'bg-emerald-100 text-emerald-700',
  needs_changes: 'bg-orange-100 text-orange-700',
  rejected: 'bg-slate-200 text-slate-600',
  published: 'bg-indigo-100 text-indigo-700',
};

const DECISION_LABEL: Record<string, string> = {
  draft_pending_clinician_review: 'Pending review',
  needs_evidence: 'Needs evidence',
  approved: 'Approved',
  needs_changes: 'Needs review',
  rejected: 'Rejected',
  published: 'Published',
};

function DraftDetail({ draft, onReview, onPublish, reviewing }: { draft: TopicMentorDraft; onReview: Props['onReview']; onPublish: Props['onPublish']; reviewing: string | null }) {  const page = draft.page as TopicMentorDraftPage | undefined;
  const [notes, setNotes] = React.useState('');
  if (!page) return <p className="p-4 text-xs text-slate-400">Full draft content unavailable.</p>;

  const decided = Boolean(draft.reviewDecision);
  return (
    <div className="space-y-4 p-4 text-sm">
      <p className="text-slate-700 dark:text-slate-300">{page.mentor_intro}</p>

      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Teaching points</p>
        <ul className="list-disc space-y-1 pl-5 text-slate-700 dark:text-slate-300">
          {page.teaching_points.map((tp, i) => (
            <li key={i}>
              {tp.tier && <span className="mr-1 rounded bg-slate-100 px-1 text-[9px] font-bold uppercase text-slate-500">{tp.tier}</span>}{tp.claim}{' '}
              <span className="whitespace-nowrap text-[10px] font-semibold text-indigo-500">
                {tp.cites.map((c) => `[PMID ${c}]`).join(' ')}
              </span>
              {tp.verification === 'source_identified_figures_in_full_text' && (
                <span className="ml-1 whitespace-nowrap text-[10px] font-semibold text-amber-700" title="The cited paper is the right source but its abstract does not state these figures; confirm them in the full text.">
                  [figures not in abstract{tp.figures_to_confirm?.length ? `: ${tp.figures_to_confirm.join(', ')}` : ''}]
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {page.uncertainties.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Uncertainties</p>
          <ul className="list-disc space-y-1 pl-5 text-slate-600 dark:text-slate-400">
            {page.uncertainties.map((u, i) => <li key={i}>{u}</li>)}
          </ul>
        </div>
      )}

      {page.mcq_angles.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">MCQ angles</p>
          <ul className="list-disc space-y-1 pl-5 text-slate-600 dark:text-slate-400">
            {page.mcq_angles.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}

      {page.case_hooks.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Case hooks</p>
          <ul className="list-disc space-y-1 pl-5 text-slate-600 dark:text-slate-400">
            {page.case_hooks.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      {page.gaps && (
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Gaps for the reviewer</p>
          <p className="text-slate-600 dark:text-slate-400">{page.gaps}</p>
        </div>
      )}

      {((page.standard_knowledge && page.standard_knowledge.length > 0) || page.standard_overview) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-700">Standard reference (textbook), no literature citation. Confirm against a current text or guideline before approving.</p>
          {page.standard_overview && <p className="mb-2 text-slate-600 dark:text-slate-400">{page.standard_overview}</p>}
          {page.overview_support && page.overview_support.length > 0 && (
            <ul className="mb-2 list-disc space-y-0.5 pl-5 text-[11px] text-slate-500">
              {page.overview_support.map((o, i) => (
                <li key={i}>
                  {o.sentence ? `Overview sentence ${o.sentence}:` : 'Removed overview sentence:'}{' '}
                  <span className={o.support.startsWith('No source') || o.support.startsWith('Recommend') ? 'font-semibold text-red-600' : 'font-semibold text-amber-700'}>{o.support}</span>
                  {o.pmids.length > 0 && <> (PMID {o.pmids.join(', ')})</>}. {o.note}
                </li>
              ))}
            </ul>
          )}
          <ul className="list-disc space-y-1 pl-5 text-slate-600 dark:text-slate-400">
            {(page.standard_knowledge || []).map((d, i) => (
              <li key={i}>
                {d.claim}{' '}
                {d.support_url && (
                  <a className="whitespace-nowrap text-[10px] font-semibold text-indigo-500 underline" href={d.support_url} target="_blank" rel="noreferrer">[{d.support || 'source'}]</a>
                )}
                {d.flag && <span className="whitespace-nowrap text-[10px] font-semibold text-red-600">[{d.flag}]</span>}
                {d.possible_support_pmid && <span className="whitespace-nowrap text-[10px] font-semibold text-amber-700">[possible support: PMID {d.possible_support_pmid}]</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Sources</p>
        <ul className="space-y-1 text-xs text-slate-500">
          {page.sources.map((s) => (
            <li key={s.pmid}>
              PMID {s.pmid}: {s.title} <span className="text-slate-400">({s.design}{s.year ? `, ${s.year}` : ''})</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={draft.reviewerNotes ? `Reviewer notes: ${draft.reviewerNotes}` : "Reviewer notes (optional)"}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          rows={2}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={reviewing === draft.topicId}
            onClick={() => onReview(draft.topicId, 'approved', notes || draft.reviewerNotes || undefined)}
            className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white transition-colors disabled:opacity-50 ${
              draft.reviewDecision === 'approved' ? 'bg-emerald-700 ring-2 ring-emerald-300' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {draft.reviewDecision === 'approved' ? '✓ Approved' : 'Approve'}
          </button>
          <button
            type="button"
            disabled={reviewing === draft.topicId}
            onClick={() => onReview(draft.topicId, 'needs_changes', notes || draft.reviewerNotes || undefined)}
            className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white transition-colors disabled:opacity-50 ${
              draft.reviewDecision === 'needs_changes' ? 'bg-orange-600 ring-2 ring-orange-300' : 'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            {draft.reviewDecision === 'needs_changes' ? '⚠ Needs review' : 'Needs review'}
          </button>
          <button
            type="button"
            disabled={reviewing === draft.topicId}
            onClick={() => onReview(draft.topicId, 'rejected', notes || draft.reviewerNotes || undefined)}
            className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white transition-colors disabled:opacity-50 ${
              draft.reviewDecision === 'rejected' ? 'bg-slate-700 ring-2 ring-slate-400' : 'bg-slate-500 hover:bg-slate-600'
            }`}
          >
            Reject
          </button>
          {decided && (
            <span className="ml-auto text-xs text-slate-400">
              State: <strong className="text-slate-600 dark:text-slate-300">{DECISION_LABEL[draft.status] ?? draft.status}</strong>
              {draft.reviewerNotes ? ` — ${draft.reviewerNotes}` : ''}
              {draft.reviewedAt ? ` (${new Date(draft.reviewedAt).toLocaleDateString()})` : ''}
              {draft.publishedAt ? ` · published ${new Date(draft.publishedAt).toLocaleDateString()}` : ''}
            </span>
          )}
        </div>
      </div>

      {draft.reviewDecision === 'approved' && !draft.publishedAt && (
        <div className="space-y-1">
          <button
            type="button"
            disabled={reviewing === draft.topicId}
            onClick={() => {
              if (window.confirm(`Publish this page to "${draft.topic}"? It replaces the topic's current mentor content (the previous content is kept on the draft).`)) {
                onPublish(draft.topicId);
              }
            }}
            className="rounded-full bg-indigo-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Publish to topic
          </button>
          <p className="text-[10px] text-slate-400">Admin only. Learners see nothing until this is published.</p>
        </div>
      )}
    </div>
  );
}

function QuickActions({ draft, onReview, reviewing }: { draft: TopicMentorDraft; onReview: Props['onReview']; reviewing: string | null }) {
  const [confirming, setConfirming] = React.useState<'approved' | 'needs_changes' | null>(null);
  const busy = reviewing === draft.topicId;

  const act = (decision: 'approved' | 'needs_changes') => {
    if (confirming === decision) {
      setConfirming(null);
      onReview(draft.topicId, decision);
    } else {
      setConfirming(decision);
      window.setTimeout(() => setConfirming((c) => (c === decision ? null : c)), 3000);
    }
  };

  const isApproved = draft.reviewDecision === 'approved';
  const isNeedsChanges = draft.reviewDecision === 'needs_changes';

  return (
    <div className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={busy}
        onClick={() => act('approved')}
        title="Approve this draft"
        className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
          confirming === 'approved'
            ? 'bg-emerald-700 text-white ring-2 ring-emerald-300'
            : isApproved
            ? 'bg-emerald-600 text-white shadow-xs'
            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
        }`}
      >
        {busy && confirming === 'approved' ? '…' : confirming === 'approved' ? 'Confirm approve' : isApproved ? '✓ Approved' : 'Approve'}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => act('needs_changes')}
        title="Mark this draft as needs review / needs changes"
        className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
          confirming === 'needs_changes'
            ? 'bg-orange-600 text-white ring-2 ring-orange-300'
            : isNeedsChanges
            ? 'bg-orange-600 text-white shadow-xs'
            : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
        }`}
      >
        {busy && confirming === 'needs_changes' ? '…' : confirming === 'needs_changes' ? 'Confirm needs review' : isNeedsChanges ? '⚠ Needs review' : 'Needs review'}
      </button>
    </div>
  );
}

export const MentorDraftsPanel: React.FC<Props> = ({ drafts, counts, loading, error, statusFilter, onStatusFilter, onRefresh, onReview, onPublish, reviewing }) => {
  const [expanded, setExpanded] = React.useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Filter drafts by status"
          value={statusFilter}
          onChange={(e) => onStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        >
          <option value="">All statuses</option>
          <option value="draft_pending_clinician_review">Pending review</option>
          <option value="needs_evidence">Needs evidence</option>
          <option value="approved">Approved</option>
          <option value="needs_changes">Needs review</option>
          <option value="rejected">Rejected</option>
          <option value="published">Published</option>
        </select>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400"
        >
          <i className="fas fa-sync-alt mr-1" /> Refresh
        </button>
        <div className="ml-auto flex gap-2 text-[10px] font-bold uppercase tracking-wider">
          {Object.entries(counts).map(([status, n]) => (
            <span key={status} className={`rounded-full px-2 py-0.5 ${STATUS_BADGE[status] ?? 'bg-slate-100 text-slate-500'}`}>
              {DECISION_LABEL[status] ?? status}: {n}
            </span>
          ))}
        </div>
      </div>

      {loading && <p className="py-6 text-center text-sm text-slate-400">Loading drafts…</p>}
      {error && <p className="py-6 text-center text-sm text-rose-500">{error}</p>}
      {!loading && !error && drafts.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-400">No mentor drafts found. Load drafts with server/scripts/loadTopicMentorDrafts.js.</p>
      )}

      {!loading && drafts.length > 0 && (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {drafts.map((d) => {
            const open = expanded === d.topicId;
            return (
              <React.Fragment key={d.topicId}>
                <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : d.topicId)}
                  className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${STATUS_BADGE[d.status] ?? 'bg-slate-100 text-slate-500'}`}>
                    {DECISION_LABEL[d.status] ?? d.status}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-200">{d.topic}</span>
                    <span className="block text-[10px] text-slate-400">
                      {d.teachingPoints} teaching points · {d.sourceCount} sources
                      {d.sourceBatch ? ` · ${d.sourceBatch}` : ''}
                    </span>
                  </span>
                  <i className={`fas fa-chevron-${open ? 'up' : 'down'} text-[10px] text-slate-300`} />
                </button>
                <QuickActions draft={d} onReview={onReview} reviewing={reviewing} />
                </div>
                {open && <DraftDetail draft={d} onReview={onReview} onPublish={onPublish} reviewing={reviewing} />}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
