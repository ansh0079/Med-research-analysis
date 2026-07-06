import { api } from '@services/api';
import { downloadText } from '@services/exportArticles';
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

type QuizReflectionKind = 'CBD' | 'mini-CEX' | 'DOPS';

function quizReflectionKindLabel(kind: QuizReflectionKind) {
  if (kind === 'CBD') return 'Case-based Discussion (CBD)';
  if (kind === 'mini-CEX') return 'Mini Clinical Evaluation Exercise (mini-CEX)';
  return 'Direct Observation of Procedural Skills (DOPS)';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildQuizReflectionSections({
  reflectionKind,
  quiz,
  evidenceSnippets,
  activeTopic,
  workflowContext,
  scorePercent,
}: {
  reflectionKind: QuizReflectionKind;
  quiz: QuizState;
  evidenceSnippets: Array<{ title?: string }>;
  activeTopic: string;
  workflowContext: Record<string, unknown>;
  scorePercent: number;
}) {
  const stamp = new Date().toISOString().split('T')[0];
  const weakTypes = quiz.questions
    .filter((q) => quiz.answers[q.id]?.toLowerCase() !== q.correctAnswer.toLowerCase())
    .map((q) => q.questionType || 'recall');
  const uniqueWeakTypes = [...new Set(weakTypes)];
  const evidenceTitles = evidenceSnippets
    .map((s) => s.title)
    .filter(Boolean)
    .slice(0, 5) as string[];
  const sections = [
    ['WBA / portfolio type', quizReflectionKindLabel(reflectionKind)],
    ['Generated', stamp],
    ['Topic', activeTopic],
    ['Original clinical question', typeof workflowContext.originalPresentation === 'string' && workflowContext.originalPresentation.trim() ? workflowContext.originalPresentation : 'Not captured. Add the de-identified presentation before submission.'],
    ['Learning journey', typeof workflowContext.source === 'string' ? `Started from ${workflowContext.source}.` : 'Started from evidence search.'],
    ['Quiz performance', `${quiz.score}/${quiz.questions.length} correct (${scorePercent}%)`],
    ['Questions attempted', String(quiz.questions.length)],
    ['Areas for improvement', uniqueWeakTypes.length > 0 ? uniqueWeakTypes.join(', ') : 'None identified - strong overall performance.'],
    ['Evidence used', evidenceTitles.length > 0 ? evidenceTitles.join('\n') : 'Current topic evidence and generated quiz explanations.'],
    ['Reflection notes', 'Use this quiz result to structure a discussion on clinical reasoning, evidence appraisal, and specific learning actions.'],
  ] as Array<[string, string]>;

  return {
    kind: reflectionKind,
    stamp,
    sections,
    uniqueWeakTypes,
    evidenceUsed: evidenceTitles.length > 0
      ? evidenceTitles.map((title, index) => `${index + 1}. ${title}`).join('\n')
      : 'Quiz questions generated from the current topic evidence.',
  };
}

export function exportQuizReflection(sections: Array<[string, string]>, kind: QuizReflectionKind, stamp: string, format: 'doc' | 'txt') {
  const safeKind = kind.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (format === 'txt') {
    const text = sections.map(([title, body]) => `${title}\n${body}`).join('\n\n');
    downloadText(`portfolio_reflection_${safeKind}_${stamp}.txt`, text);
    return;
  }
  const title = `${kind} Reflection`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>body{font-family:Arial,sans-serif;line-height:1.45;color:#111827;max-width:820px;margin:32px auto;padding:0 24px}h1{font-size:24px}h2{font-size:15px;margin-top:20px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}p{font-size:13px;white-space:pre-wrap}</style>
  </head><body>
    <h1>${escapeHtml(title)}</h1>
    ${sections.map(([sectionTitle, body]) => `<h2>${escapeHtml(sectionTitle)}</h2><p>${escapeHtml(body)}</p>`).join('\n')}
  </body></html>`;
  downloadText(`portfolio_reflection_${safeKind}_${stamp}.doc`, html, 'application/msword');
}
