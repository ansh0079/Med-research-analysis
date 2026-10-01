import React from 'react';
import { Button } from '@components/ui/Button';
import { api } from '@services/api';
import type { AgentGuidance } from '@types';
import { isLandmarkSeedKnowledge } from '@utils/topicKnowledgeTrust';

interface AgentMentorPanelProps {
  agentGuidance: AgentGuidance;
  isFlagshipTopic: boolean;
  isAuthenticated: boolean;
  topicGuideRefreshState: 'idle' | 'loading';
  onRefreshTopicGuide: () => void;
  knowledgeReviewStatus: 'idle' | 'saving' | 'saved' | 'error';
  onReviewTopicKnowledge: () => void;
  topicGuideRefreshError: string | null;
  canVerifyTeachingAnchor: boolean;
  anchorVerifyKey: string | null;
  onAnchorVerifyKeyChange: (key: string | null) => void;
  currentQuery: string;
  onAgentGuidanceChange: (guidance: AgentGuidance) => void;
}

export const AgentMentorPanel: React.FC<AgentMentorPanelProps> = ({
  agentGuidance,
  isFlagshipTopic,
  isAuthenticated,
  topicGuideRefreshState,
  onRefreshTopicGuide,
  knowledgeReviewStatus,
  onReviewTopicKnowledge,
  topicGuideRefreshError,
  canVerifyTeachingAnchor,
  anchorVerifyKey,
  onAnchorVerifyKeyChange,
  currentQuery,
  onAgentGuidanceChange,
}) => {
  const [open, setOpen] = React.useState(false);
  const [memoryFeedback, setMemoryFeedback] = React.useState<'helpful' | 'not_helpful' | null>(null);
  const [feedbackBusy, setFeedbackBusy] = React.useState(false);

  React.useEffect(() => {
    setMemoryFeedback(null);
  }, [agentGuidance.topic]);

  const submitMemoryFeedback = async (feedbackType: 'helpful' | 'not_helpful') => {
    if (!isAuthenticated || feedbackBusy || memoryFeedback) return;
    setFeedbackBusy(true);
    try {
      await api.ai.recordAgentFeedback({
        topic: agentGuidance.topic || currentQuery,
        feedbackType,
        reason: 'mentor_memory_panel',
      });
      setMemoryFeedback(feedbackType);
    } catch {
      /* optional toast */
    } finally {
      setFeedbackBusy(false);
    }
  };

  return (
  <section id="agent-mentor-panel" className="mb-4 neo-card overflow-hidden">
    <button
      type="button"
      onClick={() => setOpen((value) => !value)}
      aria-expanded={open}
      className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900"
    >
      <span className="flex min-w-0 items-center gap-2">
        <i className="fas fa-user-graduate text-[11px] text-slate-400" />
        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Mentor notes</span>
        <span className="hidden truncate text-xs text-slate-400 sm:inline">
          {agentGuidance.teachingPoints.length > 0
            ? `${agentGuidance.teachingPoints.length} teaching point${agentGuidance.teachingPoints.length === 1 ? '' : 's'}`
            : 'Seminal papers'}
          {' · '}
          {agentGuidance.status === 'human_reviewed' ? 'clinician reviewed' : 'AI generated'}
        </span>
      </span>
      <i className={`fas fa-chevron-down text-[11px] text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && (
    <div className="border-t border-slate-100 p-5 space-y-4 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-2">
        {isFlagshipTopic && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <i className="fas fa-award text-[9px]" /> Flagship
          </span>
        )}
        {agentGuidance.lastRefreshedAt && (
          <span className="text-[11px] text-slate-400">
            refreshed {new Date(agentGuidance.lastRefreshedAt).toLocaleDateString()}
          </span>
        )}
        {isAuthenticated && (
          <Button
            variant="ghost"
            size="sm"
            disabled={topicGuideRefreshState === 'loading'}
            onClick={() => void onRefreshTopicGuide()}
            leftIcon={<i className="fas fa-arrows-rotate text-[10px]" />}
          >
            {topicGuideRefreshState === 'loading' ? 'Refreshing…' : 'Refresh'}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {isLandmarkSeedKnowledge(agentGuidance) && (
          <span
            className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
            title="Landmark PMIDs are pinned; mentor copy still needs AI/human enrichment"
          >
            Landmark seed — not yet enriched
          </span>
        )}
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
          agentGuidance.status === 'human_reviewed'
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
        }`}>
          {agentGuidance.status === 'human_reviewed' ? 'Clinician reviewed' : 'AI generated'}
        </span>
        <span className="text-[11px] text-slate-400">
          confidence {Math.round((agentGuidance.confidence || 0) * 100)}%
        </span>
        {agentGuidance.status !== 'human_reviewed' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReviewTopicKnowledge}
            disabled={knowledgeReviewStatus === 'saving'}
            leftIcon={<i className="fas fa-check text-[10px]" />}
          >
            {knowledgeReviewStatus === 'saving' ? 'Saving' : 'Mark Reviewed'}
          </Button>
        )}
        {knowledgeReviewStatus === 'error' && (
          <span className="text-[11px] font-semibold text-red-500">Sign in or retry to review.</span>
        )}
        {topicGuideRefreshError && (
          <span className="text-[11px] font-semibold text-red-500">{topicGuideRefreshError}</span>
        )}
      </div>
      {isAuthenticated && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/40">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Was this mentor memory helpful?</span>
          <button
            type="button"
            disabled={feedbackBusy || Boolean(memoryFeedback)}
            onClick={() => void submitMemoryFeedback('helpful')}
            className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wide disabled:opacity-50 ${
              memoryFeedback === 'helpful'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 dark:bg-slate-900 dark:border-emerald-800 dark:text-emerald-300'
            }`}
          >
            Helpful
          </button>
          <button
            type="button"
            disabled={feedbackBusy || Boolean(memoryFeedback)}
            onClick={() => void submitMemoryFeedback('not_helpful')}
            className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wide disabled:opacity-50 ${
              memoryFeedback === 'not_helpful'
                ? 'bg-rose-600 text-white'
                : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50 dark:bg-slate-900 dark:border-rose-800 dark:text-rose-300'
            }`}
          >
            Wrong / not helpful
          </button>
          {memoryFeedback && (
            <span className="text-[11px] text-slate-500">Thanks — this trains the learning loop.</span>
          )}
        </div>
      )}
      {agentGuidance.seminalPapers.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {agentGuidance.seminalPapers.slice(0, 4).map((paper) => (
            <div key={`${paper.sourceIndex}-${paper.title}`} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">[{paper.sourceIndex}] {paper.title}</p>
              {paper.clinicalPrinciple && (
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{paper.clinicalPrinciple}</p>
              )}
            </div>
          ))}
        </div>
      )}
      {agentGuidance.teachingPoints.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Key Teaching Points</p>
          <ul className="space-y-1.5">
            {agentGuidance.teachingPoints.slice(0, 4).map((tp, i) => {
              const anchored = (agentGuidance.verifiedAnchors || []).some((a) => (a.text || '').trim() === (tp.claim || '').trim());
              return (
                <li key={i} className="flex gap-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed items-start">
                  <i className="fas fa-circle-dot text-emerald-500 mt-0.5 text-[8px] shrink-0" />
                  <span className="flex-1 min-w-0">{tp.claim}</span>
                  {anchored && (
                    <span className="shrink-0 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5">
                      Anchor
                    </span>
                  )}
                  {canVerifyTeachingAnchor && !anchored && isAuthenticated && (
                    <button
                      type="button"
                      disabled={anchorVerifyKey === `tp-${i}`}
                      onClick={async () => {
                        const key = `tp-${i}`;
                        onAnchorVerifyKeyChange(key);
                        try {
                          const topic = agentGuidance.topic || currentQuery;
                          const res = await api.knowledge.verifyTopicKnowledgeAnchor(topic, { claimText: tp.claim });
                          if (res.agentGuidance) onAgentGuidanceChange(res.agentGuidance);
                        } catch {
                          /* toast optional */
                        } finally {
                          onAnchorVerifyKeyChange(null);
                        }
                      }}
                      className="shrink-0 text-[10px] font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-40"
                    >
                      {anchorVerifyKey === `tp-${i}` ? '…' : 'Verify'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
    )}
  </section>
  );
};
