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

  async search(
    query: string,
    filters: SearchFilters = {},
    opts: { vector?: boolean; previousQueries?: string[]; intelligence?: 'sync' | 'async' } = {}
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
    if (filters.parsedQuery?.yearFilters && filters.parsedQuery.yearFilters.length > 0) {
      params.set('parsedYearFilters', JSON.stringify(filters.parsedQuery.yearFilters));
    }
    if (filters.parsedQuery?.processedQuery) {
      params.set('processedQuery', filters.parsedQuery.processedQuery);
    }
    if (opts.previousQueries && opts.previousQueries.length > 0) {
      params.set('previousQueries', JSON.stringify(opts.previousQueries));
    }
    params.set('intelligence', opts.intelligence === 'sync' ? 'sync' : 'async');

    const response = await this.fetchWithSession(`${API_BASE}/api/search?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    const data = await response.json() as SearchResponse;
    return data;
  }

  async fetchSearchIntelligence(
    query: string,
    articles: Article[],
    filters: SearchFilters = {},
    opts: { previousQueries?: string[] } = {}
  ): Promise<Pick<SearchResponse, 'agentGuidance' | 'knowledgeAvailable' | 'topicIntelligence' | 'learningContext'> & { queryIntent?: string }> {
    const sources = filters.sources || ['pubmed', 'openalex'];
    const response = await this.fetchWithSession(`${API_BASE}/api/search/intelligence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: query,
        articles,
        sources: sources.join(','),
        previousQueries: opts.previousQueries?.length ? opts.previousQueries.slice(-5) : undefined,
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
}
