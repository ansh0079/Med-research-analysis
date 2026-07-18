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

export class QuizGenerationError extends Error {
  code: string;
  status: number;
  topic?: string;
  jobKey?: string;
  jobStatus?: string;

  constructor(
    message: string,
    { code, status, topic, jobKey, jobStatus }: {
      code: string;
      status: number;
      topic?: string;
      jobKey?: string;
      jobStatus?: string;
    }
  ) {
    super(message);
    this.name = 'QuizGenerationError';
    this.code = code;
    this.status = status;
    this.topic = topic;
    this.jobKey = jobKey;
    this.jobStatus = jobStatus;
  }
}

function sessionHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };
  try {
    const sessionId = localStorage.getItem('med_research_session');
    if (sessionId) headers['X-Session-Id'] = sessionId;
  } catch {
    // ignore
  }
  return headers;
}

async function parseQuizError(res: Response): Promise<never> {
  const data = await res.json().catch(() => ({})) as {
    error?: string;
    code?: string;
    topic?: string;
    jobKey?: string;
    status?: string;
  };
  throw new QuizGenerationError(
    data.error || `Quiz generation failed (${res.status})`,
    {
      code: data.code || (res.status === 409 ? 'CONFLICT' : 'ERROR'),
      status: res.status,
      topic: data.topic,
      jobKey: data.jobKey,
      jobStatus: data.status,
    }
  );
}

export async function generateQuizFromEvidence(
  topic: string,
  articles: QuizArticle[],
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed' = 'mixed',
  count = 5
): Promise<{
  questions: QuizQuestion[];
  fromDataset: boolean;
  disclaimer?: string;
  sourceArticles: QuizArticle[];
}> {
  const res = await fetch(`${API_BASE}/api/quiz/from-evidence`, {
    method: 'POST',
    headers: sessionHeaders(),
    credentials: 'include',
    body: JSON.stringify({ topic, articles, difficulty, count }),
  });
  if (!res.ok) await parseQuizError(res);
  const data = await res.json();
  return {
    questions: data.questions as QuizQuestion[],
    fromDataset: false,
    disclaimer: data.disclaimer as string | undefined,
    sourceArticles: articles,
  };
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
    claimJobKey?: string;
    teachingPoints?: unknown[];
    mcqAngles?: string[];
  }
): Promise<{
  questions: QuizQuestion[];
  fromDataset: boolean;
  disclaimer?: string;
  sourceArticles?: QuizArticle[];
  evidenceAudit?: EvidenceAuditSnapshot;
  claimJobKey?: string;
  promptVariant?: string;
  claimAnchorMode?: string;
  adaptiveClaimCount?: number;
}> {
  const body: Record<string, unknown> = { topic, articles, count, difficulty, studyRunId };
  if (opts?.trainingStage) body.trainingStage = opts.trainingStage;
  if (opts?.explanationDepth) body.explanationDepth = opts.explanationDepth;
  if (opts?.targetNodeIds?.length) body.explicitTargetNodeIds = opts.targetNodeIds;
  if (opts?.mode) body.mode = opts.mode;
  if (opts?.claimJobKey) body.claimJobKey = opts.claimJobKey;
  if (opts?.teachingPoints?.length) body.teachingPoints = opts.teachingPoints;
  if (opts?.mcqAngles?.length) body.mcqAngles = opts.mcqAngles;

  const res = await fetch(`${API_BASE}/api/quiz/generate`, {
    method: 'POST',
    headers: sessionHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!res.ok) await parseQuizError(res);

  const data = await res.json();
  const ea = data.evidenceAudit as EvidenceAuditSnapshot | undefined;
  return {
    questions: data.questions as QuizQuestion[],
    fromDataset: !!data.fromDataset,
    disclaimer: data.disclaimer as string | undefined,
    sourceArticles: articles,
    evidenceAudit: ea,
    claimJobKey: data.claimJobKey as string | undefined,
    promptVariant: data.promptVariant as string | undefined,
    claimAnchorMode: typeof data.claimAnchorMode === 'string' ? data.claimAnchorMode : undefined,
    adaptiveClaimCount: typeof data.adaptiveClaimCount === 'number' ? data.adaptiveClaimCount : undefined,
  };
}
