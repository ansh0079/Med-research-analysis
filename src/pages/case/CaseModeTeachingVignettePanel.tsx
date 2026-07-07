import React from 'react';
import { Button } from '@components/ui/Button';
import type { TeachingVignetteResult } from '@types';
import { MODES, type ReflectionKind } from './caseModeConfig';
import { CaseReflectionExportPanel } from './CaseReflectionExportPanel';
import { CaseMCQs } from './CaseMCQs';

interface Props {
  prefillTopic: string | null;
  caseSeedArticles: Partial<{ uid?: string; title?: string }>[] | null;
  tvLoading: boolean;
  tvError: string | null;
  tvResult: TeachingVignetteResult | null;
  reflectionKind: ReflectionKind;
  reflectionSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  onGenerate: () => void;
  onStartQuiz: () => void;
  onReflectionKindChange: (kind: ReflectionKind) => void;
  onExportReflection: (format: 'doc' | 'txt') => void;
  onSaveReflectionDraft: () => void;
}

export const CaseModeTeachingVignettePanel: React.FC<Props> = ({
  prefillTopic,
  caseSeedArticles,
  tvLoading,
  tvError,
  tvResult,
  reflectionKind,
  reflectionSaveStatus,
  onGenerate,
  onStartQuiz,
  onReflectionKindChange,
  onExportReflection,
  onSaveReflectionDraft,
}) => {
  if (!prefillTopic || !caseSeedArticles || caseSeedArticles.length === 0) return null;

  return (
    <div className="neo-card rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500 mb-1">Auto Teaching Case</p>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">Generate Teaching Vignette from Top Papers</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Synthesises a fictional patient case grounded strictly in your {caseSeedArticles.length} retrieved papers — no free-text entry required.
            Every management step cites the seed articles.
          </p>
        </div>
        <i className="fas fa-book-open text-violet-400 text-xl shrink-0 mt-1" />
      </div>

      <Button variant="gradient" size="sm" onClick={onGenerate}
        disabled={tvLoading} isLoading={tvLoading}
        leftIcon={tvLoading ? undefined : <i className="fas fa-wand-magic-sparkles text-[10px]" />}>
        {tvLoading ? 'Generating…' : 'Generate Teaching Case'}
      </Button>

      {tvError && renderVignetteError(tvError)}

      {tvResult && (
        <div className="space-y-5 pt-2 border-t border-slate-100 dark:border-slate-700/60 animate-fade-in">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
              MODES.find((m) => m.id === tvResult.learningMode)?.activeColor ?? ''
            }`}>
              {MODES.find((m) => m.id === tvResult.learningMode)?.label}
            </span>
            <span className="text-[10px] text-slate-400">· {tvResult.seedCount} seeds · {tvResult.model}</span>
            {tvResult.cached && <span className="text-emerald-500 text-[10px]">cached</span>}
            <span className="sm:ml-auto">
              <button
                type="button"
                onClick={onStartQuiz}
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

          {/* Synthetic patient */}
          <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50/40 dark:from-violet-950/20 dark:to-indigo-950/10 border border-violet-100 dark:border-violet-900/40 p-5 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Synthetic Patient Vignette</p>
            {tvResult.presentingComplaint && (
              <p className="text-sm font-bold text-slate-900 dark:text-white">{tvResult.presentingComplaint}</p>
            )}
            {tvResult.history && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">History</p>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{tvResult.history}</p>
              </div>
            )}
            {tvResult.examination && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Examination</p>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{tvResult.examination}</p>
              </div>
            )}
            {tvResult.investigations && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Investigations</p>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{tvResult.investigations}</p>
              </div>
            )}
          </div>

          {/* Differential */}
          {tvResult.differential.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Differential Diagnosis</p>
              <div className="space-y-2">
                {tvResult.differential.map((d, i) => (
                  <div key={i} className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0">{d.rank}</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{d.diagnosis}</span>
                    </div>
                    <div className="ml-7 grid grid-cols-2 gap-2 text-xs">
                      {d.supporting && (
                        <div>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">For: </span>
                          <span className="text-slate-600 dark:text-slate-400">{d.supporting}</span>
                        </div>
                      )}
                      {d.against && (
                        <div>
                          <span className="text-red-500 font-semibold">Against: </span>
                          <span className="text-slate-600 dark:text-slate-400">{d.against}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Management reasoning */}
          {tvResult.managementReasoning && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-2">Evidence-Grounded Management</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{tvResult.managementReasoning}</p>
            </div>
          )}

          {/* Teaching points */}
          {tvResult.teachingPoints.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Teaching Points</p>
              <ul className="space-y-2">
                {tvResult.teachingPoints.map((tp, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {tp.point}
                      {tp.seedIndices?.length > 0 && (
                        <span className="ml-1 text-[10px] font-bold text-indigo-500">[{tp.seedIndices.join(', ')}]</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Evidence links */}
          {tvResult.evidenceLinks.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">How Each Paper Applies</p>
              <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                      <th className="text-left font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5 w-10">Seed</th>
                      <th className="text-left font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5">How It Applies</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/80">
                    {tvResult.evidenceLinks.map((el, i) => (
                      <tr key={i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-2.5 font-mono font-bold text-indigo-500">{el.seedIndex}</td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 leading-relaxed">{el.howItApplies}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Uncertainty flags */}
          {tvResult.uncertaintyFlags.length > 0 && (
            <div className="rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">Uncertainty Flags</p>
              <ul className="space-y-1.5">
                {tvResult.uncertaintyFlags.map((u, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
                    <i className="fas fa-question-circle mt-0.5 shrink-0 text-amber-500" />
                    {u}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Post-check flags */}
          {tvResult.postCheckFlags && (
            <div className="rounded-xl border border-red-100 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400 mb-1">
                <i className="fas fa-shield-halved mr-1" />Post-generation check
              </p>
              <p className="text-xs text-red-600 dark:text-red-300 mb-2">{tvResult.postCheckFlags.note}</p>
              <div className="flex flex-wrap gap-1">
                {tvResult.postCheckFlags.unsupportedDrugReferences.map((drug) => (
                  <span key={drug} className="px-2 py-0.5 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-bold font-mono">{drug}</span>
                ))}
              </div>
            </div>
          )}

          {/* Inline MCQs */}
          {tvResult.caseMCQs.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60">
              <CaseMCQs mcqs={tvResult.caseMCQs} topic={tvResult.topic || prefillTopic || 'Clinical case'} />
            </div>
          )}

          <p className="text-[10px] text-slate-400 italic border-l-2 border-amber-400 pl-3">{tvResult.disclaimer}</p>
        </div>
      )}
    </div>
  );
};

function renderVignetteError(tvError: string) {
  if (tvError === 'AUTH_REQUIRED') {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl">
        <p className="text-sm text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
          <i className="fas fa-lock text-indigo-400 text-xs" /> Sign in to use this feature.
        </p>
        <a href="/auth" className="shrink-0 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors">Sign in →</a>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl">
      <i className="fas fa-exclamation-circle text-red-400 text-xs shrink-0" />
      <p className="text-sm text-red-600 dark:text-red-300">{tvError}</p>
    </div>
  );
}
