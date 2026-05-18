import type { Article } from '@types';

type ArticleLinkInfo = {
  primaryUrl: string;
  primaryLabel: string;
  sourceLabel: string;
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
  const source = article._source;
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
