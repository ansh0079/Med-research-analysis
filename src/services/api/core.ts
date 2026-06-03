import * as Sentry from '@sentry/react';
import type { Scope } from '@sentry/react';

export const API_BASE = import.meta.env.VITE_API_URL || '';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  emailVerified?: boolean;
}

if (import.meta.env.VITE_SENTRY_DSN) {
  const tracesSampleRate = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1);
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0.1,
  });
}

class SimpleLRUCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();
  private readonly maxSize: number;
  private readonly defaultTtlMs: number;

  constructor(maxSize: number, defaultTtlMs: number) {
    this.maxSize = maxSize;
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, { value, expiry: Date.now() + (ttlMs ?? this.defaultTtlMs) });
  }

  clear(): void {
    this.cache.clear();
  }
}

export class BaseApiClient {
  private cache = new SimpleLRUCache<unknown>(100, 5 * 60 * 1000);
  private sessionId: string | null = null;
  private clientConfig: { features?: { vectorSearch?: boolean } } | null = null;
  private clientConfigFetchedAt = 0;
  private readonly clientConfigTtlMs = 60_000;

  constructor() {
    try {
      this.sessionId = localStorage.getItem('med_research_session');
    } catch {
      this.sessionId = null;
    }
  }

  async getClientConfig(): Promise<{ features?: { vectorSearch?: boolean } }> {
    if (this.clientConfig && Date.now() - this.clientConfigFetchedAt < this.clientConfigTtlMs) {
      return this.clientConfig;
    }
    const response = await this.fetchWithSession(`${API_BASE}/api/config`);
    if (!response.ok) {
      return { features: {} };
    }
    const data = (await response.json()) as { features?: { vectorSearch?: boolean } };
    this.clientConfig = data;
    this.clientConfigFetchedAt = Date.now();
    return data;
  }

  protected async fetchWithSession(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers);
    if (this.sessionId) {
      headers.set('X-Session-Id', this.sessionId);
    }
    // Required by the server-side CSRF origin check on state-changing requests
    headers.set('X-Requested-With', 'XMLHttpRequest');
    const response = await fetch(url, { ...options, headers, credentials: 'include' });
    const clonedResponse = response.clone();
    
    const serverSession = response.headers.get('X-Session-Id');
    if (serverSession && serverSession !== this.sessionId) {
      this.sessionId = serverSession;
      try {
        localStorage.setItem('med_research_session', serverSession);
      } catch {
        // ignore storage errors
      }
    }

    return clonedResponse;
  }

  protected async parseErrorResponse(response: Response): Promise<never> {
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (response.status === 429) {
      const data = await response.json().catch(() => ({})) as { retryAfter?: number };
      const secs = data.retryAfter ?? 60;
      throw new Error(`RATE_LIMITED:${secs}`);
    }
    if (response.status === 402) {
      const data = await response.json().catch(() => ({})) as { feature?: string };
      throw new Error(`UPGRADE_REQUIRED:${data.feature ?? 'premium'}`);
    }
    const err = await response.json().catch(() => ({})) as { error?: string; message?: string; feature?: string };
    if (response.status === 403) {
      const msg = String(err.error || err.message || '').toLowerCase();
      if ((err as { verificationRequired?: boolean }).verificationRequired) {
        throw new Error('VERIFICATION_REQUIRED');
      }
      if (msg.includes('insufficient') || msg.includes('forbidden') || msg.includes('premium')) {
        throw new Error(`UPGRADE_REQUIRED:${err.feature ?? 'aiSynthesis'}`);
      }
    }
    throw new Error(err.error || err.message || `Request failed (${response.status})`);
  }

  protected async withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (import.meta.env.VITE_SENTRY_DSN) {
        Sentry.withScope((scope: Scope) => {
          scope.setExtra('retryCount', retries);
          scope.setExtra('delay', delay);
          Sentry.captureException(error);
        });
      }
      // Don't retry non-retriable errors
      if (error instanceof Error &&
        (error.message === 'AUTH_REQUIRED' ||
         error.message.startsWith('RATE_LIMITED:') ||
         error.message.startsWith('UPGRADE_REQUIRED:') ||
         error.message === 'VERIFICATION_REQUIRED')) throw error;
      if (retries === 0) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.withRetry(fn, retries - 1, delay * 2);
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  protected setCache<T>(key: string, value: T, ttlMs?: number): void {
    this.cache.set(key, value, ttlMs);
  }

  protected getCache<T>(key: string): T | null {
    const value = this.cache.get(key);
    return value !== undefined ? (value as T) : null;
  }
}
