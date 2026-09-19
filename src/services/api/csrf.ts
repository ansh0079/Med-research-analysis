import { API_BASE } from './core';

let cachedToken: string | null = null;
let cachedForSession: string | null = null;
let fetching: Promise<string> | null = null;

function getStoredSessionId(): string | null {
  try {
    const v = localStorage.getItem('med_research_session');
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

function setStoredSessionId(id: string): void {
  try {
    localStorage.setItem('med_research_session', id);
  } catch {
    // ignore
  }
}

export async function getCsrfToken(): Promise<string> {
  const sid = getStoredSessionId();
  if (cachedToken && cachedForSession === sid) return cachedToken;
  if (fetching) return fetching;
  fetching = (async () => {
    try {
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (sid) headers['X-Session-Id'] = sid;
      const res = await fetch(`${API_BASE}/api/csrf-token`, {
        method: 'GET',
        credentials: 'include',
        headers,
      });
      if (!res.ok) throw new Error(`Failed to obtain CSRF token (${res.status})`);
      const serverSid = res.headers.get('X-Session-Id');
      if (serverSid && serverSid !== sid) {
        // Session rotated/initialized — update storage and drop any cached token.
        setStoredSessionId(serverSid);
        cachedToken = null;
        cachedForSession = null;
      }
      const data = (await res.json()) as { csrfToken?: string };
      if (typeof data.csrfToken !== 'string' || !data.csrfToken) {
        throw new Error('Empty CSRF token from server');
      }
      cachedToken = data.csrfToken;
      cachedForSession = getStoredSessionId();
      return cachedToken;
    } catch (err) {
      // Fail clearly — callers should surface/handle this.
      throw err instanceof Error ? err : new Error('CSRF token unavailable');
    } finally {
      fetching = null;
    }
  })();
  return fetching;
}

export function clearCsrfToken(): void {
  cachedToken = null;
  cachedForSession = null;
}

