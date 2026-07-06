'use strict';

const { hashKey } = require('../../server/services/apiKeyService');

describe('apiKeyService', () => {
    test('hashKey is deterministic for the same raw key', () => {
        const a = hashKey('mr_live_test-key-123');
        const b = hashKey('mr_live_test-key-123');
        expect(a).toBe(b);
        expect(a).toHaveLength(64);
    });

    test('hashKey differs for different keys', () => {
        expect(hashKey('mr_live_a')).not.toBe(hashKey('mr_live_b'));
    });
});
