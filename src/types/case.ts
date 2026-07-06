import type { Article } from './article';
import type { QuestionType, QuizQuestion } from './quiz';
import type { ConflictItem, TrialGuidelineAlignmentSummary } from './review';
import type { FollowUpQuestion } from './ai';

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
