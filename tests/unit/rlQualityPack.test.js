'use strict';

const {
    classifyProtection,
    enforcePersonalizationGuardrails,
} = require('../../server/services/bandit/personalizationGuardrails');
const {
    buildStrategies,
    engagementScore,
    runQueryFailureAutoRepair,
} = require('../../server/services/search/queryFailureAutoRepairService');
const {
    partitionEvidence,
    blendLiveWithEvidenceMemory,
} = require('../../server/services/topic/topicEvidenceMemoryService');
const { recommendationFromEval } = require('../../server/services/ops/offlineEvalNightlyService');
const { classifyLearningQuality } = require('../../server/services/ops/learningEventInspectorService');
const { HORIZONS, collectDelayedSignals } = require('../../server/services/learning/delayedRewardBackfillService');

describe('personalization guardrails', () => {
    test('classifies guidelines and landmarks as protected', () => {
        expect(classifyProtection({
            title: 'Practice Guideline for ARDS',
            pubtype: ['Practice Guideline'],
        })).toBe('guideline');
        expect(classifyProtection({
            title: 'Large RCT',
            pubtype: ['Randomized Controlled Trial'],
            citationCount: 500,
            pubdate: '2012',
            _pinnedLandmark: true,
        })).toBe('landmark_rct');
    });

    test('restores protected evidence into safe head band', () => {
        const original = [
            { uid: 'g1', title: 'Guideline', pubtype: ['Guideline'] },
            { uid: 'w1', title: 'Weak case report', pubtype: ['Case Reports'] },
            { uid: 'w2', title: 'Editorial', pubtype: ['Editorial'] },
        ];
        // Personalization buried the guideline
        const personalized = [original[1], original[2], original[0]];
        const { articles, guardrailMeta } = enforcePersonalizationGuardrails(personalized, original);
        expect(guardrailMeta.applied).toBe(true);
        expect(articles[0].uid).toBe('g1');
        expect(articles[0]._guardrailRestored).toBe(true);
    });
});

describe('query failure auto-repair', () => {
    test('builds strategy reformulations', () => {
        const strategies = buildStrategies('ARDS ventilation');
        expect(strategies.map((s) => s.strategy)).toEqual(expect.arrayContaining([
            'mesh_heavy', 'trial_acronym_heavy', 'guideline_focused', 'recent_review_focused', 'pico_expanded',
        ]));
    });

    test('picks a better reformulation when recall is low', async () => {
        const store = new Map();
        const db = {
            get: async () => null,
            run: async (sql, params) => {
                const key = `${params[1]}|${params[2]}`;
                store.set(key, params);
                return { changes: 1 };
            },
        };
        const result = await runQueryFailureAutoRepair({
            db,
            query: 'rare obscure syndrome xyz',
            resultCount: 0,
            countResults: async (q) => (String(q).includes('MeSH') ? 12 : 1),
        });
        expect(result.repaired).toBe(true);
        expect(result.winner.strategy).toBe('mesh_heavy');
        expect(engagementScore({ resultCount: 20 })).toBeGreaterThan(0.5);
    });
});

describe('topic evidence memory', () => {
    test('partitions guidelines and landmarks', () => {
        const parts = partitionEvidence([
            { uid: '1', title: 'ESC Guideline', pubtype: ['Practice Guideline'] },
            { uid: '2', title: 'Landmark RCT', pubtype: ['Randomized Controlled Trial'], citationCount: 400, pubdate: '2010' },
            { uid: '3', title: 'Recent systematic review', pubtype: ['Systematic Review'], pubdate: '2023' },
        ]);
        expect(parts.guidelines.length).toBe(1);
        expect(parts.landmarkTrials.length + parts.recentReviews.length).toBeGreaterThan(0);
    });

    test('blends memory refs into live results', () => {
        const blended = blendLiveWithEvidenceMemory(
            [{ uid: 'live1', title: 'Live' }, { uid: 'live2', title: 'Live2' }],
            {
                articleUids: ['mem1'],
                guidelines: [{ uid: 'mem1', title: 'Memory guideline', role: 'guideline' }],
                landmarkTrials: [],
                recentReviews: [],
                controversies: [],
                safetyUpdates: [],
            }
        );
        expect(blended.injected.length).toBe(1);
        expect(blended.articles.some((a) => a.uid === 'mem1')).toBe(true);
    });
});

describe('offline eval recommendation', () => {
    test('holds when density gate fails', () => {
        const rec = recommendationFromEval({
            density: { pass: false, reason: 'Need more labels' },
        });
        expect(rec.recommendation).toBe('hold');
    });

    test('promotes when shadow lift is significant', () => {
        const rec = recommendationFromEval({
            density: { pass: true },
            bestConstant: { candidateArmId: 'engagement_heavy', snips: 0.5, ips: 0.5, stderr: 0.02 },
            servingPolicy: { candidateArmId: 'heuristic_default', snips: 0.2, ips: 0.2, stderr: 0.02 },
        });
        expect(rec.recommendation).toBe('promote');
    });
});

