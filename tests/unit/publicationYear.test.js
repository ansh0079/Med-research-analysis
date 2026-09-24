'use strict';

const { sanitizePublicationYear } = require('../../server/utils/publicationYear');

describe('sanitizePublicationYear', () => {
    const now = new Date('2026-09-18T00:00:00Z');

    it('keeps a real publication year', () => {
        expect(sanitizePublicationYear(2025, { now })).toBe(2025);
        expect(sanitizePublicationYear('2025', { now })).toBe(2025);
    });

    it('keeps genuinely old guidelines rather than treating age as an error', () => {
        // 1992 ACCP/SCCM sepsis definitions.
        expect(sanitizePublicationYear(1992, { now })).toBe(1992);
    });

    it('allows one year of lead for ahead-of-print', () => {
        expect(sanitizePublicationYear(2027, { now })).toBe(2027);
    });

    it('rejects a target year scraped out of recommendation text', () => {
        // WHO hepatitis B row carried 2030 from "elimination by 2030".
        expect(sanitizePublicationYear(2030, { now })).toBeNull();
    });

    it('returns null for absent or unparseable input', () => {
        for (const value of [null, undefined, '', 'n/a', NaN]) {
            expect(sanitizePublicationYear(value, { now })).toBeNull();
        }
    });
});
