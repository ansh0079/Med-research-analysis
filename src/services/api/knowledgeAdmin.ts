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

  async updateBackgroundAutomation(paused: boolean, reason?: string): Promise<{ automation: { paused: boolean } }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/automation`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused, reason }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async setBackgroundAutomationPaused(paused: boolean, reason?: string): Promise<{ automation: { paused: boolean } }> {
    return this.updateBackgroundAutomation(paused, reason);
  }

  async runGuidelineAlign(topic: string): Promise<{ success: boolean; processed?: number }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/topics/${encodeURIComponent(topic)}/guideline-align`, {
      method: 'POST',
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getAdminClaimObservability(options: { limit?: number } = {}): Promise<{
    observability: {
    generatedAt: string;
    countsByStatus: Array<{ status: string; count: number }>;
    staleTopics: Array<{ normalizedTopic: string; topic: string; claimCount: number; staleCount: number; lastUpdatedAt: string | null }>;
    abstractOnlyClaims: Array<{ claimKey: string; claimText: string; normalizedTopic?: string | null; verificationStatus: string }>;
    unverifiedClaims: Array<{ claimKey: string; claimText: string; normalizedTopic?: string | null; verificationStatus: string }>;
    failedGenerationJobs: Array<{ jobKey: string; jobType: string; errorMessage: string | null; updatedAt: string | null }>;
    highDemandTopics: Array<{ normalizedTopic: string; topic: string; claimCount: number; lastUpdatedAt: string | null }>;
    };
  }> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/claim-observability?${params}`);
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
    queue: string | null;
    topic: string | null;
    limit: number;
    offset: number;
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

  async getCurriculumScheduler(): Promise<{
    scheduler: {
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
    dueTopics: Array<{ id: number | string; block: string; displayName: string; suggestedQuery?: string; priority: string; volatility: string; seedStatus: string; claimCount: number; reviewDueAt?: string | null }>;
    failedTopics: Array<{ id: number | string; block: string; displayName: string; suggestedQuery?: string; priority: string; volatility: string; seedStatus: string; claimCount: number; reviewDueAt?: string | null }>;
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
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/curriculum/scheduler`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getCurriculumSchedulerObservability(options: { limit?: number } = {}): Promise<Awaited<ReturnType<KnowledgeAdminApi['getCurriculumScheduler']>>> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/curriculum/scheduler?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async updateCurriculumScheduler(settings: {
    enabled?: boolean;
    maxTopicsPerDay?: number;
    maxSynopsesPerDay?: number;
    maxEstimatedCostUsdPerDay?: number;
    maxFailureRate?: number;
  }): Promise<{ guardrails: unknown }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/curriculum/scheduler`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async updateCurriculumSchedulerSettings(settings: {
    enabled?: boolean;
    maxTopicsPerDay?: number;
    maxSynopsesPerDay?: number;
    maxEstimatedCostUsdPerDay?: number;
    maxFailureRate?: number;
  }): Promise<{ settings: unknown; guardrails: unknown }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/curriculum/scheduler/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async listCurriculumSeedTopics(options: { seedStatus?: string; limit?: number; offset?: number } = {}): Promise<{
    topics: Array<{
      id: number | string;
      block: string;
      displayName: string;
      suggestedQuery?: string;
      priority: string;
      volatility: string;
      seedStatus: string;
      claimCount: number;
      reviewDueAt?: string | null;
    }>;
    count: number;
  }> {
    const params = new URLSearchParams();
    if (options.seedStatus) params.set('seedStatus', options.seedStatus);
    if (options.limit) params.set('limit', String(options.limit));
    if (options.offset) params.set('offset', String(options.offset));
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/curriculum/seed-topics?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async importCoreClinicalTopics(): Promise<{ importedCount: number; topics: unknown[]; source: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/curriculum/import-core-topics`, {
      method: 'POST',
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async seedCurriculumTopic(topicId: number | string, options: {
    searchLimit?: number;
    synthesisArticles?: number;
    synopsisArticles?: number;
    background?: boolean;
  } = {}): Promise<{ success?: boolean; topicId?: number | string; accepted?: boolean; topic?: unknown }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/curriculum/seed-topics/${encodeURIComponent(topicId)}/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async seedCurriculumBatch(options: {
    batchSize?: number;
    searchLimit?: number;
    synthesisArticles?: number;
    synopsisArticles?: number;
    force?: boolean;
  } = {}): Promise<{ success?: boolean; seeded?: number }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/curriculum/seed-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async runCurriculumSeedBatch(options: Parameters<KnowledgeAdminApi['seedCurriculumBatch']>[0] = {}): Promise<Awaited<ReturnType<KnowledgeAdminApi['seedCurriculumBatch']>>> {
    return this.seedCurriculumBatch(options);
  }

  async retryFailedCurriculumSeeds(options: {
    batchSize?: number;
    searchLimit?: number;
    synthesisArticles?: number;
    synopsisArticles?: number;
    force?: boolean;
  } = {}): Promise<{ success?: boolean; retried?: number }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/curriculum/retry-failed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async alignTopicGuidelines(topic: string, options: { limit?: number; apply?: boolean } = {}): Promise<{ success?: boolean; processed?: number }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/topics/${encodeURIComponent(topic)}/guideline-align`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async runGuidelineWatchScan(topic: string): Promise<{ success: boolean; scanned: number }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/topics/${encodeURIComponent(topic)}/guideline-watch-scan`, {
      method: 'POST',
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async checkTeachingClaimGuideline(claimKey: string): Promise<{
    claim: import('@types').TeachingClaimReviewItem;
    alignment: {
      alignmentStatus: string;
      recommendedVerificationStatus: string;
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

  async checkTeachingClaimGuidelineAlignment(claimKey: string): Promise<Awaited<ReturnType<KnowledgeAdminApi['checkTeachingClaimGuideline']>>> {
    return this.checkTeachingClaimGuideline(claimKey);
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

  // Background job admin (Phase 3 durable jobs)
  async listAdminJobs(options: {
    status?: string;
    jobType?: string;
    topic?: string;
    limit?: number;
  } = {}): Promise<{
    jobs: Array<{
      jobKey: string;
      jobType: string;
      status: string;
      topic: string | null;
      errorMessage: string | null;
      attempts: number;
      createdAt: string;
      updatedAt: string;
      startedAt: string | null;
      completedAt: string | null;
    }>;
  }> {
    const params = new URLSearchParams();
    if (options.status) params.set('status', options.status);
    if (options.jobType) params.set('jobType', options.jobType);
    if (options.topic) params.set('topic', options.topic);
    if (options.limit) params.set('limit', String(options.limit));
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/jobs?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getAdminJob(jobKey: string): Promise<{
    job: {
      jobKey: string;
      jobType: string;
      status: string;
      topic: string | null;
      result: unknown;
      errorMessage: string | null;
      provider: string | null;
      model: string | null;
      audit: unknown;
      attempts: number;
      createdAt: string;
      updatedAt: string;
      startedAt: string | null;
      completedAt: string | null;
    };
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/jobs/${encodeURIComponent(jobKey)}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async retryAdminJob(jobKey: string): Promise<{ success: boolean; jobKey: string; status: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/jobs/${encodeURIComponent(jobKey)}/retry`, {
      method: 'POST',
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async listDeadLetterJobs(options: {
    jobType?: string;
    topic?: string;
    limit?: number;
  } = {}): Promise<{
    jobs: Array<{
      jobKey: string;
      jobType: string;
      topic: string | null;
      errorMessage: string | null;
      attempts: number;
      failedAt: string;
      originalCreatedAt: string | null;
    }>;
  }> {
    const params = new URLSearchParams();
    if (options.jobType) params.set('jobType', options.jobType);
    if (options.topic) params.set('topic', options.topic);
    if (options.limit) params.set('limit', String(options.limit));
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/dead-letter-jobs?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async requeueDeadLetterJob(jobKey: string): Promise<{ success: boolean; jobKey: string; status: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/dead-letter-jobs/${encodeURIComponent(jobKey)}/requeue`, {
      method: 'POST',
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

}
