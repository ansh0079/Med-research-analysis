'use strict';

const { QUALITY_QUEUES } = require('../../server/services/clinicalQualityReviewService');

describe('clinicalQualityReviewService', () => {
  test('defines five curator queues', () => {
    const ids = QUALITY_QUEUES.map((q) => q.id);
    expect(ids).toEqual([
      'overclaimed',
      'guideline_conflicts',
      'stale',
      'abstract_only',
      'low_confidence',
    ]);
  });
});
