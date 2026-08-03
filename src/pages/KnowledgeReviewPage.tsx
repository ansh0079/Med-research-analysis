import React from 'react';
import {
  ClaimsReviewPanel,
  LearningHealthPanel,
  PreviewPanel,
  SeminalPapersEditor,
  SourcesPanel,
  StringListEditor,
  TeachingPointsEditor,
  statusLabel,
} from '@components/knowledge/KnowledgeReviewPanels';
import { TopicItemPsychometricsPanel } from '@components/knowledge/TopicItemPsychometricsPanel';
import { useKnowledgeReviewPage } from '@hooks/useKnowledgeReviewPage';

export const KnowledgeReviewPage: React.FC = () => {
  const {
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
  } = useKnowledgeReviewPage();

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
