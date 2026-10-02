import type { Article, SynthesisResult } from '@types';

/** Rebuild the exact server citation order from result.sources. */
export function resolveSynthesisArticles(result: SynthesisResult, available: Article[]): Article[] {
  if (!result.sources?.length) return available.slice(0, result.articleCount || available.length);
  return [...result.sources]
    .sort((a, b) => a.studyIndex - b.studyIndex)
    .map((source) => {
      const match = available.find((article) => (
        article.uid === source.uid
        || (source.pmid && article.pmid === source.pmid)
        || (source.doi && article.doi?.toLowerCase() === source.doi.toLowerCase())
      ));
      if (match) return match;
      return {
        uid: source.uid,
        title: source.title,
        doi: source.doi || undefined,
        pmid: source.pmid || undefined,
        pubdate: source.pubdate || undefined,
        source: source.source || undefined,
        _source: 'pubmed',
      } as Article;
    });
}
