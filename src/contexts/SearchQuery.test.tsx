import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SearchQueryProvider, useSearchQuery } from './SearchContext';

describe('SearchQueryContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderWithRouter = (element: React.ReactNode, initialRoute = '/search') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SearchQueryProvider>
          <Routes>
            <Route path="/search" element={element} />
            <Route path="/quiz" element={<div>Quiz Page</div>} />
            <Route path="/history" element={<div>History Page</div>} />
          </Routes>
        </SearchQueryProvider>
      </MemoryRouter>
    );
  };

  it('provides initial search query state', () => {
    const TestComponent = () => {
      const { query, results, loading, error, filters } = useSearchQuery();
      return (
        <>
          <div>Query: {query || 'empty'}</div>
          <div>Results: {results.length}</div>
          <div>Loading: {String(loading)}</div>
          <div>Error: {error ? 'present' : 'null'}</div>
          <div>Filters: {filters.specificity}</div>
        </>
      );
    };

    renderWithRouter(<TestComponent />);

    expect(screen.getByText('Query: empty')).toBeInTheDocument();
    expect(screen.getByText('Results: 0')).toBeInTheDocument();
    expect(screen.getByText('Loading: false')).toBeInTheDocument();
    expect(screen.getByText('Error: null')).toBeInTheDocument();
    expect(screen.getByText('Filters: moderate')).toBeInTheDocument();
  });

  it('updates query state', () => {
    const TestComponent = () => {
      const { query, setQuery } = useSearchQuery();
      return (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
          />
          <div>Query: {query}</div>
        </>
      );
    };

    renderWithRouter(<TestComponent />);

    const input = screen.getByPlaceholderText('Search');
    fireEvent.change(input, { target: { value: 'diabetes' } });

    expect(screen.getByText('Query: diabetes')).toBeInTheDocument();
  });

  it('updates results state', () => {
    const mockArticles = [
      { id: '1', title: 'Article 1', abstract: 'Abstract 1' },
      { id: '2', title: 'Article 2', abstract: 'Abstract 2' },
    ];

    const TestComponent = () => {
      const { results, setResults } = useSearchQuery();
      return (
        <>
          <button onClick={() => setResults(mockArticles)}>Load Results</button>
          <div>Count: {results.length}</div>
        </>
      );
    };

    renderWithRouter(<TestComponent />);

    const btn = screen.getByRole('button', { name: /load results/i });
    fireEvent.click(btn);

    expect(screen.getByText('Count: 2')).toBeInTheDocument();
  });

  it('updates loading state', () => {
    const TestComponent = () => {
      const { loading, setLoading } = useSearchQuery();
      return (
        <>
          <button onClick={() => setLoading(true)}>Start Loading</button>
          <div>Loading: {String(loading)}</div>
        </>
      );
    };

    renderWithRouter(<TestComponent />);

    expect(screen.getByText('Loading: false')).toBeInTheDocument();

    const btn = screen.getByRole('button', { name: /start loading/i });
    fireEvent.click(btn);

    expect(screen.getByText('Loading: true')).toBeInTheDocument();
  });

  it('updates error state', () => {
    const TestComponent = () => {
      const { error, setError } = useSearchQuery();
      return (
        <>
          <button onClick={() => setError(new Error('Test error'))}>Set Error</button>
          <div>Error: {error ? error.message : 'null'}</div>
        </>
      );
    };

    renderWithRouter(<TestComponent />);

    expect(screen.getByText('Error: null')).toBeInTheDocument();

    const btn = screen.getByRole('button', { name: /set error/i });
    fireEvent.click(btn);

    expect(screen.getByText('Error: Test error')).toBeInTheDocument();
  });

  it('persists filters to localStorage', () => {
    const TestComponent = () => {
      const { filters, setFilters } = useSearchQuery();
      return (
        <button
          onClick={() =>
            setFilters({ ...filters, specificity: 'high', useVectorSearch: false })
          }
        >
          Update Filters
        </button>
      );
    };

    renderWithRouter(<TestComponent />);

    const btn = screen.getByRole('button', { name: /update filters/i });
    fireEvent.click(btn);

    const stored = localStorage.getItem('medsearch_filters');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.specificity).toBe('high');
    expect(parsed.useVectorSearch).toBe(false);
  });

  it('hydrates filters from localStorage', () => {
    const savedFilters = {
      sources: ['arxiv'],
      specificity: 'high',
      useVectorSearch: true,
    };
    localStorage.setItem('medsearch_filters', JSON.stringify(savedFilters));

    const TestComponent = () => {
      const { filters } = useSearchQuery();
      return (
        <>
          <div>Specificity: {filters.specificity}</div>
          <div>Sources: {filters.sources.join(',')}</div>
        </>
      );
    };

    renderWithRouter(<TestComponent />);

    expect(screen.getByText('Specificity: high')).toBeInTheDocument();
    expect(screen.getByText('Sources: arxiv')).toBeInTheDocument();
  });

  it('detects current page from location', () => {
    const TestComponent = () => {
      const { currentPage } = useSearchQuery();
      return <div>Current Page: {currentPage}</div>;
    };

    renderWithRouter(<TestComponent />, '/search');
    expect(screen.getByText('Current Page: search')).toBeInTheDocument();
  });

  it('sets detected topic and persists to localStorage', () => {
    const TestComponent = () => {
      const { detectedTopic, setDetectedTopic } = useSearchQuery();
      return (
        <>
          <button onClick={() => setDetectedTopic('cardiology')}>Set Topic</button>
          <div>Topic: {detectedTopic || 'none'}</div>
        </>
      );
    };

    renderWithRouter(<TestComponent />);

    const btn = screen.getByRole('button', { name: /set topic/i });
    fireEvent.click(btn);

    expect(screen.getByText('Topic: cardiology')).toBeInTheDocument();
    expect(localStorage.getItem('medsearch_detected_topic')).toBe('cardiology');
  });

  it('clears detected topic from localStorage when set to empty', () => {
    localStorage.setItem('medsearch_detected_topic', 'cardiology');

    const TestComponent = () => {
      const { detectedTopic, setDetectedTopic } = useSearchQuery();
      return (
        <>
          <button onClick={() => setDetectedTopic('')}>Clear Topic</button>
          <div>Topic: {detectedTopic || 'empty'}</div>
        </>
      );
    };

    renderWithRouter(<TestComponent />);

    const btn = screen.getByRole('button', { name: /clear topic/i });
    fireEvent.click(btn);

    expect(screen.getByText('Topic: empty')).toBeInTheDocument();
    expect(localStorage.getItem('medsearch_detected_topic')).toBeNull();
  });

  it('maintains search history (max 5, no duplicates)', () => {
    const TestComponent = () => {
      const { searchHistory, addToSearchHistory } = useSearchQuery();
      return (
        <>
          <button onClick={() => addToSearchHistory('diabetes')}>Add 1</button>
          <button onClick={() => addToSearchHistory('hypertension')}>Add 2</button>
          <button onClick={() => addToSearchHistory('diabetes')}>Add Dup</button>
          <div>History: {searchHistory.join(',') || 'empty'}</div>
          <div>Count: {searchHistory.length}</div>
        </>
      );
    };

    renderWithRouter(<TestComponent />);

    fireEvent.click(screen.getByRole('button', { name: /add 1/i }));
    fireEvent.click(screen.getByRole('button', { name: /add 2/i }));
    fireEvent.click(screen.getByRole('button', { name: /add dup/i }));

    expect(screen.getByText('History: diabetes,hypertension')).toBeInTheDocument();
    expect(screen.getByText('Count: 2')).toBeInTheDocument();
  });

  it('trims and filters empty search history entries', () => {
    const TestComponent = () => {
      const { searchHistory, addToSearchHistory } = useSearchQuery();
      return (
        <>
          <button onClick={() => addToSearchHistory('  valid  ')}>Add</button>
          <button onClick={() => addToSearchHistory('')}>Add Empty</button>
          <div>History: {searchHistory.join(',') || 'empty'}</div>
        </>
      );
    };

    renderWithRouter(<TestComponent />);

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Empty' }));

    expect(screen.getByText('History: valid')).toBeInTheDocument();
  });

  it('navigates to different page', () => {
    const TestComponent = () => {
      const { setCurrentPage } = useSearchQuery();
      return (
        <button onClick={() => setCurrentPage('quiz')}>Go to Quiz</button>
      );
    };

    renderWithRouter(<TestComponent />);

    const btn = screen.getByRole('button', { name: /go to quiz/i });
    fireEvent.click(btn);

    expect(screen.getByText('Quiz Page')).toBeInTheDocument();
  });

  it('handles localStorage errors gracefully', () => {
    // Mock localStorage to throw
    const mockSetItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });

    const TestComponent = () => {
      const { filters, setFilters } = useSearchQuery();
      return (
        <button onClick={() => setFilters({ ...filters, specificity: 'high' })}>
          Update
        </button>
      );
    };

    expect(() => {
      renderWithRouter(<TestComponent />);
      const btn = screen.getByRole('button', { name: /update/i });
      fireEvent.click(btn);
    }).not.toThrow();

    mockSetItem.mockRestore();
  });

  it('throws error when useSearchQuery used outside provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const TestComponent = () => {
      useSearchQuery();
      return <div>Test</div>;
    };

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useSearchQuery must be used within SearchProvider');

    (console.error as jest.Mock).mockRestore();
  });

});
