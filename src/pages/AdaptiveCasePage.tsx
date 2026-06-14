import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@services/api';
import type { CaseSession, CaseStep, CaseStepFeedback, CaseStepResponse, CaseRecommendation, CrossLearningRecommendation } from '@types';

const STEP_TYPE_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  presentation: { icon: 'fa-user-injured', label: 'Presentation', color: 'text-blue-500' },
  investigation: { icon: 'fa-microscope', label: 'Investigations', color: 'text-violet-500' },
  management: { icon: 'fa-prescription', label: 'Management', color: 'text-emerald-500' },
  complication: { icon: 'fa-bolt', label: 'Complication', color: 'text-amber-500' },
  resolution: { icon: 'fa-check-circle', label: 'Resolution', color: 'text-teal-500' },
};

const STEP_SEQUENCE_META: Array<{ type: string }> = [
  { type: 'presentation' }, { type: 'investigation' }, { type: 'management' },
  { type: 'complication' }, { type: 'resolution' },
];

const QUESTION_TYPE_STYLES: Record<string, string> = {
  recall: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  clinical_application: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  trial_interpretation: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  guideline: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  pitfall: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Foundation', desc: 'Classic presentations' },
  { value: 'medium', label: 'Standard', desc: 'Realistic with distractors' },
  { value: 'hard', label: 'Advanced', desc: 'Atypical, multi-system' },
];

