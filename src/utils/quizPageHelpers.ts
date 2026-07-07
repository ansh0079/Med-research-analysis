import { QuizGenerationError } from '@services/quizService';
import { api } from '@services/api';
import type { QuestionType, QuizQuestion, QuizState } from '@types';

export const QUIZ_INITIAL_STATE: QuizState = {
  questions: [],
  currentIndex: 0,
  answers: {},
  showExplanation: false,
  score: 0,
  complete: false,
};

export const WORKFLOW_CONTEXT_KEY = 'med_shift_workflow';

export const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  hard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export const QTYPE_CONFIG: Record<QuestionType, { label: string; icon: string; cls: string }> = {
  recall:               { label: 'Recall',               icon: 'fa-brain',          cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  clinical_application: { label: 'Clinical Application', icon: 'fa-stethoscope',    cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  trial_interpretation: { label: 'Trial Interpretation', icon: 'fa-flask',          cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  guideline:            { label: 'Guideline',            icon: 'fa-book-medical',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  pitfall:              { label: 'Pitfall / Misconception', icon: 'fa-exclamation-triangle', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

export function currentTimeMs(): number {
  return Date.now();
}

export function readWorkflowContext() {
  try {
    return JSON.parse(sessionStorage.getItem(WORKFLOW_CONTEXT_KEY) || '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function parseSourceLabel(text: string): { text: string; label: string | null } {
  const match = text.match(/\s*\[(Trial|Guideline|Topic memory)\]$/i);
  if (match) {
    return { text: text.slice(0, match.index).trim(), label: match[1] };
  }
  return { text, label: null };
}

export function getDifficultyFromParam(value: string | null): 'easy' | 'medium' | 'hard' | 'mixed' {
  if (value === 'easy' || value === 'medium' || value === 'hard' || value === 'mixed') return value;
  return 'mixed';
}

function mapRoundItemType(itemType: string): QuestionType {
  if (itemType === 'clinical_application') return 'clinical_application';
  if (itemType === 'evidence_appraisal') return 'trial_interpretation';
  if (itemType === 'overclaim_trap') return 'pitfall';
  return 'recall';
}

export function learningRoundItemsToQuestions(
  items: Array<{
    id?: number;
    itemType?: string;
    claimKey?: string | null;
    questionText?: string;
    options?: string[];
    correctAnswer?: string | null;
    explanation?: string | null;
  }>
): QuizQuestion[] {
  return items
    .filter((item) => String(item.questionText || '').trim().length > 0)
    .map((item, idx) => ({
      id: `round-${item.id ?? idx}`,
      type: 'multiple_choice' as const,
      questionType: mapRoundItemType(String(item.itemType || 'claim_recall')),
      question: String(item.questionText || ''),
      options: Array.isArray(item.options) ? item.options : [],
      correctAnswer: String(item.correctAnswer || item.options?.[0] || ''),
      explanation: String(item.explanation || ''),
      difficulty: 'medium' as const,
      claimKey: item.claimKey || null,
    }));
}

export async function waitForClaimJob(jobKey: string, maxMs = 120000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const { job } = await api.getAiGenerationJob(jobKey);
    if (job.status === 'completed') return;
    if (job.status === 'failed') {
      throw new QuizGenerationError(job.errorMessage || 'Claim generation failed', {
        code: 'JOB_FAILED',
        status: 409,
        jobKey,
        jobStatus: job.status,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new QuizGenerationError('Timed out waiting for teaching claims', {
    code: 'JOB_TIMEOUT',
    status: 409,
    jobKey,
  });
}
