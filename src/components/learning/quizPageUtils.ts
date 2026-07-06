import { QuizGenerationError, type QuizArticle } from '@services/quizService';
import { api } from '@services/api';
import { selectTopEvidence } from '@utils/selectTopEvidence';
import type { Article, QuizQuestion, QuizState, QuestionType } from '@types';

export const QUIZ_INITIAL_STATE: QuizState = {
  questions: [],
  currentIndex: 0,
  answers: {},
  showExplanation: false,
  score: 0,
  complete: false,
};

export function readQuizPrefill(): Record<string, unknown> | null {
  try {
    const raw = sessionStorage.getItem('med_quiz_prefill');
    if (!raw) return null;
    sessionStorage.removeItem('med_quiz_prefill');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function buildLockedArticles(quizPrefill: Record<string, unknown> | null): QuizArticle[] {
  const articles = quizPrefill?.articles;
  if (!Array.isArray(articles) || articles.length === 0) return [];
  return articles
    .map((a: Record<string, unknown>) => ({
      uid: String(a.uid || ''),
      title: String(a.title || '').trim(),
      abstract: a.abstract as string | undefined,
      doi: a.doi as string | null | undefined,
      pmid: a.pmid as string | null | undefined,
      pubdate: a.pubdate as string | null | undefined,
      source: (a.source ?? a.journal) as string | null | undefined,
      pmcrefcount: a.pmcrefcount as number | undefined,
      pubtype: a.pubtype as string[] | undefined,
    }))
    .filter((a: QuizArticle) => a.title.length > 0);
}

export function buildEvidenceSnippets(lockedArticles: QuizArticle[], results: Article[]): QuizArticle[] {
  if (lockedArticles.length > 0) return lockedArticles;
  return selectTopEvidence(results, 5).map((a) => ({
    uid: a.uid,
    title: a.title,
    abstract: a.abstract,
    doi: a.doi,
    pmid: a.pmid,
    pubdate: a.pubdate,
    source: a.source ?? a.journal,
    pmcrefcount: a.pmcrefcount,
    pubtype: a.pubtype,
  }));
}

export function advanceQuizWithAdaptiveDifficulty(
  prev: QuizState,
  currentQ: QuizQuestion | undefined,
  nextIndex: number,
): { nextState: QuizState; adaptiveNotice: string | null } {
  if (!currentQ) {
    return { nextState: { ...prev, currentIndex: nextIndex, showExplanation: false }, adaptiveNotice: null };
  }
  const recentAnswered = prev.questions
    .slice(0, prev.currentIndex + 1)
    .filter((q) => prev.answers[q.id] !== undefined);
  const lastThree = recentAnswered.slice(-3);
  const lastTwo = recentAnswered.slice(-2);
  const easyCorrectStreak = lastThree.length === 3
    && lastThree.every((q) => q.difficulty === 'easy' && prev.answers[q.id]?.toLowerCase() === q.correctAnswer.toLowerCase());
  const hardWrongStreak = lastTwo.length === 2
    && lastTwo.every((q) => q.difficulty === 'hard' && prev.answers[q.id]?.toLowerCase() !== q.correctAnswer.toLowerCase());
  const desired = easyCorrectStreak ? 'hard' : hardWrongStreak ? 'medium' : null;
  if (!desired) {
    return { nextState: { ...prev, currentIndex: nextIndex, showExplanation: false }, adaptiveNotice: null };
  }
  const swapIndex = prev.questions.findIndex((q, index) => index >= nextIndex && q.difficulty === desired);
  if (swapIndex <= nextIndex) {
    return { nextState: { ...prev, currentIndex: nextIndex, showExplanation: false }, adaptiveNotice: null };
  }
  const questions = [...prev.questions];
  [questions[nextIndex], questions[swapIndex]] = [questions[swapIndex], questions[nextIndex]];
  return {
    nextState: { ...prev, questions, currentIndex: nextIndex, showExplanation: false },
    adaptiveNotice: desired === 'hard'
      ? 'Difficulty escalated after three easy correct answers.'
      : 'Difficulty eased after two hard misses.',
  };
}

export function currentTimeMs(): number {
  return Date.now();
}

export function getDifficultyFromParam(value: string | null): 'easy' | 'medium' | 'hard' | 'mixed' {
  if (value === 'easy' || value === 'medium' || value === 'hard' || value === 'mixed') return value;
  return 'mixed';
}

export function mapRoundItemType(itemType: string): QuestionType {
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
