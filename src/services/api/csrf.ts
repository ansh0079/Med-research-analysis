import { API_BASE } from './core';

let cachedToken: string | null = null;
let fetching: Promise<string> | null = null;

export async function getCsrfToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  if (fetching) return fetching;
  fetching = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/csrf-token`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to obtain CSRF token');
      const data = (await res.json()) as { csrfToken?: string };
      cachedToken = typeof data.csrfToken === 'string' ? data.csrfToken : '';
      return cachedToken;
    } catch {
      // Return empty string on failure; server will reject unsafe calls until token is fetched.
      return '';
    } finally {
      fetching = null;
    }
  })();
  return fetching;
}

export function clearCsrfToken(): void {
  cachedToken = null;
}

