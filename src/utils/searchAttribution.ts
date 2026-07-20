/**
 * Persist search→quiz attribution (decisionId / banditArmId) for reward closure.
 */

export interface SearchAttributionEntry {
  articleUid: string;
  /** Alternate keys (pmid, pubmed:id, doi) for cross-surface lookup. */
  aliases?: string[];
  decisionId?: number | null;
  banditArmId?: string | null;
}

const STORAGE_KEY = 'med_search_attribution';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredAttribution {
  searchId: number;
  entries: SearchAttributionEntry[];
  storedAt: number;
}

/** Normalize article identifiers so pubmed:123 / 123 / PMID:123 match. */
export function normalizeAttributionKey(raw: string): string {
  let key = String(raw || '').trim().toLowerCase();
  if (!key) return '';
  key = key.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  key = key.replace(/^pmid:\s*/i, '');
  key = key.replace(/^pubmed:\s*/i, '');
  return key;
}

function entryKeys(entry: SearchAttributionEntry): string[] {
  const keys = [entry.articleUid, ...(entry.aliases || [])]
    .map(normalizeAttributionKey)
    .filter(Boolean);
  return [...new Set(keys)];
}

export function storeSearchAttribution(searchId: number, entries: SearchAttributionEntry[]): void {
  if (!searchId || !entries.length) return;
  try {
    const payload: StoredAttribution = {
      searchId,
      entries: entries.filter((e) => e.articleUid),
      storedAt: Date.now(),
    };
    const serialized = JSON.stringify(payload);
    sessionStorage.setItem(STORAGE_KEY, serialized);
    // Mirror to localStorage so quiz in a new tab can still close the reward loop.
    try {
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch {
      /* ignore quota */
    }
  } catch {
    /* ignore quota / private mode */
  }
}

export function storeSearchAttributionFromArticles(
  searchId: number,
  articles: Array<{
    uid?: string;
    pmid?: string | null;
    doi?: string | null;
    _decisionId?: number | null;
    _banditArmId?: string | null;
  }>
): void {
  const entries = articles
    .filter((a) => a.uid && (a._decisionId != null || a._banditArmId))
    .map((a) => {
      const aliases: string[] = [];
      if (a.pmid) {
        aliases.push(String(a.pmid), `pubmed:${a.pmid}`, `pmid:${a.pmid}`);
      }
      if (a.doi) aliases.push(String(a.doi));
      return {
        articleUid: a.uid!,
        aliases,
        decisionId: a._decisionId ?? null,
        banditArmId: a._banditArmId ?? null,
      };
    });
  storeSearchAttribution(searchId, entries);
}

function readStoredAttribution(): StoredAttribution | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAttribution;
    if (!parsed?.entries?.length) return null;
    if (parsed.storedAt && Date.now() - parsed.storedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function lookupArticleAttribution(articleUid: string): {
  searchId?: number;
  decisionId?: number;
  banditArmId?: string;
} | null {
  if (!articleUid) return null;
  const parsed = readStoredAttribution();
  if (!parsed) return null;
  const key = normalizeAttributionKey(articleUid);
  const entry = parsed.entries.find((e) => entryKeys(e).includes(key));
  if (!entry) return null;
  return {
    searchId: parsed.searchId,
    decisionId: entry.decisionId ?? undefined,
    banditArmId: entry.banditArmId ?? undefined,
  };
}
