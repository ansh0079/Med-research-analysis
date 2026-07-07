import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ConflictMatrixPanel } from '@components/search/ConflictMatrixPanel';
import { FollowUpQuestionsPanel } from '@components/search/FollowUpQuestionsPanel';
import type { CaseModeResult } from '@types';
import { MODES, EVIDENCE_STRENGTH_STYLES } from './caseModeConfig';
import { type ReflectionKind } from './caseModeConfig';
import { CaseReflectionExportPanel } from './CaseReflectionExportPanel';
import { CaseMCQs } from './CaseMCQs';

interface Props {
  result: CaseModeResult;
  prefillTopic: string | null;
  reflectionKind: ReflectionKind;
  reflectionSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  onReflectionKindChange: (kind: ReflectionKind) => void;
  onExportReflection: (format: 'doc' | 'txt') => void;
  onSaveReflectionDraft: () => void;
  onQuiz: () => void;
  onFollowUpSearch: (query: string) => void;
}

export const CaseModeAnalysisResultPanel: React.FC<Props> = ({
  result,
  prefillTopic,
  reflectionKind,
  reflectionSaveStatus,
  onReflectionKindChange,
  onExportReflection,
  onSaveReflectionDraft,
  onQuiz,
  onFollowUpSearch,
}) => {
  const navigate = useNavigate();

  const startReview = () => {
    localStorage.setItem('med_review_prefill', JSON.stringify({ question: result.query, articles: result.citations ?? [] }));
    navigate('/review');
  };

  return (
    <div className="neo-card rounded-2xl p-5 space-y-6 animate-fade-in">
      {/* Meta */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pb-4 border-b border-slate-100 dark:border-slate-700/60">
        {result.mode && (
          <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
            MODES.find((m) => m.id === result.mode)?.activeColor ?? ''
          }`}>
            {MODES.find((m) => m.id === result.mode)?.label}
          </span>
        )}
        <span className="font-semibold text-slate-700 dark:text-slate-300">Query:</span>
        <span className="font-mono text-indigo-600 dark:text-indigo-400 truncate max-w-xs">{result.query}</span>
        {result.cached && <span className="text-emerald-500">cached</span>}
        <span className="sm:ml-auto">
          <button
            type="button"
            onClick={onQuiz}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-violet-500"
          >
            <i className="fas fa-brain text-[10px]" />
            Quiz this decision point
          </button>
        </span>
      </div>

      <CaseReflectionExportPanel
        reflectionKind={reflectionKind}
        reflectionSaveStatus={reflectionSaveStatus}
        onKindChange={onReflectionKindChange}
        onExportDoc={() => onExportReflection('doc')}
        onExportTxt={() => onExportReflection('txt')}
        onSaveDraft={onSaveReflectionDraft}
      />

      {result.disclaimer && (
        <p className="text-xs text-slate-500 dark:text-slate-400 italic border-l-2 border-amber-400 pl-3">{result.disclaimer}</p>
      )}

      {/* Clinical vignette */}
      {result.vignette && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 dark:from-slate-800/60 dark:to-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-2">Clinical Vignette</p>
          <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">{result.vignette}</p>
        </div>
      )}

      {result.caseSummary && result.caseSummary !== result.vignette && (
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{result.caseSummary}</p>
      )}

      {/* Key decision + differential */}
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

      {/* Evidence explanation */}
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

      {/* Interventions */}
      {result.interventions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Evidence-based Interventions</p>
          {result.interventions.map((item, idx) => (
            <div key={`${item.name}-${idx}`} className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{item.name}</h4>
                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${EVIDENCE_STRENGTH_STYLES[item.evidenceStrength] ?? EVIDENCE_STRENGTH_STYLES.VERY_LOW}`}>
                  {item.evidenceStrength.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{item.rationale}</p>
              {item.citations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.citations.map((c) => (
                    <span key={c} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-300">
                      Evidence {c}
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

      {/* How papers apply */}
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
                {result.paperApplications.map((pa, i) => (
                  <tr key={i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono font-bold text-indigo-500">{pa.studyIndex}</td>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 max-w-[12rem]">
                      <span className="line-clamp-2">{pa.title}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 leading-relaxed">{pa.howItApplies}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Uncertainties */}
      {result.uncertainties.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Key Uncertainties</p>
          <ul className="space-y-1.5">
            {result.uncertainties.map((u, i) => (
              <li key={`${u}-${i}`} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                {u}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Follow-up question suggestions */}
      {result.followUpQuestions && result.followUpQuestions.length > 0 && (
        <FollowUpQuestionsPanel
          questions={result.followUpQuestions}
          onSearch={onFollowUpSearch}
        />
      )}

      {/* Inline case MCQs */}
      {result.caseMCQs && result.caseMCQs.length > 0 && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60">
          <CaseMCQs mcqs={result.caseMCQs} topic={result.query || result.keyDecisionPoint || prefillTopic || 'Clinical case'} />
        </div>
      )}

      {/* Articles reviewed */}
      {result.citations && result.citations.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Articles Reviewed ({result.citations.length})</p>
          <ol className="space-y-1.5">
            {result.citations.map((cite, i) => (
              <li key={cite.uid ?? i} className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                <span className="shrink-0 font-mono text-[10px] text-slate-400 mt-0.5 w-4">{i + 1}.</span>
                <span className="leading-relaxed">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{cite.title}</span>
                  {' '}· {cite.source || cite.journal || 'Unknown Journal'}
                  {(cite.pubdate || cite.year) && ` · ${cite.pubdate?.split(' ')[0] ?? cite.year}`}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* CTA → systematic review */}
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl">
        <div>
          <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">Want to go deeper?</p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">Start a structured systematic review using these articles as the seed set.</p>
        </div>
        <button type="button"
          onClick={startReview}
          className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all whitespace-nowrap">
          Start review →
        </button>
      </div>

      <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl">
        <i className="fas fa-triangle-exclamation text-amber-500 text-xs mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">{result.safetyNotes}</p>
      </div>
    </div>
  );
};
