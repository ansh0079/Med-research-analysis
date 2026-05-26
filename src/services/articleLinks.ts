import type { Article } from '@types';

type ArticleLinkInfo = {
  primaryUrl: string;
  primaryLabel: string;
  sourceLabel: string;
};

type ArticleSourceBadgeInfo = {
  key: string;
  label: string;
  className: string;
};

const SOURCE_BADGES: Record<string, ArticleSourceBadgeInfo> = {
  pubmed: {
    key: 'pubmed',
    label: 'PubMed',
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800',
  },
  semantic: {
    key: 'semantic',
    label: 'Semantic Scholar',
    className: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-800',
  },
  openalex: {
    key: 'openalex',
    label: 'OpenAlex',
    className: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-800',
  },
  crossref: {
    key: 'crossref',
    label: 'Crossref',
    className: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700',
  },
};

const withProtocol = (value: string): string => {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
};

const normalizePmid = (uid: string): string => {
  if (uid.startsWith('pubmed-')) return uid.slice('pubmed-'.length);
  return uid;
};

export function getArticleLinkInfo(article: Article): ArticleLinkInfo {
  const source = getArticleSourceBadgeInfo(article).key;
  const safeUid = String(article.uid || '').trim();
  const doi = String(article.doi || '').trim();

  if (source === 'pubmed') {
    const pmid = normalizePmid(safeUid);
    return {
      primaryUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      primaryLabel: 'PubMed',
      sourceLabel: 'PubMed',
    };
  }

  if (source === 'semantic') {
    return {
      primaryUrl: `https://www.semanticscholar.org/paper/${encodeURIComponent(safeUid)}`,
      primaryLabel: 'Semantic Scholar',
      sourceLabel: 'Semantic Scholar',
    };
  }

  if (source === 'openalex') {
    const openAlexUrl = safeUid.includes('openalex.org') ? safeUid : `https://openalex.org/${safeUid}`;
    return {
      primaryUrl: withProtocol(openAlexUrl),
      primaryLabel: 'OpenAlex',
      sourceLabel: 'OpenAlex',
    };
  }

  if (source === 'crossref') {
    const crossrefDoi = doi || safeUid;
    return {
      primaryUrl: `https://doi.org/${encodeURIComponent(crossrefDoi)}`,
      primaryLabel: 'DOI',
      sourceLabel: 'Crossref',
    };
  }

  const fallbackDoi = doi || safeUid;
  return {
    primaryUrl: `https://doi.org/${encodeURIComponent(fallbackDoi)}`,
    primaryLabel: 'Source',
    sourceLabel: source || 'Source',
  };
}

export function getArticleSourceBadgeInfo(article: Article): ArticleSourceBadgeInfo {
  const rawSource = String(article._source || '').toLowerCase().trim();
  const sourceText = `${rawSource} ${article.uid || ''} ${article.source || ''} ${article.journal || ''}`.toLowerCase();

  if (rawSource in SOURCE_BADGES) return SOURCE_BADGES[rawSource];
  if (sourceText.includes('pubmed') || /\bpmid\b/.test(sourceText) || article.pmid) return SOURCE_BADGES.pubmed;
  if (sourceText.includes('semantic')) return SOURCE_BADGES.semantic;
  if (sourceText.includes('openalex')) return SOURCE_BADGES.openalex;
  if (sourceText.includes('crossref')) return SOURCE_BADGES.crossref;

  return {
    key: rawSource || 'source',
    label: rawSource ? rawSource.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Source',
    className: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700',
  };
}
