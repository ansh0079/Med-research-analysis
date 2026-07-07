import type { Article } from '@types';
import { WORKFLOW_CONTEXT_KEY, type ReflectionKind } from './caseModeConfig';

export type CaseEvidenceBrief = {
  bestEvidence?: string;
  applicabilityLimits?: string[];
  guidelinePosition?: string;
  practicalDecisionPoint?: string;
  keyUncertainty?: string;
  quizQuestion?: {
    question?: string;
    options?: string[];
    correctAnswer?: string;
    explanation?: string;
  };
};

export type CaseToEvidenceResult = {
  topic: string;
  clinicalQuestion: string;
  articles: Article[];
  brief: CaseEvidenceBrief;
  relatedClaims?: Array<{ claimKey?: string; claimText?: string; verificationStatus?: string; guidelineAlignment?: string | null }>;
};

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
