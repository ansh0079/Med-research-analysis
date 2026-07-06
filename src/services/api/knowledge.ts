import { API_BASE, BaseApiClient } from './core';
import type {
  Article,
  SearchFilters,
  AnalysisType,
  AnalysisResult,
  CollectionSummary,
  SavedAlert,
  Annotation,
  SynthesisResult,
  ReviewProject,
  ReviewArticle,
  ReviewCriteria,
  PrismaCounts,
  PicoExtraction,
  CaseModeResult,
  CaseLearningMode,
  ArticleSynopsisResult,
  SearchResponse,
  AgentGuidance,
  TopicKnowledge,
  TopicKnowledgeListResponse,
  TopicKnowledgeProposal,
  TopicKnowledgeProposalListResponse,
  LearningHealthResponse,
  LearningRecommendation,
} from '@types';

export class KnowledgeApi extends BaseApiClient {
  async getTopicKnowledge(topic: string): Promise<{ found: boolean; agentGuidance: AgentGuidance | null; updatedAt?: string; lastRefreshedAt?: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/knowledge/${encodeURIComponent(topic)}`);
    if (!response.ok) return { found: false, agentGuidance: null };
    return response.json();
  }

  async refreshTopicKnowledge(topic: string): Promise<{ agentGuidance: AgentGuidance; topicKnowledge: TopicKnowledge }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/knowledge/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return (await response.json()) as { agentGuidance: AgentGuidance; topicKnowledge: TopicKnowledge };
  }

  async reviewTopicKnowledge(topic: string): Promise<{ found: boolean; agentGuidance?: AgentGuidance | null }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/knowledge/${encodeURIComponent(topic)}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to review topic knowledge');
    }
    return response.json();
  }

  async verifyTopicKnowledgeAnchor(
    topic: string,
    body: { claimText: string; articleUid?: string | null }
  ): Promise<{ topicKnowledge: TopicKnowledge; agentGuidance: AgentGuidance | null }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/knowledge/${encodeURIComponent(topic)}/verify-anchor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to verify anchor');
    }
    return response.json();
  }

  async listEvidenceAlerts(options: { limit?: number; unreadOnly?: boolean; topic?: string } = {}): Promise<{
    alerts: import('@types').ProactiveEvidenceAlert[];
  }> {
    const params = new URLSearchParams();
    if (options.limit != null) params.set('limit', String(options.limit));
    if (options.unreadOnly) params.set('unread', '1');
    if (options.topic) params.set('topic', options.topic);
    const response = await this.fetchWithSession(`${API_BASE}/api/me/evidence-alerts?${params}`);
    if (!response.ok) return { alerts: [] };
    return response.json();
  }

  async markEvidenceAlertRead(id: number): Promise<{ alert: import('@types').ProactiveEvidenceAlert }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/me/evidence-alerts/${encodeURIComponent(String(id))}/read`, {
      method: 'POST',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update alert');
    }
    return response.json();
  }

  async getSynapseGraph(topic: string): Promise<import('@types').SynapseGraphPayload> {
    const response = await this.fetchWithSession(`${API_BASE}/api/topics/${encodeURIComponent(topic)}/synapse-graph`);
    if (!response.ok) throw new Error('Synapse graph failed');
    return response.json();
  }

