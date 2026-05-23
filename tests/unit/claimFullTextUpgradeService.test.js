'use strict';

jest.mock('../../server/services/claimRegenerationService', () => ({
  enqueueRegenerationForArticleClaims: jest.fn().mockResolvedValue({ queued: 2 }),
}));

const { upgradeClaimsAfterFullText } = require('../../server/services/claimFullTextUpgradeService');
const { enqueueRegenerationForArticleClaims } = require('../../server/services/claimRegenerationService');

describe('upgradeClaimsAfterFullText', () => {
  test('advances abstract-only claims to full_text_available and queues regeneration', async () => {
    const db = {
      getTeachingObjectForArticle: jest.fn().mockResolvedValue({ objectKey: 'paper:pmid-1', topic: 'COPD' }),
      listTeachingObjectClaimsByObjectKey: jest.fn().mockResolvedValue([
        { claimKey: 'claim-1', verificationStatus: 'abstract_only', normalizedTopic: 'copd' },
        { claimKey: 'claim-2', verificationStatus: 'source_verified' },
      ]),
      updateTeachingClaimVerification: jest.fn().mockResolvedValue({}),
      logClaimStatusChange: jest.fn().mockResolvedValue({}),
    };

    const result = await upgradeClaimsAfterFullText(db, 'pmid-1', { minWordCount: 750 });

    expect(result.upgraded).toBe(1);
    expect(result.queued).toBe(2);
    expect(db.updateTeachingClaimVerification).toHaveBeenCalledWith('claim-1', {
      verificationStatus: 'full_text_available',
      verificationReason: expect.stringContaining('Full text is now indexed (750+ words)'),
      reviewerId: null,
    });
    expect(enqueueRegenerationForArticleClaims).toHaveBeenCalledWith(db, 'pmid-1', {
      topic: 'COPD',
      triggerReason: 'full_text_indexed',
    });
  });
});
