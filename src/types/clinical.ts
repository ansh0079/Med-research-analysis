import type { PracticeImpactClassification } from './quiz';

export type AnalysisType = 'quick' | 'comprehensive' | 'critical' | 'biomedical' | 'layperson' | 'methodology';

export interface AnalysisResult {
  result?: string;
  summary?: string;
  keyPoints?: string[];
  confidenceScore?: number;
  studyType?: string;
  evidenceLevel?: string;
  clinicalImplications?: string;
  provider?: string;
  model?: string;
  cached?: boolean;
  timestamp?: string;
  disclaimer?: string;
  _provider?: string;
  _cost?: string;
  _timestamp?: string;
}

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

export type ConflictLevel = 'major' | 'minor' | 'nuanced';

export type ConsortAdherence = 'adequate' | 'partial' | 'not_reported';

export interface ConsortDomain {
  adherence: ConsortAdherence;
  rationale: string;
}

export interface ConsortResult {
  isRct: boolean;
  rctWarning: string | null;
  overallAdherence: 'high' | 'moderate' | 'low';
  overallSummary: string;
  adequateCount: number;
  totalDomains: number;
  domains: {
    title_abstract: ConsortDomain;
    eligibility_criteria: ConsortDomain;
    interventions: ConsortDomain;
    outcomes: ConsortDomain;
    sample_size: ConsortDomain;
    randomisation: ConsortDomain;
    blinding: ConsortDomain;
    statistical_methods: ConsortDomain;
    harms: ConsortDomain;
    trial_registration: ConsortDomain;
  };
}

export interface ConflictItem {
  level: ConflictLevel;
  trialIndex: number;
  guidelineIndex: number;
  trialClaim: string;
  guidelineClaim: string;
  populationGap: string;
  clinicalNuance: string;
  recommendation: string;
}

export interface TrialGuidelineAlignmentSummary {
  alignedCount: number;
  divergentCount: number;
  majorCount?: number;
  keyDivergence: ConflictItem | null;
  summary?: string;
}

export interface GuidelineAlignment {
  aligned: boolean | null;
  alignmentScore: number;
  guidelinesFound: number;
  guidelineList: Array<{
    uid: string;
    title: string;
    source: string;
    pubdate: string;
    authors: string;
    doi: string;
  }>;
  contradictions: Array<{
    guideline: string;
    recommendation: string;
    synthesisFinding: string;
    severity: 'major' | 'minor' | 'nuanced';
    explanation: string;
  }>;
  supportsGuidelines: Array<{
    guideline: string;
    finding: string;
  }>;
  gaps: string[];
  summary: string;
  checkedAt: string;
}

export interface GrantResult {
  structuredReview: {
    background: string;
    rationale: string;
    currentEvidence: string;
    limitationsOfCurrentEvidence: string[];
  };
  keyReferences: Array<{
    citation: string;
    relevance: string;
    pmid?: string;
    doi?: string;
  }>;
  evidenceGaps: Array<{
    gap: string;
    whyItMatters: string;
    howThisStudyAddressesIt: string;
  }>;
  proposedStudyDesignRationale: string;
  feasibilityNotes: string;
  wordCount: number;
  researchQuestion: string;
  citationStyle: string;
  articleCount: number;
  generatedAt: string;
}

/** Server-backed article annotation (team notes) */
export interface Annotation {
  id: string;
  articleId: string;
  text: string;
  user_name?: string;
  created_at?: string;
  position?: { x: number; y: number; page: number };
}

export interface PicoExtraction {
  population: string;
  intervention: string;
  comparison: string;
  outcomes: string[];
  studyDesign: string;
  sampleSize: number;
  followUp: string;
  confidence: number;
  missingFields: string[];
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
