import React from 'react';
import { Button } from '@components/ui/Button';
import { api } from '@services/api';
import type { AgentGuidance } from '@types';
import { isLandmarkSeedKnowledge } from '@utils/topicKnowledgeTrust';
import type { BriefDifficulty } from './TopicBriefPanel';

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
  onOpenCase: (difficulty?: BriefDifficulty) => void;
  onOpenQuiz: (difficulty?: BriefDifficulty) => void;
  onSynthesize: () => void;
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
  onOpenCase,
  onOpenQuiz,
  onSynthesize,
}) => (
  <div id="agent-mentor-panel" className="mb-4 neo-card overflow-hidden border border-emerald-100 dark:border-emerald-900/40">
    <div className="bg-emerald-600 px-5 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <i className="fas fa-user-graduate text-white text-sm" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
            {isFlagshipTopic ? 'Flagship Topic · Evidence Mentor Ready' : 'Mentor Message'}
          </p>
          <p className="text-sm font-black text-white truncate">{agentGuidance.topic}</p>
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-2">
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
        {isFlagshipTopic && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
            <i className="fas fa-award text-[9px]" />
            Flagship
          </span>
        )}
        {agentGuidance.lastRefreshedAt && (
          <span className="text-[10px] font-mono text-white/70">
            refreshed {new Date(agentGuidance.lastRefreshedAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
    <div className="p-5 space-y-4">
      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{agentGuidance.mentorMessage}</p>
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
      <div className="flex flex-wrap gap-2">
        <Button variant="gradient" size="sm" onClick={() => onOpenCase('mixed')}
          leftIcon={<i className="fas fa-stethoscope text-[10px]" />}>Generate Case</Button>
        <Button variant="secondary" size="sm" onClick={() => onOpenQuiz('mixed')}
          leftIcon={<i className="fas fa-brain text-[10px]" />}>Generate MCQs</Button>
        <Button variant="ghost" size="sm" onClick={onSynthesize}
          leftIcon={<i className="fas fa-layer-group text-[10px]" />}>Review Seminal Evidence</Button>
      </div>
    </div>
  </div>
);
