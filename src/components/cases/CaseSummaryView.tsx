import React from 'react';
import type { CaseSession, CrossLearningRecommendation } from '@types';
import { STEP_TYPE_LABELS } from './caseConstants';

function CrossLearningCard({ rec, onStart }: { rec: CrossLearningRecommendation; onStart: (topic: string) => void }) {
  return (
    <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border border-indigo-200 dark:border-indigo-800 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
          <i className="fas fa-project-diagram text-indigo-500 text-sm" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">Cross-learning Suggestion</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{rec.topic}</p>
        </div>
        {rec.linkType && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-medium">{rec.linkType}</span>
        )}
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400">{rec.rationale}</p>
      <p className="text-xs text-slate-500 dark:text-slate-500">{rec.reason}</p>
      {rec.overallScore != null && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${rec.overallScore >= 70 ? 'bg-emerald-500' : rec.overallScore >= 50 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${rec.overallScore}%` }} />
          </div>
          <span className="text-[10px] font-medium text-slate-500">{rec.overallScore}%</span>
        </div>
      )}
      <button
        onClick={() => onStart(rec.topic)}
        className="w-full mt-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors flex items-center justify-center gap-2"
      >
        <i className="fas fa-play text-[10px]" />
        Start Case on {rec.topic}
      </button>
    </div>
  );
}

export function CaseSummaryView({ session, crossRec, onStartCrossCase, suggestedDifficulty, onAcceptDifficulty }: {
  session: CaseSession;
  crossRec?: CrossLearningRecommendation | null;
  onStartCrossCase?: (topic: string) => void;
  suggestedDifficulty?: string | null;
  onAcceptDifficulty?: (d: string) => void;
}) {
  const responses = session.responses || [];
  const correct = responses.filter(r => r?.isCorrect).length;
  const total = responses.length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const caseData = session.caseData;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="text-center space-y-2">
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${pct >= 80 ? 'bg-emerald-100 dark:bg-emerald-900/30' : pct >= 60 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
          <span className={`text-2xl font-bold ${pct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : pct >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{pct}%</span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">{correct}/{total} correct</p>
        <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
          {pct >= 80 ? 'Excellent work!' : pct >= 60 ? 'Good effort — review the gaps' : 'Keep practising this topic'}
        </p>
      </div>

      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200 dark:border-slate-700">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Case Summary</p>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{caseData.caseSummary}</p>
      </div>

      {caseData.keyLearningPoints && caseData.keyLearningPoints.length > 0 && (
        <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-2">
            <i className="fas fa-graduation-cap mr-1" />Key Learning Points
          </p>
          <ul className="space-y-1.5">
            {caseData.keyLearningPoints.map((point, i) => (
              <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                <i className="fas fa-check text-blue-400 mt-1 text-[10px]" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {caseData.steps && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Step-by-step Review</p>
          {caseData.steps.map((step, i) => {
            const resp = responses[i];
            const meta = STEP_TYPE_LABELS[step.type] || STEP_TYPE_LABELS.presentation;
            return (
              <details key={i} className="group rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <summary className="flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <i className={`fas ${meta.icon} ${meta.color} text-xs`} />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">{meta.label}</span>
                  {resp?.isCorrect === true && <i className="fas fa-check-circle text-emerald-500 text-xs" />}
                  {resp?.isCorrect === false && <i className="fas fa-times-circle text-red-400 text-xs" />}
                  <i className="fas fa-chevron-down text-[10px] text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-4 pb-3 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                  <p className="text-xs text-slate-600 dark:text-slate-400">{step.narrative}</p>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{step.question}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Correct: {step.correctAnswer}</p>
                  {resp && !resp.isCorrect && (
                    <p className="text-xs text-red-500">Your answer: {resp.selectedAnswer}</p>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">{step.teachingPoint}</p>
                  {step.evidenceSource && (
                    <p className="text-[10px] font-medium text-blue-500 dark:text-blue-400"><i className="fas fa-bookmark mr-1" />Source: {step.evidenceSource}</p>
                  )}
                  {step.branchingNote && (
                    <p className="text-[10px] text-violet-500 dark:text-violet-400 italic"><i className="fas fa-code-branch mr-1" />{step.branchingNote}</p>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}

      {caseData.guidelinesApplied && caseData.guidelinesApplied.length > 0 && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-4 border border-emerald-200 dark:border-emerald-800">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-2">
            <i className="fas fa-book-medical mr-1" />Guidelines Applied
          </p>
          <ul className="space-y-1">
            {caseData.guidelinesApplied.map((g, i) => (
              <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                <i className="fas fa-check text-emerald-400 mt-0.5 text-[9px]" />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {caseData.evidenceGaps && caseData.evidenceGaps.length > 0 && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-4 border border-amber-200 dark:border-amber-800">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-2">
            <i className="fas fa-exclamation-triangle mr-1" />Evidence Gaps
          </p>
          <ul className="space-y-1">
            {caseData.evidenceGaps.map((g, i) => (
              <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                <i className="fas fa-info-circle text-amber-400 mt-0.5 text-[9px]" />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {caseData.sourcesUsed && caseData.sourcesUsed.length > 0 && (
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
            <i className="fas fa-book mr-1" />Answers based on these guidelines
          </p>
          <ul className="space-y-1">
            {caseData.sourcesUsed.map((s, i) => (
              <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-slate-400">G{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {suggestedDifficulty && onAcceptDifficulty && (
        <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 p-4 border border-indigo-200 dark:border-indigo-800 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">
            <i className="fas fa-chart-line mr-1" />Difficulty Suggestion
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {pct >= 90
              ? `Great score! Try a harder case next time.`
              : `This was tough. Consider a lower difficulty to build confidence.`}
          </p>
          <button
            type="button"
            onClick={() => onAcceptDifficulty(suggestedDifficulty)}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            <i className="fas fa-arrow-right mr-1" />Try {suggestedDifficulty} next
          </button>
        </div>
      )}

      {crossRec && onStartCrossCase && (
        <CrossLearningCard rec={crossRec} onStart={onStartCrossCase} />
      )}
    </div>
  );
}
