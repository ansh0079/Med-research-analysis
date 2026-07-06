import { api } from '@services/api';
import { QuizGenerationError } from '@services/quizService';
import type { QuestionType, QuizQuestion, QuizState } from '@types';

export function currentTimeMs(): number {
  return Date.now();
}

const WORKFLOW_CONTEXT_KEY = 'med_shift_workflow';

export function readWorkflowContext() {
  try {
    return JSON.parse(sessionStorage.getItem(WORKFLOW_CONTEXT_KEY) || '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

export const INITIAL_STATE: QuizState = {
  questions: [],
  currentIndex: 0,
  answers: {},
  showExplanation: false,
  score: 0,
  complete: false,
};

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
    const { job } = await api.ai.getAiGenerationJob(jobKey);
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
