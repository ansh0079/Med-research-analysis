import { renderHook, waitFor } from '@testing-library/react';
import { api } from '@services/api';
import type { Article } from '@types';
import { useGuidelineWorkspaceSummary } from './useGuidelineWorkspaceSummary';

const getGuidelines = api.collaboration.getGuidelinesForTopic as jest.Mock;

describe('useGuidelineWorkspaceSummary', () => {
  beforeEach(() => getGuidelines.mockReset());

  it('provides one canonical count model while counting result documents separately', async () => {
    getGuidelines.mockResolvedValue({
      topic: 'heart failure',
      guidelines: [{ id: 1, sourceBody: 'ESC', sourceYear: 2023, isIssuingBody: true, status: 'human_reviewed' }],
      guidelineSummary: {
        issuingBodyCount: 4,
        reviewedRecommendationCount: 2,
        aiExtractedRecommendationCount: 2,
        newestYear: 2025,
        bodies: ['ESC', 'NICE'],
        lastCheckedAt: '2026-09-01T00:00:00.000Z',
      },
      discoveryStatus: 'complete',
    });
    const papers = [{ uid: 'g1', title: 'Guideline', _source: 'pubmed', _evidenceLane: 'guidelines' }] as Article[];
    const { result, rerender } = renderHook(({ articles }) => useGuidelineWorkspaceSummary('heart failure', articles), {
      initialProps: { articles: papers },
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({
      documentCount: 1,
      recommendationCount: 4,
      reviewedRecommendationCount: 2,
      newestYear: 2025,
      bodies: ['ESC', 'NICE'],
    });
    rerender({ articles: [...papers, { uid: 'g2', title: 'Consensus', _source: 'pubmed', _evidenceLane: 'guidelines' } as Article] });
    expect(result.current.documentCount).toBe(2);
    expect(getGuidelines).toHaveBeenCalledTimes(1);
  });
});
