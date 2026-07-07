import React from 'react';
import { Button } from '@components/ui/Button';
import { TopicIntelligenceStatusBanner } from '@components/search/TopicIntelligenceStatusBanner';
import type { AgentGuidance, TopicGuideStatus } from '@types';
import type { BriefDifficulty } from './TopicBriefPanel';

interface TopicKnowledgeDiscoveryProps {
  currentQuery: string;
  resultsCount: number;
  intelligenceLoading: boolean;
  topicGuideStatus: TopicGuideStatus;
  proposeError: string | null;
  proposingKnowledge: boolean;
  onProposeKnowledge: () => void;
  proposedGuidance: AgentGuidance | null;
  onOpenCase: (difficulty?: BriefDifficulty) => void;
  onOpenQuiz: (difficulty?: BriefDifficulty) => void;
}

export const TopicKnowledgeDiscovery: React.FC<TopicKnowledgeDiscoveryProps> = ({
  currentQuery,
  resultsCount,
  intelligenceLoading,
  topicGuideStatus,
  proposeError,
  proposingKnowledge,
  onProposeKnowledge,
  proposedGuidance,
  onOpenCase,
  onOpenQuiz,
}) => (
  <>
    {!proposedGuidance && (
      <div className="mb-4 neo-card overflow-hidden border border-indigo-100 dark:border-indigo-900/40">
        <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <i className="fas fa-compass text-white text-sm" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Discovery</p>
              <p className="text-sm font-black text-white truncate">{currentQuery}</p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <TopicIntelligenceStatusBanner
            intelligenceLoading={intelligenceLoading}
            topicGuideStatus={topicGuideStatus}
          />
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            I&apos;m exploring this topic for the first time. I found <strong>{resultsCount} papers</strong> across multiple sources.
            Would you like me to synthesise what I found and add it to memory so future searches get a mentor greeting?
          </p>
          {proposeError && (
            <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
              <i className="fas fa-triangle-exclamation mr-1" />{proposeError}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onProposeKnowledge}
              disabled={proposingKnowledge}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold transition-colors"
            >
              {proposingKnowledge ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
                  Synthesising…
                </>
              ) : (
                <>
                  <i className="fas fa-brain text-[10px]" />
                  Synthesise &amp; Add to Memory
                </>
              )}
            </button>
            <span className="text-[11px] text-slate-400">
              Requires sign-in. Creates a proposal for curator review.
            </span>
          </div>
        </div>
      </div>
    )}

    {proposedGuidance && (
      <div className="mb-4 neo-card overflow-hidden border border-violet-100 dark:border-violet-900/40">
        <div className="bg-violet-600 px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <i className="fas fa-lightbulb text-white text-sm" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Proposed Knowledge · Pending Review</p>
              <p className="text-sm font-black text-white truncate">{proposedGuidance.topic}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
            <i className="fas fa-clock text-[9px]" /> Awaiting curator
          </span>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{proposedGuidance.mentorMessage}</p>
          {proposedGuidance.seminalPapers.length > 0 && (
            <div className="grid gap-2 md:grid-cols-2">
              {proposedGuidance.seminalPapers.slice(0, 4).map((paper) => (
                <div key={`${paper.sourceIndex}-${paper.title}`} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">[{paper.sourceIndex}] {paper.title}</p>
                  {paper.clinicalPrinciple && (
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{paper.clinicalPrinciple}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          {proposedGuidance.teachingPoints.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Key Teaching Points</p>
              <ul className="space-y-1.5">
                {proposedGuidance.teachingPoints.slice(0, 4).map((tp, i) => (
                  <li key={i} className="flex gap-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    <i className="fas fa-circle-dot text-violet-500 mt-0.5 text-[8px] shrink-0" />
                    <span>{typeof tp === 'string' ? tp : tp.claim}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="gradient" size="sm" onClick={() => onOpenCase('mixed')}
              leftIcon={<i className="fas fa-stethoscope text-[10px]" />}>Generate Case</Button>
            <Button variant="secondary" size="sm" onClick={() => onOpenQuiz('mixed')}
              leftIcon={<i className="fas fa-brain text-[10px]" />}>Generate MCQs</Button>
          </div>
        </div>
      </div>
    )}
  </>
);
