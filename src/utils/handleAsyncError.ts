export const ASYNC_ERROR_EVENT = 'med:async-error';

export interface AsyncErrorDetail {
  error: unknown;
  context: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === 'string') return error || fallback;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message || fallback;
  }
  return fallback;
}

/**
 * Central handler for async errors that were previously swallowed with
 * `.catch(() => undefined)`.
 *
 * - In development: logs the full error to the console for debugging.
 * - In production: dispatches a non-blocking toast via the global async-error
 *   event so App.tsx can surface it to the user.
 */
function isDev(): boolean {
  return typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
}

/**
 * Dev-only logging for background/fire-and-forget calls (prefetch, telemetry,
 * best-effort enrichment) where a user-facing toast would be noise rather
 * than help. Replaces bare `.catch(() => undefined)` so failures are at
 * least visible in development instead of silently swallowed everywhere.
 */
export function logAsyncError(error: unknown, context: string): void {
  if (isDev()) {
    console.warn(`[${context}]`, error);
  }
}

export function handleAsyncError(error: unknown, context: string): void {
  if (isDev()) {
    console.warn(`[${context}]`, error);
  }

  const message = getErrorMessage(error, 'Something went wrong. Please try again.');
  const detail: AsyncErrorDetail = { error, context };

  window.dispatchEvent(
    new CustomEvent(ASYNC_ERROR_EVENT, { detail })
  );

  // Also report to any global error reporter without blocking.
  if (typeof window.reportError === 'function') {
    const wrapped = error instanceof Error ? error : new Error(message);
    try {
      window.reportError(wrapped);
    } catch {
      // Ignore failures from the reporter itself.
    }
  }
}
