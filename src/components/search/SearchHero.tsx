import React from 'react';
import { SearchBar } from '@components/search/SearchBar';
import type { Article, SearchFilters, TopicGuideStatus } from '@types';
import type { BriefDifficulty } from './TopicBriefPanel';
import type { ClinicalScenarioExtract } from '../../utils/extractClinicalScenario';

interface SearchHeroProps {
  showVerifyBanner: boolean;
  onSearch: (query: string) => void;
  loading: boolean;
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  vectorSearchEnabled: boolean;
  searchHistory: string[];
  shiftPresentation: string;
  setShiftPresentation: (value: string) => void;
  scenarioExtract: ClinicalScenarioExtract | null;
  shiftLaneLoading: boolean;
  runShiftFastLane: () => Promise<void>;
  currentQuery: string;
  topicGuideStatus: TopicGuideStatus;
  topicGuideRefreshState: 'idle' | 'loading';
  topicGuideRefreshError: string | null;
  runTopicGuideRefresh: () => Promise<void>;
  isAuthenticated: boolean;
  error: Error | null;
  results: Article[];
  inPlaceQuizExpanded: boolean;
  setInPlaceQuizExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  trackFeatureUsage: (feature: string, metadata?: Record<string, unknown>) => void;
  openGuidelineFromWorkflow: () => void;
  openCaseFromWorkflow: (difficulty?: BriefDifficulty) => void;
}

