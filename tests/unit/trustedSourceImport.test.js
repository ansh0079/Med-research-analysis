'use strict';

/**
 * The bodies added to GUIDELINE_BODY after the bulk discovery run were
 * recognised for badging but absent from the trusted-source registry, so
 * assessGuidelineQuality scored their recommendations 20 points lower and
 * flagged them `source_not_in_trusted_registry` -- a quality penalty applied to
 * genuinely real guidance purely because one of two lists had not caught up.
 *
 * isTrustedSource matches by substring in both directions, which is why the
 * imported ids are multi-character: a two- or three-letter id would mark
 * unrelated source names as trusted.
 */

const { TRUSTED_GUIDELINE_SOURCES } = require('../../server/config/trustedGuidelineSources');
const { assessGuidelineQuality } = require('../../server/services/guidelineQualityService');
const { isIssuingBodyValue } = require('../../server/utils/guidelineAttribution');

const IMPORTED = [
    'Surviving Sepsis Campaign', 'American College of Chest Physicians', 'American Thoracic Society',
    'American College of Rheumatology', 'American Academy of Neurology',
    'International Society for Peritoneal Dialysis', 'Canadian Thoracic Society',
    'American Thyroid Association', 'American Society of Nephrology',
    'American College of Physicians', 'American Academy of Pediatrics',
    'US Preventive Services Task Force', 'Society of Obstetricians and Gynaecologists of Canada',
    'American Society for Gastrointestinal Endoscopy', 'European Stroke Organisation',
    'American Society of Clinical Oncology',
];

const quality = (sourceBody) => assessGuidelineQuality({
    sourceBody, sourceYear: 2024, sourceUrl: 'https://example.org/g',
    recommendationStrength: 'strong', recommendationCertainty: 'high',
    status: 'ai_extracted', lastCheckedAt: new Date().toISOString(),
});

describe('imported bodies are trusted for quality scoring', () => {
    test.each(IMPORTED)('%s is no longer flagged as untrusted', (body) => {
        expect(quality(body).flags).not.toContain('source_not_in_trusted_registry');
        expect(quality(body).checks.trustedSource).toBe(true);
    });

    test('they are also recognised as issuing bodies, so the two lists agree', () => {
        // The badging list and the trust registry disagreeing is what produced
        // the penalty in the first place.
        for (const body of IMPORTED) expect(isIssuingBodyValue(body)).toBe(true);
    });

    test('trusted status is worth a real score difference', () => {
        expect(quality('Surviving Sepsis Campaign').score)
            .toBeGreaterThan(quality('Journal of Unrelated Things').score);
    });
});

describe('the registry stays sane', () => {
    test('ids and names are unique', () => {
        const ids = TRUSTED_GUIDELINE_SOURCES.map((s) => s.id);
        const names = TRUSTED_GUIDELINE_SOURCES.map((s) => s.name);
        expect(new Set(ids).size).toBe(ids.length);
        expect(new Set(names).size).toBe(names.length);
    });

    test('every entry carries the fields the sources API returns', () => {
        for (const s of TRUSTED_GUIDELINE_SOURCES) {
            for (const field of ['id', 'name', 'fullName', 'region', 'specialty', 'domain', 'urlPattern']) {
                expect(typeof s[field]).toBe('string');
                expect(s[field].length).toBeGreaterThan(0);
            }
        }
    });

    test('no id is short enough to collide by substring', () => {
        // isTrustedSource does normalized.includes(id), so 'who' would match any
        // body containing "who". Existing short ids are grandfathered; imported
        // ones must not add to the problem.
        const imported = TRUSTED_GUIDELINE_SOURCES.filter((s) => IMPORTED.includes(s.name));
        expect(imported).toHaveLength(16);
        for (const s of imported) expect(s.id.length).toBeGreaterThanOrEqual(3);
    });

    test('a plainly untrusted journal is still untrusted', () => {
        expect(quality('Dig Dis Sci').checks.trustedSource).toBe(false);
    });
});
