import React from 'react';
import { useNavigatePage, useSearchContext } from '@contexts/SearchContext';
import { useAuth } from '@contexts/AuthContext';
import { CaseModeHeader } from './case/CaseModeHeader';
import { CaseModeModeSelector } from './case/CaseModeModeSelector';
import { CaseModeInputCard } from './case/CaseModeInputCard';
import { CaseModeTeachingVignettePanel } from './case/CaseModeTeachingVignettePanel';
import { CaseModeEvidenceBriefPanel } from './case/CaseModeEvidenceBriefPanel';
import { CaseModeAnalysisResultPanel } from './case/CaseModeAnalysisResultPanel';
import { useCaseModeState } from './case/useCaseModeState';

export const CaseModePage: React.FC = () => {
  const setCurrentPage = useNavigatePage();
  const { setQuery } = useSearchContext();
  const { isAuthenticated } = useAuth();
  const {
    mode,
    setMode,
    structuredCase,
    updateField,
    caseText,
    setCaseText,
    charsLeft,
    isOverLimit,
    loading,
    evidenceLoading,
    error,
    evidenceError,
    result,
    evidenceResult,
    prefillTopic,
    caseSeedArticles,
    tvLoading,
    tvError,
    tvResult,
    reflectionKind,
    setReflectionKind,
    reflectionSaveStatus,
    workflowContext,
    evidenceQuizMcqs,
    buildPayload,
    runAnalysis,
    runCaseToEvidence,
    runTeachingVignette,
    startQuizFromCase,
    exportReflection,
    saveReflectionDraft,
    clearAll,
  } = useCaseModeState();

  return (
    <div className="min-h-screen aurora-bg">
      <div className="max-w-3xl mx-auto px-4 pt-[calc(var(--nav-h)+1.5rem)] pb-10 space-y-5">
        <CaseModeHeader onBack={() => setCurrentPage('search')} />

        {prefillTopic && (
          <div className="flex items-start gap-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 px-4 py-3 text-sm">
            <i className="fas fa-search text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-indigo-700 dark:text-indigo-300">Pre-populated from your search: </span>
              <span className="text-indigo-600 dark:text-indigo-400">{prefillTopic}</span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Add patient-specific details below, then run analysis.</p>
              {caseSeedArticles && caseSeedArticles.length > 0 && (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-2 font-medium">
                  <i className="fas fa-layer-group mr-1" />
                  Evidence retrieval prioritises your top {caseSeedArticles.length} papers from this topic, then fills with live literature search.
                </p>
              )}
            </div>
          </div>
        )}

        {typeof workflowContext.originalPresentation === 'string' && workflowContext.originalPresentation.trim() && (
          <div className="rounded-xl border border-cyan-200 bg-cyan-50/80 px-4 py-3 text-sm dark:border-cyan-900/60 dark:bg-cyan-950/20">
            <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">Shift review context</p>
            <p className="mt-1 text-xs leading-relaxed text-cyan-950/80 dark:text-cyan-100/80 line-clamp-3">
              {workflowContext.originalPresentation}
            </p>
          </div>
        )}

        <CaseModeModeSelector mode={mode} onChange={setMode} />

        <CaseModeTeachingVignettePanel
          prefillTopic={prefillTopic}
          caseSeedArticles={caseSeedArticles}
          tvLoading={tvLoading}
          tvError={tvError}
          tvResult={tvResult}
          reflectionKind={reflectionKind}
          reflectionSaveStatus={reflectionSaveStatus}
          onGenerate={runTeachingVignette}
          onStartQuiz={() => startQuizFromCase('teaching_vignette')}
          onReflectionKindChange={setReflectionKind}
          onExportReflection={(format) => exportReflection('teaching_vignette', format)}
          onSaveReflectionDraft={() => void saveReflectionDraft('teaching_vignette')}
        />

        <CaseModeInputCard
          structuredCase={structuredCase}
          caseText={caseText}
          charsLeft={charsLeft}
          isOverLimit={isOverLimit}
          loading={loading}
          evidenceLoading={evidenceLoading}
          error={error}
          evidenceError={evidenceError}
          isAuthenticated={isAuthenticated}
          onUpdateField={updateField}
          onSetCaseText={setCaseText}
          onRunAnalysis={runAnalysis}
          onRunCaseToEvidence={runCaseToEvidence}
          onClear={clearAll}
          buildPayload={buildPayload}
        />

        {evidenceResult && (
          <CaseModeEvidenceBriefPanel result={evidenceResult} evidenceQuizMcqs={evidenceQuizMcqs} />
        )}

        {result && (
          <CaseModeAnalysisResultPanel
            result={result}
            prefillTopic={prefillTopic}
            reflectionKind={reflectionKind}
            reflectionSaveStatus={reflectionSaveStatus}
            onReflectionKindChange={setReflectionKind}
            onExportReflection={(format) => exportReflection('analysis', format)}
            onSaveReflectionDraft={() => void saveReflectionDraft('analysis')}
            onQuiz={() => startQuizFromCase('analysis')}
            onFollowUpSearch={(query) => { setQuery(query); setCurrentPage('search'); }}
          />
        )}
      </div>
    </div>
  );
};
