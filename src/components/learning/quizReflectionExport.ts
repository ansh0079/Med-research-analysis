import { downloadText } from '@services/exportArticles';
import type { QuizQuestion } from '@types';
import type { QuizArticle } from '@services/quizService';

export type ReflectionKind = 'CBD' | 'mini-CEX' | 'DOPS';

export function buildQuizReflectionSections(args: {
  reflectionKind: ReflectionKind;
  activeTopic: string;
  quizScore: number;
  questionCount: number;
  scorePercent: number;
  questions: QuizQuestion[];
  answers: Record<string, string>;
  workflowContext: Record<string, unknown>;
  evidenceSnippets: QuizArticle[];
}) {
  const {
    reflectionKind: kind,
    activeTopic,
    quizScore,
    questionCount,
    scorePercent,
    questions,
    answers,
    workflowContext,
    evidenceSnippets,
  } = args;
  const stamp = new Date().toISOString().split('T')[0];
  const weakTypes = questions
    .filter((q) => answers[q.id]?.toLowerCase() !== q.correctAnswer.toLowerCase())
    .map((q) => q.questionType || 'recall');
  const uniqueWeakTypes = [...new Set(weakTypes)];
  const evidenceTitles = evidenceSnippets
    .map((s) => s.title)
    .filter(Boolean)
    .slice(0, 5) as string[];
  const sections = [
    ['WBA / portfolio type', kind === 'CBD' ? 'Case-based Discussion (CBD)' : kind === 'mini-CEX' ? 'Mini Clinical Evaluation Exercise (mini-CEX)' : 'Direct Observation of Procedural Skills (DOPS)'],
    ['Generated', stamp],
    ['Topic', activeTopic],
    ['Original clinical question', typeof workflowContext.originalPresentation === 'string' && workflowContext.originalPresentation.trim() ? workflowContext.originalPresentation : 'Not captured. Add the de-identified presentation before submission.'],
    ['Learning journey', typeof workflowContext.source === 'string' ? `Started from ${workflowContext.source}.` : 'Started from evidence search.'],
    ['Quiz performance', `${quizScore}/${questionCount} correct (${scorePercent}%)`],
    ['Questions attempted', String(questionCount)],
    ['Areas for improvement', uniqueWeakTypes.length > 0 ? uniqueWeakTypes.join(', ') : 'None identified - strong overall performance.'],
    ['Evidence used', evidenceTitles.length > 0 ? evidenceTitles.join('\n') : 'Current topic evidence and generated quiz explanations.'],
    ['Reflection notes', 'Use this quiz result to structure a discussion on clinical reasoning, evidence appraisal, and specific learning actions.'],
  ] as Array<[string, string]>;
  return {
    kind,
    stamp,
    sections,
    uniqueWeakTypes,
    evidenceUsed: evidenceTitles.length > 0
      ? evidenceTitles.map((title, index) => `${index + 1}. ${title}`).join('\n')
      : 'Quiz questions generated from the current topic evidence.',
  };
}

export function exportQuizReflection(args: {
  reflectionKind: ReflectionKind;
  activeTopic: string;
  quizScore: number;
  questionCount: number;
  scorePercent: number;
  questions: QuizQuestion[];
  answers: Record<string, string>;
  format: 'doc' | 'txt';
}) {
  const { reflectionKind: kind, activeTopic, quizScore, questionCount, scorePercent, questions, answers, format } = args;
  const stamp = new Date().toISOString().split('T')[0];
  const safeKind = kind.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const weakTypes = questions
    .filter((q) => answers[q.id]?.toLowerCase() !== q.correctAnswer.toLowerCase())
    .map((q) => q.questionType || 'recall');
  const uniqueWeakTypes = [...new Set(weakTypes)];
  const sections = [
    ['WBA / portfolio type', kind === 'CBD' ? 'Case-based Discussion (CBD)' : kind === 'mini-CEX' ? 'Mini Clinical Evaluation Exercise (mini-CEX)' : 'Direct Observation of Procedural Skills (DOPS)'],
    ['Generated', stamp],
    ['Topic', activeTopic],
    ['Quiz performance', `${quizScore}/${questionCount} correct (${scorePercent}%)`],
    ['Questions attempted', String(questionCount)],
    ['Areas for improvement', uniqueWeakTypes.length > 0 ? uniqueWeakTypes.join(', ') : 'None identified — strong overall performance.'],
    ['Reflection notes', 'Use this quiz result to structure a discussion on clinical reasoning, evidence appraisal, and specific learning actions.'],
  ] as Array<[string, string]>;
  if (format === 'txt') {
    const text = sections.map(([title, body]) => `${title}\n${body}`).join('\n\n');
    downloadText(`portfolio_reflection_${safeKind}_${stamp}.txt`, text);
    return;
  }
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${kind} Reflection</title>
      <style>body{font-family:Arial,sans-serif;line-height:1.45;color:#111827;max-width:820px;margin:32px auto;padding:0 24px}h1{font-size:24px}h2{font-size:15px;margin-top:20px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}p{font-size:13px;white-space:pre-wrap}</style>
    </head><body>
      <h1>${kind} Reflection</h1>
      ${sections.map(([title, body]) => `<h2>${title}</h2><p>${body}</p>`).join('\n')}
    </body></html>`;
  downloadText(`portfolio_reflection_${safeKind}_${stamp}.doc`, html, 'application/msword');
}
