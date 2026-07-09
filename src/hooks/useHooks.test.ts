import { renderHook, act } from '@testing-library/react';
import { useSelectionBasket } from './useSelectionBasket';

describe('useSelectionBasket', () => {

  const a = (uid: string, n: number) => ({ uid, title: `Article ${n}`, id: String(n), _source: 'pubmed' }) as any;
  const mockArticle1 = a('a1', 1);
  const mockArticle2 = a('a2', 2);
  const mockArticle3 = a('a3', 3);
  const mockArticle4 = a('a4', 4);
  const mockArticle5 = a('a5', 5);
  const mockArticle6 = a('a6', 6);

  it('initializes with empty selection', () => {
    const { result } = renderHook(() => useSelectionBasket());
    expect(result.current.selectedArticles).toEqual([]);
  });

  it('toggles article selection', () => {
    const { result } = renderHook(() => useSelectionBasket());

    act(() => {
      result.current.toggleArticle(mockArticle1);
    });

    expect(result.current.selectedArticles).toEqual([mockArticle1]);

    act(() => {
      result.current.toggleArticle(mockArticle1);
    });

    expect(result.current.selectedArticles).toEqual([]);
  });

  it('selects multiple articles up to limit (5)', () => {
    const { result } = renderHook(() => useSelectionBasket());

    act(() => {
      result.current.toggleArticle(mockArticle1);
      result.current.toggleArticle(mockArticle2);
      result.current.toggleArticle(mockArticle3);
      result.current.toggleArticle(mockArticle4);
      result.current.toggleArticle(mockArticle5);
    });

    expect(result.current.selectedArticles).toHaveLength(5);
    expect(result.current.selectedArticles).toContainEqual(mockArticle1);
    expect(result.current.selectedArticles).toContainEqual(mockArticle5);
  });

  it('does not exceed 5 article limit', () => {
    const { result } = renderHook(() => useSelectionBasket());

    act(() => {
      result.current.toggleArticle(mockArticle1);
      result.current.toggleArticle(mockArticle2);
      result.current.toggleArticle(mockArticle3);
      result.current.toggleArticle(mockArticle4);
      result.current.toggleArticle(mockArticle5);
      result.current.toggleArticle(mockArticle6);
    });

    expect(result.current.selectedArticles).toHaveLength(5);
    expect(result.current.selectedArticles).not.toContainEqual(mockArticle6);
  });

  it('calls onLimitReached when trying to exceed limit', () => {
    const onLimitReached = jest.fn();
    const { result } = renderHook(() =>
      useSelectionBasket({ onLimitReached })
    );

    act(() => {
      result.current.toggleArticle(mockArticle1);
      result.current.toggleArticle(mockArticle2);
      result.current.toggleArticle(mockArticle3);
      result.current.toggleArticle(mockArticle4);
      result.current.toggleArticle(mockArticle5);
      result.current.toggleArticle(mockArticle6);
    });

    expect(onLimitReached).toHaveBeenCalledTimes(1);
  });

  it('removes article by UID', () => {
    const { result } = renderHook(() => useSelectionBasket());

    act(() => {
      result.current.toggleArticle(mockArticle1);
      result.current.toggleArticle(mockArticle2);
    });

    expect(result.current.selectedArticles).toHaveLength(2);

    act(() => {
      result.current.removeArticle('a1');
    });

    expect(result.current.selectedArticles).toHaveLength(1);
    expect(result.current.selectedArticles).toContainEqual(mockArticle2);
  });

  it('clears all articles from basket', () => {
    const { result } = renderHook(() => useSelectionBasket());

    act(() => {
      result.current.toggleArticle(mockArticle1);
      result.current.toggleArticle(mockArticle2);
      result.current.toggleArticle(mockArticle3);
    });

    expect(result.current.selectedArticles).toHaveLength(3);

    act(() => {
      result.current.clearBasket();
    });

    expect(result.current.selectedArticles).toEqual([]);
  });

  it('checks if article is selected', () => {
    const { result } = renderHook(() => useSelectionBasket());

    act(() => {
      result.current.toggleArticle(mockArticle1);
    });

    expect(result.current.isSelected('a1')).toBe(true);
    expect(result.current.isSelected('a2')).toBe(false);
  });

  it('maintains article order', () => {
    const { result } = renderHook(() => useSelectionBasket());

    act(() => {
      result.current.toggleArticle(mockArticle1);
      result.current.toggleArticle(mockArticle2);
      result.current.toggleArticle(mockArticle3);
    });

    expect(result.current.selectedArticles[0].uid).toBe('a1');
    expect(result.current.selectedArticles[1].uid).toBe('a2');
    expect(result.current.selectedArticles[2].uid).toBe('a3');
  });

  it('handles selective removal preserving order', () => {
    const { result } = renderHook(() => useSelectionBasket());

    act(() => {
      result.current.toggleArticle(mockArticle1);
      result.current.toggleArticle(mockArticle2);
      result.current.toggleArticle(mockArticle3);
    });

    act(() => {
      result.current.removeArticle('a2');
    });

    expect(result.current.selectedArticles).toEqual([mockArticle1, mockArticle3]);
  });

  it('handles updating onLimitReached callback', () => {
    const onLimitReached1 = jest.fn();
    const { result, rerender } = renderHook(
      (options) => useSelectionBasket(options),
      { initialProps: { onLimitReached: onLimitReached1 } }
    );

    // Fill basket to 5 articles
    act(() => {
      result.current.toggleArticle(mockArticle1);
      result.current.toggleArticle(mockArticle2);
      result.current.toggleArticle(mockArticle3);
      result.current.toggleArticle(mockArticle4);
      result.current.toggleArticle(mockArticle5);
    });

    expect(result.current.selectedArticles).toHaveLength(5);

    // Try to add 6th article (should trigger onLimitReached1)
    act(() => {
      result.current.toggleArticle(mockArticle6);
    });

    expect(onLimitReached1).toHaveBeenCalledTimes(1);

    const onLimitReached2 = jest.fn();
    rerender({ onLimitReached: onLimitReached2 });

    // Basket still has 5 articles, try to add another 6th (should trigger onLimitReached2)
    act(() => {
      result.current.toggleArticle(mockArticle6);
    });

    expect(onLimitReached2).toHaveBeenCalledTimes(1);
  });
});
