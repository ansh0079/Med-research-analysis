import { useCallback, useEffect, useRef, useState } from 'react';

type PollingState = 'idle' | 'polling' | 'ready' | 'failed' | 'timeout';

interface UsePollingOptions<T> {
  /** Delays in ms between attempts. */
  delays: number[];
  /** Called on each attempt. Should return the result or throw. */
  fetcher: () => Promise<T>;
  /** Returns true when polling should stop with success. */
  isComplete: (result: T) => boolean;
  /** Optional callback when polling succeeds. */
  onSuccess?: (result: T) => void;
  /** Optional callback when polling exhausts all attempts without success. */
  onTimeout?: () => void;
  /** Optional callback when fetcher throws. */
  onError?: (error: unknown) => void;
}

interface UsePollingReturn {
  state: PollingState;
  start: () => void;
  stop: () => void;
  attempt: number;
}

/**
 * Explicit state-driven polling hook.
 *
 * Replaces recursive setTimeout patterns with a useEffect-driven state machine.
 * The effect schedules the next delay only when the polling state is 'polling'.
 * All dynamic callbacks are kept fresh via refs so the timer is never torn down
 * just because a closure changed.
 */
export function usePolling<T>(options: UsePollingOptions<T>): UsePollingReturn {
  const { delays } = options;

  const [state, setState] = useState<PollingState>('idle');
  const [attempt, setAttempt] = useState(0);
  const activeRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const start = useCallback(() => {
    setAttempt(0);
    setState('polling');
    activeRef.current = true;
  }, []);

  const stop = useCallback(() => {
    activeRef.current = false;
    setState('idle');
  }, []);

  useEffect(() => {
    if (state !== 'polling') return;
    if (attempt >= delays.length) {
      setState('timeout');
      optionsRef.current.onTimeout?.();
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled || !activeRef.current) return;
      try {
        const result = await optionsRef.current.fetcher();
        if (cancelled || !activeRef.current) return;
        if (optionsRef.current.isComplete(result)) {
          setState('ready');
          optionsRef.current.onSuccess?.(result);
          return;
        }
        setAttempt((prev) => prev + 1);
      } catch (err) {
        if (cancelled || !activeRef.current) return;
        optionsRef.current.onError?.(err);
        setAttempt((prev) => prev + 1);
      }
    }, delays[attempt]);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [state, attempt, delays]);

  return { state, start, stop, attempt };
}
