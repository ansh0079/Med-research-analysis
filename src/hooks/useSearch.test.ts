/**
 * useSearch hook tests.
 *
 * useAnalytics is mocked at module level (jest.mock is hoisted) so that
 * import.meta.env.DEV inside useAnalytics.ts is never evaluated by Jest/CommonJS.
 */
import { renderHook, act } from '@testing-library/react';
import { useSearch } from './useSearch';
import { api } from '@services/api';
import * as searchContext from '@contexts/SearchContext';
import * as authContext from '@contexts/AuthContext';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('./useAnalytics', () => ({
  useAnalytics: () => ({
    trackSearch: jest.fn(),
    trackFeatureUsage: jest.fn(),
  }),
}));

jest.mock('@services/api', () => ({
  api: {
    search: jest.fn(),
    getClientConfig: jest.fn(),
    listEvidenceAlerts: jest.fn(),
    getTopicKnowledge: jest.fn(),
    getAiEnrichment: jest.fn(),
    indexArticlesForVector: jest.fn(),
    markEvidenceAlertRead: jest.fn(),
  },
}));
jest.mock('@services/QueryParser', () => ({
  queryParser: {
    parse: jest.fn().mockReturnValue({ studyTypes: [], specificity: 'moderate' }),
  },
}));
jest.mock('@contexts/SearchContext');
jest.mock('@contexts/AuthContext');

const mockedApi = api as jest.Mocked<typeof api>;
const mockedSearchContext = searchContext as jest.Mocked<typeof searchContext>;
const mockedAuthContext = authContext as jest.Mocked<typeof authContext>;

// ── Shared mock data ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockArticles: any[] = [
  { uid: 'a1', title: 'Article 1', abstract: 'Abstract 1', id: '1', _source: 'pubmed' },
  { uid: 'a2', title: 'Article 2', abstract: 'Abstract 2', id: '2', _source: 'pubmed' },
];

const mockSetResults = jest.fn();
const mockSetLoading = jest.fn();
const mockSetError = jest.fn();
const mockSetDetectedTopic = jest.fn();
const mockSetAgentGuidance = jest.fn();
const mockSetTopicIntelligence = jest.fn();
const mockSetClinicalAnswer = jest.fn();
const mockSetCommunityInsight = jest.fn();
const mockSetTopicGuideStatus = jest.fn();
const mockAddToSearchHistory = jest.fn();

