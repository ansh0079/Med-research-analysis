'use strict';

const { createLearningRound } = require('../../server/services/learningRoundsService');

describe('learningRoundsService persistence loop', () => {
  test('persists generated items using the database returned id', async () => {
    const insertedItems = [];
    const db = {
      listTeachingObjectClaimsForTopic: jest.fn().mockResolvedValue([
        { claimKey: 'c1', claimText: 'Use prone positioning in selected moderate-severe ARDS.', verificationReason: 'Verified' },
        { claimKey: 'c2', claimText: 'Avoid overclaiming mortality benefit outside studied patients.' },
        { claimKey: 'c3', claimText: 'Check guideline and patient factors before applying trial evidence.' },
      ]),
      getUserClaimMastery: jest.fn().mockResolvedValue([]),
      createLearningRound: jest.fn(async ({ userId, topic, items }) => {
        insertedItems.push(...items);
        return { id: 42, userId, topic, items };
      }),
    };

    const result = await createLearningRound(db, 'u1', 'ARDS');

    expect(result.persisted).toBe(true);
    expect(result.round.id).toBe(42);
    expect(insertedItems.length).toBeGreaterThan(0);
    expect(insertedItems.every((item) => item.claimKey)).toBe(true);
  });
});
