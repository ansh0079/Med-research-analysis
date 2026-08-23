'use strict';

const { normalizeSearchId } = require('../../shared/searchId');

describe('normalizeSearchId', () => {
    // Regression: searches.id is a uuid in production Postgres but INTEGER in local
    // SQLite. Call sites used Number(searchId), which produced NaN for every real
    // production id. In /api/search/impressions and /api/search/interaction that NaN
    // failed the `!sid` guard, so both endpoints returned 400 for every request and no
    // impression, click or dwell signal could ever be recorded.
    test('preserves a uuid instead of collapsing it to NaN', () => {
        const uuid = 'a1b64acc-d7fd-46db-9e20-4752bfe05cb8';
        expect(normalizeSearchId(uuid)).toBe(uuid);
        expect(Number.isNaN(Number(uuid))).toBe(true); // what the old code did
    });

    test('a uuid passes a truthiness guard that NaN would fail', () => {
        const uuid = 'a1b64acc-d7fd-46db-9e20-4752bfe05cb8';
        expect(Boolean(normalizeSearchId(uuid))).toBe(true);
        expect(Boolean(Number(uuid))).toBe(false); // the 400-on-every-request bug
    });

    test('still accepts SQLite integer ids', () => {
        expect(normalizeSearchId(5)).toBe('5');
        expect(normalizeSearchId('5')).toBe('5');
    });

    test('treats absent and malformed values as null', () => {
        for (const v of [null, undefined, '', '   ', NaN, 'NaN', 'null', 'undefined']) {
            expect(normalizeSearchId(v)).toBeNull();
        }
    });
});
