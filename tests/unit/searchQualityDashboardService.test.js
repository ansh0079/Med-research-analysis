'use strict';

const { collectSearchQualityDashboard } = require('../../server/services/searchQualityDashboardService');

describe('searchQualityDashboardService', () => {
    test('aggregates search, cache, intent, and shadow-ranker telemetry', async () => {
        const db = {
            all: jest.fn(async (sql) => {
                if (String(sql).includes('FROM searches')) {
                    return [
                        { query: 'ards', normalized_topic: 'ards', filters: JSON.stringify({ queryIntent: 'landmark' }), results_count: 5, execution_time_ms: 1200 },
                        { query: 'rare', normalized_topic: 'rare', filters: JSON.stringify({ queryIntent: 'general' }), results_count: 0, execution_time_ms: 3000 },
                    ];
                }
                if (String(sql).includes('FROM analytics')) {
                    return [
                        { metadata: JSON.stringify({
                            queryIntent: 'landmark',
                            resultSetCacheHit: true,
                            sourceCache: { pubmed: { hits: 2, misses: 1, shared: 0 } },
                            shadowRanker: { mode: 'shadow', applied: false, agreement: { meanAbsoluteRankDelta: 1.5, top1Changed: true } },
                        }) },
                    ];
                }
                if (String(sql).includes('FROM search_result_impressions')) {
                    return [
                        { position: 1, was_clicked: 1, was_saved: 0, dwell_time_ms: 1000 },
                        { position: 2, was_clicked: 0, was_saved: 1, dwell_time_ms: 45000 },
                    ];
                }
                return [];
            }),
            getSearchNoClickStats: jest.fn().mockResolvedValue({ noClickRate: 0.2 }),
            getSearchFeedbackStats: jest.fn().mockResolvedValue({ notHelpfulRate: 0.1 }),
            getLowRecallSearchStatsWindow: jest.fn().mockResolvedValue([
                { display_query: 'rare', normalized_topic: 'rare', result_count: 0, attempt_count: 2, last_seen_at: '2026-01-01' },
            ]),
        };

        const dashboard = await collectSearchQualityDashboard(db, { days: 7 });
        expect(dashboard.summary.searches).toBe(2);
        expect(dashboard.summary.zeroResultRate).toBe(0.5);
        expect(dashboard.sourceCache.pubmed.hitRate).toBeCloseTo(2 / 3);
        expect(dashboard.intentMix.landmark).toBe(1);
        expect(dashboard.shadowRanker.top1ChangeRate).toBe(1);
        expect(dashboard.lowRecallQueries[0].query).toBe('rare');
    });
});
