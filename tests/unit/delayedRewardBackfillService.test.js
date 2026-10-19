'use strict';

const {
    HORIZONS,
    collectDelayedSignals,
    previousHorizonBaseline,
    backfillDecisionHorizon,
    runDelayedRewardBackfill,
} = require('../../server/services/learning/delayedRewardBackfillService');
const { POLICY_SEARCH_RANKING } = require('../../server/services/personalizationBanditService');

describe('delayedRewardBackfillService', () => {
    describe('collectDelayedSignals', () => {
        test('returns zero if db or userId missing', async () => {
            const resNoDb = await collectDelayedSignals(null, { user_id: 'u1' });
            expect(resNoDb).toEqual({ additive: 0, sources: [] });

            const resNoUser = await collectDelayedSignals({ all: jest.fn() }, {});
            expect(resNoUser).toEqual({ additive: 0, sources: [] });
        });

        test('aggregates later saves, high dwell, quiz outcomes, synopsis feedback, and repeat searches', async () => {
            const mockDb = {
                all: jest.fn(async (sql) => {
                    if (sql.includes('search_result_impressions')) {
                        return [
                            { was_saved: 1, dwell_time_ms: 10000 },
                            { was_saved: 0, dwell_time_ms: 45000 },
                        ];
                    }
                    if (sql.includes('quiz_attempts')) {
                        return [
                            { is_correct: 1 },
                            { is_correct: 0 },
                        ];
                    }
                    if (sql.includes('synopsis_feedback')) {
                        return [
                            { feedback_type: 'helpful' },
                        ];
                    }
                    return [];
                }),
                get: jest.fn(async (sql) => {
                    if (sql.includes('COUNT(*) AS cnt FROM searches')) {
                        return { cnt: 2 };
                    }
                    return null;
                }),
            };

            const decision = {
                user_id: 'user_123',
                article_uid: 'pmid_9999',
                search_id: 'search_abc',
                topic: 'Heart Failure',
                normalized_topic: 'heart failure',
                created_at: '2026-07-01T00:00:00.000Z',
            };

            const result = await collectDelayedSignals(mockDb, decision, {
                now: Date.parse('2026-07-02T00:00:00.000Z'),
            });

            // later_save (+0.35) + later_dwell (+0.05) + later_quiz_correct (+0.25)
            // + later_quiz_wrong (-0.05) + later_synopsis_helpful (+0.3)
            // + repeat_topic_search (0.05 * 2 = +0.1)
            // Total = 0.35 + 0.05 + 0.25 - 0.05 + 0.30 + 0.10 = 1.0 -> clamped to 0.8
            expect(result.additive).toBe(0.8);
            expect(result.sources).toEqual(
                expect.arrayContaining([
                    'later_save',
                    'later_dwell',
                    'later_quiz_correct',
                    'later_quiz_wrong',
                    'later_synopsis_helpful',
                    'repeat_topic_search',
                ])
            );
        });
    });

    describe('previousHorizonBaseline', () => {
        test('falls back to decision rewards when no prior horizons backfilled', async () => {
            const mockDb = {
                get: jest.fn().mockResolvedValue(null),
            };
            const decision = { id: 10, immediate_reward: 0.2, total_reward: 0.2, delayed_reward: 0 };
            const baseline = await previousHorizonBaseline(mockDb, decision, 1);
            expect(baseline.previousTotal).toBe(0.2);
            expect(baseline.fromHorizon).toBeNull();
        });

        test('uses latest previous horizon log if present', async () => {
            const mockDb = {
                get: jest.fn(async (sql, params) => {
                    if (params[1] === 3) return { new_total: 0.6 };
                    if (params[1] === 1) return { new_total: 0.4 };
                    return null;
                }),
            };
            const decision = { id: 10, immediate_reward: 0.2 };
            const baseline = await previousHorizonBaseline(mockDb, decision, 7);
            expect(baseline.previousTotal).toBe(0.6);
            expect(baseline.fromHorizon).toBe(3);
        });
    });

    describe('backfillDecisionHorizon', () => {
        test('returns not_due if horizon has not elapsed', async () => {
            const decision = {
                id: 1,
                user_id: 'u1',
                created_at: '2026-07-05T00:00:00.000Z',
            };
            // 1 day has not passed
            const now = Date.parse('2026-07-05T12:00:00.000Z');
            const res = await backfillDecisionHorizon({}, decision, 1, { now });
            expect(res).toEqual({ updated: false, reason: 'not_due' });
        });

        test('returns already_done if horizon already backfilled', async () => {
            const mockDb = {
                get: jest.fn().mockResolvedValue({ id: 101 }),
            };
            const decision = {
                id: 1,
                user_id: 'u1',
                created_at: '2026-07-01T00:00:00.000Z',
            };
            const now = Date.parse('2026-07-05T00:00:00.000Z');
            const res = await backfillDecisionHorizon(mockDb, decision, 1, { now });
            expect(res).toEqual({ updated: false, reason: 'already_done' });
        });

        test('returns prior_horizon_pending if horizon 1 has not been applied when horizon 3 is due', async () => {
            const mockDb = {
                get: jest.fn().mockResolvedValue(null), // nothing backfilled
            };
            const decision = {
                id: 1,
                user_id: 'u1',
                created_at: '2026-07-01T00:00:00.000Z',
            };
            // 4 days passed, so both 1 and 3 are due, but 1 is pending
            const now = Date.parse('2026-07-05T00:00:00.000Z');
            const res = await backfillDecisionHorizon(mockDb, decision, 3, { now });
            expect(res).toEqual({ updated: false, reason: 'prior_horizon_pending', priorHorizon: 1 });
        });

        test('successfully backfills horizon 1 and updates decision and bandit reward', async () => {
            const logsInserted = [];
            let updatedReward = null;

            const mockDb = {
                get: jest.fn().mockResolvedValue(null),
                all: jest.fn(async (sql) => {
                    if (sql.includes('search_result_impressions')) {
                        return [{ was_saved: 1 }];
                    }
                    return [];
                }),
                run: jest.fn(async (sql, params) => {
                    logsInserted.push(params);
                    return { changes: 1 };
                }),
                updatePersonalizationDecisionReward: jest.fn(async (id, data) => {
                    updatedReward = data;
                }),
                ensurePersonalizationArms: jest.fn().mockResolvedValue(true),
                recordPersonalizationPull: jest.fn().mockResolvedValue(true),
                updatePersonalizationArmReward: jest.fn().mockResolvedValue(true),
            };

            const decision = {
                id: 55,
                user_id: 'u1',
                arm_id: 'recency_heavy',
                policy_type: POLICY_SEARCH_RANKING,
                article_uid: 'pmid_123',
                immediate_reward: 0.1,
                total_reward: 0.1,
                created_at: '2026-07-01T00:00:00.000Z',
            };

            const now = Date.parse('2026-07-02T01:00:00.000Z'); // > 1 day
            const result = await backfillDecisionHorizon(mockDb, decision, 1, { now });

            expect(result.updated).toBe(true);
            expect(result.sources).toContain('later_save');
            expect(result.delta).toBeCloseTo(0.35, 2);
            expect(mockDb.updatePersonalizationDecisionReward).toHaveBeenCalledWith(55, expect.objectContaining({
                immediateReward: 0.1,
                delayedReward: 0.35,
                totalReward: 0.45,
            }));
            expect(mockDb.run).toHaveBeenCalled();
            expect(logsInserted.length).toBe(1);
            expect(logsInserted[0][0]).toBe(55); // decision_id
            expect(logsInserted[0][1]).toBe(1);  // horizon_days
        });
    });

    describe('runDelayedRewardBackfill', () => {
        test('scans eligible decisions and applies horizons in sequence', async () => {
            const backfilledHorizons = [];
            const mockDb = {
                all: jest.fn(async (sql) => {
                    if (sql.includes('FROM personalization_decisions')) {
                        return [
                            {
                                id: 101,
                                user_id: 'u_test',
                                policy_type: POLICY_SEARCH_RANKING,
                                arm_id: 'heuristic_default',
                                article_uid: 'pmid_999',
                                topic: 'cardiology',
                                normalized_topic: 'cardiology',
                                created_at: '2026-07-01T00:00:00.000Z',
                                immediate_reward: 0.2,
                                total_reward: 0.2,
                            },
                        ];
                    }
                    if (sql.includes('search_result_impressions')) {
                        return [{ was_saved: 1 }];
                    }
                    return [];
                }),
                get: jest.fn(async (sql, params) => {
                    const [decisionId, horizon] = params;
                    // Check if already backfilled in this run
                    const exists = backfilledHorizons.includes(`${decisionId}:${horizon}`);
                    return exists ? { id: 999, new_total: 0.55 } : null;
                }),
                run: jest.fn(async (sql, params) => {
                    backfilledHorizons.push(`${params[0]}:${params[1]}`);
                    return { changes: 1 };
                }),
                updatePersonalizationDecisionReward: jest.fn().mockResolvedValue(true),
                ensurePersonalizationArms: jest.fn().mockResolvedValue(true),
                recordPersonalizationPull: jest.fn().mockResolvedValue(true),
                updatePersonalizationArmReward: jest.fn().mockResolvedValue(true),
            };

            const outcome = await runDelayedRewardBackfill(mockDb, { daysLookback: 14, limit: 10 });

            expect(outcome.scanned).toBe(1);
            expect(outcome.updated).toBeGreaterThanOrEqual(1);
            expect(outcome.horizons).toEqual(HORIZONS);
        });
    });
});
