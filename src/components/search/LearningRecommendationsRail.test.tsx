import { describe, expect, test } from '@jest/globals';
import type { Article } from '@types';
import { selectLearningRecommendations } from './LearningRecommendationsRail';

function article(uid: string, learningRank: number, boost: number, extra: Partial<Article> = {}): Article {
  return {
    uid,
    title: uid,
    _source: 'pubmed',
    _learningRank: learningRank,
    _rankMovedByLearning: true,
    _learningBoost: boost,
    ...extra,
  };
}

describe('selectLearningRecommendations', () => {
  test('uses learned order without admitting retracted or preprint records', () => {
    const selected = selectLearningRecommendations([
      article('second', 2, 0.4),
      article('first', 1, 0.6),
      article('retracted', 0, 1, { _retraction: { isRetracted: true, source: 'test' } }),
      article('preprint', 0, 1, { _isPreprint: true }),
      article('deprioritized', 3, -0.5),
    ]);
    expect(selected.map((row) => row.uid)).toEqual(['first', 'second']);
  });
});
