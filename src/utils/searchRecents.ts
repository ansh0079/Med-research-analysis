export const SEARCH_SESSION_HISTORY_KEY = 'medsearch_session_history';

export interface SearchRecentEntry {
  query: string;
  source: 'session' | 'local' | 'account';
}

export function readStoredSessionHistory(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_SESSION_HISTORY_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function writeStoredSessionHistory(entries: string[]): void {
  try {
    localStorage.setItem(SEARCH_SESSION_HISTORY_KEY, JSON.stringify(entries.slice(-8)));
  } catch {
    // ignore
  }
}

export function readLocalTopicRecents(): string[] {
  try {
    const raw = localStorage.getItem('med_recent_topics');
    const parsed = JSON.parse(raw || '[]') as Array<{ query?: string }>;
    return parsed.map((t) => String(t.query || '').trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function mergeSearchRecents(
  session: string[],
  localTopics: string[],
  account: string[],
  limit = 8
): SearchRecentEntry[] {
  const seen = new Set<string>();
  const out: SearchRecentEntry[] = [];
  const add = (query: string, source: SearchRecentEntry['source']) => {
    const q = query.trim();
    const key = q.toLowerCase();
    if (!q || seen.has(key)) return;
    seen.add(key);
    out.push({ query: q, source });
  };
  for (const q of session) add(q, 'session');
  for (const q of localTopics) add(q, 'local');
  for (const q of account) add(q, 'account');
  return out.slice(0, limit);
}
