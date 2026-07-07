import React from 'react';
import type { LearningProfile, UserTopicMemory } from '@types';
import type { QuizArticle } from '@services/quizService';
import { MemoryDetailBadge } from '@components/quiz/QuizQuestionParts';

export function QuizHeaderPanel({
  activeTopic,
  lockedArticles,
  singlePaperMode,
  fromDataset,
  trainingStage,
  isAuthenticated,
  topicMemory,
  explanationDepth,
  hasCurriculumTopic,
  workflowContext,
  onBack,
  onExplanationDepthChange,
}: {
  activeTopic: string;
  lockedArticles: QuizArticle[];
  singlePaperMode: boolean;
  fromDataset: boolean;
  trainingStage: NonNullable<LearningProfile['trainingStage']>;
  isAuthenticated: boolean;
  topicMemory: UserTopicMemory | null;
  explanationDepth: 'foundation' | 'exam_focus' | 'mechanistic';
  hasCurriculumTopic: boolean;
  workflowContext: Record<string, unknown>;
  onBack: () => void;
  onExplanationDepthChange: (depth: 'foundation' | 'exam_focus' | 'mechanistic') => void;
}) {
  const hasTopicMemory = isAuthenticated
    && topicMemory
    && topicMemory.searchCount + topicMemory.topPaperCount + topicMemory.savedPaperCount > 0;

  return (
    <header className="w-full pt-[calc(var(--nav-h)+1.5rem)] pb-16 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-purple-600/5 -z-10" />
      <div className="max-w-3xl mx-auto">
        <button type="button" onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm font-medium transition-colors mb-8">
          <i className="fas fa-arrow-left" /> Back to results
        </button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40">
            <i className="fas fa-brain text-white text-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Test yourself</h1>
            <p className="text-sm text-indigo-500 font-semibold capitalize">{activeTopic}</p>
            {lockedArticles.length === 1 && singlePaperMode && (
              <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-2 py-0.5 rounded-full">
                <i className="fas fa-file-medical mr-1" />
                Questions grounded in this paper only
              </span>
            )}
            {lockedArticles.length > 1 && (
              <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-2 py-0.5 rounded-full">
                <i className="fas fa-layer-group mr-1" />
                Grounded in top {lockedArticles.length} evidence papers from your search
              </span>
            )}
            {fromDataset && (
              <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                General medical questions - MedMCQA dataset
              </span>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Training: {String(trainingStage).replace(/_/g, ' ')}
              </span>
              {hasTopicMemory && <MemoryDetailBadge memory={topicMemory} />}
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                Explain
                <select
                  value={explanationDepth}
                  onChange={(event) => onExplanationDepthChange(event.target.value as 'foundation' | 'exam_focus' | 'mechanistic')}
                  className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                >
                  <option value="foundation">First principles</option>
                  <option value="exam_focus">Exam focus</option>
                  <option value="mechanistic">Mechanistic</option>
                </select>
              </label>
              {hasCurriculumTopic ? (
                <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500">
                  Study path topic
                </span>
              ) : null}
            </div>
            {typeof workflowContext.originalPresentation === 'string' && workflowContext.originalPresentation.trim() && (
              <div className="mt-3 max-w-2xl rounded-xl border border-cyan-200 bg-cyan-50/80 px-3 py-2 text-xs text-cyan-950/80 dark:border-cyan-900/60 dark:bg-cyan-950/20 dark:text-cyan-100/80">
                <span className="font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">Shift context: </span>
                {workflowContext.originalPresentation}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
