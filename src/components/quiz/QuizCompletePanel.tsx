import React from 'react';
import { StudyRunPanel } from '@components/learning/StudyRunPanel';
import type { QuizArticle } from '@services/quizService';
import type { QuizQuestion, QuizState, StudyRun, StudyRunOutline } from '@types';

interface QuizLiftSummary {
  fromScore: number;
  toScore: number;
  deltaPoints: number;
  pointsPerDay: number;
  trend: string;
  daysSpanned: number;
}

interface QuizCompletePanelProps {
  quiz: QuizState;
  scorePercent: number;
  activeStudyRunId?: number;
  studyRun: StudyRun | null;
  studyOutline: StudyRunOutline | null;
  studyRunLoadFailed: boolean;
  isAuthenticated: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  reflectionKind: 'CBD' | 'mini-CEX' | 'DOPS';
  reflectionSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  learningVelocity?: QuizLiftSummary | null;
  onReflectionKindChange: (kind: 'CBD' | 'mini-CEX' | 'DOPS') => void;
  onLoadQuiz: () => void;
  onBackToSearch: () => void;
  onBackToRun: (studyRunId: number) => void;
  onContinueGapReport: (studyRun: StudyRun) => void;
  onSignIn: () => void;
  onSaveReflectionDraft: () => void;
  onExportReflection: (format: 'doc' | 'txt') => void;
  resolveSourceArticle: (q: QuizQuestion) => QuizArticle | null;
}

