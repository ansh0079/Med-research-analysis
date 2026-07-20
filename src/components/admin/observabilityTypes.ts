export type Observability = {
  generatedAt: string;
  countsByStatus: Array<{ status: string; count: number }>;
  staleTopics: Array<{ normalizedTopic: string; topic: string; claimCount: number; staleCount: number; lastUpdatedAt: string | null }>;
  abstractOnlyClaims: Array<{ claimKey: string; claimText: string; normalizedTopic?: string | null; verificationStatus: string }>;
  unverifiedClaims: Array<{ claimKey: string; claimText: string; normalizedTopic?: string | null; verificationStatus: string }>;
  failedGenerationJobs: Array<{ jobKey: string; jobType: string; errorMessage: string | null; updatedAt: string | null }>;
  highDemandTopics: Array<{ normalizedTopic: string; topic: string; claimCount: number; lastUpdatedAt: string | null }>;
};

export type SeedTopic = {
  id: number | string;
  block: string;
  displayName: string;
  suggestedQuery?: string;
  priority: string;
  volatility: string;
  seedStatus: string;
  claimCount: number;
  reviewDueAt?: string | null;
};

export type CurriculumScheduler = {
  generatedAt: string;
  runs: Array<{
    id: number;
    status: string;
    startedAt: string;
    finishedAt?: string | null;
    candidatesCount: number;
    refreshedCount: number;
    skippedCount: number;
    errorCount: number;
    details?: { topics?: Array<Record<string, unknown>> };
  }>;
  dueTopics: SeedTopic[];
  failedTopics: SeedTopic[];
  statusCounts: Array<{ seedStatus: string; count: number; claimCount: number }>;
  guardrails: {
    settings: {
      enabled: boolean;
      maxTopicsPerDay: number;
      maxSynopsesPerDay: number;
      maxEstimatedCostUsdPerDay: number;
      maxFailureRate: number;
    };
    usage: {
      date: string;
      topicsAttempted: number;
      topicsSeeded: number;
      topicsFailed: number;
      synopsesGenerated: number;
      estimatedCostUsd: number;
    };
    blockedReason: string | null;
  };
};

export type ClaimRow = {
  claimKey: string;
  claimText: string;
  verificationStatus: string;
  normalizedTopic?: string | null;
};
