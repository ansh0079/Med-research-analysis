'use strict';

const { getPersonalisedRecommendations } = require('../../server/services/learningAgentService');

const FIXED_TOPICS = [
  {
    topic: 'Sepsis',
    normalized: 'sepsis',
    expectedTeachingClaims: ['early antibiotics', 'source control', 'lactate reassessment'],
    guidelineRequired: true,
  },
  {
    topic: 'ARDS',
    normalized: 'ards',
    expectedTeachingClaims: ['lung protective ventilation', 'prone positioning', 'PEEP titration'],
    guidelineRequired: true,
  },
];

describe('offline learning-agent eval fixtures', () => {
  test('fixed clinical topics include expected claims and guideline checks', () => {
    for (const fixture of FIXED_TOPICS) {
      expect(fixture.expectedTeachingClaims.length).toBeGreaterThanOrEqual(3);
      expect(fixture.guidelineRequired).toBe(true);
    }
  });

  test('learner-growth metric prioritizes repeated high-confidence errors before cold start', async () => {
    const db = {
      isPostgres: false,
      normalizeTopic: (value) => String(value || '').toLowerCase().trim(),
      all: jest.fn(async (sql) => {
        if (sql.includes('user_topic_mastery')) return [{ topic: 'ARDS', normalized_topic: 'ards', overall_score: 75, attempts_count: 8 }];
        if (sql.includes('spaced_rep_cards')) return [];
        if (sql.includes('searches')) return [];
        if (sql.includes('quiz_attempts')) {return [
          { topic: 'ARDS', normalized_topic: 'ards', is_correct: 0, confidence: 5, reasoning_tags: '["high_confidence_wrong"]' },
          { topic: 'ARDS', normalized_topic: 'ards', is_correct: 0, confidence: 4, reasoning_tags: '["misses_applicability"]' },
        ];}
        return [];
      }),
      get: jest.fn().mockResolvedValue(null),
      getTopicCrosslinks: jest.fn().mockResolvedValue([]),
    };

    const recommendations = await getPersonalisedRecommendations(db, 'u1', { limit: 3 });

    expect(recommendations[0].type).toBe('calibrate');
    expect(recommendations[0].priority).toBeGreaterThan(85);
  });
});
