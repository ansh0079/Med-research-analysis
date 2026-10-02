import React from 'react';
import { api } from '@services/api';
import type { Article, GuidelineWorkspaceSummary } from '@types';

function isGuidelineDocument(article: Article): boolean {
  if (article._evidenceLane === 'guidelines') return true;
  return (article.pubtype || []).some((type) => /guideline|consensus|statement/i.test(String(type || '')));
}

export function useGuidelineWorkspaceSummary(query: string, articles: Article[]): GuidelineWorkspaceSummary {
  const documentCount = React.useMemo(
    () => articles.filter(isGuidelineDocument).length,
    [articles],
  );
  const [state, setState] = React.useState<Omit<GuidelineWorkspaceSummary, 'documentCount'>>({
    query: '',
    guidelines: [],
    loading: false,
    error: null,
    discoveryStatus: 'complete',
    recommendationCount: 0,
    reviewedRecommendationCount: 0,
    aiExtractedRecommendationCount: 0,
    newestYear: null,
    bodies: [],
    lastCheckedAt: null,
  });

  React.useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 3) {
      setState((previous) => ({ ...previous, query: normalizedQuery, guidelines: [], loading: false, error: null }));
      return;
    }
    let cancelled = false;
    setState((previous) => ({ ...previous, query: normalizedQuery, guidelines: [], loading: true, error: null }));
    void api.collaboration.getGuidelinesForTopic(normalizedQuery)
      .then((response) => {
        if (cancelled) return;
        const guidelines = response.guidelines || [];
        const issuing = guidelines.filter((guideline) => guideline.isIssuingBody);
        const years = issuing.map((guideline) => guideline.sourceYear).filter((year): year is number => typeof year === 'number');
        const checked = issuing
          .map((guideline) => guideline.lastCheckedAt)
          .filter((value): value is string => Boolean(value))
          .sort();
        setState({
          query: normalizedQuery,
          guidelines,
          loading: false,
          error: null,
          discoveryStatus: response.discoveryStatus || 'complete',
          recommendationCount: response.guidelineSummary?.issuingBodyCount ?? issuing.length,
          reviewedRecommendationCount: response.guidelineSummary?.reviewedRecommendationCount
            ?? issuing.filter((guideline) => guideline.status === 'human_reviewed').length,
          aiExtractedRecommendationCount: response.guidelineSummary?.aiExtractedRecommendationCount
            ?? issuing.filter((guideline) => guideline.status === 'ai_extracted').length,
          newestYear: response.guidelineSummary?.newestYear ?? (years.length ? Math.max(...years) : null),
          bodies: response.guidelineSummary?.bodies?.length
            ? response.guidelineSummary.bodies
            : Array.from(new Set(issuing.map((guideline) => guideline.sourceBody).filter(Boolean))).slice(0, 3),
          lastCheckedAt: response.guidelineSummary?.lastCheckedAt ?? checked.at(-1) ?? null,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          query: normalizedQuery,
          guidelines: [],
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load guidelines',
          discoveryStatus: 'complete',
          recommendationCount: 0,
          reviewedRecommendationCount: 0,
          aiExtractedRecommendationCount: 0,
          newestYear: null,
          bodies: [],
          lastCheckedAt: null,
        });
      });
    return () => { cancelled = true; };
  }, [query]);

  return React.useMemo(() => ({ ...state, documentCount }), [documentCount, state]);
}
