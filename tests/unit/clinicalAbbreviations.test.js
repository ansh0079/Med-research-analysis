'use strict';

const { isClinicalAbbreviation } = require('../../server/utils/clinicalAbbreviations');

describe('isClinicalAbbreviation', () => {
    it('keeps the abbreviations clinicians actually type', () => {
        // "aki diagnosis and management" reduced to ["diagnosis"] in production
        // and returned cardiac amyloidosis, hepatorenal syndrome and syphilis.
        for (const term of ['aki', 'ckd', 'af', 'pe', 'uti', 'dvt', 'copd', 'sle', 'dka', 'tia']) {
            expect(isClinicalAbbreviation(term)).toBe(true);
        }
    });

    it('does not admit function words below the length floor', () => {
        for (const term of ['the', 'and', 'for', 'was', 'its', 'via', 'xyz', '']) {
            expect(isClinicalAbbreviation(term)).toBe(false);
        }
    });

    it('picks up short keys curated as synonym groups', () => {
        // cap / hap are synonym-group keys, not in the hand-written list.
        expect(isClinicalAbbreviation('cap')).toBe(true);
        expect(isClinicalAbbreviation('hap')).toBe(true);
    });

    it('is case-insensitive and null-safe', () => {
        expect(isClinicalAbbreviation('AKI')).toBe(true);
        expect(isClinicalAbbreviation(null)).toBe(false);
    });
});
