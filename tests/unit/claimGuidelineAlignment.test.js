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

  describe('quiz_focus questions', () => {
    // Found while triaging the guideline_uncertain queue: 26 of 56 flagged
    // claims were quiz-seed questions ("What score on CEPH-FAST indicates a
    // low risk of cephalosporin allergy?"). A question cannot semantically
    // agree or conflict with a guideline recommendation, so token-overlap
    // scoring against one is structurally guaranteed to read as no/weak match
    // -- manufacturing false uncertainty for content that was never a claim
    // about the guideline in the first place.
    it('skips guideline comparison for quiz_focus concepts, even with real overlap', () => {
      const result = classifyClaimGuidelineAlignment(
        { claimText: 'What is the first-line pharmacotherapy for adults with type 2 diabetes?', conceptKey: 'quiz_focus' },
        guidelines
      );
      expect(result.recommendedVerificationStatus).toBe('unverified');
      expect(result.alignmentStatus).toBe('not_verifiable');
      expect(result.matchedGuideline).toBeNull();
    });

    it('still verifies a non-quiz_focus claim with identical text', () => {
      // Confirms the skip is keyed on concept, not on the text happening to be
      // a question -- a real quiz_focus row and an ordinary claim with the same
      // words must not be treated identically.
      const result = classifyClaimGuidelineAlignment(
        { claimText: 'Metformin remains first-line pharmacotherapy for adults with type 2 diabetes.', conceptKey: 'main_findings' },
        guidelines
      );
      expect(result.recommendedVerificationStatus).toBe('guideline_supported');
    });

    it('accepts the snake_case concept_key field from raw DB rows', () => {
      const result = classifyClaimGuidelineAlignment(
        { claim_text: 'Which patients qualify for metformin?', concept_key: 'quiz_focus' },
        guidelines
      );
      expect(result.alignmentStatus).toBe('not_verifiable');
    });
  });
});
