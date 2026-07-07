import type { Article } from './article';

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
