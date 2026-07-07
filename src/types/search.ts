import type { Article, DataSource } from './article';

import type { GuidelineEntry } from './clinical';

export type SpecificityLevel = 'experimental' | 'broad' | 'moderate' | 'strict';

export interface SearchFilters {
  sources?: DataSource[];
  specificity?: SpecificityLevel;
  useVectorSearch?: boolean;
  yearRange?: [number, number];
  studyTypes?: string[];
  maxResults?: number;
  sortBy?: 'relevance' | 'date' | 'citations';
}

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
  /** Populated when knowledge was refreshed since user's last search — describes the delta. */
  whatIsNew?: string | null;
  /** Proactive alert prepended when new landmark evidence arrived since last visit. */
  _proactiveAlert?: string;
}

export interface ProactiveAlert {
  summary: string;
  changedPrinciples: string[];
  newPapers: string[];
  daysSinceUpdate: number;
  /** True when this is a landmark-trial greeting for a Strong Memory topic (no new update). */
  isLandmarkGreeting?: boolean;
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

export interface CommunityInsight {
  articleCount: number;
  articles: Array<{ uid: string; title: string | null }>;
  pivotTopics: string[];
}

/** Server-stored proactive alerts (e.g. knowledge drift for strong topic memory). */
export interface ProactiveEvidenceAlert {
  id: number;
  userId?: string;
  normalizedTopic: string;
  displayTopic?: string | null;
  alertKind?: string;
  title: string;
  summary?: string | null;
  payload?: Record<string, unknown> | null;
  landmarkArticleUid?: string | null;
  readAt?: string | null;
  createdAt?: string;
}

export interface SynapseGraphPayload {
  centerTopic: string;
  normalizedCenter: string;
  topicKnowledgeFound: boolean;
  nodes: Array<{ id: string; label: string; kind: string }>;
  edges: Array<{ articleUid?: string; from: string; to: string }>;
}

export interface SearchResponse {
  articles: Article[];
  count: number;
  sources: string[];
  vectorFusion?: {
    used: boolean;
    available: boolean;
    count: number;
  };
  agentGuidance?: AgentGuidance | null;
  knowledgeAvailable?: boolean;
  topicIntelligence?: TopicIntelligence | null;
  clinicalAnswer?: ClinicalAnswer | null;
  searchId?: number;
  learningContext?: SearchLearningContext;
  learnerContext?: LearnerContextSummary | null;
  lowRecallLearning?: LowRecallLearning | null;
  communityInsight?: CommunityInsight | null;
  proactiveAlert?: ProactiveAlert | null;
  aiEnrichmentKey?: string | null;
  aiEnrichmentStatus?: 'pending' | 'ready' | 'failed';
  intelligenceStatus?: 'sync' | 'deferred';
  queryIntent?: string;
  searchTelemetry?: {
    timings?: Record<string, number>;
    sources?: Record<string, { ms?: number; cached?: boolean; shared?: boolean }>;
    reformulation?: { cached?: boolean; failed?: boolean; ms?: number } | null;
    meshLookupMs?: number | null;
  };
  ranking?: Array<{
    uid?: string;
    compositeScore?: number;
    archetype?: string;
    citations?: number;
    year?: number;
    reasons?: string[];
  }>;
  rankingAttribution?: Array<{
    articleUid: string;
    decisionId?: number | null;
    banditArmId?: string | null;
  }>;
}

export interface SearchLearningContext {
  memoryTier: 'none' | 'sparse' | 'building' | 'strong' | string;
  searchCount: number;
  topPaperCount: number;
  savedPaperCount: number;
  weakOutlineNodeCount: number;
  helpfulFeedbackCount?: number;
  notHelpfulFeedbackCount?: number;
  interactionCount?: number;
  impressionCount?: number;
  personalized: boolean;
}

export interface LearnerContextSummary {
  hasPersonalization: boolean;
  memoryTier: string;
  searchCount: number;
  weakTopicCount: number;
  profileWeakTopicCount: number;
  claimMasteryCount: number;
  weakClaimCount: number;
  hasTrajectory: boolean;
  hasConversationMemory: boolean;
}

export interface LowRecallLearning {
  query: string;
  resultCount: number;
  aliases: string[];
  aliasCount: number;
}

export interface TopicIntelligence {
  topic: string;
  evidenceBouquet: {
    topPapers: Article[];
    count: number;
    rankingSignals: string[];
    ranking: Array<{
      uid: string;
      compositeScore: number;
      archetype: string;
      citations: number;
      year: number;
      reasons: string[];
    }>;
    archetypesCovered: string[];
  };
  guidelineSnapshot: {
    guidelines: GuidelineEntry[];
    count: number;
    hasReviewedGuidelines: boolean;
  };
  evidenceMap?: {
    generatedAt: string;
    freshness?: {
      effectiveConfidence?: number;
      confidenceDecay?: number;
      volatility?: string;
      priorityScore?: number;
      reason?: string;
    };
    nodes?: {
      landmarkPapers?: unknown[];
      teachingPoints?: unknown[];
      liveEvidence?: Array<{ uid: string; title: string; year?: number | null; source?: string | null; isFree?: boolean }>;
      teachingObjects?: Array<{ objectKey: string; objectType: string; articleUid?: string | null; title?: string | null; confidence?: number; claimCount?: number }>;
      groundedClaims?: Array<{
        claimKey: string;
        claimText: string;
        evidenceQuote?: string | null;
        sourcePath?: string | null;
        confidence?: number | null;
        verificationStatus?: string | null;
        verificationReason?: string | null;
        verifiedAt?: string | null;
      }>;
      relatedTopics?: Array<{ normalizedTopic: string; displayTopic: string; sharedArticles?: number }>;
      clusterArticles?: Array<{ uid: string; topicCount?: number; totalSignalCount?: number }>;
    };
    alerts?: { stale?: boolean; reason?: string; message?: string | null };
  };
  consensusSynopsis?: {
    status: 'generated' | 'insufficient_free_evidence' | 'provider_unavailable' | 'generation_failed' | string;
    jobKey?: string;
    cached?: boolean;
    topic: string;
    evidenceScope: 'free_open_access_only' | string;
    generatedAt: string;
    provider?: string;
    freePaperCount: number;
    includedArticles: Array<{
      sourceIndex: number;
      uid?: string;
      title: string;
      pmid?: string | null;
      pmcid?: string | null;
      doi?: string | null;
      journal?: string | null;
      pubdate?: string | null;
      freeFullTextUrl?: string | null;
      fullTextIndexed?: boolean;
      fullTextWordCount?: number | null;
      fullTextSections?: string[];
    }>;
    statement: string;
    clinicalBottomLine: string;
    areasOfAgreement: string[];
    areasOfUncertainty: string[];
    conflictingSignals: string[];
    evidenceStrength: 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW' | string;
    strengthRationale: string;
    guidelineAlignment?: {
      status: 'aligned' | 'conflicting' | 'not_addressed' | 'guideline_stale' | 'no_guideline_supplied' | string;
      summary: string;
      guidelineRefs: number[];
    };
    whatNotToOverclaim: string[];
    quizFocusPoints: string[];
    citationValidation?: {
      ok: boolean;
      issueCount: number;
      issues: Array<{ path: string; value?: string; errors: string[] }>;
    };
    disclaimer: string;
  };
  agentGuidance?: AgentGuidance | null;
  actions: {
    canSynthesizeTop5: boolean;
    canGenerateConsensusSynopsis?: boolean;
    canGenerateMcqs: boolean;
    canGenerateCase: boolean;
    canExportBrief: boolean;
    canSaveTopic: boolean;
  };
}
