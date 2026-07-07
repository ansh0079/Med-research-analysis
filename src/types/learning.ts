import type { Article } from './article';

import type { QuizQuestion, QuestionType } from './quiz';

import type { ConflictItem, TrialGuidelineAlignmentSummary, FollowUpQuestion } from './clinical';

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

// ==========================================
// Learning Agent Types
// ==========================================

export interface LearningInsight {
  type: 'weak_type' | 'review_due' | 'strength' | 'milestone' | 'onboarding' | 'coverage_gap' | 'active_run' | 'calibration';
  severity: 'high' | 'medium' | 'low';
  icon: string;
  color: string;
  message: string;
  detail: string;
  action: string | null;
  topic: string | null;
  questionType?: string;
  studyRunId?: number;
  gapReport?: StudyRunGapReport;
}

export interface CalibrationCurvePoint {
  confidenceLevel: number;
  predictedProbability: number;
  observedAccuracy: number | null;
  gap: number | null;
  count: number;
}

export interface CalibrationSummary {
  sampleSize: number;
  curve: CalibrationCurvePoint[];
  brierScore: number | null;
  verdict: 'insufficient_data' | 'overconfident' | 'underconfident' | 'well_calibrated';
  message: string;
  bucketCounts: {
    dangerous_misconception: number;
    needs_consolidation: number;
    calibrated_correct: number;
    low_confidence_incorrect: number;
  };
}