function StepProgressBar({ steps, currentStep, responses }: { steps: Array<{ type: string }>; currentStep: number; responses: CaseStepResponse[] }) {
  return (
    <div className="flex items-center gap-1 w-full">
      {steps.map((step, i) => {
        const responded = responses[i];
        const isCurrent = i === currentStep;
        const meta = STEP_TYPE_LABELS[step.type] || STEP_TYPE_LABELS.presentation;
        let bgColor = 'bg-slate-200 dark:bg-slate-700';
        if (responded?.isCorrect === true) bgColor = 'bg-emerald-500';
        else if (responded?.isCorrect === false) bgColor = 'bg-red-400';
        else if (isCurrent) bgColor = 'bg-blue-500 animate-pulse';
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className={`h-2 w-full rounded-full ${bgColor} transition-colors`} />
            <span className={`text-[9px] font-medium ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
              <i className={`fas ${meta.icon} mr-0.5`} />{meta.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function OptionButton({ label, selected, correct, showResult, onClick }: {
  label: string; selected: boolean; correct: boolean; showResult: boolean; onClick: () => void;
}) {
  let cls = 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20';
  if (showResult && selected && correct) cls = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 ring-2 ring-emerald-500/40';
  else if (showResult && selected && !correct) cls = 'border-red-500 bg-red-50 dark:bg-red-900/30 ring-2 ring-red-500/40';
  else if (showResult && correct) cls = 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20';
  else if (selected) cls = 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500/40';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={showResult}
      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${cls} ${showResult ? 'cursor-default' : 'cursor-pointer'}`}
    >
      <span className="text-slate-800 dark:text-slate-200">{label}</span>
      {showResult && correct && <i className="fas fa-check-circle text-emerald-500 float-right mt-0.5" />}
      {showResult && selected && !correct && <i className="fas fa-times-circle text-red-500 float-right mt-0.5" />}
    </button>
  );
}

function CaseStepView({ step, stepIndex, onSubmit, feedback, response }: {
  step: CaseStep; stepIndex: number;
  onSubmit: (answer: string, timeMs: number) => void;
  feedback: CaseStepFeedback | null;
  response: CaseStepResponse | null;
}) {
  const [selected, setSelected] = useState<string | null>(response?.selectedAnswer || null);
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(Date.now());
  const showResult = !!feedback;
  const meta = STEP_TYPE_LABELS[step.type] || STEP_TYPE_LABELS.presentation;
  const qStyle = QUESTION_TYPE_STYLES[step.questionType] || QUESTION_TYPE_STYLES.recall;

  const handleSubmit = useCallback(async () => {
    if (!selected || showResult) return;
    setSubmitting(true);
    await onSubmit(selected, Date.now() - startTime);
    setSubmitting(false);
  }, [selected, showResult, onSubmit, startTime]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 mb-1">
        <i className={`fas ${meta.icon} ${meta.color}`} />
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{meta.label}</span>
        <span className="text-xs text-slate-400">Step {stepIndex + 1} of 5</span>
      </div>

      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200 dark:border-slate-700">
        <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">{step.narrative}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{step.question}</p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${qStyle}`}>
            {step.questionType.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="space-y-2">
          {step.options.map((opt) => {
            const letter = opt.charAt(0);
            return (
              <OptionButton
                key={opt}
                label={opt}
                selected={selected === letter}
                correct={letter === step.correctAnswer}
                showResult={showResult}
                onClick={() => !showResult && setSelected(letter)}
              />
            );
          })}
        </div>
      </div>

      {!showResult && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selected || submitting}
          className="w-full py-2.5 rounded-xl font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? <><i className="fas fa-spinner fa-spin mr-2" />Submitting...</> : 'Submit Answer'}
        </button>
      )}

      {showResult && feedback && (
        <div className={`rounded-xl p-4 space-y-3 ${feedback.isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
          <div className="flex items-center gap-2">
            <i className={`fas ${feedback.isCorrect ? 'fa-check-circle text-emerald-500' : 'fa-times-circle text-red-500'}`} />
            <span className={`text-sm font-bold ${feedback.isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
              {feedback.isCorrect ? 'Correct!' : 'Incorrect'}
            </span>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{feedback.explanation}</p>
          {!feedback.isCorrect && feedback.whyOthersWrong && (
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{feedback.whyOthersWrong}</p>
          )}
          <div className="flex items-start gap-2 pt-1 border-t border-slate-200 dark:border-slate-700">
            <i className="fas fa-lightbulb text-amber-500 mt-0.5 text-xs" />
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{feedback.teachingPoint}</p>
          </div>
          {feedback.evidenceSource && (
            <div className="flex items-center gap-1.5 pt-1">
              <i className="fas fa-bookmark text-blue-400 text-[10px]" />
              <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">Source: {feedback.evidenceSource}</span>
            </div>
          )}
          {feedback.branchingNote && (
            <div className="flex items-start gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
              <i className="fas fa-code-branch text-violet-400 mt-0.5 text-[10px]" />
              <span className="text-[10px] text-violet-600 dark:text-violet-400 italic">{feedback.branchingNote}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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

function CaseSummaryView({ session, crossRec, onStartCrossCase, suggestedDifficulty, onAcceptDifficulty }: { session: CaseSession; crossRec?: CrossLearningRecommendation | null; onStartCrossCase?: (topic: string) => void; suggestedDifficulty?: string | null; onAcceptDifficulty?: (d: string) => void }) {
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

function RecommendationCard({ rec, onSelect }: { rec: CaseRecommendation; onSelect: (topic: string) => void }) {
  const weakAreas = [];
  if (rec.recallScore < 60) weakAreas.push('Recall');
  if (rec.clinicalApplicationScore < 60) weakAreas.push('Clinical');
  if (rec.guidelineScore < 60) weakAreas.push('Guidelines');
  if (rec.pitfallScore < 60) weakAreas.push('Pitfalls');
  const scoreColor = rec.overallScore < 40 ? 'text-red-500' : rec.overallScore < 60 ? 'text-amber-500' : 'text-emerald-500';

  return (
    <button
      type="button"
      onClick={() => onSelect(rec.topic)}
      className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
            {rec.displayName || rec.topic}
          </p>
          {rec.specialty && (
            <p className="text-[10px] text-slate-400 mt-0.5">{rec.specialty}</p>
          )}
        </div>
        <span className={`text-lg font-bold ${scoreColor}`}>{Math.round(rec.overallScore)}%</span>
      </div>
      {weakAreas.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {weakAreas.map(area => (
            <span key={area} className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300 font-medium">
              {area}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

export const AdaptiveCasePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTopic = searchParams.get('topic') || '';

  const [phase, setPhase] = useState<'setup' | 'loading' | 'playing' | 'summary'>('setup');
  const [topic, setTopic] = useState(initialTopic);
  const [learningMode, setLearningMode] = useState<string>('student');
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [session, setSession] = useState<CaseSession | null>(null);
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
      api.getCaseRecommendations().catch(() => ({ recommendations: [], recentTopics: [] })),
      api.listCaseSessions().catch(() => ({ sessions: [] })),
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
      const result = await api.generateAdaptiveCase({ topic: topic.trim(), learningMode, difficulty });
      setSession(result.session);
      setEvidenceWarning(result.evidenceWarning || null);
      setFeedback(null);
      setShowingFeedback(false);
      setPhase('playing');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate case');
      setPhase('setup');
    }
  }, [topic, learningMode, difficulty]);

  const handleStepSubmit = useCallback(async (answer: string, timeMs: number) => {
    if (!session) return;
    const stepIndex = session.currentStep;
    setGeneratingStep(true);
    try {
      const result = await api.submitCaseStepResponse(session.id, {
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
          <p className="text-xs text-slate-400">Generating a {difficulty} case on {topic}</p>
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
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">{session.difficulty}</span>
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
