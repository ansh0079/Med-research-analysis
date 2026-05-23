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
  TeachingVignetteResult,
  SearchResponse,
  AgentGuidance,
  TopicKnowledge,
  TopicKnowledgeListResponse,
  TopicKnowledgeProposal,
  TopicKnowledgeProposalListResponse,
  LearningHealthResponse,
  LearningRecommendation,
} from '@types';
import * as Sentry from '@sentry/react';
import type { Scope } from '@sentry/react';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  emailVerified?: boolean;
}

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 1.0,
  });
}

/**
 * Simple LRU cache with TTL eviction.
 * Prevents unbounded memory growth in long-running sessions.
 */
class SimpleLRUCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();
  private readonly maxSize: number;
  private readonly defaultTtlMs: number;

  constructor(maxSize: number, defaultTtlMs: number) {
    this.maxSize = maxSize;
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest (first in map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, { value, expiry: Date.now() + (ttlMs ?? this.defaultTtlMs) });
  }

  clear(): void {
    this.cache.clear();
  }
}

class MedicalResearchAPI {
  private cache = new SimpleLRUCache<unknown>(100, 5 * 60 * 1000);
  private sessionId: string | null = null;

  constructor() {
    try {
      this.sessionId = localStorage.getItem('med_research_session');
    } catch {
      this.sessionId = null;
    }
  }

  private clientConfig: {
    features?: { vectorSearch?: boolean };
  } | null = null;
  private clientConfigFetchedAt = 0;
  private readonly clientConfigTtlMs = 60_000;

  /**
   * Cached server /api/config (features flags for optional client behavior).
   */
  async getClientConfig(): Promise<{ features?: { vectorSearch?: boolean } }> {
    if (this.clientConfig && Date.now() - this.clientConfigFetchedAt < this.clientConfigTtlMs) {
      return this.clientConfig;
    }
    const response = await this.fetchWithSession(`${API_BASE}/api/config`);
    if (!response.ok) {
      return { features: {} };
    }
    const data = (await response.json()) as { features?: { vectorSearch?: boolean } };
    this.clientConfig = data;
    this.clientConfigFetchedAt = Date.now();
    return data;
  }

  private async fetchWithSession(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers);
    if (this.sessionId) {
      headers.set('X-Session-Id', this.sessionId);
    }
    // Required by the server-side CSRF origin check on state-changing requests
    headers.set('X-Requested-With', 'XMLHttpRequest');
    const response = await fetch(url, { ...options, headers, credentials: 'include' });
    const clonedResponse = response.clone();
    
    const serverSession = response.headers.get('X-Session-Id');
    if (serverSession && serverSession !== this.sessionId) {
      this.sessionId = serverSession;
      try {
        localStorage.setItem('med_research_session', serverSession);
      } catch {
        // ignore storage errors
      }
    }

