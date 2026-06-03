import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '@services/api';
import type { AgentGuidance, Article, CommunityInsight, SearchFilters, TopicGuideStatus, TopicIntelligence } from '@types';

export type AppPage = 'search' | 'quiz' | 'history' | 'saved' | 'auth' | 'analytics' | 'team' | 'review' | 'case' | 'grant' | 'knowledge' | 'guidelines' | 'learning';

const PAGE_ROUTES: Record<AppPage, string> = {
  search:    '/search',
  quiz:      '/quiz',
  history:   '/history',
  saved:     '/saved',
  auth:      '/auth',
  analytics: '/analytics',
  team:      '/team',
  review:    '/review',
  case:      '/case',
  grant:     '/grant',
  knowledge: '/knowledge',
  guidelines: '/guidelines',
  learning: '/learning',
};

const ROUTE_PAGES: Record<string, AppPage> = Object.fromEntries(
  (Object.entries(PAGE_ROUTES) as [AppPage, string][]).map(([page, route]) => [route, page])
);

/* ──────────────────────────────────────────────
   Standalone navigation hook — does NOT subscribe
   to any search state, so it causes zero re-renders.
   ────────────────────────────────────────────── */
export function useNavigatePage() {
  const navigate = useNavigate();
  return useCallback(
    (page: AppPage) => navigate(PAGE_ROUTES[page]),
    [navigate]
  );
}

/* ═══════════════════════════════════════════════
   1. SearchQueryContext — query, results, loading,
      error, filters, searchHistory, currentPage,
      detectedTopic, and their setters.
   ═══════════════════════════════════════════════ */

