import React from 'react';
import { useNavigatePage } from '@contexts/SearchContext';
import { api } from '@services/api';
import type { AgentGuidance, LearningHealthResponse, TeachingClaimReviewItem, TopicKnowledge } from '@types';
import {
  ClaimsReviewPanel,
  LearningHealthPanel,
  PreviewPanel,
  SeminalPapersEditor,
  SourcesPanel,
  StringListEditor,
  TeachingPointsEditor,
  statusLabel,
  toSeminalPapers,
  toStringList,
  toTeachingPoints,
  type ActiveTab,
  type SeminalPaper,
  type TeachingPointDraft,
} from '@components/knowledge/KnowledgeReviewPanels';
import { TopicItemPsychometricsPanel } from '@components/knowledge/TopicItemPsychometricsPanel';

export const KnowledgeReviewPage: React.FC = () => {
  const setCurrentPage = useNavigatePage();

  const [topics, setTopics] = React.useState<TopicKnowledge[]>([]);
  const [selected, setSelected] = React.useState<TopicKnowledge | null>(null);
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [reviewing, setReviewing] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<ActiveTab>('edit');
  const [proposals, setProposals] = React.useState<import('../types').TopicKnowledgeProposal[]>([]);
  const [learningHealth, setLearningHealth] = React.useState<LearningHealthResponse['health'] | null>(null);
  const [healthLoading, setHealthLoading] = React.useState(false);
  const [healthError, setHealthError] = React.useState('');
  const [claimQueue, setClaimQueue] = React.useState<TeachingClaimReviewItem[]>([]);
  const [claimsLoading, setClaimsLoading] = React.useState(false);
  const [claimsError, setClaimsError] = React.useState('');

  // Editor state
  const [mentorMessage, setMentorMessage] = React.useState('');
  const [seminalPapers, setSeminalPapers] = React.useState<SeminalPaper[]>([]);
  const [teachingPoints, setTeachingPoints] = React.useState<TeachingPointDraft[]>([]);
  const [caseHooks, setCaseHooks] = React.useState<string[]>([]);
  const [mcqAngles, setMcqAngles] = React.useState<string[]>([]);
  const [keywords, setKeywords] = React.useState<string[]>([]);

  const loadTopics = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.knowledge.listTopicKnowledge({ query, status: statusFilter, limit: 100 });
      setTopics(data.topics);
      setSelected((current) => {
        if (!current) return data.topics[0] ?? null;
        return data.topics.find((t) => t.id === current.id) ?? data.topics[0] ?? null;
      });
    } catch (err) {
      setError(
        err instanceof Error && err.message === 'AUTH_REQUIRED'
          ? 'Sign in to review topic knowledge.'
          : 'Failed to load topic knowledge.'
      );
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter]);

  const [prevSelected, setPrevSelected] = React.useState<TopicKnowledge | null>(null);
  if (prevSelected !== selected) {
    setPrevSelected(selected);
    if (selected) {
      const k = selected.knowledge || {};
      setMentorMessage(String(k.mentorMessage || ''));
      setSeminalPapers(toSeminalPapers(k.seminalPapers));
      setTeachingPoints(toTeachingPoints(k.teachingPoints || k.coreTeachingPoints));
      setCaseHooks(toStringList(k.caseGenerationHooks));
      setMcqAngles(toStringList(k.mcqAngles));
      setKeywords(toStringList(k.keywords));
      setNotice('');
      setError('');
      setActiveTab('edit');
      // Fetch pending proposals for this topic
      api.learning.getTopicProposals(selected.topic)
        .then((data) => setProposals(data.proposals))
        .catch(() => setProposals([]));
      setClaimQueue([]);
      setClaimsError('');
    }
  }

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadTopics();
    })();
    return () => { cancelled = true; };
  }, [loadTopics]);

  const loadLearningHealth = React.useCallback(async () => {
    setHealthLoading(true);
    setHealthError('');
    try {
      const data = await api.knowledge.getLearningHealth({ limit: 10, days: 7 });
      setLearningHealth(data.health);
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : 'Failed to load learning health.');
    } finally {
      setHealthLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    if (!learningHealth && !healthLoading) {
      void Promise.resolve().then(() => {
        if (!cancelled) void loadLearningHealth();
      });
    }
    return () => { cancelled = true; };
  }, [healthLoading, learningHealth, loadLearningHealth]);

  const loadClaimQueue = React.useCallback(async () => {
    setClaimsLoading(true);
    setClaimsError('');
    try {
      const data = await api.knowledge.getTeachingClaimReviewQueue({
        topic: selected?.topic,
        limit: 40,
      });
      setClaimQueue(data.claims);
    } catch (err) {
      setClaimsError(err instanceof Error ? err.message : 'Failed to load claim review queue.');
    } finally {
      setClaimsLoading(false);
    }
  }, [selected]);

  React.useEffect(() => {
    let cancelled = false;
    if (activeTab === 'claims' && selected) {
      void Promise.resolve().then(() => {
        if (!cancelled) void loadClaimQueue();
      });
    }
    return () => { cancelled = true; };
  }, [activeTab, loadClaimQueue, selected]);

  const updateClaimVerification = async (
    claim: TeachingClaimReviewItem,
    verificationStatus: string,
    opts?: { claimText?: string; verificationReason?: string },
  ) => {
    const verificationReason = opts?.verificationReason
      ?? (verificationStatus === 'human_reviewed'
        ? 'Curator reviewed from claim queue.'
        : `Curator marked as ${verificationStatus.replace(/_/g, ' ')}.`);
    try {
      const result = await api.knowledge.updateTeachingClaimVerification(claim.claimKey, {
        verificationStatus,
        verificationReason,
        claimText: opts?.claimText,
      });
      setClaimQueue((prev) => prev.map((item) => (item.claimKey === claim.claimKey ? { ...item, ...result.claim } : item)));
      setNotice(`Claim marked ${verificationStatus.replace(/_/g, ' ')}.`);
    } catch (err) {
      setClaimsError(err instanceof Error ? err.message : 'Failed to update claim.');
    }
  };

  const checkClaimGuideline = async (claim: TeachingClaimReviewItem) => {
    try {
      const result = await api.knowledge.checkTeachingClaimGuidelineAlignment(claim.claimKey);
      setClaimQueue((prev) => prev.map((item) => (item.claimKey === claim.claimKey ? { ...item, ...result.claim } : item)));
      setNotice(`Guideline check: ${result.alignment.alignmentStatus.replace(/_/g, ' ')}.`);
    } catch (err) {
      setClaimsError(err instanceof Error ? err.message : 'Failed to check guideline alignment.');
    }
  };

  const updateCuratorMeta = async (claim: TeachingClaimReviewItem, patch: Record<string, boolean | string>) => {
    try {
      const { claim: updated } = await api.knowledge.updateTeachingClaimCuratorMetadata(claim.claimKey, patch);
      setClaimQueue((prev) => prev.map((item) => (item.claimKey === claim.claimKey ? { ...item, ...(updated as TeachingClaimReviewItem) } : item)));
      setNotice('Curator metadata updated.');
    } catch (err) {
      setClaimsError(err instanceof Error ? err.message : 'Failed to update curator metadata.');
    }
  };

  const [proposalActionId, setProposalActionId] = React.useState<number | null>(null);

  const handleApproveProposal = async (proposalId: number) => {
    setProposalActionId(proposalId);
    setError('');
    try {
      const result = await api.knowledge.approveTopicKnowledgeProposal(proposalId);
      setNotice(`Proposal #${proposalId} approved — live topic memory updated.`);
      setProposals((prev) => prev.filter((p) => p.id !== proposalId));
      if (result.topicKnowledge) {
        setSelected(result.topicKnowledge);
        setTopics((prev) => {
          const idx = prev.findIndex((t) => t.id === result.topicKnowledge.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = result.topicKnowledge;
            return next;
          }
          return [result.topicKnowledge, ...prev];
        });
      }
      await loadTopics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve proposal.');
    } finally {
      setProposalActionId(null);
    }
  };

  const handleRejectProposal = async (proposalId: number) => {
    setProposalActionId(proposalId);
    setError('');
    try {
      await api.knowledge.rejectTopicKnowledgeProposal(proposalId);
      setNotice(`Proposal #${proposalId} rejected.`);
      setProposals((prev) => prev.filter((p) => p.id !== proposalId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject proposal.');
    } finally {
      setProposalActionId(null);
    }
  };

  const buildKnowledge = (): TopicKnowledge['knowledge'] => ({
    ...selected!.knowledge,
    mentorMessage: mentorMessage.trim(),
    seminalPapers: seminalPapers.filter((p) => p.title.trim()),
    teachingPoints: teachingPoints
      .filter((point) => point.claim.trim())
      .map((point) => ({
        claim: point.claim.trim(),
        sourceIndices: point.sourceIndices,
        confidence: point.confidence,
      })),
    caseGenerationHooks: caseHooks.filter(Boolean),
    mcqAngles: mcqAngles.filter(Boolean),
    keywords: keywords.filter(Boolean),
  });

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await api.knowledge.updateTopicKnowledge(selected.topic, {
        knowledge: buildKnowledge(),
        sourceArticles: selected.sourceArticles,
        status: 'human_edited',
        confidence: Math.max(selected.confidence || 0, 0.9),
      });
      const tk = updated.topicKnowledge;
      setSelected(tk);
      setTopics((prev) => prev.map((t) => (t.id === tk.id ? tk : t)));
      setNotice('Saved and marked as clinician-edited.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const markReviewed = async () => {
    if (!selected) return;
    setReviewing(true);
    setError('');
    setNotice('');
    try {
      const result = await api.knowledge.reviewTopicKnowledge(selected.topic);
      if (result.agentGuidance) {
        await loadTopics();
        setNotice('Marked as clinician reviewed — this knowledge is now trusted.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark reviewed.');
    } finally {
      setReviewing(false);
    }
  };

  const previewGuidance: Partial<AgentGuidance> & { topic: string } = {
    topic: selected?.topic || '',
    mentorMessage,
    seminalPapers: seminalPapers.map((p) => ({
      sourceIndex: p.sourceIndex,
      title: p.title,
      clinicalPrinciple: p.clinicalPrinciple,
    })),
  };

  const reviewedCount = topics.filter(
    (t) => t.status === 'human_reviewed' || t.status === 'human_edited'
  ).length;
  const pendingCount = topics.length - reviewedCount;
  const healthAttention = React.useMemo(() => {
    if (!learningHealth) {
      return {
        count: 0,
        failedRuns: 0,
        lowRecall: 0,
        refreshQueued: 0,
        label: healthError ? 'Learning health unavailable' : 'Learning health loading',
      };
    }
    const failedRuns = learningHealth.schedulerRuns.filter((run) => (
      run.errorCount > 0 || ['failed', 'completed_with_errors'].includes(String(run.status || '').toLowerCase())
    )).length;
    const lowRecall = learningHealth.lowRecall.items.length;
    const refreshQueued = learningHealth.refreshCandidates.length;
    const count = failedRuns + lowRecall + refreshQueued;
    const parts = [
      failedRuns ? `${failedRuns} failed runs` : '',
      lowRecall ? `${lowRecall} low-recall queries` : '',
      refreshQueued ? `${refreshQueued} refresh candidates` : '',
    ].filter(Boolean);
    return {
      count,
      failedRuns,
      lowRecall,
      refreshQueued,
      label: parts.length ? parts.join(', ') : 'Learning system clear',
    };
  }, [healthError, learningHealth]);

  const TABS: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'edit', label: 'Edit', icon: 'fa-pen' },
    { id: 'preview', label: 'Preview', icon: 'fa-eye' },
    { id: 'sources', label: `Sources (${selected?.sourceArticles?.length ?? 0})`, icon: 'fa-file-alt' },
    { id: 'claims', label: `Claims${claimQueue.length ? ` (${claimQueue.length})` : ''}`, icon: 'fa-shield-alt' },
    { id: 'health', label: 'Learning Health', icon: 'fa-chart-line' },
  ];

  return (
    <div className="min-h-screen aurora-bg pb-20">
      <div className="aurora-content">
        {/* Header */}
        <header className="max-w-7xl mx-auto px-4 pt-10 pb-8">
          <button
            type="button"
            onClick={() => setCurrentPage('search')}
            className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-indigo-600"
          >
            <i className="fas fa-arrow-left" /> Back to Search
          </button>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-400/20">
                <i className="fas fa-book-medical text-white text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">Knowledge Curator</h1>
                <p className="text-sm text-slate-400">Review, edit, and approve the agent's clinical topic memory.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="neo-card px-4 py-2 text-center">
                <p className="font-mono text-lg font-black text-slate-900 dark:text-white">{topics.length}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Topics</p>
              </div>
              <div className="neo-card px-4 py-2 text-center">
                <p className="font-mono text-lg font-black text-emerald-600">{reviewedCount}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Reviewed</p>
              </div>
              {pendingCount > 0 && (
                <div className="neo-card px-4 py-2 text-center">
                  <p className="font-mono text-lg font-black text-amber-500">{pendingCount}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pending</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setCurrentPage('guidelines')}
                className="neo-card px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <i className="fas fa-book-medical mr-1" /> Guidelines
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto grid gap-4 px-4 lg:grid-cols-[20rem_1fr]">
          {/* Sidebar */}
          <aside className="neo-card overflow-hidden self-start">
            <div className="border-b border-slate-100 p-3 dark:border-slate-800 space-y-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search topics…"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="">All statuses</option>
                <option value="ai_generated">AI Generated</option>
                <option value="human_reviewed">Clinician Reviewed</option>
                <option value="human_edited">Clinician Edited</option>
              </select>
            </div>
            <div className="max-h-[68vh] overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/60">
              {loading && <p className="p-4 text-sm text-slate-400">Loading…</p>}
              {!loading && topics.length === 0 && (
                <p className="p-4 text-sm text-slate-400">
                  No topics stored yet. Search for a medical topic to start building the knowledge base.
                </p>
              )}
              {topics.map((item) => {
                const s = statusLabel(item.status);
                const isActive = selected?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item)}
                    className={`w-full px-4 py-3 text-left transition-colors ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <p className={`truncate text-sm font-bold ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>
                      {item.topic}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${s.bg}`}>
                        {s.label}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {Math.round((item.confidence || 0) * 100)}%
                      </span>
                      <span className="ml-auto text-[9px] text-slate-300 dark:text-slate-600">
                        {item.knowledge?.seminalPapers?.length ?? 0} papers
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Detail panel */}
          <section className="neo-card overflow-hidden">
            {!selected ? (
              <div className="flex min-h-[40rem] flex-col items-center justify-center gap-3 text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <i className="fas fa-book-open text-slate-300 dark:text-slate-600 text-2xl" />
                </div>
                <p className="text-sm text-slate-400">Select a topic from the list to review its knowledge.</p>
              </div>
            ) : (
              <>
                {/* Topic header */}
                <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Topic</p>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white capitalize">{selected.topic}</h2>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Last updated {new Date(selected.updatedAt).toLocaleString()}
                        {selected.lastRefreshedAt && ` · refreshed ${new Date(selected.lastRefreshedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${statusLabel(selected.status).bg}`}>
                        {statusLabel(selected.status).label}
                      </span>
                      <span className="text-xs text-slate-400">{Math.round((selected.confidence || 0) * 100)}% confidence</span>
                      {selected.status !== 'human_reviewed' && (
                        <button
                          type="button"
                          onClick={() => void markReviewed()}
                          disabled={reviewing}
                          className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                        >
                          {reviewing
                            ? <><i className="fas fa-circle-notch fa-spin" /> Saving…</>
                            : <><i className="fas fa-check-circle" /> Mark Reviewed</>
                          }
                        </button>
                      )}
                      {selected.status === 'human_reviewed' && (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                          <i className="fas fa-check-circle" /> Clinician approved
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="mt-4 flex gap-1">
                    {TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        title={tab.id === 'health' ? healthAttention.label : undefined}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                          activeTab === tab.id
                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        <i className={`fas ${tab.icon} text-[10px]`} />
                        {tab.label}
                        {tab.id === 'health' && healthAttention.count > 0 && (
                          <span
                            aria-label={healthAttention.label}
                            className={`ml-1 min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-black leading-none text-white ${
                              healthAttention.failedRuns > 0 ? 'bg-red-600' : 'bg-amber-500'
                            }`}
                          >
                            {healthAttention.count > 99 ? '99+' : healthAttention.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Adaptive memory proposal banner */}
                {proposals.length > 0 && (
                  <div className="mx-6 mt-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-900/40 dark:bg-violet-950/20">
                    <div className="flex items-start gap-3">
                      <i className="fas fa-lightbulb text-violet-500 mt-0.5 text-sm" />
                      <div className="flex-1 min-w-0 space-y-3">
                        <div>
                          <p className="text-xs font-bold text-violet-800 dark:text-violet-200">
                            {proposals.length} pending knowledge proposal{proposals.length === 1 ? '' : 's'} for "{selected.topic}"
                          </p>
                          <p className="text-[11px] text-violet-600 dark:text-violet-300 mt-0.5">
                            Adaptive memory drafts from evolution / study signals — approve to commit live, or reject.
                          </p>
                        </div>
                        {proposals.slice(0, 5).map((proposal) => (
                          <div
                            key={proposal.id}
                            className="rounded-lg border border-violet-200/80 bg-white/70 px-3 py-2 dark:border-violet-800/50 dark:bg-slate-900/40"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                                  #{proposal.id} · confidence {Math.round((proposal.confidence || 0) * 100)}%
                                  {proposal.proposedStatus ? ` · ${proposal.proposedStatus.replace(/_/g, ' ')}` : ''}
                                </p>
                                {proposal.reason && (
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                    {proposal.reason}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  disabled={proposalActionId === proposal.id}
                                  onClick={() => void handleApproveProposal(proposal.id)}
                                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white hover:bg-emerald-500 disabled:opacity-50"
                                >
                                  {proposalActionId === proposal.id ? '…' : 'Approve'}
                                </button>
                                <button
                                  type="button"
                                  disabled={proposalActionId === proposal.id}
                                  onClick={() => void handleRejectProposal(proposal.id)}
                                  className="rounded-lg bg-slate-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-700 hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-200"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Alerts */}
                {error && (
                  <div className="mx-6 mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:bg-red-950/30">
                    {error}
                  </div>
                )}
                {notice && (
                  <div className="mx-6 mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 flex items-center gap-2">
                    <i className="fas fa-check-circle" /> {notice}
                  </div>
                )}

                {/* Tab content */}
                <div className="p-6">
                  {activeTab === 'edit' && (
                    <div className="space-y-6">
                      {/* Mentor message */}
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">
                          Mentor Message
                        </label>
                        <textarea
                          value={mentorMessage}
                          onChange={(e) => setMentorMessage(e.target.value)}
                          rows={4}
                          placeholder="What should the agent tell learners about this topic when they first search it?"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>

                      <SeminalPapersEditor papers={seminalPapers} onChange={setSeminalPapers} />

                      <TeachingPointsEditor points={teachingPoints} onChange={setTeachingPoints} />

                      <div className="grid gap-6 md:grid-cols-2">
                        <StringListEditor
                          label="Case Generation Hooks"
                          items={caseHooks}
                          placeholder="A patient scenario to generate a case from…"
                          onChange={setCaseHooks}
                        />
                        <StringListEditor
                          label="MCQ Angles"
                          items={mcqAngles}
                          placeholder="A clinical reasoning angle for an MCQ…"
                          onChange={setMcqAngles}
                        />
                      </div>

                      <StringListEditor
                        label="Keywords"
                        items={keywords}
                        placeholder="keyword"
                        onChange={setKeywords}
                      />

                      {/* Save bar */}
                      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => void loadTopics()}
                          className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                        >
                          Discard Changes
                        </button>
                        <button
                          type="button"
                          onClick={() => void save()}
                          disabled={saving}
                          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                          {saving
                            ? <><i className="fas fa-circle-notch fa-spin" /> Saving…</>
                            : <><i className="fas fa-save" /> Save Edits</>
                          }
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'preview' && (
                    <div>
                      <p className="mb-4 text-xs text-slate-400">
                        This is how the knowledge panel appears to learners on the search results page.
                      </p>
                      <PreviewPanel guidance={previewGuidance} />
                    </div>
                  )}

                  {activeTab === 'sources' && (
                    <SourcesPanel sourceArticles={selected.sourceArticles} />
                  )}

                  {activeTab === 'claims' && (
                    <ClaimsReviewPanel
                      claims={claimQueue}
                      loading={claimsLoading}
                      error={claimsError}
                      onRefresh={() => void loadClaimQueue()}
                      onUpdate={(claim, verificationStatus, opts) => void updateClaimVerification(claim, verificationStatus, opts)}
                      onGuidelineCheck={(claim) => void checkClaimGuideline(claim)}
                      onCuratorMeta={(claim, patch) => void updateCuratorMeta(claim, patch)}
                    />
                  )}

                  {activeTab === 'health' && (
                    <div className="space-y-4">
                      <LearningHealthPanel
                        health={learningHealth}
                        loading={healthLoading}
                        error={healthError}
                        onRefresh={() => void loadLearningHealth()}
                      />
                      <TopicItemPsychometricsPanel memory={selected.knowledge?.collective_memory} />
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default KnowledgeReviewPage;