    return clonedResponse;
  }

  async searchPubMed(
    query: string,
    options: { max?: number; sort?: 'relevance' | 'date' } = {}
  ): Promise<{ articles: Article[]; count: number }> {
    const { max = 20, sort = 'relevance' } = options;
    const cacheKey = `pubmed:${query}:${max}:${sort}`;
    const cached = this.getCache<{ articles: Article[]; count: number }>(cacheKey);
    if (cached) return cached;

    const response = await this.fetchWithSession(
      `${API_BASE}/api/pubmed/search?query=${encodeURIComponent(query)}&max=${max}&sort=${sort}`
    );
    if (!response.ok) throw new Error(`PubMed search failed: ${response.statusText}`);
    const data = await response.json();
    this.setCache(cacheKey, data);
    return data;
  }

  async searchSemanticScholar(
    query: string,
    options: { limit?: number } = {}
  ): Promise<{ articles: Article[] }> {
    const { limit = 20 } = options;
    const response = await this.fetchWithSession(
      `${API_BASE}/api/semantic/search?query=${encodeURIComponent(query)}&limit=${limit}`
    );
    if (!response.ok) throw new Error(`Semantic Scholar search failed: ${response.statusText}`);
    return response.json();
  }

  async searchOpenAlex(
    query: string,
    options: { perPage?: number } = {}
  ): Promise<{ articles: Article[] }> {
    const { perPage = 20 } = options;
    const response = await this.fetchWithSession(
      `${API_BASE}/api/openalex/search?query=${encodeURIComponent(query)}&perPage=${perPage}`
    );
    if (!response.ok) throw new Error(`OpenAlex search failed: ${response.statusText}`);
    return response.json();
  }

  /**
   * Primary search path — calls GET /api/search which runs fetchUnifiedEvidence
   * (RRF + EBM ranking) server-side. Prefer this over unifiedSearch.
   */
  async search(
    query: string,
    filters: SearchFilters = {},
    opts: { vector?: boolean; previousQueries?: string[] } = {}
  ): Promise<SearchResponse> {
    const sources = filters.sources || ['pubmed', 'openalex'];
    const limit = filters.maxResults ?? 20;
    const params = new URLSearchParams({
      q: query,
      sources: sources.join(','),
      limit: String(limit),
    });
    if (opts.vector === true) params.set('vector', '1');
    if (opts.vector === false) params.set('vector', '0');
    if (filters.specificity) params.set('specificity', filters.specificity);
    if (filters.parsedQuery?.studyTypes && filters.parsedQuery.studyTypes.length > 0) {
      params.set('parsedStudyTypes', JSON.stringify(filters.parsedQuery.studyTypes));
    }
    if (opts.previousQueries && opts.previousQueries.length > 0) {
      params.set('previousQueries', JSON.stringify(opts.previousQueries));
    }

    const response = await this.fetchWithSession(`${API_BASE}/api/search?${params}`);
    if (!response.ok) throw new Error(`Search failed: ${response.statusText}`);
    const data = await response.json() as SearchResponse;
    return data;
  }

  async getAiEnrichment(key: string): Promise<{
    status: 'pending' | 'ready' | 'failed';
    clinicalAnswer?: import('@types').ClinicalAnswer | null;
    consensusSynopsis?: import('@types').TopicIntelligence['consensusSynopsis'] | null;
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/search/ai-enrichment/${encodeURIComponent(key)}`);
    if (!response.ok) return { status: 'failed' };
    return response.json();
  }

  async getTopicKnowledge(topic: string): Promise<{ found: boolean; agentGuidance: AgentGuidance | null; updatedAt?: string; lastRefreshedAt?: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/knowledge/${encodeURIComponent(topic)}`);
    if (!response.ok) return { found: false, agentGuidance: null };
    return response.json();
  }

  /** Re-run server-side extraction for a topic (authenticated; rate-limited). */
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

  /**
   * Back-compat alias: same as `search()` with vector fusion off (lexical RRF only).
   * Prefer `search()` when you need `{ sources }` or optional `vector` fusion.
   */
  async unifiedSearch(
    query: string,
    filters: SearchFilters = {}
  ): Promise<{ articles: Article[]; count: number }> {
    const { articles, count } = await this.search(query, filters, { vector: false });
    return { articles, count };
  }

  async getAnnotations(articleId: string): Promise<Annotation[]> {
    const response = await this.fetchWithSession(`${API_BASE}/api/articles/${articleId}/annotations`);
    if (response.status === 401) {
      throw new Error('AUTH_REQUIRED'); 
    }
    if (!response.ok) throw new Error('Failed to fetch annotations');
    return response.json();
  }

  async addAnnotation(
    articleId: string, 
    text: string, 
    position?: { x: number; y: number; page: number }
  ): Promise<{ id: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/articles/${articleId}/annotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, position }),
    });
    if (response.status === 401) {
      throw new Error('AUTH_REQUIRED');
    }
    if (!response.ok) throw new Error('Failed to save annotation');
    return response.json();
  }

  async findFullText(
    doi: string,
    opts: { pmcid?: string } = {}
  ): Promise<{ url: string | null; isFree: boolean; source?: string; isGold?: boolean }> {
    const params = new URLSearchParams({ doi });
    if (opts.pmcid) params.set('pmcid', opts.pmcid);
    const response = await this.fetchWithSession(`${API_BASE}/api/pdf/find?${params}`);
    if (!response.ok) return { url: null, isFree: false };
    return response.json();
  }

  async getPdfStatus(article: {
    uid?: string; doi?: string; pmcid?: string;
  }): Promise<{
    indexed: boolean;
    sections?: string[];
    wordCount?: number;
    numpages?: number;
    source?: string;
    indexedAt?: string;
  }> {
    const params = new URLSearchParams();
    if (article.uid) params.set('uid', article.uid);
    if (article.doi) params.set('doi', article.doi);
    if (article.pmcid) params.set('pmcid', article.pmcid);
    try {
      const response = await this.fetchWithSession(`${API_BASE}/api/pdf/status?${params}`);
      if (!response.ok) return { indexed: false };
      return response.json();
    } catch {
      return { indexed: false };
    }
  }

  async getPdfSection(article: {
    uid?: string; doi?: string; pmcid?: string;
  }, section: string): Promise<{ section: string; text: string; wordCount: number }> {
    const params = new URLSearchParams({ section });
    if (article.uid) params.set('uid', article.uid);
    if (article.doi) params.set('doi', article.doi);
    if (article.pmcid) params.set('pmcid', article.pmcid);
    const response = await this.fetchWithSession(`${API_BASE}/api/pdf/section?${params}`);
    if (!response.ok) throw new Error(`Section "${section}" not available`);
    return response.json();
  }

  async getPdfTables(article: {
    uid?: string; doi?: string; pmcid?: string;
  }): Promise<{ tables: Array<{ heading: string; rows: string[][]; rawText: string }> }> {
    const params = new URLSearchParams();
    if (article.uid) params.set('uid', article.uid);
    if (article.doi) params.set('doi', article.doi);
    if (article.pmcid) params.set('pmcid', article.pmcid);
    const response = await this.fetchWithSession(`${API_BASE}/api/pdf/tables?${params}`);
    if (!response.ok) return { tables: [] };
    return response.json();
  }

  async extractPdfText(url: string): Promise<{
    text: string; pages: number; metadata: Record<string, unknown>;
    sections?: Record<string, string>; orderedKeys?: string[];
    tables?: Array<{ heading: string; rows: string[][]; rawText: string }>;
    wordCount?: number;
  }> {
    return this.withRetry(() => this._extractPdfText(url));
  }

  private async _extractPdfText( 
    url: string
  ): Promise<{ text: string; pages: number; metadata: Record<string, unknown> }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/pdf/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'PDF extraction failed');
    }

    return response.json();
  }

  async register(data: Record<string, unknown>): Promise<{ user: AuthUser; message?: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Registration failed');
    }
    return response.json();
  }

  async getMe(): Promise<{ user: AuthUser } | null> {
    try {
      const response = await this.fetchWithSession(`${API_BASE}/api/auth/me`);
      if (!response.ok) return null;
      return response.json();
    } catch {
      return null;
    }
  }

  async login(credentials: Record<string, unknown>): Promise<{ user: AuthUser }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Login failed');
    }
    return response.json();
  }

  async forgotPassword(email: string): Promise<void> {
    await this.fetchWithSession(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const response = await this.fetchWithSession(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Password reset failed');
    }
  }

  async verifyEmail(token: string): Promise<{ user: AuthUser }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Verification failed');
    }
    return response.json();
  }

  async resendVerification(): Promise<void> {
    const response = await this.fetchWithSession(`${API_BASE}/api/auth/resend-verification`, {
      method: 'POST',
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to resend verification email');
    }
  }

  async exportBibTeX(articles: Article[]): Promise<string> {
    const response = await this.fetchWithSession(`${API_BASE}/api/user/export/bibtex`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articles }),
    });
    if (!response.ok) throw new Error('BibTeX export failed');
    return response.text();
  }

  async getSearchHistory(): Promise<{ history: Array<{ 
    query: string; 
    timestamp: string; 
    results_count: number 
  }> }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/user/history`);
    if (!response.ok) throw new Error('Failed to fetch history');
    return response.json();
  }

  async getAnalyticsSummary(): Promise<{
    dailyStats: Array<{ date: string; searches: number; analyses: number }>;
    popularSearches: Array<{ query: string; count: number }>;
    generatedAt: string;
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/analytics/summary`);
    if (!response.ok) throw new Error('Failed to fetch analytics');
    return response.json() as Promise<{ 
      dailyStats: Array<{ date: string; searches: number; analyses: number }>; 
      popularSearches: Array<{ query: string; count: number }>; 
      generatedAt: string 
    }>;
  }

  async getDailyStats(days = 30): Promise<{ stats: Array<{ date: string; searches: number; analyses: number }> }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/analytics/daily?days=${days}`);
    if (!response.ok) throw new Error('Failed to fetch daily stats');
    return response.json();
  }

  async getPopularSearches(): Promise<{ searches: Array<{ query: string; count: number }> }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/analytics/popular`);
    if (!response.ok) throw new Error('Failed to fetch trending topics');
    return response.json();
  }

  async saveArticle(article: Article, options: { teamId?: string; topic?: string } = {}): Promise<void> {
    const response = await this.fetchWithSession(`${API_BASE}/api/user/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article, teamId: options.teamId, topicMemoryTopic: options.topic }),
    });
    if (!response.ok) throw new Error('Failed to save article');
  }

  async unsaveArticle(articleId: string, options: { teamId?: string } = {}): Promise<void> {
    const response = await this.fetchWithSession(`${API_BASE}/api/user/unsave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId, teamId: options.teamId }),
    });
    if (!response.ok) throw new Error('Failed to unsave article');
  }

  async getSavedArticles(options: { teamId?: string } = {}): Promise<{ articles: Article[] }> {
    const query = options.teamId ? `?teamId=${encodeURIComponent(options.teamId)}` : '';
    const response = await this.fetchWithSession(`${API_BASE}/api/user/saved${query}`);
    if (!response.ok) throw new Error('Failed to fetch saved articles');
    return response.json();
  }

  async createReview(payload: {
    title?: string;
    question: string;
    criteria: ReviewCriteria;
    ownerType?: 'user' | 'session' | 'team';
    teamId?: string;
  }): Promise<{ review: ReviewProject }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to create review');
    return response.json();
  }

  async getReview(reviewId: string): Promise<{ review: ReviewProject; articles: ReviewArticle[]; prisma: PrismaCounts }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/reviews/${encodeURIComponent(reviewId)}`);
    if (!response.ok) throw new Error('Failed to fetch review');
    return response.json();
  }

  async addReviewArticles(reviewId: string, articles: Article[]): Promise<{ articles: ReviewArticle[]; duplicates: Array<{ newId: string; existingId: string; title: string; similarity: number }> }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/reviews/${encodeURIComponent(reviewId)}/articles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articles }),
    });
    if (!response.ok) throw new Error('Failed to add review articles');
    return response.json();
  }

  async updateReviewScreening(
    reviewId: string,
    articleId: string,
    payload: { decision: 'pending' | 'included' | 'excluded' | 'maybe'; exclusionReason?: string; notes?: string }
  ): Promise<{ article: ReviewArticle; prisma: PrismaCounts }> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/reviews/${encodeURIComponent(reviewId)}/articles/${encodeURIComponent(articleId)}/screening`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    if (!response.ok) throw new Error('Failed to update screening decision');
    return response.json();
  }

  async meshSuggest(q: string): Promise<{ suggestions: Array<{ label: string; resource: string; note: string }> }> {
    try {
      const response = await this.fetchWithSession(`${API_BASE}/api/search/mesh-suggest?q=${encodeURIComponent(q)}`);
      if (!response.ok) return { suggestions: [] };
      return response.json();
    } catch {
      return { suggestions: [] };
    }
  }

  async extractSinglePico(
    article: Article,
    provider: 'auto' | 'gemini' | 'mistral' = 'auto'
  ): Promise<{ extraction: PicoExtraction; cached: boolean; articleId: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/ai/pico`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article, provider }),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to extract PICO');
    return response.json();
  }

  async extractPico(
    articles: Article[],
    provider: 'auto' | 'gemini' | 'mistral' = 'auto'
  ): Promise<{ results: Array<{ articleId: string; extraction: PicoExtraction; cached: boolean; confidence: number }> }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/reviews/pico/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articles, provider }),
    });
    if (!response.ok) throw new Error('Failed to extract PICO');
    return response.json();
  }

  async assessRiskOfBias(
    reviewId: string,
    articleId: string,
    provider: 'auto' | 'gemini' | 'mistral' = 'auto'
  ): Promise<{
    rob: Record<string, { judgement: 'low' | 'some_concerns' | 'high'; rationale: string }>;
    provider: string;
    model: string;
    articleId: string;
  }> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/reviews/${encodeURIComponent(reviewId)}/articles/${encodeURIComponent(articleId)}/rob`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider }) }
    );
    if (!response.ok) throw new Error('Failed to assess risk of bias');
    return response.json();
  }

  async generateGradeTable(
    reviewId: string,
    provider: 'auto' | 'gemini' | 'mistral' = 'auto'
  ): Promise<{
    gradeTable: {
      question: string;
      outcomes: Array<{
        name: string;
        studyCount: number;
        participantCount: number;
        effect: string;
        certainty: 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';
        certaintyDowngrade: string[];
        certaintyUpgrade: string[];
        comment: string;
      }>;
      overallCertainty: string;
      limitations: string;
    };
    provider: string;
    model: string;
    includedCount: number;
  }> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/reviews/${encodeURIComponent(reviewId)}/grade-table`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider }) }
    );
    if (!response.ok) throw new Error('Failed to generate GRADE table');
    return response.json();
  }

  async screeningAssist(payload: {
    criteria: ReviewCriteria;
    article: Article;
    provider?: 'auto' | 'gemini' | 'mistral';
  }): Promise<{ decision: 'include' | 'exclude' | 'uncertain'; rationale: string; matchedInclusion: string[]; triggeredExclusion: string[] }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/reviews/screening/assist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to run screening assist');
    return response.json();
  }

  async getReviewPrisma(reviewId: string): Promise<{ prisma: PrismaCounts }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/reviews/${encodeURIComponent(reviewId)}/prisma`);
    if (!response.ok) throw new Error('Failed to fetch PRISMA counts');
    return response.json();
  }

  getReviewExportUrl(reviewId: string): string {
    return `${API_BASE}/api/reviews/${encodeURIComponent(reviewId)}/export.csv`;
  }

  async getAlerts(): Promise<{ alerts: SavedAlert[] }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/alerts`);
    if (!response.ok) throw new Error('Failed to fetch alerts');
    return response.json();
  }

  async createAlert(query: string, sources: string[], frequency: 'daily' | 'weekly' | 'monthly'): Promise<{ alert: SavedAlert }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, sources, frequency }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create alert');
    }
    return response.json();
  }

  async deleteAlert(id: number): Promise<void> {
    const response = await this.fetchWithSession(`${API_BASE}/api/alerts/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete alert');
  }

  async getCitations(semanticId: string): Promise<{ citations: Article[]; references: Article[]; relations?: import('@types').CitationRelation[] }> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/citations/${encodeURIComponent(semanticId)}`
    );
    if (!response.ok) throw new Error('Failed to fetch citations');
    return response.json();
  }

  async vectorSearch(
    query: string,
    options: { limit?: number; minScore?: number } = {}
  ): Promise<{ articles: Article[]; scores: number[] }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/search/vector`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, ...options }),
    });
    if (!response.ok) throw new Error('Vector search failed');
    return response.json();
  }

  async indexArticlesForVector(articles: Article[]): Promise<{
    indexed: number;
    attempted: number;
    errors: Array<{ externalId: string; message: string }>;
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/search/vector/index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articles }),
    });
    if (!response.ok) {
      const errBody: unknown = await response.json().catch(() => ({}));
      const message = (errBody && typeof errBody === 'object' && 'error' in errBody) 
        ? String((errBody as { error: unknown }).error) 
        : 'Vector index failed';
      throw new Error(message);
    }
    return response.json();
  }

  async logEvent(eventType: string, metadata: Record<string, unknown>): Promise<void> {
    try {
      await this.fetchWithSession(`${API_BASE}/api/analytics/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType, metadata, timestamp: new Date().toISOString() }),
      });
    } catch (err) {
      if (import.meta.env.VITE_SENTRY_DSN) Sentry.captureException(err);
      if (import.meta.env.DEV) console.error('Failed to log event', err);
    }
  }

  async recordSearchFeedback(
    articleUid: string,
    feedbackType: 'helpful' | 'not_helpful',
    reason?: string
  ): Promise<void> {
    const response = await this.fetchWithSession(`${API_BASE}/api/search/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleUid, feedbackType, reason }),
    });
    if (!response.ok) throw new Error('Failed to record feedback');
  }

  async logSearchImpressions(
    searchId: number,
    impressions: { articleUid: string; position: number }[]
  ): Promise<void> {
    try {
      await this.fetchWithSession(`${API_BASE}/api/search/impressions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchId, impressions }),
      });
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to log impressions', err);
    }
  }

  async logSearchInteraction(
    searchId: number,
    articleUid: string,
    interactionType: 'click' | 'save' | 'dwell',
    dwellMs?: number
  ): Promise<void> {
    try {
      await this.fetchWithSession(`${API_BASE}/api/search/interaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchId, articleUid, interactionType, dwellMs }),
      });
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to log interaction', err);
    }
  }

  async generateQuizFromEvidence(
    topic: string,
    articles: Article[],
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed' = 'mixed',
    count = 3
  ): Promise<{ questions: import('@types').QuizQuestion[]; topic: string; provider: string; disclaimer: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/quiz/from-evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, articles, difficulty, count }),
    });
    if (!response.ok) throw new Error('Failed to generate quiz from evidence');
    return response.json();
  }

  async logout() {
    try {
      await this.fetchWithSession(`${API_BASE}/api/auth/logout`, { method: 'POST' });
    } catch {
      // Best-effort server logout
    }
  }

  async analyzeWithAI(
    text: string,
    options: { type?: AnalysisType; provider?: string; model?: string } = {}
  ): Promise<AnalysisResult> {
    return this.withRetry(() => this._analyzeWithAI(text, options));
  }

  private async _analyzeWithAI(
    text: string,
    options: { type?: AnalysisType; provider?: string; model?: string } = {}
  ): Promise<AnalysisResult> {
    const response = await this.fetchWithSession(`${API_BASE}/api/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        analysisType: options.type || 'comprehensive',
        provider: options.provider,
        model: options.model,
      }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  analyzeWithAIStream(
    text: string,
    options: { type?: AnalysisType; provider?: string; model?: string } = {},
    callbacks: {
      onChunk?: (chunk: string) => void;
      onResult?: (result: AnalysisResult) => void;
      onError?: (error: Error) => void;
      onDone?: () => void;
    } = {}
  ): () => void {
    const abortController = new AbortController();
    const { onChunk, onResult, onError, onDone } = callbacks;

    const run = async () => {
      try {
        const response = await this.fetchWithSession(`${API_BASE}/api/ai/analyze/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            analysisType: options.type || 'comprehensive',
            provider: options.provider,
            model: options.model,
          }),
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          const err = await response.json().catch(() => ({ error: 'Streaming failed' }));
          throw new Error(err.error || 'Streaming failed');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        let streamOpen = true;
        while (streamOpen) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const block of lines) {
            const eventMatch = block.match(/^event: (\w+)$/m);
            const dataMatch = block.match(/^data: (.+)$/m);
            if (!eventMatch || !dataMatch) continue;
            const event = eventMatch[1];
            const data = JSON.parse(dataMatch[1]);

            if (event === 'chunk' && onChunk) onChunk(data.text);
            if (event === 'result' && onResult) onResult(data as AnalysisResult);
            if (event === 'error') throw new Error(data.message || 'Stream error');
            if (event === 'done') {
              streamOpen = false;
              break;
            }
          }
        }
        onDone?.();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          onError?.(err as Error);
        }
      }
    };

    run();
    return () => abortController.abort();
  }

  async getSynopsis(
    article: Article,
    options?: { async?: boolean; pollIntervalMs?: number; maxAttempts?: number; topic?: string }
  ): Promise<ArticleSynopsisResult> {
    const useAsync = options?.async ?? false;
    const response = await this.fetchWithSession(`${API_BASE}/api/ai/synopsis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article, async: useAsync, topic: options?.topic }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    const initial = (await response.json()) as ArticleSynopsisResult;
    if (!useAsync || response.status === 200) return initial;
    const jobKey = initial.jobKey;
    if (!jobKey) return initial;
    const interval = options?.pollIntervalMs ?? 1200;
    const maxAttempts = options?.maxAttempts ?? 90;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, interval));
      const { job } = await this.getAiGenerationJob(jobKey);
      if (job.status === 'failed') {
        throw new Error(job.errorMessage || 'Synopsis job failed');
      }
      if (job.status === 'completed' && job.result && typeof job.result === 'object') {
        return { ...(job.result as ArticleSynopsisResult), jobKey, status: 'completed' };
      }
    }
    throw new Error('Synopsis generation timed out');
  }

  async synthesizeEvidence(
    topic: string,
    articles: Article[],
    opts?: { async?: boolean }
  ): Promise<SynthesisResult> {
    const response = await this.fetchWithSession(`${API_BASE}/api/ai/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, articles, async: opts?.async === true }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  synthesizeEvidenceStream(
    topic: string,
    articles: Article[],
    callbacks: {
      onChunk?: (chunk: string) => void;
      onResult?: (result: SynthesisResult) => void;
      onError?: (error: Error) => void;
      onDone?: () => void;
    } = {}
  ): () => void {
    const abortController = new AbortController();
    const { onChunk, onResult, onError, onDone } = callbacks;

    const run = async () => {
      try {
        const response = await this.fetchWithSession(`${API_BASE}/api/ai/synthesize/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, articles }),
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          const err = await response.json().catch(() => ({ error: 'Streaming failed' }));
          throw new Error(err.error || 'Streaming failed');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        let streamOpen = true;
        while (streamOpen) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const block of lines) {
            const eventMatch = block.match(/^event: (\w+)$/m);
            const dataMatch = block.match(/^data: (.+)$/m);
            if (!eventMatch || !dataMatch) continue;
            const event = eventMatch[1];
            const data = JSON.parse(dataMatch[1]);

            if (event === 'chunk' && onChunk) onChunk(data.text);
            if (event === 'result' && onResult) onResult(data as SynthesisResult);
            if (event === 'error') throw new Error(data.message || 'Stream error');
            if (event === 'done') {
              streamOpen = false;
              break;
            }
          }
        }
        onDone?.();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          onError?.(err as Error);
        }
      }
    };

    run();
    return () => abortController.abort();
  }

  async analyzeCase(
    caseText: string,
    provider: 'auto' | 'gemini' | 'mistral' = 'auto',
    options: {
      topic?: string;
      learningMode?: CaseModeResult['mode'];
      /** Same ranked set as topic workspace / synthesis (optional). */
      seedArticles?: Partial<Article>[];
    } = {}
  ): Promise<CaseModeResult> {
    const response = await this.fetchWithSession(`${API_BASE}/api/cases/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseText, provider, ...options }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async agentChatStream(
    topic: string,
    message: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    currentArticles: Partial<Article>[] = [],
    previousQueries: string[] = [],
    callbacks: {
      onChunk: (text: string) => void;
      onDone: (topic: string) => void;
      onError: (msg: string) => void;
    }
  ): Promise<void> {
    const response = await this.fetchWithSession(`${API_BASE}/api/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, message, conversationHistory, currentArticles, previousQueries }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Agent request failed' }));
      callbacks.onError((err as { error?: string }).error ?? 'Agent request failed');
      return;
    }
    const reader = response.body?.getReader();
    if (!reader) { callbacks.onError('No response body'); return; }
    const decoder = new TextDecoder();
    let buf = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        let event = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) { event = line.slice(7).trim(); continue; }
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (event === 'chunk' && typeof data.text === 'string') callbacks.onChunk(data.text);
            else if (event === 'done') callbacks.onDone(data.topic ?? topic);
            else if (event === 'error') callbacks.onError(data.message ?? 'Unknown error');
          } catch { /* malformed SSE line */ }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async generateTeachingVignette(
    topic: string,
    seedArticles: Partial<Article>[],
    learningMode: CaseLearningMode = 'resident',
    provider: 'auto' | 'gemini' | 'mistral' = 'auto'
  ): Promise<TeachingVignetteResult> {
    const response = await this.fetchWithSession(`${API_BASE}/api/cases/teaching-vignette`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, seedArticles, learningMode, provider }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  /** Centralised HTTP error parser — call after confirming !response.ok */
  private async parseErrorResponse(response: Response): Promise<never> {
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (response.status === 429) {
      const data = await response.json().catch(() => ({})) as { retryAfter?: number };
      const secs = data.retryAfter ?? 60;
      throw new Error(`RATE_LIMITED:${secs}`);
    }
    if (response.status === 402) {
      const data = await response.json().catch(() => ({})) as { feature?: string };
      throw new Error(`UPGRADE_REQUIRED:${data.feature ?? 'premium'}`);
    }
    const err = await response.json().catch(() => ({})) as { error?: string; message?: string };
    throw new Error(err.error || err.message || `Request failed (${response.status})`);
  }

  private async withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (import.meta.env.VITE_SENTRY_DSN) {
        Sentry.withScope((scope: Scope) => {
          scope.setExtra('retryCount', retries);
          scope.setExtra('delay', delay);
          Sentry.captureException(error);
        });
      }
      // Don't retry non-retriable errors
      if (error instanceof Error &&
        (error.message === 'AUTH_REQUIRED' ||
         error.message.startsWith('RATE_LIMITED:') ||
         error.message.startsWith('UPGRADE_REQUIRED:'))) throw error;
      if (retries === 0) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.withRetry(fn, retries - 1, delay * 2);
    }
  }

  async getAIProviders(): Promise<{ providers: Array<{ id: string; name: string; models: Array<{ id: string; name: string }> }> }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/ai/providers`);
    if (!response.ok) return { providers: [] };
    return response.json();
  }

  async getAiGenerationJob(jobKey: string): Promise<{
    job: {
      jobKey: string;
      jobType: string;
      status: string;
      topic?: string | null;
      result?: unknown;
      errorMessage?: string | null;
      provider?: string | null;
      model?: string | null;
      audit?: unknown;
      attempts: number;
      createdAt: string;
      updatedAt: string;
      startedAt?: string | null;
      completedAt?: string | null;
    };
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/ai/jobs/${encodeURIComponent(jobKey)}`);
    if (!response.ok) throw new Error('Failed to load AI generation job');
    return response.json();
  }

  async getAiJobClaims(jobKey: string): Promise<{
    jobKey: string;
    count: number;
    claims: Array<{
      claimKey: string;
      claimText: string;
      validationStatus?: string;
      sourceIds?: string[];
      evidenceQuote?: string | null;
      confidence?: number | null;
    }>;
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/ai/jobs/${encodeURIComponent(jobKey)}/claims`);
    if (!response.ok) throw new Error('Failed to load AI job claims');
    return response.json();
  }

  async getQuizAttemptsForClaim(
    claimKey: string,
    limit = 40
  ): Promise<{
    claimKey: string;
    count: number;
    attempts: Array<{
      id: number;
      isCorrect: boolean;
      createdAt: string;
      questionText: string;
      userAnswer?: string;
      correctAnswer?: string;
    }>;
  }> {
    const params = new URLSearchParams({ limit: String(limit) });
    const response = await this.fetchWithSession(
      `${API_BASE}/api/learning/quiz-attempts/by-claim/${encodeURIComponent(claimKey)}?${params}`
    );
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getTeachingClaim(claimKey: string): Promise<{
    claim: import('@types').TeachingClaimReviewItem;
    synopsisSection: { path: string; label: string; content: string } | null;
    article: {
      uid: string | null;
      title: string | null;
      authors?: Array<{ name: string }>;
      doi?: string | null;
      pmid?: string | null;
      abstract?: string | null;
      journal?: string | null;
      pubdate?: string | null;
    };
  }> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/teaching-claims/${encodeURIComponent(claimKey)}`
    );
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async findClaimContradictions(
    claimKey: string,
    topic: string,
    claimText: string
  ): Promise<{ claimKey: string; query: string; articles: Article[]; count: number }> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/teaching-claims/${encodeURIComponent(claimKey)}/find-contradictions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, claimText }),
      }
    );
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async generateJournalClub(
    topic: string,
    articles: import('@types').Article[],
    provider: 'auto' | 'gemini' | 'mistral' = 'auto'
  ): Promise<{
    topic: string;
    provider: string;
    pack: Record<string, unknown>;
    memoryContext?: { teachingObjects: number; groundedClaims: number };
    disclaimer?: string;
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/ai/journal-club`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, articles, provider }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  // ── Billing ──────────────────────────────────────────────────────────────

  async getBillingStatus(): Promise<{
    status: string; plan: string; role: string;
    currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean;
    stripeConfigured: boolean;
    plans: Array<{ id: string; name: string; amount: number; currency: string; interval: string; features: string[]; available: boolean }>;
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/billing/status`);
    if (!response.ok) throw new Error('Failed to fetch billing status');
    return response.json();
  }

  async createCheckoutSession(plan: string): Promise<{ url: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/billing/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async openBillingPortal(): Promise<{ url: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/billing/portal`, {
      method: 'POST',
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  // ── Quality & Retraction ─────────────────────────────────────────────────

  async getQualityReport(articleId: string): Promise<{ quality: import('@types').QualityScore }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/articles/${articleId}/quality`);
    if (!response.ok) throw new Error('Failed to fetch quality report');
    return response.json();
  }

  async checkRetraction(articleId: string, doi?: string, pmid?: string): Promise<{ retraction: import('@types').RetractionStatus }> {
    const params = new URLSearchParams();
    if (doi) params.set('doi', doi);
    if (pmid) params.set('pmid', pmid);
    const response = await this.fetchWithSession(`${API_BASE}/api/articles/${articleId}/retraction?${params}`);
    if (!response.ok) throw new Error('Failed to check retraction status');
    return response.json();
  }

  async batchCheckRetractions(articles: Array<{ uid: string; doi?: string; pmid?: string }>): Promise<{ results: Record<string, import('@types').RetractionStatus> }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/articles/retraction/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articles }),
    });
    if (!response.ok) throw new Error('Failed to batch check retractions');
    return response.json();
  }

  async checkGuidelineAlignment(topic: string, synthesisConsensus: string, articles: Article[]): Promise<import('@types').GuidelineAlignment> {
    const response = await this.fetchWithSession(`${API_BASE}/api/guidelines/align`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, synthesisConsensus, articles }),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Guideline alignment failed');
    return response.json();
  }

  async generateGrantSection(researchQuestion: string, articles: Article[], citationStyle?: string): Promise<import('@types').GrantResult> {
    const response = await this.fetchWithSession(`${API_BASE}/api/ai/grant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ researchQuestion, articles, citationStyle }),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Grant writing failed');
    return response.json();
  }

  // ── Collaboration ────────────────────────────────────────────────────────

  async getCollections(): Promise<{ collections: CollectionSummary[] }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/collaboration/collections`);
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to fetch collections');
    return response.json();
  }

  async createCollection(name: string, description?: string): Promise<{ collection: CollectionSummary }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/collaboration/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to create collection');
    return response.json();
  }

  async addArticleToCollection(collectionId: string, article: Article): Promise<void> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/collaboration/collections/${collectionId}/articles`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article }),
      }
    );
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to add article to collection');
  }

  async deleteCollection(collectionId: string): Promise<void> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/collaboration/collections/${collectionId}`,
      { method: 'DELETE' }
    );
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to delete collection');
  }

  // ── Team Workspace ───────────────────────────────────────────────────────

  async getTeams(): Promise<{ teams: import('@types').Team[] }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/teams`);
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to fetch teams');
    return response.json();
  }

  async createTeam(name: string): Promise<{ team: import('@types').Team }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to create team');
    return response.json();
  }

  async updateTeam(teamId: string, updates: { name?: string; plan?: string; memberLimit?: number }): Promise<{ team: import('@types').Team }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/teams/${teamId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to update team');
    return response.json();
  }

  async getTeam(teamId: string): Promise<{ team: import('@types').Team; members: import('@types').TeamMember[]; role: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/teams/${teamId}`);
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to fetch team');
    return response.json();
  }

  async inviteTeamMember(teamId: string, email: string, role?: string): Promise<{ invitation: { email: string; role: string; token: string; expiresAt: string } }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/teams/${teamId}/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to invite member');
    return response.json();
  }

  async acceptInvitation(token: string): Promise<{ success: boolean; teamId: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/teams/invitations/${token}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to accept invitation');
    return response.json();
  }

  async getTeamCollections(teamId: string): Promise<{ collections: import('@types').TeamCollection[] }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/teams/${teamId}/collections`);
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to fetch team collections');
    return response.json();
  }

  async createTeamCollection(teamId: string, name: string, description?: string): Promise<{ collection: import('@types').TeamCollection }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/teams/${teamId}/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to create team collection');
    return response.json();
  }

  async addArticleToTeamCollection(teamId: string, collectionId: string, article: Article): Promise<void> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/teams/${teamId}/collections/${collectionId}/articles`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article }),
      }
    );
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to add article to team collection');
  }

  async deleteTeamCollection(teamId: string, collectionId: string): Promise<void> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/teams/${teamId}/collections/${collectionId}`,
      { method: 'DELETE' }
    );
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to delete team collection');
  }

  async getTeamCollection(teamId: string, collectionId: string): Promise<{ collection: import('@types').TeamCollection & { articles?: Article[] } }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/teams/${teamId}/collections/${collectionId}`);
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to fetch team collection');
    return response.json();
  }

  async removeArticleFromTeamCollection(teamId: string, collectionId: string, articleId: string): Promise<void> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/teams/${teamId}/collections/${collectionId}/articles/${encodeURIComponent(articleId)}`,
      { method: 'DELETE' }
    );
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to remove article from collection');
  }

  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    const response = await this.fetchWithSession(`${API_BASE}/api/teams/${teamId}/members/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to remove team member');
  }

  async updateTeamMemberRole(teamId: string, userId: string, role: 'member' | 'admin'): Promise<void> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/teams/${teamId}/members/${encodeURIComponent(userId)}/role`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      }
    );
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to update member role');
  }

  // ── Guideline Memory ─────────────────────────────────────────────────────

  async getGuidelinesForTopic(topic: string): Promise<{ topic: string; guidelines: import('@types').GuidelineEntry[] }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/guidelines?topic=${encodeURIComponent(topic)}`);
    if (!response.ok) throw new Error('Failed to fetch guidelines');
    return response.json();
  }

  async getGuidelineSources(): Promise<{ sources: import('@types').GuidelineSource[] }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/guidelines/sources`);
    if (!response.ok) throw new Error('Failed to fetch guideline sources');
    return response.json();
  }

  /** Public browse of stored guideline memory (same rows used in synthesis); excludes superseded. */
  async browseGuidelines(options: { query?: string; status?: string; sourceBody?: string; limit?: number; offset?: number } = {}): Promise<import('../types').GuidelineListResponse> {
    const params = new URLSearchParams();
    if (options.query) params.set('query', options.query);
    if (options.status) params.set('status', options.status);
    if (options.sourceBody) params.set('sourceBody', options.sourceBody);
    if (options.limit != null) params.set('limit', String(options.limit));
    if (options.offset != null) params.set('offset', String(options.offset));
    const response = await this.fetchWithSession(`${API_BASE}/api/guidelines/browse?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to browse guidelines');
    return response.json();
  }

  async runAggregateMemory(): Promise<{ topics: number; message: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/aggregate-memory`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to run aggregate memory');
    return response.json();
  }

  async getAggregateMemoryStats(): Promise<{ topicsWithAttempts: number; totalAttempts: number; topicsWithMemory: number; topTopics: { normalized_topic: string; attempts: number; users: number }[] }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/aggregate-memory/stats`);
    if (!response.ok) throw new Error('Failed to get aggregate memory stats');
    return response.json();
  }

  async fetchPracticePool(options: { count?: number; difficulty?: string; type?: string } = {}): Promise<{ questions: unknown[]; total: number }> {
    const params = new URLSearchParams();
    if (options.count) params.set('count', String(options.count));
    if (options.difficulty) params.set('difficulty', options.difficulty);
    if (options.type) params.set('type', options.type);
    const response = await this.fetchWithSession(`${API_BASE}/api/quiz/pool?${params.toString()}`);
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to load practice pool');
    return response.json();
  }

  async listGuidelines(options: { query?: string; status?: string; sourceBody?: string; limit?: number; offset?: number } = {}): Promise<import('../types').GuidelineListResponse> {
    const params = new URLSearchParams();
    if (options.query) params.set('query', options.query);
    if (options.status) params.set('status', options.status);
    if (options.sourceBody) params.set('sourceBody', options.sourceBody);
    if (options.limit) params.set('limit', String(options.limit));
    if (options.offset) params.set('offset', String(options.offset));
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/guidelines?${params.toString()}`);
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to list guidelines');
    return response.json();
  }

  async updateGuideline(id: number, payload: Record<string, unknown>) {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/guidelines/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to update guideline');
    return response.json();
  }

  async reviewGuideline(id: number) {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/guidelines/${id}/review`, {
      method: 'POST',
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to review guideline');
    return response.json();
  }

  async staleGuideline(id: number) {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/guidelines/${id}/stale`, {
      method: 'POST',
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to mark guideline stale');
    return response.json();
  }

  // ==========================================
  // Learning Agent APIs
  // ==========================================

  async getLearningProfile(): Promise<{ profile: import('../types').LearningProfile | null }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/profile`);
    if (response.status === 404) return { profile: null };
    if (!response.ok) throw new Error('Failed to load learning profile');
    return response.json();
  }

  async saveLearningProfile(data: Partial<import('../types').LearningProfile>): Promise<{ profile: import('../types').LearningProfile }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to save learning profile');
    return response.json();
  }

  async getTopicMemory(topic: string): Promise<{ memory: import('../types').UserTopicMemory | null }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/topic-memory/${encodeURIComponent(topic)}`);
    if (!response.ok) throw new Error('Failed to load topic memory');
    return response.json();
  }

  async listTopicMemory(limit = 20, offset = 0): Promise<{ memories: import('../types').UserTopicMemory[] }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/topic-memory?limit=${limit}&offset=${offset}`);
    if (!response.ok) throw new Error('Failed to load topic memories');
    return response.json();
  }

  async getTopicProposals(topic: string): Promise<{ proposals: import('../types').TopicKnowledgeProposal[]; total: number }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/topic-proposals/${encodeURIComponent(topic)}`);
    if (!response.ok) throw new Error('Failed to load topic proposals');
    return response.json();
  }

  async submitQuizAttempt(data: import('../types').QuizAttemptSubmission): Promise<{
    saved: number;
    mastery: { overall: number; byType: Record<string, number> };
    remediation?: {
      missedCount: number;
      targets: Array<{
        outlineNodeId: string | null;
        questionType: string;
        sourceArticleUid: string | null;
        sourceArticleTitle: string | null;
        prompt: string;
      }>;
      nextReviewAt: string;
    };
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/quiz-attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to submit quiz attempt');
    return response.json();
  }

  async createStudyRun(
    topic: string,
    curriculumTopicId?: number
  ): Promise<{ run: import('../types').StudyRun; outline: import('../types').StudyRunOutline; resumed?: boolean }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/study-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, ...(curriculumTopicId != null ? { curriculumTopicId } : {}) }),
    });
    if (!response.ok) throw new Error('Failed to start study run');
    return response.json();
  }

  async listCurricula(): Promise<{ curricula: import('../types').CurriculumListItem[] }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/curricula`);
    if (!response.ok) throw new Error('Failed to load curricula');
    return response.json();
  }

  async getCurriculum(slug: string): Promise<{
    curriculum: import('../types').CurriculumDetail;
    progress: Record<number, import('../types').TopicCurriculumProgress>;
    examSummary: import('../types').CurriculumExamSummary | null;
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/curricula/${encodeURIComponent(slug)}`);
    if (!response.ok) throw new Error('Failed to load curriculum');
    return response.json();
  }

  async getStudyRuns(status = 'active'): Promise<{ runs: import('../types').StudyRun[] }> {
    const params = new URLSearchParams({ status });
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/study-runs?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to load study runs');
    return response.json();
  }

  async getStudyRun(id: number): Promise<{ run: import('../types').StudyRun; outline: import('../types').StudyRunOutline }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/study-runs/${id}`);
    if (!response.ok) throw new Error('Failed to load study run');
    return response.json();
  }

  async updateStudyRun(id: number, data: Partial<Pick<import('../types').StudyRun, 'status' | 'progress' | 'nodeCoverage'>>): Promise<{ run: import('../types').StudyRun }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/study-runs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update study run');
    return response.json();
  }

  async getQuizHistory(topic?: string): Promise<{ attempts: import('../types').QuizAttempt[] }> {
    const url = topic ? `${API_BASE}/api/learning/quiz-history/${encodeURIComponent(topic)}` : `${API_BASE}/api/learning/quiz-history`;
    const response = await this.fetchWithSession(url);
    if (!response.ok) throw new Error('Failed to load quiz history');
    return response.json();
  }

  async createAgentSession(topic: string, title?: string): Promise<{ conversation: import('../types').AgentConversation }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/agent/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, title }),
    });
    if (!response.ok) throw new Error('Failed to create agent session');
    return response.json();
  }

  async getAgentSessions(topic?: string): Promise<{ conversations: import('../types').AgentConversation[] }> {
    const params = topic ? `?topic=${encodeURIComponent(topic)}` : '';
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/agent/conversations${params}`);
    if (!response.ok) throw new Error('Failed to load agent sessions');
    return response.json();
  }

  async getAgentSession(id: number): Promise<{ conversation: import('../types').AgentConversation }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/agent/conversations/${id}`);
    if (!response.ok) throw new Error('Failed to load agent session');
    return response.json();
  }

  async appendAgentMessages(id: number, messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp?: string }>): Promise<{ conversation: import('../types').AgentConversation }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/agent/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    if (!response.ok) throw new Error('Failed to append agent messages');
    return response.json();
  }

  async deleteAgentSession(id: number): Promise<{ success: boolean }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/agent/conversations/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete agent session');
    return response.json();
  }

  async getTopicMastery(topic?: string): Promise<{ mastery: import('../types').UserTopicMastery | import('../types').UserTopicMastery[] }> {
    const url = topic ? `${API_BASE}/api/learning/mastery/${encodeURIComponent(topic)}` : `${API_BASE}/api/learning/mastery`;
    const response = await this.fetchWithSession(url);
    if (!response.ok) throw new Error('Failed to load topic mastery');
    return response.json();
  }

  async getCompetencyRecord(topic: string): Promise<{
    topic: string;
    overallAccuracy: number | null;
    totalAttempts: number;
    totalCorrect: number;
    sessionCount: number;
    firstQuizDate: string | null;
    lastQuizDate: string | null;
    sessionSummaries: Array<{ date: string; total: number; correct: number; accuracyPct: number }>;
    papersSeen: Array<{ uid: string; missCount: number; hitCount: number }>;
    weakAreas: Array<{ type: string; accuracyPct: number; attempted: number }>;
    evidenceBasis: Array<{ title: string; whySeminal?: string; evidenceStrength?: string }>;
    mastery: import('../types').UserTopicMastery | null;
    topicMemoryTier: string;
    searchCount: number;
    evidenceUpdatedSinceLastQuiz: boolean;
    knowledgeUpdatedAt: string | null;
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/competency/${encodeURIComponent(topic)}`);
    if (!response.ok) throw new Error('Failed to load competency record');
    return response.json();
  }

  async postQuizFeedback(payload: { topic: string; outlineNodeId: string; feedbackType: 'confusing' | 'clear' }): Promise<void> {
    await this.fetchWithSession(`${API_BASE}/api/learning/quiz-feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async getDueReviews(): Promise<{ total: number; groups: Array<{ topic: string; normalizedTopic: string; cards: Array<{ outlineNodeId: string; outlineLabel: string | null; intervalDays: number; repetitions: number; dueAt: string }> }> }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/due-reviews`);
    if (!response.ok) throw new Error('Failed to load due reviews');
    return response.json();
  }

  async getDueReviewCount(): Promise<{ count: number }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/due-reviews/count`);
    if (!response.ok) return { count: 0 };
    return response.json();
  }

  async getSpacedRepTopics(): Promise<{ topics: import('../types').SpacedRepTopicGroup[] }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/spaced-rep/topics`);
    if (!response.ok) throw new Error('Failed to load spaced repetition topics');
    return response.json();
  }

  async getMasteryCohortBenchmark(topic: string): Promise<{ cohort: import('../types').MasteryCohortBenchmark }> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/learning/mastery/${encodeURIComponent(topic)}/cohort`,
    );
    if (!response.ok) throw new Error('Failed to load cohort benchmark');
    return response.json();
  }

  async getLearningRecommendations(limit = 8): Promise<{ recommendations: LearningRecommendation[]; generatedAt: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/recommendations?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to load recommendations');
    return response.json();
  }

  async getLearningDashboard(): Promise<import('../types').LearningDashboard> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/dashboard`);
    if (!response.ok) throw new Error('Failed to load learning dashboard');
    return response.json();
  }

  async getLearningInsights(): Promise<{ insights: import('../types').LearningInsight[]; profile: import('../types').LearningProfile | null }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/insights`);
    if (!response.ok) throw new Error('Failed to load insights');
    return response.json();
  }

  async updateLearningProfile(data: Partial<import('../types').LearningProfile>): Promise<{ profile: import('../types').LearningProfile }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update profile');
    return response.json();
  }

  async submitCaseAttempt(data: Omit<import('../types').CaseAttempt, 'id' | 'userId' | 'normalizedTopic' | 'createdAt'>): Promise<{ attempt: import('../types').CaseAttempt }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/case-attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to submit case attempt');
    return response.json();
  }

  async getCaseHistory(topic?: string): Promise<{ attempts: import('../types').CaseAttempt[] }> {
    const params = topic ? `?topic=${encodeURIComponent(topic)}` : '';
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/case-history${params}`);
    if (!response.ok) throw new Error('Failed to load case history');
    return response.json();
  }

  async logCpdSession(data: {
    activityType: import('../types').CpdActivityType;
    topic?: string;
    durationMinutes?: number;
    questionCount?: number;
    accuracyPct?: number | null;
    notes?: string;
    source?: 'auto' | 'manual';
  }): Promise<{ id: number }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/cpd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to log CPD session');
    return response.json();
  }

  async getCpdSessions(params: { startDate?: string; endDate?: string; activityType?: string; limit?: number } = {}): Promise<{ sessions: import('../types').CpdSession[] }> {
    const q = new URLSearchParams();
    if (params.startDate) q.set('startDate', params.startDate);
    if (params.endDate) q.set('endDate', params.endDate);
    if (params.activityType) q.set('activityType', params.activityType);
    if (params.limit) q.set('limit', String(params.limit));
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/cpd?${q.toString()}`);
    if (!response.ok) throw new Error('Failed to load CPD sessions');
    return response.json();
  }

  async getCpdSummary(year?: number): Promise<{ summary: import('../types').CpdSummary }> {
    const q = year ? `?year=${year}` : '';
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/cpd/summary${q}`);
    if (!response.ok) throw new Error('Failed to load CPD summary');
    return response.json();
  }

  async downloadCpdPdf(year: number): Promise<Blob> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/cpd/export-pdf?year=${year}`);
    if (!response.ok) {
      let msg = 'Failed to export CPD PDF';
      try {
        const j = await response.json();
        if (j.error) msg = j.error;
      } catch { /* ignore */ }
      throw new Error(msg);
    }
    return response.blob();
  }

  async createPortfolioReflection(data: {
    reflectionType: 'CBD' | 'mini-CEX' | 'DOPS';
    sourceType?: 'quiz' | 'case' | 'manual';
    topic: string;
    whatHappened: string;
    whatILearned: string;
    whatIWillChange: string;
    evidenceUsed: string;
    supervisorDiscussion?: string;
    status?: 'draft' | 'submitted';
    linkedCpdSessionId?: number | null;
  }): Promise<{ reflection: import('../types').PortfolioReflection }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/reflections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to save portfolio reflection');
    return response.json();
  }

  async getPortfolioReflections(params: { topic?: string; status?: string; limit?: number } = {}): Promise<{ reflections: import('../types').PortfolioReflection[] }> {
    const q = new URLSearchParams();
    if (params.topic) q.set('topic', params.topic);
    if (params.status) q.set('status', params.status);
    if (params.limit) q.set('limit', String(params.limit));
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/reflections?${q.toString()}`);
    if (!response.ok) throw new Error('Failed to load portfolio reflections');
    return response.json();
  }

  async draftPortfolioReflection(reflectionType: 'CBD' | 'mini-CEX' | 'DOPS', topic: string): Promise<{
    draft: { whatHappened: string; whatILearned: string; whatIWillChange: string; evidenceUsed: string };
    reflectionType: string;
    topic: string;
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/reflections/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reflectionType, topic }),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to generate reflection draft');
    return response.json();
  }

  async updatePortfolioReflection(id: number, data: Partial<{
    reflectionType: 'CBD' | 'mini-CEX' | 'DOPS';
    sourceType: 'quiz' | 'case' | 'manual';
    topic: string;
    whatHappened: string;
    whatILearned: string;
    whatIWillChange: string;
    evidenceUsed: string;
    supervisorDiscussion: string;
    status: 'draft' | 'discussed' | 'exported' | 'submitted';
    linkedCpdSessionId: number | null;
  }>): Promise<{ reflection: import('../types').PortfolioReflection }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/reflections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update portfolio reflection');
    return response.json();
  }

  clearCache(): void {
    this.cache.clear();
  }

  async getTopicCrosslinks(topic: string): Promise<{
    crosslinks: Array<{
      topic: string;
      normalizedTopic: string;
      linkType: 'shared_paper' | 'ai_inferred';
      sharedEvidence: { pmid?: string; title?: string } | null;
      strength: number;
      aiRationale: string | null;
      createdAt: string;
    }>;
  }> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/topic/${encodeURIComponent(topic)}/crosslinks`
    );
    if (!response.ok) throw new Error('Failed to load topic cross-links');
    return response.json();
  }

  private setCache<T>(key: string, value: T, ttlMs?: number): void {
    this.cache.set(key, value, ttlMs);
  }

  private getCache<T>(key: string): T | null {
    const value = this.cache.get(key);
    return value !== undefined ? (value as T) : null;
  }
}

export const api = new MedicalResearchAPI();
export default api;
