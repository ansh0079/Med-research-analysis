import { API_BASE, BaseApiClient } from './core';
import { yearRangeToPubMedFilter } from '@utils/searchStudyFilters';
import type {
  Article,
  SearchFilters,
  SearchResponse,
} from '@types';

export class SearchApi extends BaseApiClient {
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
    if (!response.ok) await this.parseErrorResponse(response);
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
    if (!response.ok) await this.parseErrorResponse(response);
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
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async search(
    query: string,
    filters: SearchFilters = {},
    opts: { vector?: boolean; previousQueries?: string[]; intelligence?: 'sync' | 'async'; signal?: AbortSignal } = {}
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
    if (filters.studyTypes && filters.studyTypes.length > 0) {
      params.set('parsedStudyTypes', JSON.stringify(filters.studyTypes));
    }
    const yearFilters = yearRangeToPubMedFilter(filters.yearRange);
    if (yearFilters.length > 0) {
      params.set('parsedYearFilters', JSON.stringify(yearFilters));
    }
    if (opts.previousQueries && opts.previousQueries.length > 0) {
      params.set('previousQueries', JSON.stringify(opts.previousQueries));
    }
    params.set('intelligence', opts.intelligence === 'sync' ? 'sync' : 'async');

    const response = await this.fetchWithSession(`${API_BASE}/api/search?${params}`, undefined, opts.signal);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json() as Promise<SearchResponse>;
  }

  async fetchSearchIntelligence(
    query: string,
    articles: Article[],
    filters: SearchFilters = {},
    opts: { previousQueries?: string[]; ranking?: SearchResponse['ranking'] } = {}
  ): Promise<Pick<SearchResponse, 'agentGuidance' | 'knowledgeAvailable' | 'topicIntelligence' | 'learningContext' | 'learnerContext'> & { queryIntent?: string }> {
    const sources = filters.sources || ['pubmed', 'openalex'];
    const response = await this.fetchWithSession(`${API_BASE}/api/search/intelligence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: query,
        articles,
        sources: sources.join(','),
        previousQueries: opts.previousQueries?.length ? opts.previousQueries.slice(-5) : undefined,
        ranking: opts.ranking?.length ? opts.ranking.slice(0, 100) : undefined,
      }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
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

  async unifiedSearch(
    query: string,
    filters: SearchFilters = {}
  ): Promise<{ articles: Article[]; count: number }> {
    const { articles, count } = await this.search(query, filters, { vector: false });
    return { articles, count };
  }

  async getCitations(
    semanticId: string,
    options: { limit?: number } = {}
  ): Promise<{ citations: Article[]; references: Article[]; relations?: import('@types').CitationRelation[]; cached?: boolean }> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithSession(
      `${API_BASE}/api/citations/${encodeURIComponent(semanticId)}${suffix}`
    );
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async vectorSearch(
    query: string,
    options: {
      limit?: number;
      minScore?: number;
      userEmbedding?: number[];
      userProfileText?: string;
      queryWeight?: number;
    } = {}
  ): Promise<{
    articles: Article[];
    scores: number[];
    semantic?: {
      queryEmbeddingUsed: boolean;
      userEmbeddingUsed: boolean;
      queryWeight: number;
    };
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/search/vector`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, ...options }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
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
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async recordSearchFeedback(
    articleUid: string,
    feedbackType: 'helpful' | 'not_helpful',
    reason?: string,
    searchId?: number,
    decisionId?: number
  ): Promise<void> {
    const response = await this.fetchWithSession(`${API_BASE}/api/search/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleUid, feedbackType, reason, searchId, decisionId }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
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
    dwellMs?: number,
    elapsedMs?: number,
    decisionId?: number
  ): Promise<void> {
    try {
      await this.fetchWithSession(`${API_BASE}/api/search/interaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchId, articleUid, interactionType, dwellMs, elapsedMs, decisionId }),
      });
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to log interaction', err);
    }
  }

  async inferTopicForArticle(
    article: Article,
    searchTopic?: string,
  ): Promise<{
    displayTopic: string;
    normalizedTopic: string;
    canonicalTopic: string;
    source: string;
    confidence: number;
    reason: string;
    candidates: Array<{ displayTopic: string; source: string; confidence: number }>;
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/topics/infer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article, searchTopic: searchTopic || undefined }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
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
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }
}
