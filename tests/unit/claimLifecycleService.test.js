'use strict';

const {
  canTransition,
  describeClaimLifecycle,
  summarizeTopicLifecycle,
} = require('../../server/services/claimLifecycleService');

describe('claimLifecycleService', () => {
  test('allows abstract_only to full_text_available', () => {
    expect(canTransition('abstract_only', 'full_text_available')).toBe(true);
  });

  test('describes claim lifecycle stage', () => {
    const d = describeClaimLifecycle({
      claimKey: 'c1',
      claimText: 'Metformin first line',
      verificationStatus: 'full_text_available',
    });
    expect(d.lifecycleStage).toBe('full_text_available');
    expect(d.lifecycleLabel).toBe('Full text ready');
    expect(d.recommendedAction).toMatch(/synopsis/i);
  });

  test('summarizes topic pipeline counts', () => {
    const s = summarizeTopicLifecycle([
      { verificationStatus: 'abstract_only' },
      { verificationStatus: 'full_text_available' },
      { verificationStatus: 'guideline_conflict' },
    ]);
    expect(s.totalClaims).toBe(3);
    expect(s.needsAttention).toBeGreaterThanOrEqual(3);
    expect(s.byStage.guideline_conflict).toBe(1);
  });
});
