'use strict';

const { buildEvidenceDeltaBrief, buildSummaryLines } = require('../../server/services/evidenceDeltaBriefService');

describe('evidenceDeltaBriefService', () => {
  test('buildSummaryLines formats doctor-facing sentence', () => {
    const line = buildSummaryLines({ claimsChanged: 2, safetyCautions: 1, weakenedConclusions: 1 });
    expect(line).toContain('2 claims changed');
    expect(line).toContain('1 safety caution');
    expect(line).toContain('1 prior conclusion');
  });

  test('buildEvidenceDeltaBrief aggregates history since last review', async () => {
    const db = {
      normalizeTopic: (t) => String(t).toLowerCase().trim(),
      getUserTopicReview: jest.fn().mockResolvedValue({ lastReviewedAt: '2026-01-01T00:00:00.000Z' }),
      getClaimStatusHistorySince: jest.fn().mockResolvedValue([
        {
          claimKey: 'c1',
          claimText: 'NIV reduces intubation',
          fromStatus: 'source_verified',
          toStatus: 'stale_needs_refresh',
          reason: 'New trial',
          createdAt: '2026-02-01T00:00:00.000Z',
        },
        {
          claimKey: 'c2',
          claimText: 'Avoid routine steroids',
          fromStatus: 'guideline_supported',
          toStatus: 'guideline_conflict',
          reason: 'Guideline update',
          createdAt: '2026-02-02T00:00:00.000Z',
        },
      ]),
      listTeachingObjectClaimsForTopic: jest.fn().mockResolvedValue([]),
      listClaimRegenerationForTopic: jest.fn().mockResolvedValue([
        { claimKey: 'c1', status: 'queued', triggerReason: 'full_text_indexed' },
      ]),
    };

    const brief = await buildEvidenceDeltaBrief(db, 'user-1', 'COPD');
    expect(brief.claimsChanged).toBe(2);
    expect(brief.safetyCautions).toBe(1);
    expect(brief.weakenedConclusions).toBe(2);
    expect(brief.significantChange).toBe(true);
    expect(brief.summary).toMatch(/Since your last review/);
    expect(brief.pendingRegeneration).toHaveLength(1);
  });
});
