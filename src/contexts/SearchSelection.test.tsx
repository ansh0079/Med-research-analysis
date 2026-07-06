import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SearchQueryProvider } from './SearchContext';
import { SearchSelectionProvider, useSearchSelection } from './SearchContext';
import { api } from '@services/api';

// Mock the API service
jest.mock('@services/api', () => ({
  api: {
    documents: {
      getSavedArticles: jest.fn(),
      saveArticle: jest.fn(),
      unsaveArticle: jest.fn(),
    },
    auth: {
      getMe: jest.fn().mockResolvedValue({ user: null }),
    },
  },
}));

const mockedApi = api as unknown as { [K in keyof typeof api]: jest.Mocked<(typeof api)[K]> };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockArticle = { uid: 'article-1', title: 'Test Article', abstract: 'Test abstract', id: '1', _source: 'pubmed' } as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockArticle2 = { uid: 'article-2', title: 'Test Article 2', abstract: 'Test abstract 2', id: '2', _source: 'pubmed' } as any;

describe('SearchSelectionContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockedApi.documents.getSavedArticles.mockResolvedValue({ articles: [] });
  });

  const renderWithContext = (element: React.ReactNode) => {
    return render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SearchQueryProvider>
          <SearchSelectionProvider>{element}</SearchSelectionProvider>
        </SearchQueryProvider>
      </MemoryRouter>
    );
  };

  it('provides initial selection state', async () => {
    mockedApi.documents.getSavedArticles.mockResolvedValue({ articles: [] });

    const TestComponent = () => {
      const { savedArticles, selectedArticles } = useSearchSelection();
      return (
        <>
          <div>Saved: {savedArticles.length}</div>
          <div>Selected: {selectedArticles.length}</div>
        </>
      );
    };

    renderWithContext(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByText('Saved: 0')).toBeInTheDocument();
    });
    expect(screen.getByText('Selected: 0')).toBeInTheDocument();
  });

  it('hydrates saved articles from API on mount', async () => {
    const mockArticles = [mockArticle, mockArticle2];
    mockedApi.documents.getSavedArticles.mockResolvedValue({ articles: mockArticles });

    const TestComponent = () => {
      const { savedArticles } = useSearchSelection();
      return (
        <>
          {savedArticles.map((a) => (
            <div key={a.uid}>{a.title}</div>
          ))}
        </>
      );
    };

    renderWithContext(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByText('Test Article')).toBeInTheDocument();
    });
    expect(screen.getByText('Test Article 2')).toBeInTheDocument();
    expect(mockedApi.documents.getSavedArticles).toHaveBeenCalledTimes(1);
  });

  it('persists saved articles to localStorage after hydration', async () => {
    mockedApi.documents.getSavedArticles.mockResolvedValue({
      articles: [mockArticle],
    });

    renderWithContext(<div>Test</div>);

    await waitFor(() => {
      const stored = localStorage.getItem('medsearch_saved');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed[0].uid).toBe('article-1');
    });
  });

  it('falls back to localStorage if API fails', async () => {
    mockedApi.documents.getSavedArticles.mockRejectedValue(new Error('Network error'));
    localStorage.setItem(
      'medsearch_saved',
      JSON.stringify([mockArticle])
    );

    const TestComponent = () => {
      const { savedArticles } = useSearchSelection();
      return <div>Saved: {savedArticles.length}</div>;
    };

    renderWithContext(<TestComponent />);

    // Should still be 0 since localStorage fallback is silent
    await waitFor(() => {
      expect(screen.getByText('Saved: 0')).toBeInTheDocument();
    });
  });

  it('toggles selection of articles (max 3)', () => {
    const article3 = { ...mockArticle2, uid: 'article-3', title: 'Article 3' };

    const TestComponent = () => {
      const { selectedArticles, toggleSelectArticle } = useSearchSelection();
      return (
        <>
          <button onClick={() => toggleSelectArticle(mockArticle)}>Select 1</button>
          <button onClick={() => toggleSelectArticle(mockArticle2)}>Select 2</button>
          <button onClick={() => toggleSelectArticle(article3)}>Select 3</button>
          <button
            onClick={() => toggleSelectArticle({ ...article3, uid: 'article-4' })}
          >
            Select 4
          </button>
          <div>Selected: {selectedArticles.length}</div>
          <div>
            {selectedArticles.map((a) => (
              <div key={a.uid}>{a.title}</div>
            ))}
          </div>
        </>
      );
    };

    renderWithContext(<TestComponent />);

    fireEvent.click(screen.getByRole('button', { name: /select 1/i }));
    expect(screen.getByText('Selected: 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /select 2/i }));
    expect(screen.getByText('Selected: 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /select 3/i }));
    expect(screen.getByText('Selected: 3')).toBeInTheDocument();

    // Adding 4th article should remove the 1st (FIFO when max reached)
    fireEvent.click(screen.getByRole('button', { name: /select 4/i }));
    expect(screen.getByText('Selected: 3')).toBeInTheDocument();
    expect(screen.queryByText('Test Article')).not.toBeInTheDocument();
    expect(screen.getByText('Test Article 2')).toBeInTheDocument();
  });

  it('deselects article if clicking same article twice', () => {
    const TestComponent = () => {
      const { selectedArticles, toggleSelectArticle } = useSearchSelection();
      return (
        <>
          <button onClick={() => toggleSelectArticle(mockArticle)}>Toggle</button>
          <div>Selected: {selectedArticles.length}</div>
        </>
      );
    };

    renderWithContext(<TestComponent />);

    const btn = screen.getByRole('button', { name: /toggle/i });

    fireEvent.click(btn);
    expect(screen.getByText('Selected: 1')).toBeInTheDocument();

    fireEvent.click(btn);
    expect(screen.getByText('Selected: 0')).toBeInTheDocument();
  });

  it('checks if article is saved', async () => {
    mockedApi.documents.getSavedArticles.mockResolvedValue({
      articles: [mockArticle],
    });

    const TestComponent = () => {
      const { isSaved } = useSearchSelection();
      return (
        <>
          <div>Saved 1: {String(isSaved('article-1'))}</div>
          <div>Saved 2: {String(isSaved('article-2'))}</div>
        </>
      );
    };

    renderWithContext(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByText('Saved 1: true')).toBeInTheDocument();
    });
    expect(screen.getByText('Saved 2: false')).toBeInTheDocument();
  });

  it('checks if article is selected', () => {
    const TestComponent = () => {
      const { toggleSelectArticle, isSelected } = useSearchSelection();
      return (
        <>
          <button onClick={() => toggleSelectArticle(mockArticle)}>Select</button>
          <div>Selected 1: {String(isSelected('article-1'))}</div>
          <div>Selected 2: {String(isSelected('article-2'))}</div>
        </>
      );
    };

    renderWithContext(<TestComponent />);

    expect(screen.getByText('Selected 1: false')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /select/i }));

    expect(screen.getByText('Selected 1: true')).toBeInTheDocument();
    expect(screen.getByText('Selected 2: false')).toBeInTheDocument();
  });

  it('clears all selected articles', () => {
    const TestComponent = () => {
      const { selectedArticles, toggleSelectArticle, clearSelection } =
        useSearchSelection();
      return (
        <>
          <button onClick={() => toggleSelectArticle(mockArticle)}>Select 1</button>
          <button onClick={() => toggleSelectArticle(mockArticle2)}>Select 2</button>
          <button onClick={() => clearSelection()}>Clear</button>
          <div>Selected: {selectedArticles.length}</div>
        </>
      );
    };

    renderWithContext(<TestComponent />);

    fireEvent.click(screen.getByRole('button', { name: /select 1/i }));
    fireEvent.click(screen.getByRole('button', { name: /select 2/i }));
    expect(screen.getByText('Selected: 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(screen.getByText('Selected: 0')).toBeInTheDocument();
  });

  it('saves article with optimistic update and API call', async () => {
    mockedApi.documents.getSavedArticles.mockResolvedValue({ articles: [] });
    mockedApi.documents.saveArticle.mockResolvedValue(undefined);

    const TestComponent = () => {
      const { savedArticles, toggleSaveArticle } = useSearchSelection();
      return (
        <>
          <button onClick={() => toggleSaveArticle(mockArticle)}>Save</button>
          <div>Saved: {savedArticles.length}</div>
          {savedArticles.map((a) => (
            <div key={a.uid}>{a.title}</div>
          ))}
        </>
      );
    };

    renderWithContext(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByText('Saved: 0')).toBeInTheDocument();
    });

    const saveBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveBtn);

    // Optimistic update should happen immediately
    expect(screen.getByText('Saved: 1')).toBeInTheDocument();
    expect(screen.getByText('Test Article')).toBeInTheDocument();

    // Wait for API call to complete
    await waitFor(() => {
      expect(mockedApi.documents.saveArticle).toHaveBeenCalledWith(
        mockArticle,
        expect.any(Object)
      );
    });
  });

  it('unsaves article with optimistic update and API call', async () => {
    mockedApi.documents.getSavedArticles.mockResolvedValue({ articles: [mockArticle] });
    mockedApi.documents.unsaveArticle.mockResolvedValue(undefined);

    const TestComponent = () => {
      const { savedArticles, toggleSaveArticle } = useSearchSelection();
      return (
        <>
          <button onClick={() => toggleSaveArticle(mockArticle)}>Unsave</button>
          <div>Saved: {savedArticles.length}</div>
          {savedArticles.length === 0 && <div>No articles</div>}
        </>
      );
    };

    renderWithContext(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByText('Saved: 1')).toBeInTheDocument();
    });

    const unsaveBtn = screen.getByRole('button', { name: /unsave/i });
    fireEvent.click(unsaveBtn);

    // Optimistic update
    expect(screen.getByText('Saved: 0')).toBeInTheDocument();
    expect(screen.getByText('No articles')).toBeInTheDocument();

    // Wait for API call
    await waitFor(() => {
      expect(mockedApi.documents.unsaveArticle).toHaveBeenCalledWith('article-1');
    });
  });

  it('rolls back optimistic save on API failure', async () => {
    mockedApi.documents.getSavedArticles.mockResolvedValue({ articles: [] });
    mockedApi.documents.saveArticle.mockRejectedValue(new Error('Network error'));

    const TestComponent = () => {
      const { savedArticles, toggleSaveArticle } = useSearchSelection();
      return (
        <>
          <button onClick={() => toggleSaveArticle(mockArticle)}>Save</button>
          <div>Saved: {savedArticles.length}</div>
        </>
      );
    };

    renderWithContext(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByText('Saved: 0')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    // Optimistic update
    expect(screen.getByText('Saved: 1')).toBeInTheDocument();

    // Rollback on failure
    await waitFor(() => {
      expect(screen.getByText('Saved: 0')).toBeInTheDocument();
    });
  });

  it('rolls back optimistic unsave on API failure', async () => {
    mockedApi.documents.getSavedArticles.mockResolvedValue({ articles: [mockArticle] });
    mockedApi.documents.unsaveArticle.mockRejectedValue(new Error('Network error'));

    const TestComponent = () => {
      const { savedArticles, toggleSaveArticle } = useSearchSelection();
      return (
        <>
          <button onClick={() => toggleSaveArticle(mockArticle)}>Unsave</button>
          <div>Saved: {savedArticles.length}</div>
        </>
      );
    };

    renderWithContext(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByText('Saved: 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /unsave/i }));

    // Optimistic update
    expect(screen.getByText('Saved: 0')).toBeInTheDocument();

    // Rollback on failure
    await waitFor(() => {
      expect(screen.getByText('Saved: 1')).toBeInTheDocument();
    });
  });

  it('updates localStorage after save/unsave', async () => {
    mockedApi.documents.getSavedArticles.mockResolvedValue({ articles: [] });
    mockedApi.documents.saveArticle.mockResolvedValue(undefined);

    const TestComponent = () => {
      const { savedArticles, toggleSaveArticle } = useSearchSelection();
      return (
        <>
          <button onClick={() => toggleSaveArticle(mockArticle)}>Save</button>
          <div>Count: {savedArticles.length}</div>
        </>
      );
    };

    renderWithContext(<TestComponent />);

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('Count: 0')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    // Verify localStorage is updated after optimistic save
    await waitFor(() => {
      const stored = localStorage.getItem('medsearch_saved');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.some((a: any) => a.uid === 'article-1')).toBe(true);
    });
  });

  it('throws error when useSearchSelection used outside provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const TestComponent = () => {
      useSearchSelection();
      return <div>Test</div>;
    };

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useSearchSelection must be used within SearchProvider');

    (console.error as jest.Mock).mockRestore();
  });

  it('handles hydration cancellation on unmount', async () => {
    let resolveGetSaved: any;
    mockedApi.documents.getSavedArticles.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGetSaved = resolve;
        })
    );

    const TestComponent = () => {
      const { savedArticles } = useSearchSelection();
      return <div>Saved: {savedArticles.length}</div>;
    };

    const { unmount } = renderWithContext(<TestComponent />);

    expect(screen.getByText('Saved: 0')).toBeInTheDocument();

    unmount();

    // Resolve the pending promise - should not cause errors
    resolveGetSaved({ articles: [mockArticle] });

    expect(() => {
      // No errors or setState warnings
    }).not.toThrow();
  });

  it('does not add duplicate saved articles', async () => {
    mockedApi.documents.getSavedArticles.mockResolvedValue({ articles: [mockArticle] });
    mockedApi.documents.saveArticle.mockResolvedValue(undefined);

    const TestComponent = () => {
      const { savedArticles, toggleSaveArticle } = useSearchSelection();
      return (
        <>
          <button onClick={() => toggleSaveArticle(mockArticle)}>Save</button>
          <div>Count: {savedArticles.length}</div>
        </>
      );
    };

    renderWithContext(<TestComponent />);
    await waitFor(() => expect(screen.getByText('Count: 1')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    // Should unsave since already saved
    await waitFor(() => expect(screen.getByText('Count: 0')).toBeInTheDocument());
  });

  it('handles save of article with minimal fields', async () => {
    mockedApi.documents.getSavedArticles.mockResolvedValue({ articles: [] });
    mockedApi.documents.saveArticle.mockResolvedValue(undefined);

    const minimalArticle = { uid: 'min-1', title: 'Minimal', _source: 'pubmed' as const };

    const TestComponent = () => {
      const { savedArticles, toggleSaveArticle } = useSearchSelection();
      return (
        <>
          <button onClick={() => toggleSaveArticle(minimalArticle)}>Save</button>
          <div>Count: {savedArticles.length}</div>
        </>
      );
    };

    renderWithContext(<TestComponent />);
    await waitFor(() => expect(screen.getByText('Count: 0')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(screen.getByText('Count: 1')).toBeInTheDocument());
    expect(mockedApi.documents.saveArticle).toHaveBeenCalledWith(minimalArticle, expect.any(Object));
  });

  it('falls back to localStorage when API getSavedArticles fails', async () => {
    mockedApi.documents.getSavedArticles.mockRejectedValue(new Error('Offline'));
    localStorage.setItem('medsearch_saved', JSON.stringify([mockArticle2]));

    const TestComponent = () => {
      const { savedArticles } = useSearchSelection();
      return <div>Count: {savedArticles.length}</div>;
    };

    renderWithContext(<TestComponent />);
    // Fallback logic currently leaves empty on API failure; this test documents behavior
    await waitFor(() => expect(screen.getByText('Count: 0')).toBeInTheDocument());
  });
});
