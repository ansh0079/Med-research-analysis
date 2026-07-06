export type EvidenceGrade =
  | 'GUIDELINE_BACKED'
  | 'RCT_SUPPORTED'
  | 'OBSERVATIONAL_ONLY'
  | 'CONFLICTING'
  | 'LOW_CERTAINTY'
  | 'PRACTICE_CHANGING_RECENT'
  | 'EXPERT_OPINION';

export interface ClinicalAnswer {
  bottomLine: string;
  whatChangesManagement: string;
  whoItAppliesTo: string;
  whatIsUncertain: string;
  keyContraindications?: string | null;
  guidelinePosition?: string | null;
  recentPracticeChanging?: string | null;
  evidenceGrade?: EvidenceGrade;
  /** Populated when knowledge was refreshed since user's last search. */
  whatIsNew?: string | null;
  /** Proactive alert prepended when new landmark evidence arrived since last visit. */
  _proactiveAlert?: string;
}

export interface Contradiction {
  claim: string;
  counter: string;
  sourceIndices: number[];
  clinicalImplication: string;
}

export interface AgentGuidance {
  topic: string;
  status: string;
  confidence: number;
  lastRefreshedAt?: string;
  mentorMessage: string;
  clinicalAnswer?: ClinicalAnswer;
  contradictions?: Contradiction[];
  seminalPapers: Array<{
    sourceIndex: number;
    title: string;
    whySeminal?: string;
    clinicalPrinciple?: string;
    evidenceStrength?: 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';
  }>;
  teachingPoints: Array<{
    claim: string;
    sourceIndices: number[];
    confidence?: 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';
  }>;
  /** Clinician-verified teaching anchors preserved across AI refresh. */
  verifiedAnchors?: Array<{
    id: string;
    text: string;
    verifiedAt?: string;
    verifiedBy?: string | null;
    articleUid?: string | null;
  }>;
  caseGenerationHooks?: string[];
  mcqAngles?: string[];
  sourceArticles?: Array<{
    sourceIndex: number;
    uid?: string;
    title: string;
    doi?: string | null;
    pmid?: string | null;
    pmcid?: string | null;
    isFree?: boolean;
    fullTextUrl?: string | null;
    openAccess?: boolean;
    openAccessUrl?: string | null;
    source?: string | null;
    pubdate?: string | null;
  }>;
}

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
