'use strict';

const {
    attributionConfidenceForSource,
    globalPriorConfidence,
    clampConfidence,
} = require('../../server/services/learning/attributionConfidence');
const { recordBanditReward } = require('../../server/services/bandit/rewards');
const { POLICY_SYNOPSIS_STYLE, POLICY_SEARCH_RANKING } = require('../../server/services/bandit/constants');
const { buildShadowRankings } = require('../../server/services/search/counterfactualRankingService');
const { findBestSpan, groundSynopsisClaims } = require('../../server/services/ai/synopsisSpanGroundingService');
const { calibratePaperSignificance } = require('../../server/services/ai/synopsisPaperSignificance');
const { detectSynopsisGuidelineConflicts } = require('../../server/services/ai/synopsisContradictionService');

describe('attribution confidence', () => {
    test('direct synopsis preference is high confidence; dwell is low', () => {
        expect(attributionConfidenceForSource('synopsis_feedback_helpful')).toBeGreaterThan(0.9);
        expect(attributionConfidenceForSource('impression_dwell')).toBeLessThan(0.3);
    });

    test('global prior is scaled down from user confidence', () => {
        expect(globalPriorConfidence(1)).toBeCloseTo(0.35, 5);
        expect(clampConfidence(2)).toBe(1);
    });

    test('recordBanditReward weights user and global pulls by confidence', async () => {
        const db = { recordPersonalizationArmPull: jest.fn().mockResolvedValue(true) };
        await recordBanditReward(db, POLICY_SYNOPSIS_STYLE, 'narrative', 1, 'user-9', {
            confidence: 0.95,
            sourceEvent: 'synopsis_feedback_helpful',
        });
        expect(db.recordPersonalizationArmPull).toHaveBeenCalledTimes(2);
        expect(db.recordPersonalizationArmPull.mock.calls[0][3]).toBe('user:user-9');
        expect(db.recordPersonalizationArmPull.mock.calls[0][4]).toBeCloseTo(0.95);
        expect(db.recordPersonalizationArmPull.mock.calls[1][3]).toBe('global');
        expect(db.recordPersonalizationArmPull.mock.calls[1][4]).toBeCloseTo(0.35 * 0.95);
    });
});

describe('counterfactual shadow rankings', () => {
    test('builds alternate arm orderings from served boosts', () => {
        const articles = [
            { uid: 'a', _learningBoost: 2 },
            { uid: 'b', _learningBoost: 0.5 },
            { uid: 'c', _learningBoost: 0 },
        ];
        const { servedUids, shadows } = buildShadowRankings(articles, 'heuristic_default');
        expect(servedUids).toEqual(['a', 'b', 'c']);
        expect(shadows.length).toBeGreaterThan(0);
        expect(shadows.every((s) => s.shadowArmId !== 'heuristic_default')).toBe(true);
        expect(shadows[0].shadowUids).toContain('a');
    });
});

describe('synopsis span grounding', () => {
    test('finds verbatim span in abstract', () => {
        const source = 'Low tidal volume ventilation reduces mortality in ARDS patients.';
        const hit = findBestSpan('Low tidal volume ventilation reduces mortality', source);
        expect(hit.grounded).toBe(true);
        expect(hit.evidenceSpan).toMatch(/tidal volume/i);
    });

    test('marks ungrounded key fields', () => {
        const result = groundSynopsisClaims(
            { bottomLine: 'Use extracorporeal membrane oxygenation routinely for mild hypoxemia.', mainFindings: 'Something unrelated xyzzy' },
            { abstract: 'This trial compared aspirin versus placebo for headache.' }
        );
        expect(result.ungroundedFields.length).toBeGreaterThan(0);
    });
});

describe('paper significance + contradictions', () => {
    test('calibrates landmark from archetype/citations', () => {
        const cal = calibratePaperSignificance(
            {
                title: 'Large RCT of ventilation',
                abstract: 'randomized controlled trial',
                pubtype: ['Randomized Controlled Trial'],
                citationCount: 500,
                pubdate: '2012',
            },
            { trustRating: 'HIGH' }
        );
        expect(['landmark', 'confirmatory', 'practice_changing']).toContain(cal.paperSignificance);
    });

    test('detects polarity conflict vs guideline', () => {
        const detection = detectSynopsisGuidelineConflicts(
            { bottomLine: 'This drug reduces mortality and is recommended first-line.' },
            [{ source_body: 'ESC', recommendation_text: 'This drug is not recommended and may increase mortality.' }]
        );
        expect(detection.hasConflict).toBe(true);
        expect(detection.conflicts[0].versus).toBe('guideline');
    });
});

describe('legacy organic arm normalization still works with confidence arg', () => {
    test('recordBanditReward writes normalized arm id', async () => {
        const db = { recordPersonalizationArmPull: jest.fn().mockResolvedValue(true) };
        await recordBanditReward(db, POLICY_SEARCH_RANKING, 'organic', 0.5, 'user-1');
        expect(db.recordPersonalizationArmPull).toHaveBeenCalledWith(
            POLICY_SEARCH_RANKING,
            'heuristic_default',
            0.5,
            expect.any(String),
            expect.any(Number)
        );
    });
});
