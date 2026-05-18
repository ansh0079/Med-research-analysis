import type { QuizQuestion, LearningProfile } from '@types';
import type { EvidenceAuditSnapshot } from '@components/search/EvidenceAuditPanel';

const API_BASE = import.meta.env.VITE_API_URL || '';

export interface QuizArticle {
  uid?: string;
  title: string;
  abstract?: string;
  doi?: string | null;
  pmid?: string | null;
  pubdate?: string | null;
  source?: string | null;
  journal?: string | null;
  pmcrefcount?: number;
  pubtype?: string[];
}

export async function generateQuiz(
  topic: string,
  articles: QuizArticle[],
  count = 5,
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed' = 'mixed',
  studyRunId?: number,
  opts?: {
    trainingStage?: LearningProfile['trainingStage'];
    explanationDepth?: LearningProfile['defaultExplanationDepth'];
    targetNodeIds?: string[];
    mode?: 'spaced_rep' | 'standard';
    /** Completed AI job whose claim_map rows anchor each quiz question. */
    claimJobKey?: string;
  }
): Promise<{
  questions: QuizQuestion[];
  fromDataset: boolean;
  disclaimer?: string;
  sourceArticles?: QuizArticle[];
  evidenceAudit?: EvidenceAuditSnapshot;
  claimJobKey?: string;
}> {
  let sessionId: string | null = null;
  try {
    sessionId = localStorage.getItem('med_research_session');
  } catch {
    sessionId = null;
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionId) headers['X-Session-Id'] = sessionId;

  const body: Record<string, unknown> = { topic, articles, count, difficulty, studyRunId };
  if (opts?.trainingStage) body.trainingStage = opts.trainingStage;
  if (opts?.explanationDepth) body.explanationDepth = opts.explanationDepth;
  if (opts?.targetNodeIds?.length) body.explicitTargetNodeIds = opts.targetNodeIds;
  if (opts?.mode) body.mode = opts.mode;
  if (opts?.claimJobKey) body.claimJobKey = opts.claimJobKey;

  const res = await fetch(`${API_BASE}/api/quiz/generate`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Quiz generation failed (${res.status})`);
  }

  const data = await res.json();
  const ea = data.evidenceAudit as EvidenceAuditSnapshot | undefined;
  return {
    questions: data.questions as QuizQuestion[],
    fromDataset: !!data.fromDataset,
    disclaimer: data.disclaimer as string | undefined,
    // Echo back the articles so the caller can resolve sourceIndices → real papers
    sourceArticles: articles,
    evidenceAudit: ea,
    claimJobKey: data.claimJobKey as string | undefined,
  };
}
