'use strict';

const { classifyClaimGuidelineAlignment } = require('../../server/services/claimGuidelineAlignmentService');

describe('classifyClaimGuidelineAlignment', () => {
  const guidelines = [
    {
      recommendationText: 'Adults with type 2 diabetes should receive metformin as first-line pharmacotherapy unless contraindicated.',
    },
  ];

  it('returns guideline_supported when claim overlaps a recommendation', () => {
    const result = classifyClaimGuidelineAlignment(
      { claimText: 'Metformin remains first-line pharmacotherapy for adults with type 2 diabetes.' },
      guidelines
    );
    expect(result.recommendedVerificationStatus).toBe('guideline_supported');
    expect(result.alignmentStatus).toBe('guideline_supported');
  });

  it('returns guideline_uncertain when overlap is too weak', () => {
    const result = classifyClaimGuidelineAlignment(
      { claimText: 'Sleep hygiene may improve wellbeing in hospitalised patients.' },
      guidelines
    );
    expect(result.recommendedVerificationStatus).toBe('guideline_uncertain');
    expect(result.alignmentStatus).toBe('guideline_uncertain');
  });

  it('returns guideline_conflict when negation diverges from guideline', () => {
    const result = classifyClaimGuidelineAlignment(
      { claimText: 'Do not use metformin as first-line therapy for adults with type 2 diabetes.' },
      guidelines
    );
    expect(result.recommendedVerificationStatus).toBe('guideline_conflict');
    expect(result.alignmentStatus).toBe('possible_conflict');
  });
});
