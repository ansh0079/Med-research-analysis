'use strict';

const { getPersonalisedRecommendations, freshnessHint, normalizeCandidate } = require('../../server/services/learningAgentService');

function makeDb({ mastery = [], dueCards = [], searches = [], quizzes = [], feedback = [], topicRows = [], topicLookup = null } = {}) {
  const db = {
    isPostgres: false,
    normalizeTopic: jest.fn((value) => String(value || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ').trim()),
    all: jest.fn(async (sql, params = []) => {
      if (sql.includes('FROM user_topic_mastery')) return mastery;
      if (sql.includes('FROM spaced_rep_cards')) return dueCards;
      if (sql.includes('FROM searches')) return searches;
      if (sql.includes('FROM quiz_attempts')) return quizzes;
      if (sql.includes('FROM topic_knowledge')) return topicRows;
      return [];
    }),
    get: jest.fn(async (_sql, params = []) => {
      if (topicLookup) return topicLookup(params);
      const normalized = params[0];
      return topicRows.find((row) => row.normalized_topic === normalized) || null;
    }),
    getTopicCrosslinks: jest.fn().mockResolvedValue([]),
    listSearchResultFeedbackForUser: jest.fn().mockResolvedValue(feedback),
  };
  return db;
}

describe('learningAgentService recommendations', () => {
  test('normalizes recent searches through topic aliases instead of exact raw query matching', async () => {
    const db = makeDb({
      searches: [{ query: 'ARDS proning in ICU' }],
      topicRows: [{
        topic: 'Acute Respiratory Distress Syndrome',
        normalized_topic: 'ards',
        confidence: 0.9,
        updated_at: new Date().toISOString(),
        last_refreshed_at: new Date().toISOString(),
      }],
      topicLookup: async () => ({
        topic: 'Acute Respiratory Distress Syndrome',
        normalized_topic: 'ards',
        confidence: 0.9,
        updated_at: new Date().toISOString(),
        last_refreshed_at: new Date().toISOString(),
      }),
    });

    const recommendations = await getPersonalisedRecommendations(db, 'u1', { limit: 5 });

    expect(recommendations).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'explore', normalizedTopic: 'ards' }),
    ]));
  });

  test('uses recent quiz confidence and reasoning tags for calibration recommendations', async () => {
    const db = makeDb({
      mastery: [{ topic: 'Sepsis', normalized_topic: 'sepsis', overall_score: 72, attempts_count: 5 }],
      quizzes: [{
        topic: 'Sepsis',
        normalized_topic: 'sepsis',
        is_correct: 0,
        confidence: 5,
        reasoning_tags: JSON.stringify(['overclaims_evidence']),
      }],
    });

    const recommendations = await getPersonalisedRecommendations(db, 'u1', { limit: 5 });

    expect(recommendations[0]).toMatchObject({
      type: 'calibrate',
      normalizedTopic: 'sepsis',
      action: 'quiz',
    });
    expect(recommendations[0].reason).toContain('high-confidence wrong');
  });

  test('feeds not-helpful search feedback into recommendations', async () => {
    const db = makeDb({
      feedback: [
        {
          feedback_type: 'not_helpful',
          article_uid: 'pmid-1',
          search_query: 'ARDS ventilation',
          search_normalized_topic: 'ards ventilation',
        },
      ],
    });

    const recommendations = await getPersonalisedRecommendations(db, 'u1', { limit: 5 });

    expect(db.listSearchResultFeedbackForUser).toHaveBeenCalledWith('u1', { limit: 100, days: 90 });
    expect(recommendations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'recalibrate_search',
        normalizedTopic: 'ards ventilation',
        action: 'topic',
        feedbackArticleCount: 1,
      }),
    ]));
  });

  test('uses dialect-appropriate random expression for cold start and factors stale memory', async () => {
    const staleDate = new Date(Date.now() - 160 * 86400000).toISOString();
    const db = makeDb({
      topicRows: [{
        topic: 'Acute kidney injury',
        normalized_topic: 'acute kidney injury',
        confidence: 0.8,
        updated_at: staleDate,
        last_refreshed_at: staleDate,
      }],
    });
    db.isPostgres = true;

    const recommendations = await getPersonalisedRecommendations(db, 'u1', { limit: 3 });

    expect(db.all.mock.calls.find(([sql]) => sql.includes('FROM topic_knowledge'))[0]).toContain('random()');
    expect(recommendations[0]).toMatchObject({ type: 'start', normalizedTopic: 'acute kidney injury' });
    expect(recommendations[0].reason).toContain('Topic memory is');
  });

  test('helper normalization and freshness are deterministic for offline eval fixtures', () => {
    expect(normalizeCandidate({}, 'ARDS: Prone Positioning!')).toBe('ards prone positioning');
    expect(freshnessHint({ last_refreshed_at: '2025-01-01T00:00:00.000Z' }, new Date('2026-05-23T00:00:00.000Z'))).toMatchObject({
      priorityBoost: 18,
    });
  });
});
