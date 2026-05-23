'use strict';

const { buildEvidenceMemoryMessages } = require('../../server/services/topicEvidenceMemoryService');

describe('topicEvidenceMemoryService messages', () => {
  test('builds learner-facing memory lines', () => {
    const messages = buildEvidenceMemoryMessages({
      strongEvidenceMemory: true,
      untestedClaimCount: 3,
      guidelineConflictCount: 1,
      daysSinceRefresh: 12,
    });
    const texts = messages.map((m) => m.text);
    expect(texts.some((t) => t.includes('strong evidence memory'))).toBe(true);
    expect(texts.some((t) => t.includes('3 claims are untested'))).toBe(true);
    expect(texts.some((t) => t.includes('1 guideline conflict'))).toBe(true);
    expect(texts.some((t) => t.includes('refreshed 12 days'))).toBe(true);
  });
});
