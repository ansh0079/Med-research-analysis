'use strict';

const { applyGuidelineCoverageMask, isGuidelineSource, GUARDED_INTENTS } = require('../../server/services/search/guidelineCoverageMask');

describe('guidelineCoverageMask', () => {
    const pool = [
        { uid: 'g1', _evidenceLane: 'guidelines', title: 'NICE sepsis guideline' },
        { uid: 'a1', _evidenceLane: 'landmark_trials' },
        { uid: 'a2', _evidenceLane: 'reviews' },
    ];

    test('non-guarded intents pass through untouched', () => {
        const ranked = [{ uid: 'a1' }, { uid: 'a2' }];
        const out = applyGuidelineCoverageMask(ranked, pool, { intent: 'diagnostic' });
        expect(out.applied).toBe(false);
        expect(out.reason).toBe('intent_not_guarded');
        expect(out.articles).toBe(ranked);
    });

    test('therapeutic intent with guideline already served is a no-op', () => {
        const ranked = [{ uid: 'g1', _evidenceLane: 'guidelines' }, { uid: 'a1' }];
        const out = applyGuidelineCoverageMask(ranked, pool, { intent: 'therapeutic' });
        expect(out.applied).toBe(false);
        expect(out.reason).toBe('coverage_ok');
    });

    test('therapeutic intent without guideline reinstates best pool guideline in top-3', () => {
        const ranked = [{ uid: 'a1' }, { uid: 'a2' }, { uid: 'a3' }, { uid: 'a4' }];
        const out = applyGuidelineCoverageMask(ranked, pool, { intent: 'therapeutic' });
        expect(out.applied).toBe(true);
        expect(out.inserted.uid).toBe('g1');
        expect(out.articles).toHaveLength(4); // count preserved
        expect(out.articles[2].uid).toBe('g1'); // inserted at position 2
        expect(out.articles[2]._guidelineGuardrail).toBe('inserted');
        expect(out.articles[out.articles.length - 1].uid).toBe('a3'); // tail dropped
    });

    test('guideline intent is also guarded', () => {
        expect(GUARDED_INTENTS.has('guideline')).toBe(true);
        const out = applyGuidelineCoverageMask([{ uid: 'a1' }], pool, { intent: 'guideline' });
        expect(out.applied).toBe(true);
    });

    test('no guideline anywhere in pool: pass through and report the gap', () => {
        const noGuidePool = [{ uid: 'a1', _evidenceLane: 'reviews' }];
        const out = applyGuidelineCoverageMask([{ uid: 'a1' }], noGuidePool, { intent: 'therapeutic' });
        expect(out.applied).toBe(false);
        expect(out.reason).toBe('no_guideline_in_pool');
    });

    test('isGuidelineSource recognizes lane, archetype and sourceType', () => {
        expect(isGuidelineSource({ _evidenceLane: 'guidelines' })).toBe(true);
        expect(isGuidelineSource({ archetype: 'guideline' })).toBe(true);
        expect(isGuidelineSource({ sourceType: 'guideline' })).toBe(true);
        expect(isGuidelineSource({ _evidenceLane: 'reviews' })).toBe(false);
        expect(isGuidelineSource(null)).toBe(false);
    });
});
