'use strict';

jest.mock('../../server/services/flagshipTopicOps', () => ({
    loadFlagshipConfig: jest.fn(() => ({
        topics: [
            { topic: 'Zero Claim Topic', landmarkPmids: ['1'] },
            { topic: 'Already Enriched Topic', landmarkPmids: ['2'] },
        ],
    })),
}));

jest.mock('../../server/services/enrichmentJobService', () => ({
    getOrEnqueueFlagshipEnrich: jest.fn(async ({ topic }) => ({
        status: 'queued',
        jobKey: `flagship-enrich:${topic}`,
    })),
}));

const { loadFlagshipConfig } = require('../../server/services/flagshipTopicOps');
const { getOrEnqueueFlagshipEnrich } = require('../../server/services/enrichmentJobService');
const { runFlagshipZeroClaimEnrichBatch } = require('../../server/services/flagshipEnrichScheduler');

describe('flagshipEnrichScheduler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        loadFlagshipConfig.mockReturnValue({
            topics: [
                { topic: 'Zero Claim Topic', landmarkPmids: ['1'] },
                { topic: 'Already Enriched Topic', landmarkPmids: ['2'] },
            ],
        });
    });

    it('enqueues only flagship topics with claimCount === 0', async () => {
        const db = {
            normalizeTopic: (t) => String(t || '').toLowerCase().trim(),
            get: jest.fn(async (_sql, params) => {
                const topic = params?.[0];
                if (topic === 'already enriched topic') return { count: 9 };
                return { count: 0 };
            }),
        };

        const result = await runFlagshipZeroClaimEnrichBatch(db, {
            logger: { info() {}, warn() {} },
            limit: 10,
        });

        expect(result.scanned).toBe(2);
        expect(result.zeroClaim).toBe(1);
        expect(result.enqueued).toBe(1);
        expect(getOrEnqueueFlagshipEnrich).toHaveBeenCalledTimes(1);
        expect(getOrEnqueueFlagshipEnrich).toHaveBeenCalledWith(
            expect.objectContaining({ topic: 'Zero Claim Topic' })
        );
    });

    it('respects batch limit', async () => {
        loadFlagshipConfig.mockReturnValue({
            topics: [
                { topic: 'A', landmarkPmids: ['1'] },
                { topic: 'B', landmarkPmids: ['2'] },
                { topic: 'C', landmarkPmids: ['3'] },
            ],
        });
        const db = {
            normalizeTopic: (t) => String(t || '').toLowerCase().trim(),
            get: jest.fn(async () => ({ count: 0 })),
        };

        const result = await runFlagshipZeroClaimEnrichBatch(db, {
            logger: { info() {}, warn() {} },
            limit: 2,
        });

        expect(result.enqueued).toBe(2);
        expect(getOrEnqueueFlagshipEnrich).toHaveBeenCalledTimes(2);
    });
});
