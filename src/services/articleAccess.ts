import type { Article } from '@types';

export function normalizePmcid(value: unknown): string | null {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const tagged = raw.match(/PMC\s*(\d+)/i);
  if (tagged) return `PMC${tagged[1]}`;
  const digits = raw.match(/\b(\d{5,})\b/);
  if (digits && /pmc/i.test(raw)) return `PMC${digits[1]}`;
  return null;
}

export function pmcFullTextUrl(pmcid: unknown): string | null {
  const id = normalizePmcid(pmcid);
  return id ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${id}/` : null;
}

export function isOpenAccessArticle(article?: Partial<Article> | null): boolean {
  if (!article) return false;
  if (article.isFree || article.openAccess) return true;
  if (normalizePmcid(article.pmcid)) return true;
  if (article.openAccessUrl || article.fullTextUrl) return true;
  return false;
}

export function resolveFreeFullTextUrl(article?: Partial<Article> | null): string | null {
  if (!article) return null;
  return pmcFullTextUrl(article.pmcid)
    || (article.fullTextUrl ? String(article.fullTextUrl) : null)
    || (article.openAccessUrl ? String(article.openAccessUrl) : null)
    || null;
}