function setupDefaultMocks() {
  mockedSearchContext.useSearchContext.mockReturnValue({
    query: '',
    results: [],
    loading: false,
    error: null,
    filters: { sources: ['pubmed'], specificity: 'moderate', useVectorSearch: true },
    detectedTopic: '',
    currentPage: 'search',
    searchHistory: [],
    setQuery: jest.fn(),
    setResults: mockSetResults,
    setLoading: mockSetLoading,
    setError: mockSetError,
    setFilters: jest.fn(),
    setDetectedTopic: mockSetDetectedTopic,
    setCurrentPage: jest.fn(),
    addToSearchHistory: mockAddToSearchHistory,
    setAgentGuidance: mockSetAgentGuidance,
    setTopicIntelligence: mockSetTopicIntelligence,
    setClinicalAnswer: mockSetClinicalAnswer,
    setCommunityInsight: mockSetCommunityInsight,
    setTopicGuideStatus: mockSetTopicGuideStatus,
    agentGuidance: null,
    topicIntelligence: null,
    clinicalAnswer: null,
    communityInsight: null,
    topicGuideStatus: 'idle',
    savedArticles: [],
    selectedArticles: [],
    toggleSaveArticle: jest.fn(),
    toggleSelectArticle: jest.fn(),
    clearSelection: jest.fn(),
    isSaved: jest.fn().mockReturnValue(false),
    isSelected: jest.fn().mockReturnValue(false),
  } as any);

  mockedAuthContext.useAuth.mockReturnValue({
    user: { id: 'u1', email: 'test@example.com' },
    isAuthenticated: true,
    isLoading: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    forgotPassword: jest.fn(),
    resendVerification: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      deleteAccount: jest.fn(),
    setUser: jest.fn(),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockedApi.search.mockResolvedValue({ articles: mockArticles, count: 2, sources: ['pubmed'] } as any);
  mockedApi.getClientConfig.mockResolvedValue({ features: { vectorSearch: false } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockedApi.listEvidenceAlerts.mockResolvedValue({ alerts: [] } as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockedApi.getTopicKnowledge.mockResolvedValue({ found: false, agentGuidance: null } as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockedApi.getAiEnrichment.mockResolvedValue({ status: 'ready' } as any);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    setupDefaultMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it('returns search and clearResults functions and correct initial state', () => {
    const { result } = renderHook(() => useSearch());

    expect(typeof result.current.search).toBe('function');
    expect(typeof result.current.clearResults).toBe('function');
    expect(result.current.knowledgeDriftAlerts).toEqual([]);
    expect(result.current.lastSearchId).toBeNull();
    expect(result.current.proactiveAlert).toBeNull();
    expect(result.current.aiEnrichmentLoading).toBe(false);
  });

  // ── Basic search ──────────────────────────────────────────────────────────

  it('calls api.search with query and returns articles', async () => {
    const { result } = renderHook(() => useSearch());

    let articles: any;
    await act(async () => {
      articles = await result.current.search('diabetes');
    });

    expect(articles).toEqual(mockArticles);
    expect(mockedApi.search).toHaveBeenCalledWith(
      'diabetes',
      expect.any(Object),
      expect.any(Object)
    );
  });

  it('sets loading true then false around search', async () => {
    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.search('diabetes');
    });

    expect(mockSetLoading).toHaveBeenCalledWith(true);
    expect(mockSetLoading).toHaveBeenCalledWith(false);
  });

  it('calls setResults with returned articles', async () => {
    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.search('diabetes');
    });

    expect(mockSetResults).toHaveBeenCalledWith(mockArticles);
  });

  it('returns empty array and skips api call when query is whitespace only', async () => {
    const { result } = renderHook(() => useSearch());

    let articles: any;
    await act(async () => {
      articles = await result.current.search('   ');
    });

    expect(articles).toEqual([]);
    expect(mockedApi.search).not.toHaveBeenCalled();
  });

  it('returns empty array when api.search returns no articles', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedApi.search.mockResolvedValue({ articles: [], count: 0, sources: [] } as any);
    const { result } = renderHook(() => useSearch());

    let articles: any;
    await act(async () => {
      articles = await result.current.search('nosuchquery');
    });

    expect(articles).toEqual([]);
  });

  // ── Error handling ────────────────────────────────────────────────────────

  it('calls setError and returns empty array when api.search throws', async () => {
    mockedApi.search.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useSearch());

    let articles: any;
    await act(async () => {
      articles = await result.current.search('test');
    });

    expect(articles).toEqual([]);
    expect(mockSetError).toHaveBeenCalledWith(expect.any(Error));
    expect(mockSetLoading).toHaveBeenCalledWith(false);
  });

  // ── Search ID tracking ────────────────────────────────────────────────────

  it('stores searchId from api response as lastSearchId', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedApi.search.mockResolvedValue({ articles: mockArticles, searchId: 42, count: 2, sources: ['pubmed'] } as any);
    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.search('diabetes');
    });

    expect(result.current.lastSearchId).toBe(42);
  });

  it('updates lastSearchId on consecutive searches', async () => {
    mockedApi.search
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValueOnce({ articles: mockArticles, searchId: 10, count: 2, sources: ['pubmed'] } as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValueOnce({ articles: mockArticles, searchId: 11, count: 2, sources: ['pubmed'] } as any);

    const { result } = renderHook(() => useSearch());

    await act(async () => { await result.current.search('query1'); });
    expect(result.current.lastSearchId).toBe(10);

    await act(async () => { await result.current.search('query2'); });
    expect(result.current.lastSearchId).toBe(11);

    expect(mockedApi.search).toHaveBeenCalledTimes(2);
  });

  // ── Topic guide status ────────────────────────────────────────────────────

  it('sets topicGuideStatus to ready when agentGuidance is returned', async () => {
    mockedApi.search.mockResolvedValue({
      articles: mockArticles, count: 2, sources: ['pubmed'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      agentGuidance: { topic: 'diabetes', mentorMessage: 'Use insulin' } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.search('diabetes');
    });

    expect(mockSetTopicGuideStatus).toHaveBeenCalledWith('ready');
    expect(mockSetAgentGuidance).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'diabetes' })
    );
  });

  it('sets topicGuideStatus to building when 2+ articles and no knowledge yet', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedApi.search.mockResolvedValue({ articles: mockArticles, count: 2, sources: ['pubmed'], knowledgeAvailable: false } as any);
    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.search('diabetes');
    });

    expect(mockSetTopicGuideStatus).toHaveBeenCalledWith('building');
  });

  it('sets topicGuideStatus to none when single result and no guidance', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedApi.search.mockResolvedValue({ articles: [mockArticles[0]], count: 1, sources: ['pubmed'] } as any);
    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.search('rare condition');
    });

    expect(mockSetTopicGuideStatus).toHaveBeenCalledWith('none');
  });

  // ── Proactive alert ───────────────────────────────────────────────────────

  it('stores proactiveAlert when returned from search', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockAlert = { summary: 'Update available', changedPrinciples: [], newPapers: [], daysSinceUpdate: 3 } as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedApi.search.mockResolvedValue({ articles: mockArticles, count: 2, sources: ['pubmed'], proactiveAlert: mockAlert } as any);
    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.search('diabetes');
    });

    expect(result.current.proactiveAlert).toEqual(mockAlert);
  });

  it('clears proactiveAlert on next search', async () => {
    mockedApi.search
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValueOnce({ articles: mockArticles, count: 2, sources: ['pubmed'], proactiveAlert: { summary: 'alert', changedPrinciples: [], newPapers: [], daysSinceUpdate: 1 } } as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValueOnce({ articles: mockArticles, count: 2, sources: ['pubmed'] } as any);

    const { result } = renderHook(() => useSearch());

    await act(async () => { await result.current.search('first'); });
    expect(result.current.proactiveAlert).not.toBeNull();

    await act(async () => { await result.current.search('second'); });
    expect(result.current.proactiveAlert).toBeNull();
  });

  // ── AI enrichment polling ─────────────────────────────────────────────────

  it('starts aiEnrichmentLoading when enrichment is pending and polls for completion', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedApi.search.mockResolvedValue({ articles: mockArticles, count: 2, sources: ['pubmed'], aiEnrichmentKey: 'key-123', aiEnrichmentStatus: 'pending' } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedApi.getAiEnrichment.mockResolvedValue({ status: 'ready' } as any);

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.search('diabetes');
    });

    // Poll fires after 2000ms
    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(mockedApi.getAiEnrichment).toHaveBeenCalledWith('key-123');
    expect(result.current.aiEnrichmentLoading).toBe(false);
  });

  // ── Search history ────────────────────────────────────────────────────────

  it('calls addToSearchHistory after successful search', async () => {
    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.search('hypertension');
    });

    expect(mockAddToSearchHistory).toHaveBeenCalledWith('hypertension');
  });

  it('does not add to history when search fails', async () => {
    mockedApi.search.mockRejectedValue(new Error('Fail'));
    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.search('test');
    });

    expect(mockAddToSearchHistory).not.toHaveBeenCalled();
  });

  // ── clearResults ──────────────────────────────────────────────────────────

  it('clearResults resets all state to idle/null', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.clearResults();
    });

    expect(mockSetResults).toHaveBeenCalledWith([]);
    expect(mockSetAgentGuidance).toHaveBeenCalledWith(null);
    expect(mockSetTopicIntelligence).toHaveBeenCalledWith(null);
    expect(mockSetClinicalAnswer).toHaveBeenCalledWith(null);
    expect(mockSetCommunityInsight).toHaveBeenCalledWith(null);
    expect(mockSetTopicGuideStatus).toHaveBeenCalledWith('idle');
  });

  // ── Unmount safety ────────────────────────────────────────────────────────

  it('does not throw when hook unmounts with pending poll timers', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedApi.search.mockResolvedValue({ articles: mockArticles, count: 2, sources: ['pubmed'], knowledgeAvailable: false } as any);
    const { result, unmount } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.search('diabetes');
    });

    expect(() => unmount()).not.toThrow();
  });

  // ── Knowledge drift alerts ────────────────────────────────────────────────

  it('fetches knowledgeDriftAlerts on mount when authenticated', async () => {
    const mockAlerts = [
      { id: 1, normalizedTopic: 'diabetes', title: 'New RCT published', alertKind: 'new_evidence' },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedApi.listEvidenceAlerts.mockResolvedValue({ alerts: mockAlerts } as any);

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.knowledgeDriftAlerts).toEqual(mockAlerts);
  });

  it('does not fetch alerts when not authenticated', async () => {
    mockedAuthContext.useAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      forgotPassword: jest.fn(),
      resendVerification: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      deleteAccount: jest.fn(),
      setUser: jest.fn(),
    });

    renderHook(() => useSearch());

    await act(async () => { await Promise.resolve(); });

    expect(mockedApi.listEvidenceAlerts).not.toHaveBeenCalled();
  });

  it('dismissKnowledgeDriftAlert removes alert from list', async () => {
    const mockAlerts = [
      { id: 1, normalizedTopic: 'topic', title: 'Alert 1' },
      { id: 2, normalizedTopic: 'topic', title: 'Alert 2' },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedApi.listEvidenceAlerts.mockResolvedValue({ alerts: mockAlerts } as any);
    (mockedApi as any).markEvidenceAlertRead = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useSearch());
    await act(async () => { await Promise.resolve(); });

    await act(async () => {
      await result.current.dismissKnowledgeDriftAlert(1);
    });

    expect(result.current.knowledgeDriftAlerts).toHaveLength(1);
    expect(result.current.knowledgeDriftAlerts[0].id).toBe(2);
  });
});
