const { evaluateSearchRankerPromotionGate } = require('../../server/services/searchRankerPromotionGateService');

function makeDb({ searches = 60, shadowSamples = 30, top1Changes = 0, gold = null } = {}) {
    return {
        all: jest.fn(async (sql) => {
            if (/FROM searches/.test(sql)) {
                return Array.from({ length: searches }, (_, index) => ({
                    id: index + 1,
                    query: 'ARDS ventilation',
                    normalized_topic: 'ards ventilation',
                    filters: JSON.stringify({ queryIntent: 'therapy' }),
                    sources: 'pubmed',
                    results_count: 12,
                    execution_time_ms: 350 + index,
                    created_at: new Date().toISOString(),
                }));
            }
            if (/FROM analytics/.test(sql)) {
                return Array.from({ length: shadowSamples }, (_, index) => ({
                    metadata: JSON.stringify({
                        shadowRanker: {
                            mode: 'shadow',
                            applied: false,
                            agreement: {
                                top1Changed: index < top1Changes,
                                meanAbsoluteRankDelta: index < top1Changes ? 2 : 0.5,
                            },
                        },
                    }),
                    created_at: new Date().toISOString(),
                }));
            }
            if (/FROM search_result_impressions/.test(sql)) {
                return Array.from({ length: 120 }, (_, index) => ({
                    position: (index % 10) + 1,
                    was_clicked: index % 4 === 0 ? 1 : 0,
                    was_saved: index % 20 === 0 ? 1 : 0,
                    dwell_time_ms: index % 5 === 0 ? 45000 : 1000,
                }));
            }
            return [];
        }),
        getSearchNoClickStats: jest.fn(async () => ({ noClickRate: 0.25 })),
        getSearchFeedbackStats: jest.fn(async () => ({ notHelpfulRate: 0.05 })),
        getLowRecallSearchStatsWindow: jest.fn(async () => []),
        getSearchGoldJudgmentStats: jest.fn(async () => gold || ({
            total: 35,
            positive: 20,
            negative: 15,
            byLabel: { essential: 12, useful: 8, off_topic: 15 },
        })),
    };
}

describe('searchRankerPromotionGateService', () => {
    test('promotes when search, shadow, gold, and safety checks pass', async () => {
        const gate = await evaluateSearchRankerPromotionGate(makeDb());

        expect(gate.recommendation).toBe('promote');
        expect(gate.checks.every((check) => check.status === 'pass')).toBe(true);
        expect(gate.rolloutEnv.promoteWith).toBe('SEARCH_SHADOW_RANKER_MODE=apply');
    });

    test('holds when shadow ranker disagreement is too high', async () => {
        const gate = await evaluateSearchRankerPromotionGate(makeDb({ top1Changes: 20 }));

        expect(gate.recommendation).toBe('hold');
        expect(gate.checks.find((check) => check.id === 'top1_disagreement')).toMatchObject({
            status: 'fail',
        });
    });
});