describe('phase 2 RL control plane', () => {
    test('chooseArmBySamples returns propensity mass', () => {
        const { chooseArmBySamples } = require('../../server/services/bandit/sampling');
        const result = chooseArmBySamples(
            ['a', 'b'],
            { a: 0.9, b: 0.1 },
            {},
            0,
            'a'
        );
        expect(result.armId).toBe('a');
        expect(result.propensity).toBeGreaterThan(0.5);
        expect(result.propensityByArm.a + result.propensityByArm.b).toBeCloseTo(1, 5);
    });

    test('idempotent bandit reward skips duplicate application keys', async () => {
        const { recordBanditReward } = require('../../server/services/bandit/rewards');
        const seen = new Set();
        let pulls = 0;
        const db = {
            recordPersonalizationArmPullIdempotent: async ({ applicationKey }) => {
                if (seen.has(applicationKey)) return { applied: false, reason: 'duplicate' };
                seen.add(applicationKey);
                pulls += 1;
                return { applied: true, applicationKey };
            },
        };
        const first = await recordBanditReward(db, 'search_ranking', 'heuristic_default', 0.4, 'u1', {
            applicationKey: 'decision:9:immediate',
            decisionId: 9,
        });
        const second = await recordBanditReward(db, 'search_ranking', 'heuristic_default', 0.4, 'u1', {
            applicationKey: 'decision:9:immediate',
            decisionId: 9,
        });
        expect(first.applied).toBe(true);
        expect(second.applied).toBe(false);
        // user scope + global scope = 2 unique keys on first call
        expect(pulls).toBe(2);
    });

    test('actuateServingRecommendation promotes shadow arm', async () => {
        const { actuateServingRecommendation } = require('../../server/services/ops/offlineEvalNightlyService');
        let stored = null;
        const db = {
            upsertPolicyServingState: async (row) => {
                stored = row;
                return row;
            },
        };
        const result = await actuateServingRecommendation(db, {
            policyType: 'search_ranking',
            recommendation: 'promote',
            reason: 'lift',
            currentServingArmId: 'heuristic_default',
            bestShadowArmId: 'engagement_heavy',
            evalRunId: 12,
        });
        expect(result.actuated).toBe(true);
        expect(stored.servingArmId).toBe('engagement_heavy');
        expect(stored.status).toBe('promote');
    });

    test('actuateServingRecommendation regresses to heuristic_default', async () => {
        const { actuateServingRecommendation } = require('../../server/services/ops/offlineEvalNightlyService');
        let stored = null;
        const db = {
            upsertPolicyServingState: async (row) => {
                stored = row;
                return row;
            },
        };
        await actuateServingRecommendation(db, {
            policyType: 'search_ranking',
            recommendation: 'regress',
            reason: 'underperform',
            currentServingArmId: 'engagement_heavy',
            bestShadowArmId: 'quiz_gap_heavy',
        });
        expect(stored.servingArmId).toBe('heuristic_default');
        expect(stored.status).toBe('regress');
    });

    test('delayed backfill applies incremental delta vs prior horizon', async () => {
        const { backfillDecisionHorizon } = require('../../server/services/learning/delayedRewardBackfillService');
        const logs = new Map();
        const decision = {
            id: 7,
            user_id: 'u1',
            article_uid: 'pmid:1',
            arm_id: 'heuristic_default',
            policy_type: 'search_ranking',
            created_at: '2026-01-01T00:00:00.000Z',
            immediate_reward: 0.1,
            delayed_reward: 0,
            total_reward: 0.1,
            normalized_topic: 'ards',
        };
        const rewards = [];
        const db = {
            get: async (sql, params) => {
                if (sql.includes('delayed_reward_backfill_log') && sql.includes('SELECT id')) {
                    const key = `${params[0]}:${params[1]}`;
                    return logs.has(key) ? { id: 1 } : null;
                }
                if (sql.includes('SELECT new_total')) {
                    const key = `${params[0]}:${params[1]}`;
                    return logs.get(key) || null;
                }
                return { cnt: 0 };
            },
            all: async (sql) => {
                if (sql.includes('search_result_impressions')) {
                    return [{ was_saved: 1, dwell_time_ms: 0, created_at: '2026-01-02' }];
                }
                return [];
            },
            run: async (sql, params) => {
                if (sql.includes('INSERT INTO delayed_reward_backfill_log')) {
                    logs.set(`${params[0]}:${params[1]}`, {
                        new_total: params[3],
                        previous_total: params[2],
                        delta: params[4],
                    });
                }
                return { changes: 1 };
            },
            updatePersonalizationDecisionReward: async () => null,
            recordPersonalizationArmPullIdempotent: async (args) => {
                rewards.push(args);
                return { applied: true };
            },
        };

        const day1 = await backfillDecisionHorizon(db, decision, 1, {
            now: Date.parse('2026-01-03T00:00:00.000Z'),
        });
        expect(day1.updated).toBe(true);
        expect(day1.delta).toBeGreaterThan(0);

        const day3 = await backfillDecisionHorizon(db, decision, 3, {
            now: Date.parse('2026-01-05T00:00:00.000Z'),
        });
        // Same cumulative signals → incremental delta vs day-1 baseline should be ~0
        expect(day3.updated).toBe(true);
        expect(Math.abs(day3.delta)).toBeLessThan(0.02);
    });
});
