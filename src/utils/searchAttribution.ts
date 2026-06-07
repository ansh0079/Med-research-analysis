/**
 * Persist search→quiz attribution (decisionId / banditArmId) for reward closure.
 */

export interface SearchAttributionEntry {
  articleUid: string;
  decisionId?: number | null;
  banditArmId?: string | null;
}

const STORAGE_KEY = 'med_search_attribution';

interface StoredAttribution {
  searchId: number;
  entries: SearchAttributionEntry[];
  storedAt: number;
}

export function storeSearchAttribution(searchId: number, entries: SearchAttributionEntry[]): void {
  if (!searchId || !entries.length) return;
  try {
    const payload: StoredAttribution = {
      searchId,
      entries: entries.filter((e) => e.articleUid),
      storedAt: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

export function storeSearchAttributionFromArticles(
  searchId: number,
  articles: Array<{ uid?: string; _decisionId?: number | null; _banditArmId?: string | null }>
): void {
  const entries = articles
    .filter((a) => a.uid && (a._decisionId != null || a._banditArmId))
    .map((a) => ({
      articleUid: a.uid!,
      decisionId: a._decisionId ?? null,
      banditArmId: a._banditArmId ?? null,
    }));
  storeSearchAttribution(searchId, entries);
}

export function lookupArticleAttribution(articleUid: string): {
  searchId?: number;
  decisionId?: number;
  banditArmId?: string;
} | null {
  if (!articleUid) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAttribution;
    const key = articleUid.trim().toLowerCase();
    const entry = parsed.entries.find((e) => e.articleUid.trim().toLowerCase() === key);
    if (!entry) return null;
    return {
      searchId: parsed.searchId,
      decisionId: entry.decisionId ?? undefined,
      banditArmId: entry.banditArmId ?? undefined,
    };
  } catch {
    return null;
  }
}