  async proposeTopicKnowledge(
    topic: string,
    articles: Article[]
  ): Promise<{ proposal: TopicKnowledgeProposal; agentGuidance: AgentGuidance | null }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/search/${encodeURIComponent(topic)}/propose-knowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articles }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to propose topic knowledge');
    }
    return response.json();
  }

  async listTopicKnowledge(options: { query?: string; status?: string; limit?: number; offset?: number } = {}): Promise<TopicKnowledgeListResponse> {
    const params = new URLSearchParams();
    if (options.query) params.set('q', options.query);
    if (options.status) params.set('status', options.status);
    if (options.limit) params.set('limit', String(options.limit));
    if (options.offset) params.set('offset', String(options.offset));
    const response = await this.fetchWithSession(`${API_BASE}/api/knowledge?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async updateTopicKnowledge(
    topic: string,
    payload: { knowledge: TopicKnowledge['knowledge']; sourceArticles?: TopicKnowledge['sourceArticles']; status?: string; confidence?: number }
  ): Promise<{ topicKnowledge: TopicKnowledge; agentGuidance: AgentGuidance | null }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/knowledge/${encodeURIComponent(topic)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async listTopicKnowledgeProposals(
    options: { topic?: string; status?: string; limit?: number; offset?: number } = {}
  ): Promise<TopicKnowledgeProposalListResponse> {
    const params = new URLSearchParams();
    if (options.topic) params.set('topic', options.topic);
    if (options.status) params.set('status', options.status);
    if (options.limit) params.set('limit', String(options.limit));
    if (options.offset) params.set('offset', String(options.offset));
    const response = await this.fetchWithSession(`${API_BASE}/api/knowledge-proposals?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async approveTopicKnowledgeProposal(
    id: number
  ): Promise<{ proposal: TopicKnowledgeProposal; topicKnowledge: TopicKnowledge; agentGuidance: AgentGuidance | null }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/knowledge-proposals/${encodeURIComponent(String(id))}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async rejectTopicKnowledgeProposal(id: number): Promise<{ proposal: TopicKnowledgeProposal }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/knowledge-proposals/${encodeURIComponent(String(id))}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

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

  async getClaimMastery(topic: string, limit = 80): Promise<{
    topic: string;
    summary: { total: number; untested: number; weak: number; mastered: number };
    claims: Array<{
      claimKey: string;
      claimText: string;
      evidenceQuote?: string | null;
      sourcePath?: string | null;
      attempts: number;
      correct: number;
      accuracy: number | null;
      /** Bayesian Knowledge Tracing probability of mastery (0-1), null if untested. */
      masteryProbability: number | null;
      masteryState: 'untested' | 'weak' | 'mastered' | string;
    }>;
  }> {
    const params = new URLSearchParams({ limit: String(limit) });
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/claim-mastery/${encodeURIComponent(topic)}?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getEvidenceJudgementProfile(topic = '', limit = 8): Promise<{
    profile: {
      topic: string | null;
      totalTaggedAttempts: number;
      generatedAt: string;
      tags: Array<{
        tag: string;
        count: number;
        wrongCount: number;
        lowConfidenceCorrectCount?: number;
        lastSeenAt: string | null;
        examples: Array<{
          topic: string | null;
          questionType: string | null;
          questionText: string;
          isCorrect: boolean;
          reasoningNote?: string | null;
          createdAt: string | null;
        }>;
      }>;
      topics: Array<{
        topic: string;
        attempts: number;
        correct: number;
        accuracy: number;
        lastAttemptAt?: string | null;
      }>;
    };
  }> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (topic) params.set('topic', topic);
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/evidence-judgement-profile?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getPracticeAlerts(topic = '', limit = 20): Promise<{
    count: number;
    alerts: Array<{
      objectKey: string;
      objectType: string;
      articleUid?: string | null;
      topic?: string | null;
      normalizedTopic?: string | null;
      title: string;
      classification: string;
      rationale?: string | null;
      provider?: string | null;
      model?: string | null;
      generatedAt?: string | null;
      updatedAt?: string | null;
    }>;
  }> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (topic) params.set('topic', topic);
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/practice-alerts?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getTopicStaleness(topic: string): Promise<{
    hasPrior: boolean;
    significantChange: boolean;
    changes: string[];
    latest?: { evidence_grade: string; key_finding_count: number; generated_at: string };
    prior?:  { evidence_grade: string; key_finding_count: number; generated_at: string };
  }> {
    const params = new URLSearchParams({ topic });
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/staleness?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getTopicOverview(topic: string): Promise<{
    topic: string;
    activeRun: import('@types').StudyRun | null;
    practiceAlerts: Array<{
      objectKey: string; title: string; classification: string; topic?: string | null; rationale?: string | null;
    }>;
    latestSnapshot: {
      evidence_grade: string; key_finding_count: number; consensus_text: string; generated_at: string;
    } | null;
  }> {
    const params = new URLSearchParams({ topic });
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/topic-overview?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getEvidenceDeltaBrief(topic: string): Promise<{
    brief: {
      topic: string;
      hasPriorReview: boolean;
      lastReviewedAt: string | null;
      claimsChanged: number;
      safetyCautions: number;
      weakenedConclusions: number;
      summary: string | null;
      significantChange: boolean;
      changes: Array<{
        claimKey: string;
        claimText: string | null;
        fromLabel: string | null;
        toLabel: string;
        reason?: string | null;
      }>;
      pendingRegeneration: Array<{ claimKey: string; claimText: string | null; status: string; triggerReason: string }>;
    };
  }> {
    const params = new URLSearchParams({ topic });
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/evidence-delta?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getTopicEvidenceMemory(topic: string): Promise<{ memory: import('@types').TopicEvidenceMemory }> {
    const params = new URLSearchParams({ topic });
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/topic-evidence-memory?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getClaimLifecycle(topic: string): Promise<{
    topic: string;
    summary: { totalClaims: number; needsAttention: number; pipeline: Array<{ stage: string; label: string; count: number }> };
    claims: Array<{
      claimKey: string;
      lifecycleStage: string;
      lifecycleLabel: string;
      recommendedAction: string;
      trustTier?: string;
      trustLadder?: Array<{ tier: string; label: string; reached: boolean; current: boolean; stale?: boolean }>;
    }>;
    regeneration: Array<{ claimKey: string; status: string; triggerReason: string }>;
  }> {
    const params = new URLSearchParams({ topic });
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/claim-lifecycle?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async recordTopicReview(topic: string): Promise<{ review: { lastReviewedAt: string } }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/topic-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getPersonalKnowledgeGraph(topic: string): Promise<{
    graph: {
      nodes: Array<{ id: string; type: string; label: string }>;
      edges: Array<{ from: string; to: string; relation: string }>;
      weakClaims: Array<{ claimKey: string; claimText: string; reasoningHint: string }>;
      agentHooks: Array<{ claimKey: string; prompt: string }>;
    };
  }> {
    const params = new URLSearchParams({ topic });
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/knowledge-graph?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getConfidenceCalibration(topic = ''): Promise<{
    profile: {
      buckets: { dangerousMisconception: number; knowledgeGap: number; needsConsolidation: number; wellCalibrated: number };
      recent: Record<string, unknown[]>;
    };
  }> {
    const params = new URLSearchParams(topic ? { topic } : {});
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/confidence-calibration?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async createLearningRound(topic: string): Promise<{ round: { id: number; items: unknown[] }; persisted: boolean }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/learning-rounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getLearningRound(roundId: number): Promise<{ round: { id: number; topic: string; items: unknown[] } }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/learning-rounds/${roundId}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getCaseToEvidence(clinicalQuestion: string, topic = '', seedArticles: import('@types').Article[] = []): Promise<{
    topic?: string;
    brief: Record<string, unknown>;
    articles: Article[];
    guidelines: unknown[];
    relatedClaims: unknown[];
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/case-to-evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinicalQuestion, topic, seedArticles }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getGuidelineWatchEvents(topic: string): Promise<{ events: Array<{ eventType: string; message: string; severity: string }> }> {
    const params = new URLSearchParams({ topic });
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/guideline-watch?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async updateTeachingClaimCuratorMetadata(
    claimKey: string,
    metadata: {
      examRelevant?: boolean;
      practiceChanging?: boolean;
      overclaimed?: boolean;
      paperSectionRef?: string;
      curatorNotes?: string;
    }
  ): Promise<{ claim: unknown }> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/admin/teaching-claims/${encodeURIComponent(claimKey)}/curator-metadata`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata),
      }
    );
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }
}
