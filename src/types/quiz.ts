import type { ConflictItem, TrialGuidelineAlignmentSummary } from './review';

export type QuestionType = 'recall' | 'clinical_application' | 'trial_interpretation' | 'guideline' | 'pitfall';

export type PracticeImpactClassification =
  | 'confirms_existing_practice'
  | 'weakly_modifies_practice'
  | 'practice_changing'
  | 'hypothesis_generating_only'
  | 'not_clinically_actionable_yet';

export interface FollowUpQuestion {
  question: string;
  rationale: string;
  trigger: 'conflict' | 'uncertainty' | 'gap' | 'subgroup';
}

export interface SynthesisResult {
  synthesis: {
    overallAnswer?: string;
    consensus: string;
    agreement?: string[];
    evidenceGrade: 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';
    gradeRationale: string;
    keyFindings: Array<{
      finding: string;
      studyIndices: number[];
      strength: 'strong' | 'moderate' | 'weak';
    }>;
    conflicts: Array<{
      description: string;
      studiesFor: number[];
      studiesAgainst: number[];
    }>;
    statistics: Array<{
      metric: string;
      value: string;
      context: string;
      studyIndex: number;
    }>;
    studyDesigns: {
      metaAnalysis?: number;
      rct?: number;
      cohort?: number;
      caseControl?: number;
      crossSectional?: number;
      caseReport?: number;
      other?: number;
    };
    clinicalActionCard?: {
      recommendation: string;
      certainty: string;
      caveat: string;
    };
    clinicalBottomLine: string;
    clinicalImplications?: string;
    limitations: string;
    researchGaps: string;
    uncertainties?: string[];
    practiceImpact?: {
      classification: PracticeImpactClassification;
      mondayMorningLine: string;
      rationale: string;
    };
    evidenceDisagreement?: {
      hasMaterialDisagreement: boolean;
      guidelineRecommendation: string;
      strongestSupportingTrial: { studyIndex: number; summary: string };
      strongestContradictingTrial: { studyIndex: number | null; summary: string };
      populationsWhereFails: string;
      whatWouldChangePractice: string;
    };
    safetySignals?: Array<{
      signal: string;
      severity: 'serious' | 'moderate' | 'mild';
      studyIndices: number[];
      context: string;
    }>;
    paperContributions?: Array<{
      studyIndex: number;
      mainContribution: string;
      strengthAdded: string;
      practiceImpactClass?: PracticeImpactClassification;
      practiceImpactNote?: string;
    }>;
    followUpQuestions?: FollowUpQuestion[];
  };
  articleCount: number;
  topic: string;
  timestamp: string;
  cached?: boolean;
  sources?: Array<{
    studyIndex: number;
    uid: string;
    title: string;
    doi?: string | null;
    pmid?: string | null;
    source?: string | null;
    pubdate?: string | null;
  }>;
  retractionWarning?: string | null;
  disclaimer?: string;
  citationValidation?: {
    ok: boolean;
    issueCount: number;
    issues: Array<{ path: string; value?: string; errors: string[] }>;
  };
  audit?: {
    provider: string;
    model: string;
    promptVersion: string;
    prompt?: string;
    promptHash?: string;
    citationValidation?: {
      ok: boolean;
      issueCount: number;
      issues: Array<{ path: string; value?: string; errors: string[] }>;
    };
    retrievedContext: Array<{
      studyIndex: number;
      uid: string;
      title: string;
      doi?: string | null;
      pmid?: string | null;
      source?: string | null;
      pubdate?: string | null;
    }>;
    humanReviewStatus?: string;
    generatedAt?: string;
    fullTextCoverageRatio?: number;
    fullTextIndexedCount?: number;
    sourceCount?: number;
    retractedInBundleCount?: number;
    retractionCheckedCount?: number;
  };
  jobKey?: string;
  status?: 'queued' | 'running' | 'completed' | 'failed';
  errorMessage?: string | null;
  conflictMatrix?: ConflictItem[];
  guidelineAlignment?: TrialGuidelineAlignmentSummary | null;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false';
  questionType?: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  explanationDeep?: string | null;
  whyOthersWrong?: string;
  /** Per-option wrong-answer rationale (keys A–D). */
  distractorRationale?: Record<string, string> | null;
  visualExplanation?: {
    kind: 'flowchart' | 'comparison_table' | 'mechanism';
    title: string;
    steps?: string[];
    columns?: string[];
    rows?: string[][];
  } | null;
  difficulty: 'easy' | 'medium' | 'hard';
  sourceArticle?: string;
  sourceArticleUid?: string;
  sourceReference?: string;
  sourceIndices?: number[];
  outlineNodeId?: string | null;
  /** Anchors quiz to a row from ai_generation_claims (provenance mode). */
  claimKey?: string | null;
  /** personalization_decisions.id for quiz_claim_selection bandit arm. */
  claimDecisionId?: number | null;
  /** Bandit arm id (usually claimKey) when claim selection bandit ran. */
  banditArmId?: string | null;
  outlineLabel?: string | null;
  promptVariant?: string | null;
  validationStatus?: 'llm_validated' | 'validation_skipped' | string;
  topic?: string;
}
