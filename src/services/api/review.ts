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
  ConsortResult,
  ArticleComparison,
  ROBResult,
  GRADETable,
} from '@types';

export class ReviewApi extends BaseApiClient {
  async listReviews(options?: { limit?: number; offset?: number }): Promise<{ reviews: ReviewProject[]; limit: number; offset: number }> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    const response = await this.fetchWithSession(`${API_BASE}/api/reviews?${params}`);
    if (!response.ok) throw new Error('Failed to list reviews');
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
    provider: 'auto' | 'claude' | 'gemini' | 'mistral' = 'auto'
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
    provider: 'auto' | 'claude' | 'gemini' | 'mistral' = 'auto'
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
    provider: 'auto' | 'claude' | 'gemini' | 'mistral' = 'auto'
  ): Promise<{ rob: ROBResult; provider: string; model: string; articleId: string }> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/reviews/${encodeURIComponent(reviewId)}/articles/${encodeURIComponent(articleId)}/rob`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider }) }
    );
    if (!response.ok) throw new Error('Failed to assess risk of bias');
    return response.json();
  }

  async compareArticles(
    articleA: Article,
    articleB: Article,
    topic?: string,
    provider: 'auto' | 'claude' | 'gemini' | 'mistral' = 'auto'
  ): Promise<{ comparison: ArticleComparison; articleIdA: string; articleIdB: string; provider: string; model: string; cached?: boolean }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/ai/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleA, articleB, topic, provider }),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to compare articles');
    return response.json();
  }

  async assessConsort(
    article: Article,
    provider: 'auto' | 'claude' | 'gemini' | 'mistral' = 'auto'
  ): Promise<{ consort: ConsortResult; provider: string; model: string; articleId: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/ai/consort`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article, provider }),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to assess CONSORT adherence');
    return response.json();
  }

  async generateGradeTable(
    reviewId: string,
    provider: 'auto' | 'claude' | 'gemini' | 'mistral' = 'auto'
  ): Promise<{ gradeTable: GRADETable; provider: string; model: string; includedCount: number }> {
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
    provider?: 'auto' | 'claude' | 'gemini' | 'mistral';
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

  async createAlert(
    query: string,
    sources: string[],
    frequency: 'daily' | 'weekly' | 'monthly',
    options?: { author?: string; journal?: string }
  ): Promise<{ alert: SavedAlert }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, sources, frequency, author: options?.author, journal: options?.journal }),
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
}
