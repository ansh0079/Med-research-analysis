import { useCallback, useRef, useEffect, useState } from 'react';
import { api } from '@services/api';
import { handleAsyncError } from '@utils/handleAsyncError';
import { useSearchMeta, useSearchQuery } from '@contexts/SearchContext';
import type { AgentGuidance, Article, LearnerContextSummary, LowRecallLearning, ProactiveAlert, ProactiveEvidenceAlert, SearchFilters } from '@types';
import { useAuth } from '@contexts/AuthContext';
import { useAnalytics } from './useAnalytics';
import { usePolling } from './usePolling';
import { storeSearchAttribution, storeSearchAttributionFromArticles } from '@utils/searchAttribution';
import type { SearchResponse } from '@types';

const POLL_DELAYS = [8000, 12000, 18000]; // 8 s, then 12 s, then 18 s — three attempts
const ENRICHMENT_POLL_DELAYS = [2000, 3000, 4000, 5000, 6000, 8000, 10000]; // up to ~38 s total

function searchRequestKey(query: string, filters: SearchFilters): string {
  return JSON.stringify({
    query: query.trim().toLowerCase(),
    sources: filters.sources || ['pubmed', 'openalex'],
    maxResults: filters.maxResults ?? 20,
    specificity: filters.specificity || null,
    studyTypes: filters.studyTypes || [],
    yearRange: filters.yearRange || null,
    useVectorSearch: filters.useVectorSearch !== false,
  });
}

