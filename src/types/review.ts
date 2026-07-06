import type { Article } from './article';

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

export interface ReviewCriteria {
  inclusion: string[];
  exclusion: string[];
}

export type OwnerType = 'session' | 'user' | 'team';

export interface ReviewProject {
  id: string;
  title: string;
  question: string;
  criteria: ReviewCriteria;
  owner_type?: OwnerType;
  owner_id?: string;
  created_at?: string;
  updated_at?: string;
  total_articles?: number;
  included_count?: number;
}

export type ROBJudgement = 'LOW' | 'SOME_CONCERNS' | 'HIGH' | 'NOT_APPLICABLE';

export interface ROBDomain {
  judgement: ROBJudgement;
  rationale: string;
  signals?: string[];
}

export interface ROBResult {
  randomisation_process: ROBDomain;
  deviations_from_intervention: ROBDomain;
  missing_outcome_data: ROBDomain;
  measurement_of_outcomes: ROBDomain;
  selection_of_reported_result: ROBDomain;
  overall: ROBJudgement;
  overallRationale?: string;
}

export interface GRADEOutcome {
  outcome: string;
  studyDesign: string;
  studiesN: number;
  participantsN: number;
  riskOfBias: 'not serious' | 'serious' | 'very serious';
  inconsistency: 'not serious' | 'serious' | 'very serious';
  indirectness: 'not serious' | 'serious' | 'very serious';
  imprecision: 'not serious' | 'serious' | 'very serious';
  certainty: 'HIGH' | 'MODERATE' | 'LOW' | 'VERY LOW';
  effect?: string;
  importance: 'CRITICAL' | 'IMPORTANT' | 'NOT_IMPORTANT';
  footnote?: string;
}

export interface GRADETable {
  question: string;
  outcomes: GRADEOutcome[];
  overallCertainty: 'HIGH' | 'MODERATE' | 'LOW' | 'VERY LOW';
  limitations: string[];
  interpretation: string;
  provider?: string;
  model?: string;
}

export interface ReviewArticle {
  review_id: string;
  article_id: string;
  article_data: Article;
  screening_status: 'pending' | 'included' | 'excluded' | 'maybe';
  exclusion_reason?: string;
  notes?: string;
  created_at?: string;
}

export interface PrismaCounts {
  total: number;
  pending: number;
  included: number;
  excluded: number;
  maybe: number;
}
