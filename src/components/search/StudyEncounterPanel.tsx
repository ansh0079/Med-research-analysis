import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@services/api';
import type { Article, QuizQuestion } from '@types';
import type { AiJobClaimRow } from '@components/search/ClaimProvenanceModal';

// ─── Weakness analysis ────────────────────────────────────────────────────────

const WEAKNESS_MESSAGES: Record<string, string> = {
  trial_interpretation: 'You may be misinterpreting trial outcomes — watch for relative vs absolute risk and surrogate endpoints.',
  clinical_application:  'Applying trial evidence to individual patients needs attention — consider baseline risk and patient-important outcomes.',
  guideline:             'Guideline awareness needs work — check which bodies have reviewed this evidence and what grade they assigned.',
  pitfall:               'Common clinical pitfalls caught you — review confounding, selection bias, and overclaiming subgroup findings.',
  recall:                'Basic recall needs reinforcement — revisit the key definitions and mechanisms before tackling application.',
};

function deriveWeaknesses(attempts: Array<{ questionType?: string; isCorrect: boolean }>): string[] {
  const wrongTypes = attempts.filter((a) => !a.isCorrect).map((a) => a.questionType ?? 'recall');
  return [...new Set(wrongTypes)].map((t) => WEAKNESS_MESSAGES[t] ?? WEAKNESS_MESSAGES.recall);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex gap-1.5 items-center">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full transition-all ${
            i < current ? 'bg-emerald-500' : i === current ? 'bg-indigo-500 scale-125' : 'bg-slate-200 dark:bg-slate-700'
          }`}
        />
      ))}
    </div>
  );
}

function OptionButton({
  label,
  text,
  state,
  onClick,
}: {
  label: string;
  text: string;
  state: 'idle' | 'correct' | 'wrong' | 'missed';
  onClick?: () => void;
}) {
  const cls =
    state === 'correct' ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200'
    : state === 'wrong'  ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200'
    : state === 'missed' ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 opacity-80'
    : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 cursor-pointer';
  return (
    <button
      type="button"
      disabled={state !== 'idle'}
      onClick={onClick}
      className={`w-full text-left flex items-start gap-3 rounded-xl border px-3 py-2.5 text-xs transition-colors ${cls}`}
    >
      <span className="shrink-0 w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-bold mt-0.5">{label}</span>
      <span className="flex-1 leading-relaxed">{text}</span>
      {state === 'correct' && <i className="fas fa-check text-emerald-500 text-[11px] mt-0.5 shrink-0" />}
      {state === 'wrong'   && <i className="fas fa-times text-rose-500 text-[11px] mt-0.5 shrink-0" />}
      {state === 'missed'  && <i className="fas fa-arrow-right text-emerald-400 text-[11px] mt-0.5 shrink-0" />}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Phase = 'idle' | 'generating' | 'quizzing' | 'reviewing' | 'complete';

interface AttemptRecord {
  questionId: string;
  questionType?: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
  sourceArticleUid?: string;
  claimKey?: string | null;
}

interface StudyEncounterPanelProps {
  topic: string;
  articles: Article[];
  jobClaims: AiJobClaimRow[];
  guidelineConflictCount?: number;
}

export function StudyEncounterPanel({ topic, articles, jobClaims, guidelineConflictCount = 0 }: StudyEncounterPanelProps) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('idle');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [genError, setGenError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scheduleState, setScheduleState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [runId, setRunId] = useState<number | null>(null);

  const startQuiz = useCallback(async () => {
    setPhase('generating');
    setGenError('');
    try {
      const { questions: qs } = await api.ai.generateQuizFromEvidence(topic, articles, 'mixed', 3);
      setQuestions(qs);
      setQIndex(0);
      setSelected(null);
      setAttempts([]);
      setPhase('quizzing');
    } catch {
      setGenError('Could not generate questions — the AI tier may be unavailable.');
      setPhase('idle');
    }
  }, [topic, articles]);

  const currentQ = questions[qIndex] ?? null;
  const isAnswered = selected !== null;

  const handleSelect = useCallback((option: string) => {
    if (selected !== null || !currentQ) return;
    setSelected(option);
    // record attempt
    setAttempts((prev) => [
      ...prev,
      {
        questionId: currentQ.id,
        questionType: currentQ.questionType,
        questionText: currentQ.question,
        userAnswer: option,
        correctAnswer: currentQ.correctAnswer,
        isCorrect: option === currentQ.correctAnswer,
        explanation: currentQ.explanation,
        sourceArticleUid: currentQ.sourceArticle,
        claimKey: currentQ.claimKey ?? null,
      },
    ]);
  }, [selected, currentQ]);

  const handleNext = useCallback(async () => {
    if (qIndex < questions.length - 1) {
      setQIndex((i) => i + 1);
      setSelected(null);
    } else {
      // Last question — submit attempts
      setSubmitting(true);
      const allAttempts = [...attempts]; // already includes current answer
      try {
        await api.learning.submitQuizAttempt({
          topic,
          attempts: allAttempts.map((a) => ({
            questionId: a.questionId,
            questionType: (a.questionType ?? 'recall') as Parameters<typeof api.learning.submitQuizAttempt>[0]['attempts'][0]['questionType'],
            questionText: a.questionText,
            userAnswer: a.userAnswer,
            correctAnswer: a.correctAnswer,
            isCorrect: a.isCorrect,
            sourceArticleUid: a.sourceArticleUid,
            claimKey: a.claimKey,
          })),
        });
      } catch {
        // best-effort: submission failure shouldn't block showing results
      } finally {
        setSubmitting(false);
      }
      setPhase('reviewing');
    }
  }, [qIndex, questions.length, attempts, topic]);

  const handleSchedule = useCallback(async () => {
    if (scheduleState !== 'idle') return;
    setScheduleState('busy');
    try {
      const { run } = await api.learning.createStudyRun(topic);
      setRunId(run.id);
      setScheduleState('done');
    } catch {
      setScheduleState('idle');
    }
  }, [scheduleState, topic]);

  // ─ Idle ─────────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    if (articles.length === 0) return null;
    return (
      <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/10 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <i className="fas fa-graduation-cap text-indigo-500 text-sm" />
          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">Study this synthesis</span>
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          <span><i className="fas fa-file-alt mr-1" />{articles.length} article{articles.length !== 1 ? 's' : ''}</span>
          {jobClaims.length > 0 && <span><i className="fas fa-tag mr-1" />{jobClaims.length} grounded claim{jobClaims.length !== 1 ? 's' : ''}</span>}
          {guidelineConflictCount > 0 && (
            <span className="text-rose-600 dark:text-rose-400 font-semibold">
              <i className="fas fa-exclamation-triangle mr-1" />{guidelineConflictCount} guideline conflict{guidelineConflictCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {genError && <p className="text-xs text-rose-600 dark:text-rose-400">{genError}</p>}
        <button
          type="button"
          onClick={() => void startQuiz()}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 transition-colors"
        >
          <i className="fas fa-brain mr-1.5" /> Start 3-question quiz
        </button>
      </div>
    );
  }

  // ─ Generating ───────────────────────────────────────────────────────────────
  if (phase === 'generating') {
    return (
      <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/10 p-4 flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin shrink-0" />
        <p className="text-xs text-slate-500 dark:text-slate-400">Generating questions from evidence…</p>
      </div>
    );
  }

  // ─ Quizzing ─────────────────────────────────────────────────────────────────
  if (phase === 'quizzing' && currentQ) {
    const opts = currentQ.options ?? [];
    const optionLabels = ['A', 'B', 'C', 'D'];
    const isLast = qIndex === questions.length - 1;

    const optionState = (opt: string): 'idle' | 'correct' | 'wrong' | 'missed' => {
      if (!isAnswered) return 'idle';
      if (opt === currentQ.correctAnswer) return opt === selected ? 'correct' : 'missed';
      if (opt === selected) return 'wrong';
      return 'idle';
    };

    return (
      <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/10 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <ProgressDots total={questions.length} current={qIndex} />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Q{qIndex + 1} of {questions.length}
            {currentQ.questionType && <> · <span className="text-indigo-400">{currentQ.questionType.replace(/_/g, ' ')}</span></>}
          </span>
        </div>

        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">{currentQ.question}</p>

        <div className="space-y-2">
          {opts.map((opt, i) => (
            <OptionButton
              key={opt}
              label={optionLabels[i] ?? String(i + 1)}
              text={opt}
              state={optionState(opt)}
              onClick={() => handleSelect(opt)}
            />
          ))}
        </div>

        {isAnswered && (
          <div className={`rounded-xl px-3 py-2.5 text-xs leading-relaxed ${
            selected === currentQ.correctAnswer
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/50'
              : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800/50'
          }`}>
            <p className="font-bold mb-1">
              {selected === currentQ.correctAnswer
                ? <><i className="fas fa-check mr-1" />Correct</>
                : <><i className="fas fa-times mr-1" />Incorrect — correct answer: {currentQ.correctAnswer}</>}
            </p>
            <p>{currentQ.explanation}</p>
          </div>
        )}

        {isAnswered && (
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleNext()}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 transition-colors"
          >
            {submitting ? <><i className="fas fa-spinner fa-spin mr-1" />Saving…</> : isLast ? 'See results' : 'Next question'} <i className="fas fa-arrow-right ml-1" />
          </button>
        )}
      </div>
    );
  }

  // ─ Reviewing ────────────────────────────────────────────────────────────────
  if (phase === 'reviewing') {
    const correct = attempts.filter((a) => a.isCorrect).length;
    const total = attempts.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const weaknesses = deriveWeaknesses(attempts);
    const missedAttempts = attempts.filter((a) => !a.isCorrect);

    return (
      <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/10 p-4 space-y-4">
        {/* Score */}
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black text-white text-lg shrink-0 ${
            pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-500'
          }`}>
            {correct}/{total}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{pct}% correct</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {pct >= 80 ? 'Strong performance — ready to schedule review.' : pct >= 60 ? 'Good start — a few gaps to address.' : 'More practice needed — see reasoning notes below.'}
            </p>
          </div>
        </div>

        {/* Reasoning weaknesses */}
        {weaknesses.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Reasoning feedback</p>
            {weaknesses.map((w, i) => (
              <div key={i} className="flex items-start gap-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 px-3 py-2">
                <i className="fas fa-lightbulb text-amber-500 text-[11px] mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">{w}</p>
              </div>
            ))}
          </div>
        )}

        {/* Missed questions */}
        {missedAttempts.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Missed questions</p>
            {missedAttempts.map((a, i) => (
              <div key={i} className="rounded-xl border border-slate-100 dark:border-slate-800 px-3 py-2.5 space-y-1">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">{a.questionText}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Your answer: <span className="text-rose-600 dark:text-rose-400 font-medium">{a.userAnswer}</span>
                  {' · '}Correct: <span className="text-emerald-600 dark:text-emerald-400 font-medium">{a.correctAnswer}</span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{a.explanation}</p>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {scheduleState === 'done' ? (
            <button
              type="button"
              onClick={() => runId && navigate(`/learning/${runId}`)}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 transition-colors"
            >
              <i className="fas fa-calendar-check mr-1.5" /> Open study plan
            </button>
          ) : (
            <button
              type="button"
              disabled={scheduleState === 'busy'}
              onClick={() => void handleSchedule()}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 transition-colors"
            >
              {scheduleState === 'busy'
                ? <><i className="fas fa-spinner fa-spin mr-1" />Scheduling…</>
                : <><i className="fas fa-calendar-plus mr-1.5" />Add to review plan</>}
            </button>
          )}
          <button
            type="button"
            onClick={() => { setPhase('idle'); setAttempts([]); setSelected(null); }}
            className="rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <i className="fas fa-redo mr-1.5" /> Retry quiz
          </button>
        </div>
      </div>
    );
  }

  return null;
}