export interface LearningProfile {
  id: number;
  userId: string;
  persona?: string;
  goals: string[];
  weakTopics: string[];
  strongTopics: string[];
  preferredDifficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  dailyGoalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate?: string;
  /** Drives MCQ vignette depth and question mix (server quiz prompt). */
  trainingStage?: 'preclinical' | 'early_clinical' | 'finals' | 'foundation_doctor';
  /** Default explanation style for quiz review panel. */
  defaultExplanationDepth?: 'foundation' | 'exam_focus' | 'mechanistic';
  specialtyInterest?: string | null;
  studyGoal?: string | null;
  activeCurriculumId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioReflection {
  id: number;
  userId: string;
  reflectionType: 'CBD' | 'mini-CEX' | 'DOPS';
  sourceType: 'quiz' | 'case' | 'manual' | string;
  topic: string;
  normalizedTopic: string;
  whatHappened: string;
  whatILearned: string;
  whatIWillChange: string;
  evidenceUsed: string;
  supervisorDiscussion: string;
  status: 'draft' | 'discussed' | 'exported' | 'submitted' | string;
  linkedCpdSessionId?: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Per-user signals for adaptive quiz / topic promotion (server-computed tier). */
export interface UserTopicMemory {
  userId: string;
  normalizedTopic: string;
  displayTopic?: string | null;
  searchCount: number;
  lastSearchAt?: string | null;
  topArticles: Array<{ uid: string; w?: number; at?: string | null }>;
  savedArticles: Array<{ uid: string; w?: number; at?: string | null }>;
  weakOutlineNodeIds: string[];
  memoryScore: number;
  memoryTier: 'sparse' | 'building' | 'strong';
  topPaperCount: number;
  savedPaperCount: number;
  promotedProposalAt?: string | null;
  updatedAt?: string | null;
}

export interface QuizAttempt {
  id: number;
  userId: string;
  topic: string;
  normalizedTopic: string;
  questionId: string;
  questionType: 'recall' | 'clinical_application' | 'trial_interpretation' | 'guideline' | 'pitfall';
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeMs?: number;
  confidence?: number;
  sourceArticleUid?: string;
  studyRunId?: number;
  outlineNodeId?: string | null;
  claimKey?: string | null;
  promptVariant?: string | null;
  createdAt: string;
}

export interface QuizAttemptSubmission {
  topic: string;
  studyRunId?: number;
  curriculumTopicId?: number;
  attempts: Array<{
    questionId: string;
    questionType: QuizAttempt['questionType'];
    questionText: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    timeMs?: number;
    confidence?: number;
    sourceArticleUid?: string;
    sourceArticleTitle?: string | null;
    decisionId?: number;
    banditArmId?: string | null;
    searchId?: number;
    outlineNodeId?: string | null;
    outlineLabel?: string | null;
    claimKey?: string | null;
    promptVariant?: string | null;
  }>;
}

export interface StudyRunOutlineNode {
  id: string;
  kind: 'teaching_point' | 'mcq_angle' | 'source_article';
  label: string;
  sourceIndices: number[];
  articleUid?: string | null;
}

export interface StudyRunOutline {
  id: number | null;
  topic: string | null;
  nodes: StudyRunOutlineNode[];
}

export interface StudyRunGapNode extends StudyRunOutlineNode {
  seen: boolean;
  quizAttempts: number;
  correct: number;
  accuracy: number | null;
  lastAttemptAt: string | null;
}

export interface StudyRunGapReport {
  totalNodes: number;
  coveredNodes: number;
  uncoveredNodes: StudyRunGapNode[];
  weakNodes: StudyRunGapNode[];
}

export interface StudyRun {
  id: number;
  userId: string;
  topic: string;
  normalizedTopic: string;
  outlineId: number | null;
  curriculumTopicId?: number | null;
  status: 'active' | 'completed' | 'paused' | string;
  progress: {
    startedFrom?: string;
    quizAttempts?: number;
    coveredNodes?: number;
    totalNodes?: number;
    quizCompletedAt?: string;
    [key: string]: unknown;
  };
  nodeCoverage: Record<string, { seen: boolean; quizAttempts: number; correct: number; lastAttemptAt: string | null }>;
  startedAt: string;
  lastActiveAt: string;
  completedAt?: string | null;
}

export interface AgentConversation {
  id: number;
  userId: string;
  topic: string;
  normalizedTopic: string;
  title?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp?: string }>;
  messageCount: number;
  lastMessageAt?: string;
  conversationSummary?: string | null;
  learnerSnapshot?: {
    focusAreas?: string[];
    misconceptions?: string[];
    masteredThisSession?: string[];
    openQuestion?: string | null;
    updatedAt?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface UserTopicMastery {
  id: number;
  userId: string;
  topic: string;
  normalizedTopic: string;
  overallScore: number;
  recallScore: number;
  clinicalApplicationScore: number;
  trialInterpretationScore: number;
  guidelineScore: number;
  pitfallScore: number;
  attemptsCount: number;
  correctCount: number;
  lastAttemptAt?: string;
  nextReviewAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpacedRepCardMemory {
  outlineNodeId: string;
  outlineLabel: string | null;
  intervalDays: number;
  easiness: number;
  repetitions: number;
  dueAt: string;
  lastReviewedAt?: string | null;
  daysSinceReview: number | null;
  daysUntilDue: number | null;
  /** FSRS: days until predicted recall probability decays to ~90% ("memory strength"). */
  stability?: number;
  /** FSRS: 1 (easy) - 10 (hard), independent of stability. */
  difficulty?: number;
  /** FSRS: 'new' | 'review' | 'relearning'. */
  state?: string;
  lapses?: number;
  /** FSRS: live-computed recall probability (0-1) right now, given stability and elapsed time. */
  retrievability?: number | null;
}

export interface SpacedRepTopicGroup {
  topic: string;
  normalizedTopic: string;
  cards: SpacedRepCardMemory[];
}

export interface MasteryCohortBenchmark {
  normalizedTopic: string;
  myScore: number;
  peerStage: string;
  peerAvg: number | null;
  peerSampleSize: number;
  foundationDoctorAvg: number | null;
  foundationDoctorSampleSize: number;
  globalAvg: number | null;
  globalSampleSize: number;
  percentileAmongPeers: number | null;
}

export interface CaseAttempt {
  id: number;
  userId: string;
  topic: string;
  normalizedTopic: string;
  caseText: string;
  caseType: 'analysis' | 'teaching_vignette';
  learningMode: string;
  userResponse: { differential?: string; management?: string; keyFindings?: string } | null;
  aiFeedback: { score?: number; strengths?: string[]; gaps?: string[]; suggestions?: string[] } | null;
  score?: number;
  seedArticleUids: string[];
  createdAt: string;
}

export type CpdActivityType = 'quiz' | 'synthesis' | 'case' | 'search' | 'study_run' | 'manual';

export interface CpdSession {
  id: number;
  activityType: CpdActivityType;
  topic: string;
  durationMinutes: number;
  questionCount: number;
  accuracyPct: number | null;
  notes: string;
  source: 'auto' | 'manual';
  createdAt: string;
}

export interface CpdSummary {
  year: number;
  totalMinutes: number;
  totalHours: number;
  byType: Record<string, { sessions: number; minutes: number; questions: number; avgAccuracy: number | null }>;
  monthly: Array<{ month: number; minutes: number; sessions: number }>;
}

export interface CurriculumTopic {
  id: number;
  blockId: number;
  displayName: string;
  suggestedQuery: string;
  sortOrder: number;
  prerequisites?: number[];
}

export interface CurriculumBlock {
  id: number;
  curriculumId: number;
  name: string;
  sortOrder: number;
  topics: CurriculumTopic[];
}

export interface CurriculumDetail {
  id: number;
  slug: string;
  name: string;
  examStageLabel: string | null;
  description: string | null;
  sortOrder: number;
  blocks: CurriculumBlock[];
}

export interface CurriculumExamSummary {
  totalTopics: number;
  topicsStarted: number;
  confident: number;
  pctTopicsTouched: number;
}

export interface CurriculumListItem {
  id: number;
  slug: string;
  name: string;
  examStageLabel: string | null;
  description: string | null;
  sortOrder: number;
  examSummary?: CurriculumExamSummary | null;
}

export interface TopicCurriculumProgress {
  status: string;
  quizAttempts: number;
  correctCount: number;
  lastScorePct: number | null;
  updatedAt: string;
}

export interface TopicProgressTopic {
  id: number;
  displayName: string;
  normalizedTopic: string;
  status: 'not_started' | 'in_progress' | 'confident';
  quizAttempts: number;
  correctCount: number;
  lastScorePct: number | null;
  overallScore: number | null;
  recallScore: number | null;
  clinicalApplicationScore: number | null;
  guidelineScore: number | null;
  nextReviewAt: string | null;
}

export interface TopicProgressBlock {
  id: number;
  name: string;
  sortOrder: number;
  topicCount: number;
  started: number;
  confident: number;
  avgScore: number | null;
  topics: TopicProgressTopic[];
}

export interface TopicProgressResponse {
  curriculum: { id: number; slug: string; name: string };
  examSummary: CurriculumExamSummary | null;
  blocks: TopicProgressBlock[];
}

export interface LearningRecommendation {
  type: 'review' | 'strengthen' | 'explore' | 'discover' | 'refresh' | 'case' | 'start' | 'calibrate';
  topic: string;
  normalizedTopic: string;
  reason: string;
  action: 'quiz' | 'topic' | 'case';
  priority: number;
  icon: string;
  sourceTopic?: string;
}

export interface LearningDashboard {
  profile: LearningProfile | null;
  stats: {
    currentStreak: number;
    longestStreak: number;
    totalQuizzes: number;
    totalCases: number;
    overallAccuracy: number;
    topicsStudied: number;
  };
  weakTopics: UserTopicMastery[];
  reviewQueue: UserTopicMastery[];
  dueCardCount?: number;
  curriculaOverview?: CurriculumListItem[];
  recentActivity: {
    quizzes: QuizAttempt[];
    conversations: AgentConversation[];
    cases: CaseAttempt[];
  };
  mastery: UserTopicMastery[];
  activeRuns?: StudyRun[];
}

export interface TeachingVignetteResult {
  provider: string;
  model: string;
  topic: string;
  learningMode: CaseLearningMode;
  seedCount: number;
  presentingComplaint: string;
  history: string;
  examination: string;
  investigations: string;
  differential: Array<{
    diagnosis: string;
    supporting: string;
    against: string;
    rank: number;
  }>;
  managementReasoning: string;
  teachingPoints: Array<{
    point: string;
    seedIndices: number[];
  }>;
  evidenceLinks: Array<{
    seedIndex: number;
    howItApplies: string;
  }>;
  uncertaintyFlags: string[];
  caseMCQs: QuizQuestion[];
  postCheckFlags: {
    unsupportedDrugReferences: string[];
    note: string;
  } | null;
  disclaimer: string;
  cached?: boolean;
}
