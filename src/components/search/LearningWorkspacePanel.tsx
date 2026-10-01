import React from 'react';
import type { Article, TopicIntelligence } from '@types';

interface LearningWorkspacePanelProps {
  query: string;
  results: Article[];
  topicIntelligence?: TopicIntelligence | null;
  synthesisLoading: boolean;
  isAuthenticated: boolean;
  onGenerateSynopsis: () => void;
  onOpenQuiz: () => void;
  onOpenCase: () => void;
  onChooseSources: () => void;
}

const REVIEW_PATTERN = /systematic review|meta-analysis/i;

export const LearningWorkspacePanel: React.FC<LearningWorkspacePanelProps> = ({
  query,
  results,
  topicIntelligence,
  synthesisLoading,
  isAuthenticated,
  onGenerateSynopsis,
  onOpenQuiz,
  onOpenCase,
  onChooseSources,
}) => {
  const guidelineCount = topicIntelligence?.guidelineSnapshot?.count ?? 0;
  const reviewCount = results.filter((article) =>
    (article.pubtype || []).some((type) => REVIEW_PATTERN.test(String(type || '')))
  ).length;

  return (
    <section aria-labelledby="learning-workspace-title" className="space-y-3">
      <div className="flex flex-col gap-3 rounded-2xl bg-indigo-50/90 p-4 dark:bg-indigo-950/30 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="learning-workspace-title" className="text-sm font-bold text-slate-900 dark:text-white">
            Generate from this evidence set
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            Uses {results.length} papers, {guidelineCount} guideline recommendation{guidelineCount === 1 ? '' : 's'} and {reviewCount} systematic review{reviewCount === 1 ? '' : 's'} for {query}.
          </p>
        </div>
        <button
          type="button"
          onClick={onChooseSources}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-950/60"
        >
          <i className="fas fa-list-check text-[11px]" aria-hidden />
          Choose sources
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <LearningAction
          icon="fa-file-lines"
          title="Evidence synopsis"
          description="A concise clinical overview covering diagnosis, prognostic scoring, treatment and uncertainty."
          detail="3–5 minute read · citations beside each section"
          action={synthesisLoading ? 'Generating…' : isAuthenticated ? 'Generate synopsis' : 'Sign in to generate'}
          disabled={synthesisLoading}
          onClick={onGenerateSynopsis}
        />
        <LearningAction
          icon="fa-brain"
          title="MCQ quiz"
          description="Questions on diagnosis, severity scores and treatment decisions, grounded in the selected evidence."
          detail="5 questions · explanations and source links"
          action={isAuthenticated ? 'Create quiz' : 'Sign in to create'}
          onClick={onOpenQuiz}
        />
        <LearningAction
          icon="fa-stethoscope"
          title="Clinical case"
          description="A branching patient scenario with investigation, treatment and reassessment decisions."
          detail="Decision points · evidence after each answer"
          action={isAuthenticated ? 'Generate case' : 'Sign in to create'}
          onClick={onOpenCase}
        />
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Generated learning material remains linked to its source set and must be verified before clinical use.
      </p>
    </section>
  );
};

const LearningAction: React.FC<{
  icon: string;
  title: string;
  description: string;
  detail: string;
  action: string;
  disabled?: boolean;
  onClick: () => void;
}> = ({ icon, title, description, detail, action, disabled = false, onClick }) => (
  <article className="flex min-h-64 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <i className={`fas ${icon} text-lg text-indigo-500`} aria-hidden />
    <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">{title}</h3>
    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
    <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{detail}</p>
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="mt-auto inline-flex min-h-10 w-fit items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-500 disabled:cursor-wait disabled:opacity-60"
    >
      {action}
    </button>
  </article>
);