interface SearchQueryContextType {
  query: string;
  results: Article[];
  loading: boolean;
  error: Error | null;
  filters: SearchFilters;
  detectedTopic: string;
  currentPage: AppPage;
  searchHistory: string[];
  setQuery: (query: string) => void;
  setResults: (results: Article[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  setFilters: (filters: SearchFilters) => void;
  setDetectedTopic: (topic: string) => void;
  setCurrentPage: (page: AppPage) => void;
  addToSearchHistory: (query: string) => void;
}

const SearchQueryContext = createContext<SearchQueryContextType | undefined>(undefined);

const TOPIC_STORAGE_KEY = 'medsearch_detected_topic';
const FILTER_STORAGE_KEY = 'medsearch_filters';

export const SearchQueryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [detectedTopic, setDetectedTopicState] = useState<string>(() => {
    try { return localStorage.getItem(TOPIC_STORAGE_KEY) || ''; } catch { return ''; }
  });
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [filters, setFiltersState] = useState<SearchFilters>(() => {
    const defaults: SearchFilters = {
      sources: ['pubmed', 'openalex', 'semantic'],
      specificity: 'moderate',
      useVectorSearch: true,
    };
    try {
      const saved = localStorage.getItem(FILTER_STORAGE_KEY);
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch { return defaults; }
  });

  const currentPage: AppPage = ROUTE_PAGES[location.pathname] ?? 'search';

  const setCurrentPage = useCallback(
    (page: AppPage) => navigate(PAGE_ROUTES[page]),
    [navigate]
  );

  const setDetectedTopic = useCallback((topic: string) => {
    setDetectedTopicState(topic);
    try {
      if (topic) { localStorage.setItem(TOPIC_STORAGE_KEY, topic); }
      else { localStorage.removeItem(TOPIC_STORAGE_KEY); }
    } catch { /* Ignore localStorage errors */ }
  }, []);

  const setFilters = useCallback((newFilters: SearchFilters) => {
    setFiltersState((prev) => {
      const updated = { ...prev, ...newFilters };
      try { localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const addToSearchHistory = useCallback((q: string) => {
    setSearchHistory((prev) => {
      const trimmed = q.trim();
      if (!trimmed || prev.includes(trimmed)) return prev;
      return [...prev, trimmed].slice(-5);
    });
  }, []);

  const value = useMemo(
    () => ({
      query, results, loading, error, filters, detectedTopic, currentPage, searchHistory,
      setQuery, setResults, setLoading, setError, setFilters, setDetectedTopic, setCurrentPage, addToSearchHistory,
    }),
    [query, results, loading, error, filters, detectedTopic, currentPage, searchHistory,
     setDetectedTopic, setFilters, setCurrentPage, addToSearchHistory]
  );

  return <SearchQueryContext.Provider value={value}>{children}</SearchQueryContext.Provider>;
};

export const useSearchQuery = (): SearchQueryContextType => {
  const ctx = useContext(SearchQueryContext);
  if (!ctx) throw new Error('useSearchQuery must be used within SearchProvider');
  return ctx;
};

/* ═══════════════════════════════════════════════
   2. SearchSelectionContext — savedArticles,
      selectedArticles, toggle/clear/is helpers.
   ═══════════════════════════════════════════════ */

interface SearchSelectionContextType {
  savedArticles: Article[];
  selectedArticles: Article[];
  toggleSaveArticle: (article: Article) => Promise<void>;
  toggleSelectArticle: (article: Article) => void;
  clearSelection: () => void;
  isSaved: (uid: string) => boolean;
  isSelected: (uid: string) => boolean;
}

const SearchSelectionContext = createContext<SearchSelectionContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'medsearch_saved';

export const SearchSelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read detectedTopic from the query context so toggleSaveArticle can tag saves.
  const { detectedTopic, setError } = useSearchQuery();
  const detectedTopicRef = useRef(detectedTopic);
  detectedTopicRef.current = detectedTopic;

  const [savedArticles, setSavedArticles] = useState<Article[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<Article[]>([]);

  // Hydrate saved articles from backend on mount
  useEffect(() => {
    let cancelled = false;
    api.getSavedArticles()
      .then(({ articles }) => {
        if (cancelled) return;
        if (articles && articles.length > 0) {
          setSavedArticles(articles);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(articles));
        }
      })
      .catch(() => { /* Silent — localStorage is the fallback */ });
    return () => { cancelled = true; };
  }, []);

  const savedArticlesRef = useRef(savedArticles);
  savedArticlesRef.current = savedArticles;

  const toggleSaveArticle = useCallback(async (article: Article) => {
    const isCurrentlySaved = savedArticlesRef.current.some((a) => a.uid === article.uid);

    // Optimistic UI update
    setSavedArticles((prev) => {
      const updated = isCurrentlySaved
        ? prev.filter((a) => a.uid !== article.uid)
        : [...prev, article];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    // Sync with backend
    try {
      if (isCurrentlySaved) {
        await api.unsaveArticle(article.uid);
      } else {
        await api.saveArticle(article, { topic: detectedTopicRef.current || undefined });
      }
    } catch {
      // Revert optimistic update on failure
      setSavedArticles((prev) => {
        const reverted = isCurrentlySaved
          ? [...prev, article]
          : prev.filter((a) => a.uid !== article.uid);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reverted));
        return reverted;
      });
      setError(new Error(isCurrentlySaved ? 'Failed to unsave article' : 'Failed to save article'));
    }
  }, [setError]);

  const toggleSelectArticle = useCallback((article: Article) => {
    setSelectedArticles((prev) => {
      const alreadySelected = prev.some((a) => a.uid === article.uid);
      if (alreadySelected) return prev.filter((a) => a.uid !== article.uid);
      if (prev.length >= 3) return [...prev.slice(1), article];
      return [...prev, article];
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedArticles([]), []);

  const isSaved = useCallback(
    (uid: string) => savedArticles.some((a) => a.uid === uid),
    [savedArticles]
  );

  const isSelected = useCallback(
    (uid: string) => selectedArticles.some((a) => a.uid === uid),
    [selectedArticles]
  );

  const value = useMemo(
    () => ({
      savedArticles, selectedArticles,
      toggleSaveArticle, toggleSelectArticle, clearSelection, isSaved, isSelected,
    }),
    [savedArticles, selectedArticles, toggleSaveArticle, isSaved, isSelected]
  );

  return <SearchSelectionContext.Provider value={value}>{children}</SearchSelectionContext.Provider>;
};

export const useSearchSelection = (): SearchSelectionContextType => {
  const ctx = useContext(SearchSelectionContext);
  if (!ctx) throw new Error('useSearchSelection must be used within SearchProvider');
  return ctx;
};

/* ═══════════════════════════════════════════════
   3. SearchMetaContext — AI-derived metadata:
      agentGuidance, topicIntelligence, clinicalAnswer,
      communityInsight, topicGuideStatus, and setters.
   ═══════════════════════════════════════════════ */

interface SearchMetaContextType {
  agentGuidance: AgentGuidance | null;
  topicIntelligence: TopicIntelligence | null;
  clinicalAnswer: import('@types').ClinicalAnswer | null;
  communityInsight: CommunityInsight | null;
  topicGuideStatus: TopicGuideStatus;
  setAgentGuidance: (guidance: AgentGuidance | null) => void;
  setTopicIntelligence: React.Dispatch<React.SetStateAction<TopicIntelligence | null>>;
  setClinicalAnswer: (ca: import('@types').ClinicalAnswer | null) => void;
  setCommunityInsight: (ci: CommunityInsight | null) => void;
  setTopicGuideStatus: (status: TopicGuideStatus) => void;
}

const SearchMetaContext = createContext<SearchMetaContextType | undefined>(undefined);

export const SearchMetaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [agentGuidance, setAgentGuidance] = useState<AgentGuidance | null>(null);
  const [topicIntelligence, setTopicIntelligence] = useState<TopicIntelligence | null>(null);
  const [clinicalAnswer, setClinicalAnswer] = useState<import('@types').ClinicalAnswer | null>(null);
  const [communityInsight, setCommunityInsight] = useState<CommunityInsight | null>(null);
  const [topicGuideStatus, setTopicGuideStatus] = useState<TopicGuideStatus>('idle');

  const value = useMemo(
    () => ({
      agentGuidance, topicIntelligence, clinicalAnswer, communityInsight, topicGuideStatus,
      setAgentGuidance, setTopicIntelligence, setClinicalAnswer, setCommunityInsight, setTopicGuideStatus,
    }),
    [agentGuidance, topicIntelligence, clinicalAnswer, communityInsight, topicGuideStatus]
  );

  return <SearchMetaContext.Provider value={value}>{children}</SearchMetaContext.Provider>;
};

export const useSearchMeta = (): SearchMetaContextType => {
  const ctx = useContext(SearchMetaContext);
  if (!ctx) throw new Error('useSearchMeta must be used within SearchProvider');
  return ctx;
};

/* ═══════════════════════════════════════════════
   Backward-compatible monolith
   ═══════════════════════════════════════════════ */

interface SearchContextType extends SearchQueryContextType, SearchSelectionContextType, SearchMetaContextType {}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SearchQueryProvider>
    <SearchSelectionProvider>
      <SearchMetaProvider>
        <SearchContextBridge>{children}</SearchContextBridge>
      </SearchMetaProvider>
    </SearchSelectionProvider>
  </SearchQueryProvider>
);

/** Bridges the three granular contexts into the legacy combined context. */
const SearchContextBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const query = useSearchQuery();
  const selection = useSearchSelection();
  const meta = useSearchMeta();

  const value = useMemo(
    () => ({ ...query, ...selection, ...meta }),
    [query, selection, meta]
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
};

export const useSearchContext = (): SearchContextType => {
  const context = useContext(SearchContext);
  if (!context) throw new Error('useSearchContext must be used within SearchProvider');
  return context;
};
