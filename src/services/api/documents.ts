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
import * as Sentry from '@sentry/react';

export class DocumentsApi extends BaseApiClient {
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

  protected async _extractPdfText(
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

  async getQualityMetrics(days = 30): Promise<Record<string, unknown>> {
    const response = await this.fetchWithSession(`${API_BASE}/api/analytics/quality-metrics?days=${days}`);
    if (!response.ok) throw new Error('Failed to fetch quality metrics');
    return response.json();
  }

  async submitQualityFeedback(payload: {
    productType: 'synthesis' | 'case' | 'agent' | 'search';
    topic?: string;
    factualAccuracy?: number;
    completeness?: number;
    clinicalUsefulness?: number;
    timeSavedMinutes?: number;
    comment?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const response = await this.fetchWithSession(`${API_BASE}/api/analytics/quality-feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to submit quality feedback');
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
}
