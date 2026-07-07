import type { AgentGuidance } from './search';

export type TopicGuideStatus = 'idle' | 'none' | 'building' | 'ready' | 'pending';

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
    reviewedBy?: string | null;
    reviewedAt?: string;
    editedBy?: string | null;
    editedAt?: string;
    [key: string]: unknown;
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
      details: { topics?: Array<Record<string, unknown>>; [key: string]: unknown };
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
