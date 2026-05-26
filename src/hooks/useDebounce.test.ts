import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('debounces string values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 500 } }
    );

    expect(result.current).toBe('hello');

    // Change value
    rerender({ value: 'world', delay: 500 });
    expect(result.current).toBe('hello'); // Still old value

    // Advance timer halfway
    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(result.current).toBe('hello'); // Still old value

    // Advance timer to complete
    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(result.current).toBe('world'); // Updated
  });

  it('debounces number values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 42, delay: 300 } }
    );

    expect(result.current).toBe(42);

    rerender({ value: 100, delay: 300 });
    expect(result.current).toBe(42);

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe(100);
  });

  it('debounces boolean values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: true, delay: 200 } }
    );

    expect(result.current).toBe(true);

    rerender({ value: false, delay: 200 });
    expect(result.current).toBe(true);

    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe(false);
  });

  it('debounces object values', () => {
    const obj1 = { name: 'John' };
    const obj2 = { name: 'Jane' };

    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: obj1, delay: 400 } }
    );

    expect(result.current).toBe(obj1);

    rerender({ value: obj2, delay: 400 });
    expect(result.current).toBe(obj1);

    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(result.current).toBe(obj2);
  });

  it('resets timer when value changes before delay completes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'first', delay: 500 } }
    );

    // Change value after 300ms
    act(() => {
      jest.advanceTimersByTime(300);
    });
    rerender({ value: 'second', delay: 500 });

    // Wait 400ms more (total 700ms)
    act(() => {
      jest.advanceTimersByTime(400);
    });
    // Should still be 'first' because timer was reset
    expect(result.current).toBe('first');

    // Wait another 100ms to complete the 500ms delay for 'second'
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe('second');
  });

  it('respects different delay values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 200 } }
    );

    rerender({ value: 'updated', delay: 200 });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe('updated');

    // Change to different delay
    rerender({ value: 'third', delay: 1000 });
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe('updated'); // Still waiting for 1000ms

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe('third'); // Now updated
  });

  it('handles rapid successive changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 100 } }
    );

    // Rapidly change values
    rerender({ value: 'b', delay: 100 });
    act(() => {
      jest.advanceTimersByTime(30);
    });

    rerender({ value: 'c', delay: 100 });
    act(() => {
      jest.advanceTimersByTime(30);
    });

    rerender({ value: 'd', delay: 100 });
    act(() => {
      jest.advanceTimersByTime(30);
    });

    // Only after 100ms from last change should it update
    expect(result.current).toBe('a');

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe('d');
  });

  it('cleans up timers on unmount', () => {
    const { unmount } = renderHook(() => useDebounce('test', 500));

    const clearSpy = jest.spyOn(global, 'clearTimeout');
    unmount();

    expect(clearSpy).toHaveBeenCalled();
  });
});
