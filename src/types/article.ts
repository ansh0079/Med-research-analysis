export interface Author {
  name: string;
  affiliation?: string;
  orcid?: string;
}

export interface Article {
  uid: string;
  title: string;
  abstract?: string;
  authors?: Author[];
  pubdate?: string;
  year?: number;
  source?: string;
  journal?: string;
  pmcrefcount?: number;
  citationCount?: number;
  doi?: string;
  pmid?: string;
  pmcid?: string;
  volume?: string;
  pages?: string;
  articleids?: Array<{ idtype?: string; value?: string }>;
  pubtype?: string[];
  keywords?: string[];
  isFree?: boolean;
  openAccess?: boolean;
  openAccessUrl?: string;
  fullTextUrl?: string;
  _source: DataSource;
  /** Cross-topic synapse: topics that also cite this paper (e.g. Sepsis ↔ AKI). */
  _synapseTopics?: string[];
  /** OpenAlex-derived signals used for ranking (when source is OpenAlex or merged union). */
  _openalexMetrics?: {
    fwci: number | null;
    citationPercentile: number | null;
    isTopCitationPercentile: boolean;
    sourceIsCore: boolean;
    issnL: string | null;
  };
  _impact?: ImpactScore;
  _teachingObjectBoost?: number;
  _semanticScore?: number;
  _quality?: QualityScore;
  _retraction?: RetractionStatus;
  _ebmScore?: number;
  _ebmLabel?: { label: string; short: string };
  _isPreprint?: boolean;
  /** Rank before personalization, based on evidence/relevance signals. */
  _evidenceRank?: number;
  /** Rank after learner personalization has been applied. */
  _learningRank?: number;
  _rankMovedByLearning?: boolean;
  _rankReasons?: string[];
  _ranking?: {
    compositeScore?: number;
    archetype?: string;
    citations?: number;
    year?: number;
  };
  /** Auditable ranking decomposition (search pipeline). */
  _rankingTrace?: import('../contracts').SearchResultRanking;
  _learningBoost?: number;
  _banditArmId?: string | null;
  _decisionId?: number | null;
  _missedQuizCount?: number;
}

export type DataSource = 'pubmed' | 'semantic' | 'crossref' | 'openalex';

export interface ImpactScore {
  score: number;
  level: 'high' | 'medium' | 'low';
  factors: string[];
  citations: number;
  evidenceType: 'rct' | 'meta' | 'other';
  isRecent: boolean;
}

export interface QualityScore {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  factors: string[];
  signals: string[];
}

export interface RetractionStatus {
  isRetracted: boolean;
  retractionDate?: string;
  reason?: string;
  source: string;
}

export interface CitationRelation {
  source: string;
  target: string;
  direction: 'cites-target' | 'target-cites';
  contexts: string[];
  intents: string[];
  isInfluential: boolean;
}

export type TrustRating = 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';

/** Structured synopsis returned by POST /api/ai/synopsis */
export interface ArticleSynopsisFields {
  takeaway: string | null;
  clinicalQuestion: string | null;
  background?: string | null;
  studyDesign: string | null;
  setting?: string | null;
  population: string | null;
  inclusionCriteria?: string[];
  exclusionCriteria?: string[];
  intervention: string | null;
  comparator: string | null;
  primaryOutcome?: string | null;
  secondaryOutcomes?: string[];
  safetyOutcomes?: string[];
  outcomes: string | null;
  mainFindings: string | null;
  authorsConclusion?: string | null;
  strengths?: string[];
  weaknesses?: string[];
  clinicalMeaning: string | null;
  limitations: string | null;
  bottomLine: string | null;
  practiceImplication?: string | null;
  whatNotToOverclaim?: string[];
  quizFocusPoints?: string[];
  trustRating: TrustRating;
  trustRationale: string | null;
}

export interface ArticleSynopsisResult {
  synopsis?: ArticleSynopsisFields;
  articleId?: string;
  provider?: string;
  model?: string;
  timestamp?: string;
  disclaimer?: string;
  cached?: boolean;
  /** Durable job / queued response */
  status?: 'queued' | 'running' | 'completed' | 'failed';
  jobKey?: string | null;
  errorMessage?: string | null;
  audit?: Record<string, unknown>;
  evidenceDelta?: {
    significantChange: boolean;
    summary: string | null;
    claimsChanged: number;
    safetyCautions: number;
    weakenedConclusions: number;
    pendingRegeneration?: Array<{ claimKey?: string; claimText?: string | null; status?: string; triggerReason?: string }>;
  };
}
