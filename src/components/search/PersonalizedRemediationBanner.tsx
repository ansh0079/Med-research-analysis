import React from 'react';
import type { AgentGuidance, LearnerContextSummary } from '@types';

interface PersonalizedRemediationBannerProps {
  learnerContext: LearnerContextSummary;
  onOpenQuiz: () => void;
  agentGuidance: AgentGuidance | null;
}

export const PersonalizedRemediationBanner: React.FC<PersonalizedRemediationBannerProps> = ({
  learnerContext,
  onOpenQuiz,
  agentGuidance,
}) => (
  <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/50 dark:bg-violet-950/25">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-300">Personalized remediation</p>
        <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
          {learnerContext.weakClaimCount > 0
            ? `${learnerContext.weakClaimCount} weak claim${learnerContext.weakClaimCount === 1 ? '' : 's'} from your learning history match this topic.`
            : learnerContext.hasTrajectory
              ? 'Your recent learning trajectory includes this topic.'
              : 'This search overlaps with prior weak topics.'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpenQuiz}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-bold text-white hover:bg-violet-500"
        >
          <i className="fas fa-brain text-[10px]" /> Targeted quiz
        </button>
        {agentGuidance && (
          <button
            type="button"
            onClick={() => document.getElementById('agent-mentor-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-300 px-3 text-xs font-bold text-violet-700 hover:bg-white dark:border-violet-800 dark:text-violet-200 dark:hover:bg-violet-900/40"
          >
            <i className="fas fa-comments text-[10px]" /> Ask mentor
          </button>
        )}
      </div>
    </div>
  </div>
);