export const SearchHero: React.FC<SearchHeroProps> = ({
  showVerifyBanner,
  onSearch,
  loading,
  filters,
  setFilters,
  vectorSearchEnabled,
  searchHistory,
  shiftPresentation,
  setShiftPresentation,
  scenarioExtract,
  shiftLaneLoading,
  runShiftFastLane,
  currentQuery,
  topicGuideStatus,
  topicGuideRefreshState,
  topicGuideRefreshError,
  runTopicGuideRefresh,
  isAuthenticated,
  error,
  results,
  inPlaceQuizExpanded,
  setInPlaceQuizExpanded,
  trackFeatureUsage,
  openGuidelineFromWorkflow,
  openCaseFromWorkflow,
}) => {
  return (
    <header className={`w-full pb-24 px-4 relative overflow-hidden ${showVerifyBanner ? 'pt-28' : 'pt-20'}`}>
      <div className="max-w-4xl mx-auto">

        {/* Hero heading */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-3 leading-[1.08]">
            Medical Evidence,<br />
            <span className="gradient-text">Synthesised by AI</span>
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 font-mono tracking-wide">
            PubMed · Semantic Scholar · OpenAlex · Gemini 2.0 Flash
          </p>
        </div>

        <SearchBar
          onSearch={onSearch}
          loading={loading}
          specificity={filters.specificity}
          onSpecificityChange={(specificity) => setFilters({ specificity })}
          sources={filters.sources}
          onSourcesChange={(sources) => setFilters({ sources })}
          vectorSearchEnabled={vectorSearchEnabled}
          useVectorSearch={Boolean(filters.useVectorSearch)}
          onVectorModeChange={(useVectorSearch) => setFilters({ useVectorSearch })}
          placeholder="e.g. SGLT2 inhibitors in heart failure with preserved ejection fraction"
        />

        {/* Session trajectory breadcrumb */}
        {searchHistory.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Exploring:</span>
            {searchHistory.map((q, i) => (
              <React.Fragment key={`${q}-${i}`}>
                <button
                  type="button"
                  onClick={() => onSearch(q)}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 transition-colors"
                  title={`Re-run: ${q}`}
                >
                  {q}
                </button>
                {i < searchHistory.length - 1 && (
                  <i className="fas fa-chevron-right text-[9px] text-slate-300 dark:text-slate-600" />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        <div className="mt-5 max-w-3xl mx-auto rounded-2xl border border-cyan-200/80 dark:border-cyan-900/60 bg-cyan-50/70 dark:bg-cyan-950/20 p-4 text-left shadow-sm shadow-cyan-100/50 dark:shadow-none">
          <div className="flex flex-col gap-3 md:flex-row md:items-start">
            <div className="min-w-0 flex-1">
              <label htmlFor="shift-presentation" className="text-[10px] font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
                I saw this patient today
              </label>
              <textarea
                id="shift-presentation"
                value={shiftPresentation}
                onChange={(event) => setShiftPresentation(event.target.value)}
                rows={3}
                className="mt-2 w-full resize-none rounded-xl border border-cyan-200 bg-white/90 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:border-cyan-900/70 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:ring-cyan-900/60"
                placeholder="e.g. 72F with pneumonia, septic shock, lactate 4, on noradrenaline. Do steroids help?"
              />
              <p className="mt-2 text-xs text-cyan-900/70 dark:text-cyan-100/70">
                Turns a quick presentation into an evidence search, then you can synthesize, quiz, or open case mode from the same results.
              </p>
              {scenarioExtract && scenarioExtract.confidence >= 0.3 && (
                <div className="mt-3 rounded-xl border border-cyan-200/60 dark:border-cyan-900/50 bg-white/70 dark:bg-slate-950/40 p-3">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
                      Detected PICO
                    </span>
                    <span className="text-[10px] text-cyan-600/70 dark:text-cyan-400/70">
                      confidence {(scenarioExtract.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                    {scenarioExtract.population && (
                      <div className="truncate" title={scenarioExtract.population}>
                        <span className="font-semibold text-cyan-800 dark:text-cyan-200">P:</span>{' '}
                        <span className="text-cyan-700 dark:text-cyan-300">{scenarioExtract.population}</span>
                      </div>
                    )}
                    {scenarioExtract.intervention && (
                      <div className="truncate" title={scenarioExtract.intervention}>
                        <span className="font-semibold text-cyan-800 dark:text-cyan-200">I:</span>{' '}
                        <span className="text-cyan-700 dark:text-cyan-300">{scenarioExtract.intervention}</span>
                      </div>
                    )}
                    {scenarioExtract.comparison && (
                      <div className="truncate" title={scenarioExtract.comparison}>
                        <span className="font-semibold text-cyan-800 dark:text-cyan-200">C:</span>{' '}
                        <span className="text-cyan-700 dark:text-cyan-300">{scenarioExtract.comparison}</span>
                      </div>
                    )}
                    {scenarioExtract.outcome && (
                      <div className="truncate" title={scenarioExtract.outcome}>
                        <span className="font-semibold text-cyan-800 dark:text-cyan-200">O:</span>{' '}
                        <span className="text-cyan-700 dark:text-cyan-300">{scenarioExtract.outcome}</span>
                      </div>
                    )}
                  </div>
                  {scenarioExtract.decisionPoint && (
                    <div className="mt-1.5 pt-1.5 border-t border-cyan-200/40 dark:border-cyan-900/40">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">Decision point</span>
                      <p className="mt-0.5 text-xs text-cyan-800 dark:text-cyan-200 italic">{scenarioExtract.decisionPoint}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={shiftPresentation.trim().length < 10 || loading || shiftLaneLoading}
              onClick={() => void runShiftFastLane()}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-cyan-500 disabled:pointer-events-none disabled:opacity-45 md:mt-6 md:w-44"
            >
              {shiftLaneLoading || loading ? (
                <>
                  <span className="spinner w-3.5 h-3.5" />
                  Finding...
                </>
              ) : (
                <>
                  <i className="fas fa-bolt text-xs" />
                  Find trials
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-8 max-w-3xl mx-auto space-y-3">
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-700/90 bg-white/70 dark:bg-slate-900/45 px-4 py-3 text-left shadow-sm shadow-slate-200/30 dark:shadow-none">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Junior doctor workflow</p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {[
                { id: 'evidence', label: 'Evidence', icon: 'fa-layer-group', color: 'bg-indigo-600 text-white hover:bg-indigo-500', scrollTo: 'workflow-evidence' },
                { id: 'guideline', label: 'Guideline check', icon: 'fa-book-medical', color: 'border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40', action: openGuidelineFromWorkflow },
                { id: 'case', label: 'Case mode', icon: 'fa-stethoscope', color: 'border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40', action: () => openCaseFromWorkflow('mixed') },
                { id: 'quiz', label: 'Quiz', icon: 'fa-brain', color: inPlaceQuizExpanded ? 'bg-violet-600 text-white hover:bg-violet-500' : 'border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/40', action: () => setInPlaceQuizExpanded((v) => !v) },
                { id: 'export', label: 'CBD export', icon: 'fa-file-export', color: 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40', action: () => openCaseFromWorkflow('mixed') },
              ].map((step, idx, arr) => (
                <React.Fragment key={step.id}>
                  <button
                    type="button"
                    disabled={results.length === 0}
                    onClick={() => {
                      trackFeatureUsage(`workflow_${step.id}_click`, { resultsCount: results.length });
                      if (step.action) {
                        step.action();
                      } else if (step.scrollTo) {
                        document.getElementById(step.scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40 disabled:pointer-events-none transition-colors ${step.color}`}
                  >
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-white/20 text-[9px] font-black">{idx + 1}</span>
                    <i className={`fas ${step.icon} text-[10px]`} />
                    {step.label}
                  </button>
                  {idx < arr.length - 1 && (
                    <i className="fas fa-chevron-right text-[10px] text-slate-300 dark:text-slate-600" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
          {currentQuery && topicGuideStatus === 'building' && (
            <div className="text-xs text-amber-800 dark:text-amber-200 px-1 space-y-2">
              <p className="flex items-start gap-2">
                <span className="mt-1 inline-block w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" aria-hidden />
                <span>
                  Topic mentor guide is generating in the background (often under a minute). You can still synthesize, quiz, and case while you wait.
                </span>
              </p>
              {isAuthenticated && (
                <div className="flex flex-wrap items-center gap-2 pl-4">
                  <button
                    type="button"
                    disabled={topicGuideRefreshState === 'loading'}
                    onClick={() => void runTopicGuideRefresh()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100/80 disabled:opacity-50 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/70"
                  >
                    {topicGuideRefreshState === 'loading' ? 'Refreshing…' : 'Refresh topic guide now'}
                  </button>
                  {topicGuideRefreshError && (
                    <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">{topicGuideRefreshError}</span>
                  )}
                </div>
              )}
            </div>
          )}
          {currentQuery && topicGuideStatus === 'pending' && (
            <div className="text-xs text-slate-600 dark:text-slate-400 px-1 space-y-2">
              <p>
                Topic guide did not appear yet.{' '}
                <button
                  type="button"
                  className="font-semibold text-indigo-600 dark:text-indigo-400 underline underline-offset-2"
                  onClick={() => void onSearch(currentQuery)}
                >
                  Run search again
                </button>
                {' '}or open Knowledge review after sign-in.
              </p>
              {isAuthenticated && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={topicGuideRefreshState === 'loading'}
                    onClick={() => void runTopicGuideRefresh()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/40"
                  >
                    {topicGuideRefreshState === 'loading' ? 'Refreshing…' : 'Refresh topic guide'}
                  </button>
                  {topicGuideRefreshError && (
                    <span className="text-[11px] font-semibold text-red-500">{topicGuideRefreshError}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-400 rounded-2xl text-sm flex items-center gap-2">
            <i className="fas fa-exclamation-circle" /> {error.message}
          </div>
        )}
      </div>
    </header>
  );
};
