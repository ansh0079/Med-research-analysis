import { API_BASE } from './core';
import type { LearningHealthResponse } from '@types';
import { KnowledgeCoreApi } from './knowledgeCore';

export class KnowledgeAdminApi extends KnowledgeCoreApi {
  async getLearningHealth(options: { limit?: number; days?: number } = {}): Promise<LearningHealthResponse> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    if (options.days) params.set('days', String(options.days));
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/learning-health?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getTeachingClaimReviewQueue(options: { topic?: string; status?: string; limit?: number; offset?: number } = {}): Promise<{
    claims: import('@types').TeachingClaimReviewItem[];
    limit: number;
    offset: number;
    status: string;
    topic: string;
  }> {
    const params = new URLSearchParams();
    if (options.topic) params.set('topic', options.topic);
    if (options.status) params.set('status', options.status);
    if (options.limit) params.set('limit', String(options.limit));
    if (options.offset) params.set('offset', String(options.offset));
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/teaching-claims/review?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async updateTeachingClaimVerification(claimKey: string, payload: {
    verificationStatus: string;
    verificationReason?: string;
    claimText?: string;
  }): Promise<{ claim: import('@types').TeachingClaimReviewItem }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/teaching-claims/${encodeURIComponent(claimKey)}/verification`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getAdminLlmCostDashboard(options: { days?: number; limit?: number } = {}): Promise<{
    dashboard: {
      generatedAt: string;
      windowDays: number;
      totals: {
        llmCalls: number;
        successCalls: number;
        failedCalls: number;
        estimatedCostUsd: number;
        estimatedTokens: number;
        synopsesGenerated: number;
      };
      byOperation: Array<{ operation: string; callCount: number; estimatedCostUsd: number; failedCount: number }>;
      failedLlmCalls: Array<{ operation: string; provider: string | null; model: string | null; normalizedTopic: string | null; errorMessage: string | null; createdAt: string }>;
      failedGenerationJobs: Array<{ jobKey: string; jobType: string; errorMessage: string | null; updatedAt: string | null }>;
      highCostTopics: Array<{ normalizedTopic: string; callCount: number; estimatedCostUsd: number }>;
    };
  }> {
    const params = new URLSearchParams();
    if (options.days) params.set('days', String(options.days));
    if (options.limit) params.set('limit', String(options.limit));
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/llm-cost-dashboard?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getBackgroundAutomation(): Promise<{
    automation: { paused: boolean; pausedAt: string | null; pausedBy: string | null; reason: string | null };
    curriculumScheduler: { enabled: boolean };
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/automation`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async setBackgroundAutomationPaused(paused: boolean, reason?: string): Promise<{
    automation: { paused: boolean; pausedAt: string | null };
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/automation`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused, reason }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getClinicalQualityQueue(options: {
    queue?: string;
    topic?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    queues: Array<{ id: string; label: string; description: string; tone: string }>;
    counts: Record<string, number>;
    claims: import('@types').TeachingClaimReviewItem[];
  }> {
    const params = new URLSearchParams();
    if (options.queue) params.set('queue', options.queue);
    if (options.topic) params.set('topic', options.topic);
    if (options.limit) params.set('limit', String(options.limit));
    if (options.offset) params.set('offset', String(options.offset));
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/clinical-quality-queue?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getAdminClaimObservability(options: { limit?: number } = {}): Promise<{
    observability: {
      generatedAt: string;
      countsByStatus: Array<{ status: string; count: number }>;
      staleTopics: Array<{ normalizedTopic: string; topic: string; claimCount: number; staleCount: number; lastUpdatedAt: string | null }>;
      abstractOnlyClaims: import('@types').TeachingClaimReviewItem[];
      unverifiedClaims: import('@types').TeachingClaimReviewItem[];
      failedGenerationJobs: Array<{ jobKey: string; jobType: string; status: string; errorMessage: string | null; updatedAt: string | null }>;
      highDemandTopics: Array<{ normalizedTopic: string; topic: string; claimCount: number; lastUpdatedAt: string | null }>;
    };
  }> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/claim-observability?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async alignTopicGuidelines(topic: string, options: { limit?: number; apply?: boolean } = {}): Promise<{
    topic: string;
    processed: number;
    results: Array<{ claimKey: string; alignmentStatus?: string; recommendedVerificationStatus?: string; applied?: boolean; skipped?: boolean; error?: string }>;
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/topics/${encodeURIComponent(topic)}/guideline-align`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: options.limit ?? 40, apply: options.apply !== false }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async importCoreClinicalTopics(): Promise<{
    importedCount: number;
    source: string;
    topics: Array<{
      id: number | string;
      block: string;
      displayName: string;
      suggestedQuery: string;
      priority: string;
      volatility: string;
      seedStatus: string;
    }>;
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/curriculum/import-core-topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async listCurriculumSeedTopics(options: { limit?: number; offset?: number; seedStatus?: string } = {}): Promise<{
    count: number;
    topics: Array<{
      id: number | string;
      block: string;
      displayName: string;
      suggestedQuery: string;
      priority: string;
      volatility: string;
      seedStatus: string;
      lastSeededAt?: string | null;
      claimCount: number;
      reviewDueAt?: string | null;
    }>;
  }> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    if (options.offset) params.set('offset', String(options.offset));
    if (options.seedStatus) params.set('seedStatus', options.seedStatus);
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/curriculum/seed-topics?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async seedCurriculumTopic(topicId: number | string, options: {
    provider?: string;
    searchLimit?: number;
    synthesisArticles?: number;
    synopsisArticles?: number;
    background?: boolean;
  } = {}): Promise<{
    accepted?: boolean;
    topic: {
      id: number | string;
      block: string;
      displayName: string;
      seedStatus: string;
      claimCount: number;
      reviewDueAt?: string | null;
    };
    articleCount?: number;
    selectedArticleCount?: number;
    synthesisJobKey?: string;
    synopsisCount?: number;
    synopsisFailures?: Array<{ uid?: string; title?: string; error: string }>;
    claimCount?: number;
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/curriculum/seed-topics/${encodeURIComponent(String(topicId))}/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async runCurriculumSeedBatch(options: {
    batchSize?: number;
    searchLimit?: number;
    synthesisArticles?: number;
    synopsisArticles?: number;
    seedStatuses?: string[];
  } = {}): Promise<{
    candidatesCount: number;
    refreshedCount: number;
    skippedCount: number;
    errorCount: number;
    details: { topics?: unknown[] };
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/curriculum/seed-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async retryFailedCurriculumSeeds(options: {
    batchSize?: number;
    searchLimit?: number;
    synthesisArticles?: number;
    synopsisArticles?: number;
  } = {}): Promise<{
    candidatesCount: number;
    refreshedCount: number;
    skippedCount: number;
    errorCount: number;
    details: { topics?: unknown[] };
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/curriculum/retry-failed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getCurriculumSchedulerObservability(options: { limit?: number } = {}): Promise<{
    scheduler: {
      generatedAt: string;
      runs: Array<{
        id: number;
        runType: string;
        status: string;
        startedAt: string;
        finishedAt?: string | null;
        candidatesCount: number;
        refreshedCount: number;
        skippedCount: number;
        errorCount: number;
        details?: { topics?: Array<Record<string, unknown>> };
        error?: string | null;
      }>;
      dueTopics: Array<{
        id: number | string;
        block: string;
        displayName: string;
        priority: string;
        volatility: string;
        seedStatus: string;
        claimCount: number;
        reviewDueAt?: string | null;
      }>;
      failedTopics: Array<{
        id: number | string;
        block: string;
        displayName: string;
        priority: string;
        volatility: string;
        seedStatus: string;
        claimCount: number;
      }>;
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
  }> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/curriculum/scheduler?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async updateCurriculumSchedulerSettings(settings: {
    enabled?: boolean;
    maxTopicsPerDay?: number;
    maxSynopsesPerDay?: number;
    maxEstimatedCostUsdPerDay?: number;
    maxFailureRate?: number;
  }): Promise<{
    settings: {
      enabled: boolean;
      maxTopicsPerDay: number;
      maxSynopsesPerDay: number;
      maxEstimatedCostUsdPerDay: number;
      maxFailureRate: number;
    };
    guardrails: unknown;
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/curriculum/scheduler/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async checkTeachingClaimGuidelineAlignment(claimKey: string): Promise<{
    claim: import('@types').TeachingClaimReviewItem;
    alignment: {
      alignmentStatus: string;
      recommendedVerificationStatus: string;
      confidence: number;
      reason: string;
      matchedGuideline?: unknown;
    };
    guidelineCount: number;
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/teaching-claims/${encodeURIComponent(claimKey)}/guideline-check`, {
      method: 'POST',
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getEvidenceMap(topic: string): Promise<{
    evidenceMap: NonNullable<import('@types').TopicIntelligence['evidenceMap']>;
    guidelines: import('@types').GuidelineEntry[];
    topicKnowledgeFound: boolean;
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/topics/${encodeURIComponent(topic)}/evidence-map`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

}
