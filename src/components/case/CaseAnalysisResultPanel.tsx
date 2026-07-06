import React from 'react';
import type { Article, CaseModeResult } from '@types';
import { ConflictMatrixPanel } from '@components/search/ConflictMatrixPanel';
import { FollowUpQuestionsPanel } from '@components/search/FollowUpQuestionsPanel';
import { CaseMCQs } from '@components/case/CaseMCQs';
import { EVIDENCE_STRENGTH_STYLES, MODES } from '@components/case/CaseModeUtils';

export function CaseAnalysisResultPanel({
  result,
  prefillTopic,
  quizButton,
  reflectionExport,
  onSearchFollowUp,
  onStartReview,
}: {
  result: CaseModeResult;
  prefillTopic: string | null;
  quizButton: React.ReactNode;
  reflectionExport: React.ReactNode;
  onSearchFollowUp: (question: string) => void;
  onStartReview: (question: string, articles: Article[]) => void;
}) {
  return (
    <div className="neo-card rounded-2xl p-5 space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pb-4 border-b border-slate-100 dark:border-slate-700/60">
        {result.mode && (
          <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
            MODES.find((mode) => mode.id === result.mode)?.activeColor ?? ''
          }`}>
            {MODES.find((mode) => mode.id === result.mode)?.label}
          </span>
        )}
        <span className="font-semibold text-slate-700 dark:text-slate-300">Query:</span>
        <span className="font-mono text-indigo-600 dark:text-indigo-400 truncate max-w-xs">{result.query}</span>
        {result.cached && <span className="text-emerald-500">cached</span>}
        <span className="sm:ml-auto">{quizButton}</span>
      </div>

      {reflectionExport}

      {result.disclaimer && (
        <p className="text-xs text-slate-500 dark:text-slate-400 italic border-l-2 border-amber-400 pl-3">{result.disclaimer}</p>
      )}

      {result.vignette && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 dark:from-slate-800/60 dark:to-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-2">Clinical Vignette</p>
          <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">{result.vignette}</p>
        </div>
      )}

      {result.caseSummary && result.caseSummary !== result.vignette && (
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{result.caseSummary}</p>
      )}

      {(result.keyDecisionPoint || result.differentialReasoning) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {result.keyDecisionPoint && (
            <div className="p-4 rounded-xl border border-red-100 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-1.5">Key Decision Point</p>
              <p className="text-sm text-slate-800 dark:text-slate-200 font-semibold leading-snug">{result.keyDecisionPoint}</p>
            </div>
          )}
          {result.differentialReasoning && (
            <div className="p-4 rounded-xl border border-violet-100 dark:border-violet-900/40 bg-violet-50/50 dark:bg-violet-950/20">
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500 mb-1.5">Differential / Management Reasoning</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{result.differentialReasoning}</p>
            </div>
          )}
        </div>
      )}

      {result.evidenceExplanation && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-2">How the Evidence Answers This Case</p>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{result.evidenceExplanation}</p>
        </div>
      )}

      {(result.conflictMatrix?.length ?? 0) > 0 && (
        <ConflictMatrixPanel
          id="case-conflict-matrix"
          conflictMatrix={result.conflictMatrix!}
          guidelineAlignment={result.guidelineAlignment}
          articles={result.citations}
        />
      )}

      {result.interventions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Evidence-based Interventions</p>
          {result.interventions.map((item, index) => (
            <div key={`${item.name}-${index}`} className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{item.name}</h4>
                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${EVIDENCE_STRENGTH_STYLES[item.evidenceStrength] ?? EVIDENCE_STRENGTH_STYLES.VERY_LOW}`}>
                  {item.evidenceStrength.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{item.rationale}</p>
              {item.citations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.citations.map((citation) => (
                    <span key={citation} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-300">
                      Evidence {citation}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
            <i className="fas fa-hospital mr-1" />
            Verify local policy before applying any intervention.
          </p>
        </div>
      )}

      {result.paperApplications && result.paperApplications.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">How the Top Papers Apply to This Case</p>
          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                  <th className="text-left font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5 w-8">#</th>
                  <th className="text-left font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5">Paper</th>
                  <th className="text-left font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5">How It Applies</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/80">
                {result.paperApplications.map((application, index) => (
                  <tr key={index} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono font-bold text-indigo-500">{application.studyIndex}</td>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 max-w-[12rem]">
                      <span className="line-clamp-2">{application.title}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 leading-relaxed">{application.howItApplies}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result.uncertainties.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Key Uncertainties</p>
          <ul className="space-y-1.5">
            {result.uncertainties.map((uncertainty, index) => (
              <li key={`${uncertainty}-${index}`} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                {uncertainty}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.followUpQuestions && result.followUpQuestions.length > 0 && (
        <FollowUpQuestionsPanel
          questions={result.followUpQuestions}
          onSearch={onSearchFollowUp}
        />
      )}

      {result.caseMCQs && result.caseMCQs.length > 0 && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60">
          <CaseMCQs mcqs={result.caseMCQs} topic={result.query || result.keyDecisionPoint || prefillTopic || 'Clinical case'} />
        </div>
      )}

      {result.citations && result.citations.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Articles Reviewed ({result.citations.length})</p>
          <ol className="space-y-1.5">
            {result.citations.map((citation, index) => (
              <li key={citation.uid ?? index} className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                <span className="shrink-0 font-mono text-[10px] text-slate-400 mt-0.5 w-4">{index + 1}.</span>
                <span className="leading-relaxed">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{citation.title}</span>
                  {' '} - {citation.source || citation.journal || 'Unknown Journal'}
                  {(citation.pubdate || citation.year) && ` - ${citation.pubdate?.split(' ')[0] ?? citation.year}`}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 px-4 py-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl">
        <div>
          <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">Want to go deeper?</p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">Start a structured systematic review using these articles as the seed set.</p>
        </div>
        <button type="button"
          onClick={() => onStartReview(result.query, result.citations ?? [])}
          className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all whitespace-nowrap">
          Start review -&gt;
        </button>
      </div>

      <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl">
        <i className="fas fa-triangle-exclamation text-amber-500 text-xs mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">{result.safetyNotes}</p>
      </div>
    </div>
  );
}
