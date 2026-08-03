import React from 'react';
import { useNavigatePage } from '@contexts/SearchContext';
import { api } from '@services/api';
import type { AgentGuidance, LearningHealthResponse, TeachingClaimReviewItem, TopicKnowledge } from '@types';
import {
  toSeminalPapers,
  toStringList,
  toTeachingPoints,
  type ActiveTab,
  type SeminalPaper,
  type TeachingPointDraft,
} from '@components/knowledge/KnowledgeReviewPanels';

export function useKnowledgeReviewPage() {
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

  return {
    setCurrentPage,
    topics,
    selected,
    setSelected,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    loading,
    saving,
    reviewing,
    error,
    notice,
    activeTab,
    setActiveTab,
    proposals,
    learningHealth,
    healthLoading,
    healthError,
    claimQueue,
    claimsLoading,
    claimsError,
    mentorMessage,
    setMentorMessage,
    seminalPapers,
    setSeminalPapers,
    teachingPoints,
    setTeachingPoints,
    caseHooks,
    setCaseHooks,
    mcqAngles,
    setMcqAngles,
    keywords,
    setKeywords,
    loadTopics,
    loadLearningHealth,
    loadClaimQueue,
    updateClaimVerification,
    checkClaimGuideline,
    updateCuratorMeta,
    proposalActionId,
    handleApproveProposal,
    handleRejectProposal,
    save,
    markReviewed,
    previewGuidance,
    reviewedCount,
    pendingCount,
    healthAttention,
    TABS,
  };
}
