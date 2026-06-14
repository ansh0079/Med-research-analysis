import * as Sentry from '@sentry/react';
import type { Scope } from '@sentry/react';
import { AppError, parseApiErrorBody } from '@utils/appErrors';
import { buildUsageLimitError, type UsageLimitInfo } from '@utils/usageErrors';

export const API_BASE = import.meta.env.VITE_API_URL || '';
export const USAGE_HEADER_EVENT = 'medsearch:usage-headers';

export interface UsageHeaderDetail {
  kind: 'usage' | 'search';
  limitKey: string;
  feature: string;
  used: number;
  cap: number;
  url: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  emailVerified?: boolean;
  subscriptionPlan?: string;
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
  private requestId: string | null = null;
  private clientConfig: {
    features?: { vectorSearch?: boolean; betaMode?: boolean };
    betaMode?: boolean;
    betaOpenAccess?: boolean;
  } | null = null;
  private clientConfigFetchedAt = 0;
  private readonly clientConfigTtlMs = 60_000;
  private refreshInFlight: Promise<boolean> | null = null;

  constructor() {
    try {
      this.sessionId = localStorage.getItem('med_research_session');
      this.requestId = localStorage.getItem('med_research_request_id');
    } catch {
      this.sessionId = null;
      this.requestId = null;
    }
    if (!this.requestId) {
      this.requestId = crypto.randomUUID();
      try {
        localStorage.setItem('med_research_request_id', this.requestId);
      } catch {
        // ignore storage errors
      }
    }
  }

  private ensureRequestId(): string {
    if (!this.requestId) {
      this.requestId = crypto.randomUUID();
    }
    return this.requestId;
  }

  async getClientConfig(): Promise<{
    features?: { vectorSearch?: boolean; betaMode?: boolean };
    betaMode?: boolean;
    betaOpenAccess?: boolean;
  }> {
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

  private shouldAttemptRefresh(url: string, response: Response): boolean {
    if (response.status !== 401) return false;
    if (url.includes('/api/auth/login')
      || url.includes('/api/auth/register')
      || url.includes('/api/auth/refresh')
      || url.includes('/api/auth/logout')) {
      return false;
    }
    return true;
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Request-Id': this.ensureRequestId(),
          },
          credentials: 'include',
        });
        return response.ok;
      } catch {
        return false;
      } finally {
        this.refreshInFlight = null;
      }
    })();
    return this.refreshInFlight;
  }

  protected async fetchWithSession(url: string, options: RequestInit = {}, signal?: AbortSignal): Promise<Response> {
    const headers = new Headers(options.headers);
    if (this.sessionId) {
      headers.set('X-Session-Id', this.sessionId);
    }
    headers.set('X-Request-Id', this.ensureRequestId());
    // Required by the server-side CSRF origin check on state-changing requests
    headers.set('X-Requested-With', 'XMLHttpRequest');
    const fetchOpts = { ...options, headers, credentials: 'include' as const, ...(signal ? { signal } : {}) };
    let response = await fetch(url, fetchOpts);

    if (this.shouldAttemptRefresh(url, response)) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        response = await fetch(url, fetchOpts);
      }
    }
    const clonedResponse = response.clone();

    const serverRequestId = response.headers.get('X-Request-Id');
    if (serverRequestId && serverRequestId !== this.requestId) {
      this.requestId = serverRequestId;
      try {
        localStorage.setItem('med_research_request_id', serverRequestId);
      } catch {
        // ignore storage errors
      }
    }
    
    const serverSession = response.headers.get('X-Session-Id');
    if (serverSession && serverSession !== this.sessionId) {
      this.sessionId = serverSession;
      try {
        localStorage.setItem('med_research_session', serverSession);
      } catch {
        // ignore storage errors
      }
    }

    this.emitUsageHeaderEvent(clonedResponse, url);

    return clonedResponse;
  }

  private emitUsageHeaderEvent(response: Response, url: string): void {
    if (typeof window === 'undefined') return;

    const maybeEmit = (
      kind: UsageHeaderDetail['kind'],
      usedHeader: string,
      limitHeader: string,
      keyHeader: string,
      featureHeader: string,
      fallbackKey: string
    ) => {
      const used = Number(response.headers.get(usedHeader));
      const cap = Number(response.headers.get(limitHeader));
      if (!Number.isFinite(used) || !Number.isFinite(cap) || cap <= 0) return;

      const limitKey = response.headers.get(keyHeader) || fallbackKey;
      const feature = response.headers.get(featureHeader) || limitKey;
      window.dispatchEvent(new CustomEvent<UsageHeaderDetail>(USAGE_HEADER_EVENT, {
        detail: { kind, limitKey, feature, used, cap, url },
      }));
    };

    maybeEmit('usage', 'X-Usage-Used', 'X-Usage-Limit', 'X-Usage-Key', 'X-Usage-Feature', 'aiAnalysesPerMonth');
    maybeEmit('search', 'X-Search-Used', 'X-Search-Limit', 'X-Search-Key', 'X-Search-Feature', 'searchesPerDay');
  }

  protected async parseErrorResponse(response: Response): Promise<never> {
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (response.status === 429) {
      const data = await response.json().catch(() => ({})) as {
        retryAfter?: number;
        limitKey?: string;
        feature?: string;
        used?: number;
        cap?: number;
        plan?: string;
        resetsAt?: string;
        upgradeRequired?: boolean;
        error?: string;
      };
      if (typeof data.limitKey === 'string' && typeof data.cap === 'number' && typeof data.used === 'number') {
        const info: UsageLimitInfo = {
          limitKey: data.limitKey,
          feature: data.feature || data.limitKey,
          used: data.used,
          cap: data.cap,
          plan: data.plan,
          resetsAt: data.resetsAt,
          upgradeRequired: data.upgradeRequired,
        };
        throw new Error(buildUsageLimitError(info));
      }
      const secs = data.retryAfter ?? 60;
      throw new Error(`RATE_LIMITED:${secs}`);
    }
    if (response.status === 402) {
      const data = await response.json().catch(() => ({})) as { feature?: string };
      throw new Error(`UPGRADE_REQUIRED:${data.feature ?? 'premium'}`);
    }
    if (response.status === 503) {
      throw new Error('AI_UNAVAILABLE');
    }
    const err = await response.json().catch(() => ({})) as {
      error?: string;
      message?: string;
      feature?: string;
      code?: string;
      recovery?: string;
      details?: unknown;
      verificationRequired?: boolean;
    };
    if (response.status === 403) {
      const msg = String(err.error || err.message || '').toLowerCase();
      if (err.verificationRequired) {
        throw new Error('VERIFICATION_REQUIRED');
      }
      if (msg.includes('insufficient') || msg.includes('forbidden') || msg.includes('premium')) {
        throw new Error(`UPGRADE_REQUIRED:${err.feature ?? 'aiSynthesis'}`);
      }
    }
    if (err.code || err.recovery) {
      throw parseApiErrorBody(err, response.status);
    }
    throw new AppError(err.error || err.message || `Request failed (${response.status})`, 'INTERNAL_ERROR');
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
         error.message.startsWith('USAGE_LIMITED:') ||
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
