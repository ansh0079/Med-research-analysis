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

export class ReviewApi extends BaseApiClient {
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
}
