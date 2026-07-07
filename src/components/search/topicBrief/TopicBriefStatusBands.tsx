import React from 'react';
import type { AgentGuidance, ProactiveEvidenceAlert, TopicEvidenceMemory } from '@types';

interface Props {
  retractedCount: number;
  preprintCount: number;
  driftForTopic: ProactiveEvidenceAlert | null;
  onDismissKnowledgeDrift?: (id: number) => void;
  evidenceMemory?: TopicEvidenceMemory | null;
  agentGuidance?: AgentGuidance | null;
  guidelineCount: number;
  hasReviewedGuidelines: boolean;
}

export const TopicBriefStatusBands: React.FC<Props> = ({
  retractedCount,
  preprintCount,
  driftForTopic,
  onDismissKnowledgeDrift,
  evidenceMemory,
  agentGuidance,
  guidelineCount,
  hasReviewedGuidelines,
}) => (
  <>
    {(retractedCount > 0 || preprintCount > 0) && (
      <div className="flex flex-wrap gap-3 px-5 py-2 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/40 text-xs font-semibold">
        {retractedCount > 0 && (
          <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
            <i className="fas fa-triangle-exclamation" />
            {retractedCount} retracted paper{retractedCount > 1 ? 's' : ''} excluded from curated list
          </span>
        )}
        {preprintCount > 0 && (
          <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <i className="fas fa-hourglass-half" />
            {preprintCount} preprint{preprintCount > 1 ? 's' : ''} in results — not peer-reviewed
          </span>
        )}
      </div>
    )}

    {driftForTopic && (
      <div className="px-5 py-3 bg-violet-50/90 dark:bg-violet-950/30 border-b border-violet-100 dark:border-violet-900/40">
        <div className="flex flex-col sm:flex-row sm:items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-700 dark:text-violet-400 mb-1 flex items-center gap-1.5">
              <i className="fas fa-bell text-[9px]" />
              What&apos;s New (your topic)
            </p>
            <p className="text-xs text-violet-900 dark:text-violet-100 leading-relaxed">{driftForTopic.summary}</p>
          </div>
          {onDismissKnowledgeDrift && (
            <button
              type="button"
              onClick={() => onDismissKnowledgeDrift(driftForTopic.id)}
              className="shrink-0 rounded-lg bg-violet-600 text-white text-[11px] font-bold px-3 py-1.5 hover:bg-violet-700"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    )}

    {evidenceMemory && evidenceMemory.messages.length > 0 && (
      <div className="px-5 py-3 bg-slate-50/80 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Evidence memory
          </span>
          {evidenceMemory.messages.map((message) => (
            <span
              key={message.key}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                message.tone === 'positive'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : message.tone === 'warning'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {message.text}
            </span>
          ))}
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {evidenceMemory.trustedClaimCount ?? 0}/{evidenceMemory.totalClaims} trusted claims
          </span>
        </div>
      </div>
    )}

    {agentGuidance && (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2 bg-emerald-50/60 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/40 text-[11px]">
        <span className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
          <i className="fas fa-user-graduate text-[10px]" />
          Mentor knowledge loaded
        </span>
        {agentGuidance.seminalPapers?.length > 0 && (
          <span className="text-emerald-600 dark:text-emerald-500">
            {agentGuidance.seminalPapers.length} seminal paper{agentGuidance.seminalPapers.length === 1 ? '' : 's'} stored
          </span>
        )}
        {agentGuidance.teachingPoints?.length > 0 && (
          <span className="text-emerald-600 dark:text-emerald-500">
            {agentGuidance.teachingPoints.length} teaching point{agentGuidance.teachingPoints.length === 1 ? '' : 's'}
          </span>
        )}
        <span className={`ml-auto rounded-full px-2 py-0.5 font-bold uppercase tracking-wider ${
          agentGuidance.status === 'human_reviewed'
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
            : agentGuidance.status === 'human_edited'
            ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
        }`}>
          {agentGuidance.status === 'human_reviewed' ? 'Clinician reviewed' : agentGuidance.status === 'human_edited' ? 'Clinician edited' : 'AI generated'}
        </span>
      </div>
    )}

    {guidelineCount > 0 && (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2 bg-blue-50/70 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/40 text-[11px]">
        <span className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-300 shrink-0">
          <i className="fas fa-book-medical text-[10px]" />
          Guideline snapshot loaded
        </span>
        <span className="text-blue-600 dark:text-blue-400">
          {guidelineCount} stored recommendation{guidelineCount === 1 ? '' : 's'}
        </span>
        <span className={`ml-auto rounded-full px-2 py-0.5 font-bold uppercase tracking-wider ${
          hasReviewedGuidelines
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
        }`}>
          {hasReviewedGuidelines ? 'Reviewed guidance present' : 'Needs curator review'}
        </span>
      </div>
    )}
  </>
);
