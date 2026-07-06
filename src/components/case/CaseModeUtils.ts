import { downloadText } from '@services/exportArticles';
import type { Article, CaseLearningMode, CaseModeResult, QuizQuestion, TeachingVignetteResult } from '@types';

export const REVIEW_PREFILL_KEY = 'med_review_prefill';
export const CASE_PREFILL_KEY = 'med_case_prefill';
export const QUIZ_PREFILL_KEY = 'med_quiz_prefill';
export const WORKFLOW_CONTEXT_KEY = 'med_shift_workflow';
export const MAX_CHARS = 5000;

export type ReflectionKind = 'CBD' | 'mini-CEX' | 'DOPS';

export const EXAMPLE_CASE =
  '68-year-old male with moderate ARDS (P/F ratio 140) on mechanical ventilation for 48 hours. ' +
  'No contraindications to prone positioning. Has not received systemic corticosteroids. ' +
  'Current PEEP 10 cmH2O, FiO2 0.6. Background: T2DM, hypertension. What evidence-based interventions should be considered?';

export const EVIDENCE_STRENGTH_STYLES: Record<string, string> = {
  HIGH:     'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
  MODERATE: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
  LOW:      'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
  VERY_LOW: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
};

export const MODES: Array<{ id: CaseLearningMode; label: string; icon: string; desc: string; activeColor: string }> = [
  { id: 'student',    label: 'Medical Student', icon: 'fa-graduation-cap', desc: 'Core concepts, mechanisms',      activeColor: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300' },
  { id: 'resident',   label: 'Resident',        icon: 'fa-user-md',        desc: 'Clinical decisions, management', activeColor: 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300' },
  { id: 'specialist', label: 'Specialist',      icon: 'fa-microscope',     desc: 'Nuance, evidence gaps',          activeColor: 'border-violet-400 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300' },
  { id: 'exam',       label: 'Exam Revision',   icon: 'fa-clipboard-check', desc: 'USMLE / MRCP / AMC style',     activeColor: 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300' },
];

export function cleanText(value?: string | number | null) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function articleReference(article: Partial<Article>, index: number) {
  const source = cleanText(article.journal || article.source || 'Unknown source');
  const year = cleanText(article.year || article.pubdate || 'Unknown year');
  return `${index + 1}. ${cleanText(article.title || 'Untitled article')} (${source}, ${year})`;
}

export function articleQuizSeed(article: Partial<Article>) {
  return {
    uid: article.uid,
    title: article.title,
    abstract: article.abstract,
    doi: article.doi,
    pmid: article.pmid,
    pubdate: article.pubdate,
    source: article.source ?? article.journal,
    _source: article._source,
  };
}

export function reflectionKindLabel(kind: ReflectionKind) {
  if (kind === 'CBD') return 'Case-based Discussion (CBD)';
  if (kind === 'mini-CEX') return 'Mini Clinical Evaluation Exercise (mini-CEX)';
  return 'Direct Observation of Procedural Skills (DOPS)';
}

export function readWorkflowContext() {
  try {
    return JSON.parse(sessionStorage.getItem(WORKFLOW_CONTEXT_KEY) || '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function writeWorkflowContext(update: Record<string, unknown>) {
  try {
    sessionStorage.setItem(WORKFLOW_CONTEXT_KEY, JSON.stringify({
      ...readWorkflowContext(),
      ...update,
      updatedAt: new Date().toISOString(),
    }));
  } catch {
    // Keep the clinical flow working even if session storage is unavailable.
  }
}

type CaseReflectionSource = 'analysis' | 'teaching_vignette';

export function buildCaseReflectionSections({
  source,
  kind,
  result,
  tvResult,
  caseSeedArticles,
  workflowContext,
  caseText,
  buildPayload,
  prefillTopic,
}: {
  source: CaseReflectionSource;
  kind: ReflectionKind;
  result: CaseModeResult | null;
  tvResult: TeachingVignetteResult | null;
  caseSeedArticles: Partial<Article>[] | null;
  workflowContext: Record<string, unknown>;
  caseText: string;
  buildPayload: () => string;
  prefillTopic: string | null;
}) {
  const generatedAt = new Date().toLocaleString();
  const sourceResult = source === 'analysis' ? result : null;
  const sourceVignette = source === 'teaching_vignette' ? tvResult : null;
  const evidence = sourceResult?.citations?.length
    ? sourceResult.citations
    : caseSeedArticles ?? [];
  const originalPresentation = typeof workflowContext.originalPresentation === 'string' ? workflowContext.originalPresentation : '';
  const presentation = cleanText(
    originalPresentation ||
    sourceResult?.vignette ||
    sourceResult?.patientPresentation ||
    sourceResult?.caseSummary ||
    sourceVignette?.presentingComplaint ||
    caseText ||
    buildPayload()
  );
  const decisionPoint = cleanText(
    sourceResult?.keyDecisionPoint ||
    sourceResult?.differentialReasoning ||
    sourceVignette?.managementReasoning ||
    prefillTopic ||
    'Clinical decision point reviewed with evidence'
  );
  const evidenceSummary = [
    sourceResult?.evidenceExplanation,
    sourceVignette?.managementReasoning,
    sourceResult?.interventions?.map((item) => `${item.name}: ${item.rationale} [${item.evidenceStrength}]`).join('\n'),
  ].filter(Boolean).map(cleanText).join('\n\n');
  const learningPoints = sourceVignette?.teachingPoints?.length
    ? sourceVignette.teachingPoints.map((tp, index) => `${index + 1}. ${tp.point}`)
    : [
      ...(sourceResult?.interventions ?? []).slice(0, 3).map((item, index) => `${index + 1}. ${item.name}: ${item.rationale}`),
      ...(sourceResult?.caseMCQs ?? []).slice(0, 2).map((q, index) => `${index + 1 + (sourceResult?.interventions?.slice(0, 3).length ?? 0)}. ${q.explanation}`),
    ];
  const uncertainties = [
    ...(sourceResult?.uncertainties ?? []),
    ...(sourceVignette?.uncertaintyFlags ?? []),
  ];
  const actionPlan = kind === 'DOPS'
    ? 'Clarify the relevant local procedural guideline, discuss supervision requirements, and document observed competence separately if a real procedure was performed.'
    : kind === 'mini-CEX'
      ? 'Discuss the case with a senior clinician, compare the evidence against local guidance, and identify one behaviour to use in the next similar presentation.'
      : 'Use this evidence summary to structure a CBD discussion: clinical reasoning, evidence appraisal, uncertainty, patient safety, and a specific learning action.';

  return [
    ['WBA / portfolio type', reflectionKindLabel(kind)],
    ['Generated', generatedAt],
    ['Topic', cleanText(prefillTopic || sourceResult?.query || sourceVignette?.topic || 'Clinical evidence reflection')],
    ['Original clinical question', cleanText(originalPresentation) || 'Not captured. Add the de-identified presentation before submission.'],
    ['De-identified case / scenario', presentation],
    ['Clinical decision point', decisionPoint],
    ['Evidence reviewed', evidence.length ? evidence.map(articleReference).join('\n') : 'No seed articles recorded. Add citations before portfolio submission.'],
    ['Evidence appraisal', evidenceSummary || 'Summarise the main evidence, guideline comparison, and limitations after senior review.'],
    ['Learning points', learningPoints.length ? learningPoints.map(cleanText).join('\n') : 'Add 2-3 personal learning points before submission.'],
    ['Uncertainty and safety', uncertainties.length ? uncertainties.map((item) => `- ${cleanText(item)}`).join('\n') : 'No explicit uncertainties captured. Verify against local guidelines and patient-specific factors.'],
    ['Reflection', 'This was generated from an evidence-assisted learning workflow and should be edited into first person before portfolio submission. Include what changed in your clinical reasoning and how this will affect future practice.'],
    ['Action plan', actionPlan],
    ['Governance note', 'Do not include identifiable patient data. Verify against local policy, guideline recommendations, and senior clinical judgement.'],
  ] as Array<[string, string]>;
}

export function exportCaseReflection(sections: Array<[string, string]>, kind: ReflectionKind, format: 'doc' | 'txt') {
  const stamp = new Date().toISOString().split('T')[0];
  const safeKind = kind.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (format === 'txt') {
    const text = sections.map(([title, body]) => `${title}\n${body}`).join('\n\n');
    downloadText(`portfolio_reflection_${safeKind}_${stamp}.txt`, text);
    return;
  }
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(reflectionKindLabel(kind))}</title>
    <style>body{font-family:Arial,sans-serif;line-height:1.45;color:#111827;max-width:820px;margin:32px auto;padding:0 24px}h1{font-size:24px}h2{font-size:15px;margin-top:20px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}p{font-size:13px;white-space:pre-wrap}</style>
  </head><body>
    <h1>${escapeHtml(reflectionKindLabel(kind))}</h1>
    ${sections.map(([title, body]) => `<h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p>`).join('\n')}
  </body></html>`;
  downloadText(`portfolio_reflection_${safeKind}_${stamp}.doc`, html, 'application/msword');
}

export function buildCaseQuizPrefill({
  source,
  result,
  tvResult,
  prefillTopic,
  caseSeedArticles,
}: {
  source: CaseReflectionSource;
  result: CaseModeResult | null;
  tvResult: TeachingVignetteResult | null;
  prefillTopic: string | null;
  caseSeedArticles: Partial<Article>[] | null;
}) {
  const sourceResult = source === 'analysis' ? result : null;
  const sourceVignette = source === 'teaching_vignette' ? tvResult : null;
  const topic = cleanText(
    sourceResult?.keyDecisionPoint ||
    sourceResult?.query ||
    sourceVignette?.managementReasoning ||
    sourceVignette?.topic ||
    prefillTopic ||
    'Clinical decision point'
  );
  const evidence = sourceResult?.citations?.length
    ? sourceResult.citations
    : caseSeedArticles ?? [];
  const teachingPoints = sourceVignette?.teachingPoints?.map((tp) => ({
    claim: tp.point,
    evidence: tp.seedIndices?.map((idx) => `Seed ${idx}`).join(', '),
  })) || sourceResult?.interventions?.map((item) => ({
    claim: item.name,
    evidence: item.rationale,
  })) || [];
  const mcqAngles = [
    sourceResult?.keyDecisionPoint,
    sourceResult?.evidenceExplanation,
    sourceVignette?.managementReasoning,
    ...(sourceResult?.uncertainties ?? []),
    ...(sourceVignette?.uncertaintyFlags ?? []),
  ].filter(Boolean).map(cleanText).slice(0, 5);

  return {
    topic,
    evidence,
    teachingPoints,
    mcqAngles,
  };
}

export function buildEvidenceQuizMcqs(quizQuestion?: {
  question?: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
}, fallbackExplanation = ''): QuizQuestion[] {
  if (!quizQuestion?.question || !Array.isArray(quizQuestion.options) || !quizQuestion.options.length) return [];
  const letter = String(quizQuestion.correctAnswer || 'A').trim().charAt(0).toUpperCase();
  return [{
    id: 'case-evidence-quiz-1',
    question: quizQuestion.question,
    options: quizQuestion.options.map((opt, i) => `${String.fromCharCode(65 + i)}: ${opt}`),
    correctAnswer: /^[A-D]$/i.test(letter) ? letter : 'A',
    explanation: quizQuestion.explanation || fallbackExplanation,
    difficulty: 'medium',
    type: 'multiple_choice',
    questionType: 'clinical_application',
  }];
}
