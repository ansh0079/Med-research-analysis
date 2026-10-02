'use strict';

const { buildSynthesisCacheKey } = require('../../server/services/synthesisPersonalization');

describe('synthesisPersonalization', () => {
    test('buildSynthesisCacheKey is stable for the same article UIDs in different orders', () => {
        const a = buildSynthesisCacheKey('ARDS', [
            { uid: 'pmid:2' },
            { uid: 'pmid:1' },
        ], 'pv-test');
        const b = buildSynthesisCacheKey('ARDS', [
            { uid: 'pmid:1' },
            { uid: 'pmid:2' },
        ], 'pv-test');

        expect(a).toBe(b);
    });

    test('two clinicians and two synonym phrasings share one synthesis key', () => {
        const articles = [{ uid: 'pmid:2' }, { uid: 'pmid:1' }];
        const aki = buildSynthesisCacheKey('AKI', articles, 'pv-test', { userId: 'u1', sessionDepth: 4 });
        const expanded = buildSynthesisCacheKey('acute kidney injury', articles, 'pv-test', { userId: 'u2', trainingStage: 'finals' });
        expect(aki).toBe(expanded);
        expect(buildSynthesisCacheKey('AKI dialysis', articles, 'pv-test')).not.toBe(aki);
    });
});
