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
});
