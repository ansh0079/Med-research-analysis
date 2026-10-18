'use strict';

const {
    collectDelayedSignals,
    runDelayedRewardBackfill,
} = require('../../server/services/learning/delayedRewardBackfillService');

describe('delayedRewardBackfillService', () => {
    test('anonymous decisions use their UUID search id without numeric coercion', async () => {
        const searchId = '2ee45fd6-a561-4f3c-a9f9-f4442ddc4aad';
        const db = {
            all: jest.fn().mockResolvedValue([{ was_saved: 1, dwell_time_ms: 0 }]),
        };
        const result = await collectDelayedSignals(db, {
            user_id: null,
            search_id: searchId,
            article_uid: 'pmid-1',
            created_at: '2026-01-01T00:00:00.000Z',
        });
        expect(result.sources).toContain('later_save');
        expect(db.all.mock.calls[0][1][0]).toBe(searchId);
    });

    test('selects only decisions with a due, unprocessed horizon', async () => {
        const db = { all: jest.fn().mockResolvedValue([]) };
        await runDelayedRewardBackfill(db, { daysLookback: 60, limit: 5000 });
        const [sql, params] = db.all.mock.calls[0];
        expect(sql).toContain('NOT EXISTS');
        expect(sql).toContain('l.horizon_days = 7');
        expect(params[0]).toBe('search_ranking');
        expect(params.at(-1)).toBe(5000);
    });
});
