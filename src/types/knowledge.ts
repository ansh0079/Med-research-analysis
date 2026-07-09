import type { Article } from './article';
import type { AgentGuidance } from './clinical';
import type { GuidelineEntry } from './learning';

export type TopicGuideStatus = 'idle' | 'none' | 'building' | 'ready' | 'pending';

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
    citationCheckPassed?: boolean;
    reviewState?: 'unreviewed' | 'machine_checked' | 'human_reviewed' | 'needs_revision' | string;
    abstractPaperCount?: number;
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

export interface CollectiveMemoryPsychometricItem {
  conceptHash: string;
  questionText: string;
  questionType?: string;
  correctRate?: number;
  totalAttempts?: number;
  uniqueUsers?: number;
  discrimination?: number | null;
  discriminationLabel?: string;
  sampleSize?: number;
  reliable?: boolean;
}

export interface TopicCollectiveMemory {
  interactionCount?: number;
  uniqueUsers?: number;
  highDiscrimination?: CollectiveMemoryPsychometricItem[];
  tooEasy?: CollectiveMemoryPsychometricItem[];
  tooHard?: CollectiveMemoryPsychometricItem[];
  flaggedForReview?: CollectiveMemoryPsychometricItem[];
  sharedMisconceptions?: Array<{
    conceptHash: string;
    questionText?: string;
    wrongAnswer: string;
    pickRate: number;
  }>;
  lastAggregatedAt?: string;
}

export interface TopicKnowledge {
  id: number;
  topic: string;
  normalizedTopic: string;
  canonicalNormalized?: string;
  knowledge: {
    mentorMessage?: string;
    seminalPapers?: AgentGuidance['seminalPapers'];
    teachingPoints?: AgentGuidance['teachingPoints'];
    coreTeachingPoints?: AgentGuidance['teachingPoints'];
    caseGenerationHooks?: string[];
    mcqAngles?: string[];
    controversies?: unknown[];
    keywords?: string[];
    collective_memory?: TopicCollectiveMemory;
    reviewedBy?: string | null;
    reviewedAt?: string;
    editedBy?: string | null;
    editedAt?: string;
  };
  sourceArticles: NonNullable<AgentGuidance['sourceArticles']>;
  status: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  lastRefreshedAt: string;
}

export interface TopicKnowledgeListResponse {
  topics: TopicKnowledge[];
  total: number;
  limit: number;
  offset: number;
}

export interface TopicKnowledgeProposal {
  id: number;
  topic: string;
  normalizedTopic: string;
  knowledge: TopicKnowledge['knowledge'];
  sourceArticles: TopicKnowledge['sourceArticles'];
  proposedStatus: string;
  confidence: number;
  reason?: string;
  createdBy?: string;
  status: 'pending_review' | 'approved' | 'rejected' | string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TopicKnowledgeProposalListResponse {
  proposals: TopicKnowledgeProposal[];
  total: number;
  limit: number;
  offset: number;
}

export interface LearningHealthResponse {
  health: {
    generatedAt: string;
    topBouquetTopics: Array<{
      normalizedTopic: string;
      displayTopic: string;
      totalSignals: number;
      distinctArticles: number;
      lastSeenAt: string | null;
    }>;
    lowRecall: {
      days: number;
      items: Array<{
        normalizedTopic: string;
        displayQuery: string;
        resultCount: number;
        expandedAliases: string[];
        attemptCount: number;
        lastSeenAt: string;
      }>;
    };
    aliasSeededTopics: Array<{
      topic: string;
      normalizedTopic: string;
      confidence: number;
      aliasesNormalized: string[];
      updatedAt: string;
    }>;
    vectorUsage: {
      windowDays: number;
      used: number;
      notUsed: number;
      total: number;
      usageRate: number;
    };
    refreshCandidates: Array<{
      normalizedTopic: string;
      displayTopic: string;
      totalSignals: number;
      distinctArticles: number;
      lastRefreshedAt: string | null;
      status: string | null;
      confidence: number;
      effectiveConfidence: number;
      confidenceDecay: number;
      volatility: string;
      priorityScore: number;
      priorityReason: string;
    }>;
    schedulerRuns: Array<{
      id: number;
      runType: string;
      status: string;
      startedAt: string;
      finishedAt: string | null;
      candidatesCount: number;
      refreshedCount: number;
      skippedCount: number;
      errorCount: number;
      details: { topics?: Array<Record<string, unknown>> };
      error: string | null;
    }>;
    teachingObjects?: {
      total: number;
      byType: Array<{ objectType: string; count: number }>;
      recent: Array<{ objectKey: string; objectType: string; topic?: string | null; title?: string | null; updatedAt?: string | null }>;
      topTopics: Array<{ normalizedTopic: string; topic: string; count: number; lastUpdatedAt?: string | null }>;
    } | null;
    freshness?: {
      staleTopics: Array<{
        normalizedTopic: string;
        displayTopic: string;
        confidenceDecay: number;
        volatility: string;
        priorityScore: number;
      }>;
      strongMemoryRefresh: Array<{
        normalizedTopic: string;
        displayTopic: string;
        communityEngagementScore: number;
        memoryTier: string;
      }>;
    };
  };
}

export interface TopicEvidenceMemory {
  topic: string;
  strongEvidenceMemory: boolean;
  totalClaims: number;
  trustedClaimCount?: number;
  untestedClaimCount: number;
  guidelineConflictCount: number;
  refreshedAt?: string | null;
  daysSinceRefresh: number | null;
  lifecycleNeedsAttention?: number;
  messages: Array<{ key: string; text: string; tone: 'positive' | 'neutral' | 'warning' }>;
}

export interface TeachingClaimReviewItem {
  id?: number | string;
  objectKey?: string | null;
  claimKey: string;
  claimText: string;
  evidenceQuote?: string | null;
  sourcePath?: string | null;
  articleUid?: string | null;
  normalizedTopic?: string | null;
  conceptKey?: string | null;
  confidence?: number | null;
  verificationStatus: string;
  verificationReason?: string | null;
  verifiedAt?: string | null;
  objectType?: string | null;
  topic?: string | null;
  objectTitle?: string | null;
  quizAttempts?: number;
  quizCorrect?: number;
  curatorMetadata?: {
    examRelevant?: boolean;
    practiceChanging?: boolean;
    overclaimed?: boolean;
    paperSectionRef?: string | null;
    curatorNotes?: string | null;
  } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
