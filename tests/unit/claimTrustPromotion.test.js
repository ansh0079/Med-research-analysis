'use strict';

const {
  canTransition,
  canPromoteToGuidelineStatus,
  assertTransitionAllowed,
  statusToTrustTier,
  getTrustLadderForClaim,
} = require('../../server/services/claimLifecycleService');

describe('claim trust promotion', () => {
  test('maps statuses to doctor-facing trust tiers', () => {
    expect(statusToTrustTier('synthesis_inferred')).toBe('generated');
    expect(statusToTrustTier('abstract_only')).toBe('abstract_only');
    expect(statusToTrustTier('source_verified')).toBe('full_text_verified');
    expect(statusToTrustTier('guideline_supported')).toBe('guideline_supported');
    expect(statusToTrustTier('human_reviewed')).toBe('curator_reviewed');
  });

  test('blocks abstract_only to guideline_supported', () => {
    expect(canTransition('abstract_only', 'guideline_supported')).toBe(false);
    expect(() => assertTransitionAllowed('abstract_only', 'guideline_supported')).toThrow();
  });

  test('requires full-text verified before guideline promotion', () => {
    expect(canPromoteToGuidelineStatus('abstract_only')).toBe(false);
    expect(canPromoteToGuidelineStatus('source_verified')).toBe(true);
  });

  test('builds trust ladder steps for claim', () => {
    const ladder = getTrustLadderForClaim({ verificationStatus: 'source_verified' });
    expect(ladder.currentTier).toBe('full_text_verified');
    expect(ladder.steps.filter((s) => s.reached).length).toBeGreaterThanOrEqual(3);
  });
});
