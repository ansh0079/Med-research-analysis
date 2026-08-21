import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@services/api';
import type { CaseSession, CaseStepFeedback, CaseRecommendation, CrossLearningRecommendation } from '@types';
import {
  CaseStepView,
  CaseSummaryView,
  DIFFICULTY_OPTIONS,
  RecommendationCard,
  STEP_SEQUENCE_META,
  StepProgressBar,
} from '@components/cases';

export const AdaptiveCasePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTopic = searchParams.get('topic') || '';

  const [phase, setPhase] = useState<'setup' | 'loading' | 'playing' | 'summary'>('setup');
  const [topic, setTopic] = useState(initialTopic);
  const [learningMode, setLearningMode] = useState<string>('student');
  const [difficulty, setDifficulty] = useState<string>('auto');
  const [session, setSession] = useState<CaseSession | null>(null);
  const [banditMeta, setBanditMeta] = useState<{ selectedBy?: string; armId?: string } | null>(null);
  const [feedback, setFeedback] = useState<CaseStepFeedback | null>(null);
  const [showingFeedback, setShowingFeedback] = useState(false);
  const [recommendations, setRecommendations] = useState<CaseRecommendation[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<CaseSession[]>([]);
  const [crossRec, setCrossRec] = useState<CrossLearningRecommendation | null>(null);
  const [generatingStep, setGeneratingStep] = useState(false);
  const [evidenceWarning, setEvidenceWarning] = useState<string | null>(null);
  const [suggestedDifficulty, setSuggestedDifficulty] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== 'setup') return;
    setRecsLoading(true);
    Promise.all([
      api.learning.getCaseRecommendations().catch(() => ({ recommendations: [], recentTopics: [] })),
      api.learning.listCaseSessions().catch(() => ({ sessions: [] })),
    ]).then(([recs, hist]) => {
      setRecommendations(recs.recommendations);
      setHistory(hist.sessions.slice(0, 5));
    }).finally(() => setRecsLoading(false));
  }, [phase]);

  useEffect(() => {
    if (initialTopic) {
      setTopic(initialTopic);
    }
  }, [initialTopic]);

  const startCase = useCallback(async () => {
    if (!topic.trim()) return;
    setPhase('loading');
    setError(null);
    try {
      const result = await api.learning.generateAdaptiveCase({ topic: topic.trim(), learningMode, difficulty });
      setSession(result.session);
      setEvidenceWarning(result.evidenceWarning || null);
      setBanditMeta(result.banditMeta || null);
      setFeedback(null);
      setShowingFeedback(false);
      setPhase('playing');
    } catch (err: unknown) {
      const anyErr = err as Error & { code?: string };
      const code = anyErr?.code;
      const msg = anyErr?.message || 'Failed to generate case';
      if (code === 'EVIDENCE_TOO_THIN') {
        setError(`${msg} Tip: run a search on this topic first so guidelines and teaching points can populate.`);
      } else if (code === 'CASE_STEP_GENERATION_FAILED') {
        setError('Could not generate a grounded case. Please retry — we never invent answers without evidence.');
      } else {
        setError(msg);
      }
      setPhase('setup');
    }
  }, [topic, learningMode, difficulty]);

  const handleStepSubmit = useCallback(async (answer: string, timeMs: number) => {
    if (!session) return;
    const stepIndex = session.currentStep;
    setGeneratingStep(true);
    try {
      const result = await api.learning.submitCaseStepResponse(session.id, {
        stepIndex, selectedAnswer: answer, timeMs,
      });
      setFeedback(result.stepFeedback);
      setShowingFeedback(true);
      setSession(result.session);
      if (result.crossLearningRecommendation) {
        setCrossRec(result.crossLearningRecommendation);
      }
      if (result.suggestedDifficulty) {
        setSuggestedDifficulty(result.suggestedDifficulty);
      }
      if (result.session.status === 'completed') {
        setTimeout(() => setPhase('summary'), 2500);
      }
    } catch (err: unknown) {
      const anyErr = err as Error & { code?: string };
      if (anyErr?.code === 'CASE_STEP_GENERATION_FAILED') {
        setError(anyErr.message || 'Could not generate the next grounded step. Your answer was saved — please retry.');
      } else {
        setError(anyErr?.message || 'Failed to submit step');
      }
    } finally {
      setGeneratingStep(false);
    }
  }, [session]);

  const advanceStep = useCallback(() => {
    setFeedback(null);
    setShowingFeedback(false);
  }, []);

  const resetToSetup = useCallback(() => {
    setPhase('setup');
    setSession(null);
    setFeedback(null);
    setShowingFeedback(false);
    setCrossRec(null);
    setGeneratingStep(false);
    setEvidenceWarning(null);
    setSuggestedDifficulty(null);
    setBanditMeta(null);
    setError(null);
  }, []);

  const currentStep = session?.caseData?.steps?.[session.currentStep];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <i className="fas fa-heartbeat text-rose-500 text-lg" />
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">Clinical Cases</h1>
      </div>

      {phase === 'setup' && (
        <div className="space-y-5">
          {recommendations.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                <i className="fas fa-crosshairs mr-1" />Recommended for you
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Based on your quiz performance — these topics need work</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {recommendations.map(rec => (
                  <RecommendationCard key={rec.normalizedTopic} rec={rec} onSelect={(t) => { setTopic(t); }} />
                ))}
              </div>
            </div>
          )}

          {recsLoading && (
            <div className="text-center py-6">
              <i className="fas fa-spinner fa-spin text-slate-400 text-lg" />
              <p className="text-xs text-slate-400 mt-2">Loading recommendations...</p>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Topic</label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Acute coronary syndrome, Heart failure..."
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Level</label>
                <select
                  value={learningMode}
                  onChange={e => setLearningMode(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200"
                >
                  <option value="student">Medical Student</option>
                  <option value="resident">Junior Doctor</option>
                  <option value="specialist">Senior Trainee</option>
                  <option value="exam">Exam Prep</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Difficulty</label>
                <div className="mt-1 flex gap-1">
                  {DIFFICULTY_OPTIONS.map(d => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setDifficulty(d.value)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${difficulty === d.value ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                      title={d.desc}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={startCase}
              disabled={!topic.trim()}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <i className="fas fa-play mr-2" />Generate Clinical Case
            </button>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
                <i className="fas fa-exclamation-circle mr-1" />{error}
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                <i className="fas fa-history mr-1" />Recent Cases
              </p>
              {history.map(h => (
                <div key={h.id} className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{h.topic}</p>
                    <p className="text-[10px] text-slate-400">{new Date(h.createdAt).toLocaleDateString()}</p>
                  </div>
                  {h.totalScore != null && (
                    <span className={`text-sm font-bold ${h.totalScore >= 80 ? 'text-emerald-500' : h.totalScore >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{h.totalScore}%</span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${h.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                    {h.status === 'completed' ? 'Done' : 'In progress'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {phase === 'loading' && (
        <div className="text-center py-16 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/30">
            <i className="fas fa-heartbeat text-rose-500 text-2xl animate-pulse" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Building your clinical case...</p>
          <p className="text-xs text-slate-400">
            Generating a {difficulty === 'auto' ? 'personalized' : difficulty} case on {topic}
          </p>
        </div>
      )}

      {phase === 'playing' && session && currentStep && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">{session.caseData.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                  <i className="fas fa-hospital mr-1" />{session.caseData.setting}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                  {session.difficulty}
                  {banditMeta?.selectedBy === 'bandit' ? ' · adaptive' : ''}
                </span>
              </div>
            </div>
            <button type="button" onClick={resetToSetup} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <i className="fas fa-times mr-1" />Exit
            </button>
          </div>

          <StepProgressBar steps={STEP_SEQUENCE_META} currentStep={session.currentStep} responses={session.responses} />

          {evidenceWarning && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              <i className="fas fa-exclamation-triangle mr-1.5" />{evidenceWarning}
            </div>
          )}

          {generatingStep && !showingFeedback && (
            <div className="flex items-center justify-center gap-3 py-8">
              <div className="spinner" />
              <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">Generating next step based on your answer...</p>
            </div>
          )}

          {currentStep && (
            <CaseStepView
              key={session.currentStep}
              step={currentStep}
              stepIndex={session.currentStep}
              onSubmit={handleStepSubmit}
              feedback={showingFeedback ? feedback : null}
              response={session.responses[session.currentStep] || null}
            />
          )}

          {showingFeedback && session.status !== 'completed' && (
            <button
              type="button"
              onClick={advanceStep}
              disabled={generatingStep}
              className="w-full py-2.5 rounded-xl font-semibold text-sm bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 hover:bg-slate-700 dark:hover:bg-slate-300 transition-colors disabled:opacity-50"
            >
              {generatingStep ? <><div className="spinner spinner-sm inline-block mr-2" />Preparing next step...</> : <>Next Step <i className="fas fa-arrow-right ml-2" /></>}
            </button>
          )}
        </div>
      )}

      {phase === 'summary' && session && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">{session.caseData.title}</h2>
            <button type="button" onClick={resetToSetup} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold">
              <i className="fas fa-plus mr-1" />New Case
            </button>
          </div>
          <CaseSummaryView session={session} crossRec={crossRec} onStartCrossCase={(t) => { setTopic(t); setCrossRec(null); setPhase('setup'); }} suggestedDifficulty={suggestedDifficulty} onAcceptDifficulty={(d) => { setDifficulty(d); setSuggestedDifficulty(null); resetToSetup(); }} />
        </div>
      )}

      <div className="text-[9px] text-slate-400 dark:text-slate-500 italic text-center">
        <i className="fas fa-robot mr-1" />
        AI-generated clinical cases — for educational purposes only. Verify against clinical guidelines before application.
      </div>
    </div>
  );
};
