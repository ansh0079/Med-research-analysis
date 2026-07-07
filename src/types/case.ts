import type { Article } from './article';
import type { FollowUpQuestion, QuestionType } from './analysis';
import type { QuizQuestion } from './quiz';
import type { ConflictItem, TrialGuidelineAlignmentSummary } from './review';

export type CaseLearningMode = 'student' | 'resident' | 'specialist' | 'exam';

export interface CaseModeResult {
  provider: string;
  model: string;
  /** Literature search string derived from the case (AI-assisted + fallback). */
  query: string;
  queryHints?: Record<string, unknown> | null;
  searchSources?: string[];
  vectorUsed?: boolean;
  caseSummary: string;
  interventions: Array<{
    name: string;
    evidenceStrength: 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';
    rationale: string;
    citations: number[];
  }>;
  uncertainties: string[];
  disclaimer?: string;
  safetyNotes: string;
  citations: Article[];
  cached?: boolean;
  /** Enhanced case-based learning fields (Phase 5) */
  mode?: CaseLearningMode;
  vignette?: string;
  patientPresentation?: string;
  keyDecisionPoint?: string;
  differentialReasoning?: string;
  evidenceExplanation?: string;
  paperApplications?: Array<{
    studyIndex: number;
    title: string;
    howItApplies: string;
  }>;
  caseMCQs?: QuizQuestion[];
  conflictMatrix?: ConflictItem[];
  guidelineAlignment?: TrialGuidelineAlignmentSummary | null;
  followUpQuestions?: FollowUpQuestion[];
}

export interface QuizState {
  questions: QuizQuestion[];
  currentIndex: number;
  answers: Record<string, string>;
  showExplanation: boolean;
  score: number;
  complete: boolean;
}

export interface GuidelineSource {
  id: string;
  name: string;
  fullName: string;
  region: string;
  specialty: string;
  domain: string;
  urlPattern: string;
}

export interface GuidelineEntry {
  id: number;
  topic: string;
  normalizedTopic: string;
  sourceBody: string;
  sourceRegion?: string;
  sourceYear?: number;
  sourceUrl?: string;
  sourceSpecialty?: string;
  sourceDomain?: string;
  recommendationText: string;
  recommendationStrength?: string;
  recommendationCertainty?: string;
  population?: string;
  intervention?: string;
  cautions?: string;
  status: 'ai_extracted' | 'human_reviewed' | 'stale' | 'superseded';
  reviewedBy?: string;
  reviewedAt?: string;
  supersededById?: number;
  lastCheckedAt: string;
  createdAt: string;
  updatedAt: string;
  qualityAssessment?: {
    score: number;
    level: 'high' | 'moderate' | 'low' | string;
    checks: Record<string, boolean>;
    flags: string[];
    summary: string;
  };
}

export interface GuidelineListResponse {
  guidelines: GuidelineEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface GuidelineContradiction {
  id: number;
  normalizedTopic: string;
  severity: 'major' | 'minor' | 'nuanced';
  contradictionSummary: string;
  bodyAPosition: string;
  bodyBPosition: string;
  clinicalImplication: string | null;
  aiConfidence: number;
  status: 'ai_detected' | 'human_confirmed' | 'dismissed';
  detectedAt: string;
  guidelineA: {
    id: string;
    sourceBody: string;
    sourceYear: number | null;
    sourceUrl: string | null;
    recommendationStrength: string | null;
    recommendationText: string;
  };
  guidelineB: {
    id: string;
    sourceBody: string;
    sourceYear: number | null;
    sourceUrl: string | null;
    recommendationStrength: string | null;
    recommendationText: string;
  };
}

export interface GuidelineContradictionResponse {
  topic: string;
  contradictions: GuidelineContradiction[];
  count: { total: number; major: number; minor: number; nuanced: number };
}

// ==========================================
// Adaptive Case Sessions
// ==========================================

export interface CaseStep {
  type: 'presentation' | 'investigation' | 'management' | 'complication' | 'resolution';
  narrative: string;
  question: string;
  questionType: QuestionType;
  options: string[];
  correctAnswer: string;
  explanation: string;
  whyOthersWrong: string;
  teachingPoint: string;
  evidenceSource: string | null;
  branchingNote?: string | null;
}

export interface CaseSessionData {
  title: string;
  setting: string;
  patientProfile?: string;
  steps: CaseStep[];
  caseSummary: string;
  keyLearningPoints: string[];
  guidelinesApplied?: string[];
  evidenceGaps?: string[];
  sourcesUsed?: string[];
}

export interface CaseStepResponse {
  selectedAnswer: string;
  isCorrect: boolean;
  timeMs: number;
  answeredAt: string;
}

export interface CaseSession {
  id: string;
  userId: string;
  topic: string;
  normalizedTopic: string;
  learningMode: string;
  difficulty: string;
  caseData: CaseSessionData;
  targetedWeaknesses: Array<{ type: string; score: number }>;
  status: 'in_progress' | 'completed' | 'abandoned';
  currentStep: number;
  responses: CaseStepResponse[];
  totalScore: number | null;
  generationMode: 'branching' | 'legacy';
  createdAt: string;
  completedAt: string | null;
}

export interface CaseRecommendation {
  topic: string;
  normalizedTopic: string;
  overallScore: number;
  recallScore: number;
  clinicalApplicationScore: number;
  guidelineScore: number;
  pitfallScore: number;
  attemptsCount: number;
  displayName?: string;
  specialty?: string;
}

export interface CaseStepFeedback {
  isCorrect: boolean;
  explanation: string;
  whyOthersWrong: string;
  teachingPoint: string;
  evidenceSource: string | null;
  branchingNote?: string | null;
}

export interface CrossLearningRecommendation {
  topic: string;
  normalizedTopic: string;
  linkType: string;
  rationale: string;
  reason: string;
  overallScore: number | null;
}

// ==========================================
// Learning Agent Types
// ==========================================

