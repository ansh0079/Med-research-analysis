import React from 'react';
import type { TeachingVignetteResult } from '@types';
import { Button } from '@components/ui/Button';
import { CaseMCQs } from '@components/case/CaseMCQs';
import { MODES } from '@components/case/CaseModeUtils';

export function TeachingVignettePanel({
  topic,
  seedCount,
  result,
  loading,
  error,
  quizButton,
  reflectionExport,
  onGenerate,
}: {
  topic: string;
  seedCount: number;
  result: TeachingVignetteResult | null;
  loading: boolean;
  error: string | null;
  quizButton: React.ReactNode;
  reflectionExport: React.ReactNode;
  onGenerate: () => void;
}) {
  return (
    <div className="neo-card rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500 mb-1">Auto Teaching Case</p>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">Generate Teaching Vignette from Top Papers</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Synthesises a fictional patient case grounded strictly in your {seedCount} retrieved papers - no free-text entry required.
            Every management step cites the seed articles.
          </p>
        </div>
        <i className="fas fa-book-open text-violet-400 text-xl shrink-0 mt-1" />
      </div>

      <Button variant="gradient" size="sm" onClick={onGenerate}
        disabled={loading} isLoading={loading}
        leftIcon={loading ? undefined : <i className="fas fa-wand-magic-sparkles text-[10px]" />}>
        {loading ? 'Generating...' : 'Generate Teaching Case'}
      </Button>

      {error && <TeachingVignetteError error={error} />}

      {result && (
        <TeachingVignetteResultView
          result={result}
          topicFallback={topic}
          quizButton={quizButton}
          reflectionExport={reflectionExport}
        />
      )}
    </div>
  );
}

function TeachingVignetteError({ error }: { error: string }) {
  if (error === 'AUTH_REQUIRED') {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl">
        <p className="text-sm text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
          <i className="fas fa-lock text-indigo-400 text-xs" /> Sign in to use this feature.
        </p>
        <a href="/auth" className="shrink-0 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors">Sign in -&gt;</a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl">
      <i className="fas fa-exclamation-circle text-red-400 text-xs shrink-0" />
      <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
    </div>
  );
}

function TeachingVignetteResultView({
  result,
  topicFallback,
  quizButton,
  reflectionExport,
}: {
  result: TeachingVignetteResult;
  topicFallback: string;
  quizButton: React.ReactNode;
  reflectionExport: React.ReactNode;
}) {
  return (
    <div className="space-y-5 pt-2 border-t border-slate-100 dark:border-slate-700/60 animate-fade-in">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
          MODES.find((mode) => mode.id === result.learningMode)?.activeColor ?? ''
        }`}>
          {MODES.find((mode) => mode.id === result.learningMode)?.label}
        </span>
        <span className="text-[10px] text-slate-400">- {result.seedCount} seeds - {result.model}</span>
        {result.cached && <span className="text-emerald-500 text-[10px]">cached</span>}
        <span className="sm:ml-auto">{quizButton}</span>
      </div>

      {reflectionExport}

      <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50/40 dark:from-violet-950/20 dark:to-indigo-950/10 border border-violet-100 dark:border-violet-900/40 p-5 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Synthetic Patient Vignette</p>
        {result.presentingComplaint && (
          <p className="text-sm font-bold text-slate-900 dark:text-white">{result.presentingComplaint}</p>
        )}
        {result.history && <VignetteTextBlock label="History" text={result.history} />}
        {result.examination && <VignetteTextBlock label="Examination" text={result.examination} />}
        {result.investigations && <VignetteTextBlock label="Investigations" text={result.investigations} />}
      </div>

      {result.differential.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Differential Diagnosis</p>
          <div className="space-y-2">
            {result.differential.map((differential, index) => (
              <div key={index} className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0">{differential.rank}</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{differential.diagnosis}</span>
                </div>
                <div className="ml-7 grid grid-cols-2 gap-2 text-xs">
                  {differential.supporting && (
                    <div>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">For: </span>
                      <span className="text-slate-600 dark:text-slate-400">{differential.supporting}</span>
                    </div>
                  )}
                  {differential.against && (
                    <div>
                      <span className="text-red-500 font-semibold">Against: </span>
                      <span className="text-slate-600 dark:text-slate-400">{differential.against}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.managementReasoning && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-2">Evidence-Grounded Management</p>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{result.managementReasoning}</p>
        </div>
      )}

      {result.teachingPoints.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Teaching Points</p>
          <ul className="space-y-2">
            {result.teachingPoints.map((teachingPoint, index) => (
              <li key={index} className="flex items-start gap-2.5">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0">{index + 1}</span>
                <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {teachingPoint.point}
                  {teachingPoint.seedIndices?.length > 0 && (
                    <span className="ml-1 text-[10px] font-bold text-indigo-500">[{teachingPoint.seedIndices.join(', ')}]</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.evidenceLinks.length > 0 && (
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
                {result.evidenceLinks.map((evidenceLink, index) => (
                  <tr key={index} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono font-bold text-indigo-500">{evidenceLink.seedIndex}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 leading-relaxed">{evidenceLink.howItApplies}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result.uncertaintyFlags.length > 0 && (
        <div className="rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">Uncertainty Flags</p>
          <ul className="space-y-1.5">
            {result.uncertaintyFlags.map((uncertainty, index) => (
              <li key={index} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
                <i className="fas fa-question-circle mt-0.5 shrink-0 text-amber-500" />
                {uncertainty}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.postCheckFlags && (
        <div className="rounded-xl border border-red-100 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400 mb-1">
            <i className="fas fa-shield-halved mr-1" />Post-generation check
          </p>
          <p className="text-xs text-red-600 dark:text-red-300 mb-2">{result.postCheckFlags.note}</p>
          <div className="flex flex-wrap gap-1">
            {result.postCheckFlags.unsupportedDrugReferences.map((drug) => (
              <span key={drug} className="px-2 py-0.5 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-bold font-mono">{drug}</span>
            ))}
          </div>
        </div>
      )}

      {result.caseMCQs.length > 0 && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60">
          <CaseMCQs mcqs={result.caseMCQs} topic={result.topic || topicFallback || 'Clinical case'} />
        </div>
      )}

      <p className="text-[10px] text-slate-400 italic border-l-2 border-amber-400 pl-3">{result.disclaimer}</p>
    </div>
  );
}

function VignetteTextBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{text}</p>
    </div>
  );
}
