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

describe('learning event quality + delayed horizons', () => {
    test('flags dwell-only low confidence as noise risk', () => {
        const q = classifyLearningQuality({
            attributionConfidence: 0.2,
            totalReward: 0.03,
            interactions: [{ type: 'impression', wasSaved: false, dwellMs: 15000 }],
        });
        expect(q.label).toBe('noise_risk');
    });

    test('exposes 1/3/7 day horizons', () => {
        expect(HORIZONS).toEqual([1, 3, 7]);
    });

    test('collectDelayedSignals sums later saves', async () => {
        const db = {
            all: async (sql) => {
                if (sql.includes('search_result_impressions')) {
                    return [{ was_saved: 1, dwell_time_ms: 0, created_at: '2026-01-02' }];
                }
                return [];
            },
            get: async () => ({ cnt: 0 }),
        };
        const { additive, sources } = await collectDelayedSignals(db, {
            user_id: 'u1',
            article_uid: 'pmid:1',
            created_at: '2026-01-01',
            normalized_topic: 'ards',
        });
        expect(sources).toContain('later_save');
        expect(additive).toBeGreaterThan(0);
    });
});