export function useSearch() {
  const {
    setResults,
    setLoading,
    setError,
    setDetectedTopic,
    addToSearchHistory,
    searchHistory,
    loading,
    error,
    results,
  } = useSearchQuery();
  const {
    setAgentGuidance,
    setTopicIntelligence,
    setClinicalAnswer,
    setCommunityInsight,
    setTopicGuideStatus,
  } = useSearchMeta();
  const { trackSearch, trackFeatureUsage } = useAnalytics();

  const [knowledgeDriftAlerts, setKnowledgeDriftAlerts] = useState<ProactiveEvidenceAlert[]>([]);
  const { isAuthenticated } = useAuth();

  const refreshKnowledgeDriftAlerts = useCallback(() => {
    if (!isAuthenticated) {
      setKnowledgeDriftAlerts([]);
      return;
    }
    void api.knowledge.listEvidenceAlerts({ limit: 30, unreadOnly: true })
      .then((r) => setKnowledgeDriftAlerts(r.alerts || []))
      .catch((err) => handleAsyncError(err, 'useSearch/listEvidenceAlerts'));
  }, [isAuthenticated]);

  useEffect(() => {
    refreshKnowledgeDriftAlerts();
  }, [refreshKnowledgeDriftAlerts]);

  const dismissKnowledgeDriftAlert = useCallback(async (id: number) => {
    await api.knowledge.markEvidenceAlertRead(id);
    setKnowledgeDriftAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);
  const [lastSearchId, setLastSearchId] = useState<number | null>(null);
  const [searchCompletedAt, setSearchCompletedAt] = useState<number | null>(null);
  const [proactiveAlert, setProactiveAlert] = useState<ProactiveAlert | null>(null);
  const [learnerContext, setLearnerContext] = useState<LearnerContextSummary | null>(null);
  const [aiEnrichmentLoading, setAiEnrichmentLoading] = useState(false);
  const [aiEnrichmentFailed, setAiEnrichmentFailed] = useState(false);
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  const [lowRecallLearning, setLowRecallLearning] = useState<LowRecallLearning | null>(null);
  const [searchTelemetry, setSearchTelemetry] = useState<import('@types').SearchResponse['searchTelemetry'] | null>(null);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSearchRef = useRef<{ key: string; query: string; time: number } | null>(null);
  const lastSuccessfulSearchRef = useRef<{ key: string; response: SearchResponse } | null>(null);

  // Topic-knowledge polling --------------------------------------------------
  const [pollTopic, setPollTopic] = useState<string | null>(null);
  const topicPollRequestIdRef = useRef(0);

  const topicPoll = usePolling({
    delays: POLL_DELAYS,
    fetcher: useCallback(async () => {
      if (!pollTopic) throw new Error('no topic');
      return api.knowledge.getTopicKnowledge(pollTopic);
    }, [pollTopic]),
    isComplete: useCallback((result: Awaited<ReturnType<typeof api.knowledge.getTopicKnowledge>>) => {
      return Boolean(result.found && result.agentGuidance);
    }, []),
    onSuccess: useCallback((result: { found: boolean; agentGuidance: AgentGuidance | null }) => {
      if (topicPollRequestIdRef.current !== requestIdRef.current) return;
      setAgentGuidance(result.agentGuidance);
      setTopicGuideStatus('ready');
      trackFeatureUsage('topic_guide_ready', { source: 'poll', topic: (pollTopic || '').slice(0, 200) });
    }, [setAgentGuidance, setTopicGuideStatus, trackFeatureUsage, pollTopic]),
    onTimeout: useCallback(() => {
      if (topicPollRequestIdRef.current !== requestIdRef.current) return;
      setTopicGuideStatus('pending');
      trackFeatureUsage('topic_guide_pending', { topic: (pollTopic || '').slice(0, 200) });
    }, [setTopicGuideStatus, trackFeatureUsage, pollTopic]),
  });

  // AI-enrichment polling ----------------------------------------------------
  const [enrichKey, setEnrichKey] = useState<string | null>(null);
  const enrichPollRequestIdRef = useRef(0);

  const enrichmentPoll = usePolling({
    delays: ENRICHMENT_POLL_DELAYS,
    fetcher: useCallback(async () => {
      if (!enrichKey) throw new Error('no key');
      return api.search.getAiEnrichment(enrichKey);
    }, [enrichKey]),
    isComplete: useCallback((enrichment: Awaited<ReturnType<typeof api.search.getAiEnrichment>>) => {
      return enrichment.status === 'ready' || enrichment.status === 'failed';
    }, []),
    onSuccess: useCallback((enrichment: {
      status: 'pending' | 'ready' | 'failed';
      clinicalAnswer?: import('@types').ClinicalAnswer | null;
      consensusSynopsis?: import('@types').TopicIntelligence['consensusSynopsis'] | null;
    }) => {
      if (enrichPollRequestIdRef.current !== requestIdRef.current) return;
      if (enrichment.status === 'ready') {
        setAiEnrichmentFailed(false);
        if (enrichment.clinicalAnswer) setClinicalAnswer(enrichment.clinicalAnswer);
        if (enrichment.consensusSynopsis) {
          const cs = enrichment.consensusSynopsis;
          setTopicIntelligence((prev) =>
            prev
              ? {
                  ...prev,
                  consensusSynopsis: cs ?? undefined,
                  actions: {
                    ...prev.actions,
                    canGenerateConsensusSynopsis: cs?.status === 'generated',
                  },
                }
              : prev
          );
        }
      } else if (enrichment.status === 'failed') {
        setAiEnrichmentFailed(true);
      }
      setAiEnrichmentLoading(false);
    }, [setClinicalAnswer, setTopicIntelligence]),
    onTimeout: useCallback(() => {
      if (enrichPollRequestIdRef.current !== requestIdRef.current) return;
      setAiEnrichmentLoading(false);
    }, [setAiEnrichmentLoading]),
  });

  // Cancel all polling when a new search starts or on unmount
  const cancelPoll = useCallback(() => {
    topicPoll.stop();
    enrichmentPoll.stop();
    setPollTopic(null);
    setEnrichKey(null);
  }, [topicPoll, enrichmentPoll]);

  const cancelPollRef = useRef(cancelPoll);
  cancelPollRef.current = cancelPoll;
  const searchHistoryRef = useRef(searchHistory);
  searchHistoryRef.current = searchHistory;
  const topicPollRef = useRef(topicPoll);
  topicPollRef.current = topicPoll;
  const enrichmentPollRef = useRef(enrichmentPoll);
  enrichmentPollRef.current = enrichmentPoll;

  const recordSearchView = useCallback((searchId: number | null | undefined, articles: Article[]) => {
    if (!searchId || articles.length === 0) return;
    void api.search.logSearchImpressions(
      searchId,
      articles.slice(0, 20).map((article, index) => ({
        articleUid: article.uid,
        position: index + 1,
      }))
    );
    storeSearchAttributionFromArticles(searchId, articles);
  }, []);

  // Cancel any in-flight polling and HTTP requests when the consumer unmounts
  // so background network requests don't keep firing and setState doesn't
  // fire on a detached component.
  useEffect(() => {
    return () => {
      cancelPollRef.current();
      abortControllerRef.current?.abort();
    };
  }, []);

  const search = useCallback(
    async (query: string, filters: SearchFilters = {}): Promise<Article[]> => {
      const thisRequestId = ++requestIdRef.current;
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      cancelPollRef.current();
      setAiEnrichmentLoading(false);
      setAiEnrichmentFailed(false);

      if (!query.trim()) {
        setResults([]);
        setAgentGuidance(null);
        setTopicIntelligence(null);
        setTopicGuideStatus('idle');
        return [];
      }

      const now = Date.now();
      const requestKey = searchRequestKey(query, filters);
      const lastSuccessful = lastSuccessfulSearchRef.current;
      if (lastSuccessful?.key === requestKey) {
        recordSearchView(lastSuccessful.response.searchId ?? null, lastSuccessful.response.articles || []);
        trackSearch(query, {
          filters,
          resultsCount: lastSuccessful.response.articles?.length || 0,
          cached: true,
          cacheLayer: 'hook',
        });
        return lastSuccessful.response.articles;
      }
      const last = lastSearchRef.current;
      if (last && last.key === requestKey && now - last.time < 5000) {
        recordSearchView(lastSearchId, results);
        trackSearch(query, { filters, resultsCount: results.length, cached: true, cacheLayer: 'dedupe' });
        return results;
      }
      lastSearchRef.current = { key: requestKey, query: query.trim(), time: now };

      setLoading(true);
      setError(null);

      try {
        const maxResults = filters.maxResults ?? 20;
        const config = await api.search.getClientConfig();
        const canUseVector = Boolean(config.features?.vectorSearch);
        const fuseVector = canUseVector && filters.useVectorSearch !== false;

        const enrichedFilters: SearchFilters = { ...filters, maxResults };

        const previousQueries = searchHistoryRef.current.slice(-3);
        const data = await api.search.search(
          query,
          enrichedFilters,
          { vector: fuseVector, previousQueries, intelligence: 'async', signal: controller.signal }
        );

        const {
          articles, agentGuidance, topicIntelligence, knowledgeAvailable,
          clinicalAnswer, searchId, communityInsight, proactiveAlert,
          aiEnrichmentKey, aiEnrichmentStatus, intelligenceStatus, learnerContext: nextLearnerContext,
          lowRecallLearning: nextLowRecallLearning,
          ranking,
          rankingAttribution,
        } = data;

        if (thisRequestId !== requestIdRef.current) return articles;
        trackSearch(query, { filters, resultsCount: articles.length });
        lastSuccessfulSearchRef.current = { key: requestKey, response: data };
        setResults(articles);
        setLastSearchId(searchId ?? null);
        setSearchCompletedAt(Date.now());
        if (searchId && articles.length > 0) {
          recordSearchView(searchId, articles);
          if (rankingAttribution?.length) {
            storeSearchAttribution(searchId, rankingAttribution);
          }
        }
        setDetectedTopic(query.trim());
        setClinicalAnswer(clinicalAnswer || null);
        setCommunityInsight(communityInsight || null);
        setProactiveAlert(proactiveAlert || null);
        setLearnerContext(nextLearnerContext || null);
        setLowRecallLearning(nextLowRecallLearning || null);
        setSearchTelemetry(data.searchTelemetry ?? null);
        addToSearchHistory(query.trim());
        refreshKnowledgeDriftAlerts();

        if (intelligenceStatus === 'deferred') {
          setAgentGuidance(null);
          setTopicIntelligence(null);
          if (articles.length >= 2) {
            setTopicGuideStatus('building');
            trackFeatureUsage('topic_guide_building', { query: query.slice(0, 200) });
          } else {
            setTopicGuideStatus('none');
          }
          setIntelligenceLoading(true);
          void api.search.fetchSearchIntelligence(query, articles, enrichedFilters, { previousQueries, ranking })
            .then((intel) => {
              if (thisRequestId !== requestIdRef.current) return;
              setAgentGuidance(intel.agentGuidance || null);
              setTopicIntelligence(intel.topicIntelligence || null);
              if (intel.learnerContext) setLearnerContext(intel.learnerContext);
              if (intel.agentGuidance) {
                setTopicGuideStatus('ready');
                trackFeatureUsage('topic_guide_ready', { source: 'intelligence', query: query.slice(0, 200) });
              } else if (articles.length >= 2 && intel.knowledgeAvailable === false) {
                setTopicGuideStatus('building');
              } else {
                setTopicGuideStatus('none');
              }
            })
            .catch(() => {
              if (thisRequestId !== requestIdRef.current) return;
              setTopicGuideStatus('none');
            })
            .finally(() => {
              if (thisRequestId === requestIdRef.current) setIntelligenceLoading(false);
            });
        } else {
          setAgentGuidance(agentGuidance || null);
          setTopicIntelligence(topicIntelligence || null);
          if (agentGuidance) {
            setTopicGuideStatus('ready');
            trackFeatureUsage('topic_guide_ready', { source: 'search', query: query.slice(0, 200) });
          } else if (articles.length >= 2 && knowledgeAvailable === false) {
            setTopicGuideStatus('building');
            trackFeatureUsage('topic_guide_building', { query: query.slice(0, 200) });
          } else {
            setTopicGuideStatus('none');
          }
        }

        // If no guidance yet, poll in background until extraction completes
        if (!agentGuidance && knowledgeAvailable === false && articles.length >= 2) {
          topicPollRequestIdRef.current = thisRequestId;
          setPollTopic(query.trim());
          topicPollRef.current.start();
        }

        // Poll for AI enrichment (consensus synopsis + clinical answer) if still pending
        if (aiEnrichmentKey && aiEnrichmentStatus === 'pending') {
          setAiEnrichmentLoading(true);
          setAiEnrichmentFailed(false);
          enrichPollRequestIdRef.current = thisRequestId;
          setEnrichKey(aiEnrichmentKey);
          enrichmentPollRef.current.start();
        }

        return articles;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return [];
        if (thisRequestId !== requestIdRef.current) return [];
        const error = err instanceof Error ? err : new Error('Search failed');
        setError(error);
        setResults([]);
        setAgentGuidance(null);
        setTopicIntelligence(null);
        setClinicalAnswer(null);
        setCommunityInsight(null);
        setTopicGuideStatus('idle');
        setLearnerContext(null);
        setLowRecallLearning(null);
        return [];
      } finally {
        if (thisRequestId === requestIdRef.current) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setResults, setLoading, setError, setDetectedTopic, setAgentGuidance, setTopicIntelligence, setClinicalAnswer, setCommunityInsight, setTopicGuideStatus, trackFeatureUsage, trackSearch, addToSearchHistory, refreshKnowledgeDriftAlerts]
  );

  const clearResults = useCallback(() => {
    cancelPoll();
    lastSearchRef.current = null;
    lastSuccessfulSearchRef.current = null;
    setResults([]);
    setError(null);
    setAgentGuidance(null);
    setTopicIntelligence(null);
    setClinicalAnswer(null);
    setCommunityInsight(null);
    setProactiveAlert(null);
    setLearnerContext(null);
    setLowRecallLearning(null);
    setTopicGuideStatus('idle');
    setLastSearchId(null);
    setAiEnrichmentLoading(false);
    setAiEnrichmentFailed(false);
    setIntelligenceLoading(false);
  }, [setResults, setError, setAgentGuidance, setTopicIntelligence, setClinicalAnswer, setCommunityInsight, setTopicGuideStatus, cancelPoll]);

  return {
    search,
    loading,
    error,
    results,
    clearResults,
    lastSearchId,
    searchCompletedAt,
    proactiveAlert,
    learnerContext,
    aiEnrichmentLoading,
    aiEnrichmentFailed,
    intelligenceLoading,
    knowledgeDriftAlerts,
    dismissKnowledgeDriftAlert,
    lowRecallLearning,
    searchTelemetry,
  };
}
