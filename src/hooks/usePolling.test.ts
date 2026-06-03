import { renderHook, act, waitFor } from '@testing-library/react';
import { usePolling } from './usePolling';

describe('usePolling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('idles until start is called', () => {
    const { result } = renderHook(() =>
      usePolling({
        delays: [100],
        fetcher: jest.fn().mockResolvedValue('ok'),
        isComplete: () => true,
      })
    );
    expect(result.current.state).toBe('idle');
    expect(result.current.attempt).toBe(0);
  });

  it('polls until isComplete returns true', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce('not-ready')
      .mockResolvedValueOnce('ready');

    const { result } = renderHook(() =>
      usePolling({
        delays: [100, 200],
        fetcher,
        isComplete: (r) => r === 'ready',
      })
    );

    act(() => result.current.start());
    expect(result.current.state).toBe('polling');

    // First attempt
    act(() => jest.advanceTimersByTime(100));
    await waitFor(() => expect(result.current.attempt).toBe(1));

    // Second attempt
    act(() => jest.advanceTimersByTime(200));
    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('calls onSuccess when polling completes', async () => {
    const onSuccess = jest.fn();
    const fetcher = jest.fn().mockResolvedValue('done');

    const { result } = renderHook(() =>
      usePolling({
        delays: [50],
        fetcher,
        isComplete: () => true,
        onSuccess,
      })
    );

    act(() => result.current.start());
    act(() => jest.advanceTimersByTime(50));

    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(onSuccess).toHaveBeenCalledWith('done');
  });

  it('times out after exhausting all delays', async () => {
    const onTimeout = jest.fn();
    const fetcher = jest.fn().mockResolvedValue('never-ready');

    const { result } = renderHook(() =>
      usePolling({
        delays: [50, 50],
        fetcher,
        isComplete: () => false,
        onTimeout,
      })
    );

    act(() => result.current.start());
    act(() => jest.advanceTimersByTime(50));
    await waitFor(() => expect(result.current.attempt).toBe(1));

    act(() => jest.advanceTimersByTime(50));
    await waitFor(() => expect(result.current.state).toBe('timeout'));
    expect(onTimeout).toHaveBeenCalled();
  });

  it('stops polling when stop is called', async () => {
    const fetcher = jest.fn().mockResolvedValue('x');

    const { result } = renderHook(() =>
      usePolling({
        delays: [100, 100],
        fetcher,
        isComplete: () => false,
      })
    );

    act(() => result.current.start());
    act(() => result.current.stop());
    expect(result.current.state).toBe('idle');

    // Timer should not fire after stop
    act(() => jest.advanceTimersByTime(200));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('retries on fetcher errors and calls onError', async () => {
    const onError = jest.fn();
    const fetcher = jest
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce('ok');

    const { result } = renderHook(() =>
      usePolling({
        delays: [50, 50],
        fetcher,
        isComplete: (r) => r === 'ok',
        onError,
      })
    );

    act(() => result.current.start());
    act(() => jest.advanceTimersByTime(50));
    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.any(Error)));

    act(() => jest.advanceTimersByTime(50));
    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