export const QuizCompletePanel: React.FC<QuizCompletePanelProps> = ({
  quiz,
  scorePercent,
  activeStudyRunId,
  studyRun,
  studyOutline,
  studyRunLoadFailed,
  isAuthenticated,
  saveStatus,
  reflectionKind,
  reflectionSaveStatus,
  learningVelocity = null,
  onReflectionKindChange,
  onLoadQuiz,
  onBackToSearch,
  onBackToRun,
  onContinueGapReport,
  onSignIn,
  onSaveReflectionDraft,
  onExportReflection,
  resolveSourceArticle,
}) => {
  const missedPapers = new Map<string, { article: QuizArticle; missCount: number; questionTypes: string[] }>();
  quiz.questions.forEach((q) => {
    const wrong = (quiz.answers[q.id] || '').toLowerCase() !== q.correctAnswer.toLowerCase();
    if (!wrong) return;
    const src = resolveSourceArticle(q);
    if (!src) return;
    const key = src.uid || src.title;
    const existing = missedPapers.get(key);
    if (existing) {
      existing.missCount += 1;
      if (q.questionType && !existing.questionTypes.includes(q.questionType)) existing.questionTypes.push(q.questionType);
    } else {
      missedPapers.set(key, { article: src, missCount: 1, questionTypes: q.questionType ? [q.questionType] : [] });
    }
  });
  const missedEntries = [...missedPapers.values()].sort((a, b) => b.missCount - a.missCount);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-8 text-center shadow-sm">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl ${
          scorePercent >= 70 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
        }`}>
          <i className={`fas fa-${scorePercent >= 70 ? 'trophy' : 'chart-bar'}`} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{quiz.score}/{quiz.questions.length}</h2>
        <p className="text-lg text-slate-500 dark:text-slate-400 mb-1">{scorePercent}% correct</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
          {scorePercent >= 80 ? 'Excellent — strong knowledge of this topic.' : scorePercent >= 60 ? 'Good effort — review explanations to solidify understanding.' : 'Keep studying — review source articles and try again.'}
        </p>
        {learningVelocity && typeof learningVelocity.fromScore === 'number' && typeof learningVelocity.toScore === 'number' && (
          <div className="mb-6 mx-auto max-w-md rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-left dark:border-emerald-800 dark:bg-emerald-950/30">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Learning lift on this topic
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              Mastery {learningVelocity.fromScore}% → {learningVelocity.toScore}%
              {learningVelocity.deltaPoints !== 0 && (
                <span className="ml-1 font-bold">
                  ({learningVelocity.deltaPoints > 0 ? '+' : ''}{learningVelocity.deltaPoints})
                </span>
              )}
            </p>
            <p className="mt-0.5 text-[11px] text-emerald-800/80 dark:text-emerald-200/80">
              {learningVelocity.trend === 'improving'
                ? 'You’re improving — recent practice is moving the needle.'
                : learningVelocity.trend === 'declining'
                  ? 'Recent scores dipped — review the missed papers below, then retest.'
                  : 'Mastery is steady — keep spacing reviews to lock it in.'}
              {learningVelocity.pointsPerDay !== 0 && (
                <> · {learningVelocity.pointsPerDay > 0 ? '+' : ''}{learningVelocity.pointsPerDay} pts/day over {learningVelocity.daysSpanned}d</>
              )}
            </p>
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={onLoadQuiz}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors">
            <i className="fas fa-redo mr-2" /> New questions
          </button>
          {activeStudyRunId ? (
            <button type="button" onClick={() => onBackToRun(activeStudyRunId)}
              className="px-5 py-2.5 border-2 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl font-bold text-sm transition-colors">
              <i className="fas fa-map mr-2" /> Back to run
            </button>
          ) : (
            <button type="button" onClick={onBackToSearch}
              className="px-5 py-2.5 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl font-bold text-sm transition-colors">
              <i className="fas fa-search mr-2" /> Back to papers
            </button>
          )}
        </div>
        {isAuthenticated && saveStatus !== 'idle' && (
          <div className="mt-4">
            {saveStatus === 'saving' && (
              <span className="text-xs text-slate-400"><i className="fas fa-spinner fa-spin mr-1" /> Saving progress...</span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-xs text-emerald-600 font-semibold"><i className="fas fa-check mr-1" /> Progress saved</span>
            )}
            {saveStatus === 'error' && (
              <span className="text-xs text-red-500"><i className="fas fa-exclamation-triangle mr-1" /> Failed to save progress</span>
            )}
          </div>
        )}
        {!isAuthenticated && (
          <div className="mt-4">
            <span className="text-xs text-slate-400">
              <i className="fas fa-info-circle mr-1" />
              <button type="button" onClick={onSignIn} className="underline hover:text-indigo-600">Sign in</button> to track your progress
            </span>
          </div>
        )}
      </div>

      {missedEntries.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900/30 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
            <i className="fas fa-book-open text-red-500" />
            Review these papers before your next session
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            You missed {quiz.questions.length - quiz.score} question{quiz.questions.length - quiz.score === 1 ? '' : 's'} grounded in the following evidence.
          </p>
          <div className="space-y-3">
            {missedEntries.map(({ article, missCount, questionTypes }) => {
              const year = article.pubdate?.slice(0, 4) ?? null;
              const journal = article.source ?? article.journal ?? null;
              const pubmedUrl = article.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/` : article.doi ? `https://doi.org/${article.doi}` : null;
              return (
                <div key={article.uid || article.title} className="flex gap-3 rounded-xl bg-red-50/60 dark:bg-red-950/10 border border-red-100 dark:border-red-900/20 px-4 py-3">
                  <i className="fas fa-circle-xmark text-red-400 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">{article.title}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {[journal, year].filter(Boolean).join(' · ')}
                      {missCount > 1 && <span className="ml-2 font-semibold text-red-500">{missCount} questions missed</span>}
                      {questionTypes.length > 0 && <span className="ml-2 text-slate-400">({questionTypes.join(', ')})</span>}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3">
                      {pubmedUrl && (
                        <a href={pubmedUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                          <i className="fas fa-arrow-up-right-from-square text-[9px]" /> View paper
                        </a>
                      )}
                      <a
                        href={`/search?q=${encodeURIComponent(article.title || quiz.topic || '')}${article.pmid ? `&focusPmid=${encodeURIComponent(article.pmid)}` : ''}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
                        title="Open search with personalization — missed papers are boosted for you"
                      >
                        <i className="fas fa-user-graduate text-[9px]" /> Find in search (personalized)
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeStudyRunId && studyRun && studyOutline && studyOutline.nodes.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <i className="fas fa-map-signs text-indigo-500" /> Outline coverage — gap report
          </h3>
          <StudyRunPanel
            run={studyRun}
            outline={studyOutline}
            gapReportMode
            onContinue={() => onContinueGapReport(studyRun)}
          />
        </div>
      )}

      {activeStudyRunId && studyRunLoadFailed && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-center gap-3">
          <i className="fas fa-exclamation-triangle text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Gap report unavailable</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Could not load your outline coverage. Your quiz results were saved.{' '}
              <button type="button" onClick={() => onBackToRun(activeStudyRunId)}
                className="underline hover:no-underline font-bold">
                View run page
              </button>{' '}to see the full gap report.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
          <i className="fas fa-file-export text-emerald-500" /> Portfolio reflection
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Export a de-identified WBA draft for CBD, mini-CEX, or DOPS evidence.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={reflectionKind}
            onChange={(e) => onReflectionKindChange(e.target.value as 'CBD' | 'mini-CEX' | 'DOPS')}
            className="h-9 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 text-xs font-bold text-slate-700 dark:text-slate-200"
            aria-label="Portfolio reflection type"
          >
            <option value="CBD">CBD</option>
            <option value="mini-CEX">mini-CEX</option>
            <option value="DOPS">DOPS</option>
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSaveReflectionDraft}
              disabled={reflectionSaveStatus === 'saving'}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-black text-white transition-colors hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <i className={`fas ${reflectionSaveStatus === 'saving' ? 'fa-circle-notch fa-spin' : reflectionSaveStatus === 'saved' ? 'fa-check' : 'fa-save'} text-[10px]`} />
              {reflectionSaveStatus === 'saved' ? 'Saved' : 'Save draft'}
            </button>
            <button
              type="button"
              onClick={() => onExportReflection('doc')}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-black text-white transition-colors hover:bg-emerald-500"
            >
              <i className="fas fa-file-word text-[10px]" />
              Export .doc
            </button>
            <button
              type="button"
              onClick={() => onExportReflection('txt')}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-black text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
            >
              <i className="fas fa-file-lines text-[10px]" />
              Export .txt
            </button>
          </div>
        </div>
        {reflectionSaveStatus === 'error' && (
          <p className="mt-3 text-xs font-semibold text-red-500">Could not save draft. Please sign in and try again.</p>
        )}
      </div>
    </div>
  );
};
