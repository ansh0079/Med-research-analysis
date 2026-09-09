'use strict';

/**
 * A reader opening the EASL ascites guideline was shown, under a
 * recommendations heading, a row attributed to "Trauma surgery & acute care
 * open 2022" -- a journal. getGuidelinesByTopic never set isIssuingBody (only
 * the /api/guidelines route did), so the synopsis path read undefined from
 * every row and filtered nothing.
 *
 * These tests pin the two decisions that keep attribution honest: journals are
 * not guidance, and a recommendation is only ever presented as *this document's*
 * when the issuing body actually matches.
 */

const {
    detectIssuingBody,
    isIssuingBodyValue,
    partitionGuidelinesForDocument,
    toRecommendation,
} = require('../../server/utils/guidelineAttribution');

describe('detectIssuingBody', () => {
    test.each([
        ['EASL clinical practice guidelines on the management of ascites', 'EASL'],
        ['AGA Institute', 'AGA'],
        ['2021 AASLD practice guidance on ascites', 'AASLD'],
        ['NICE guideline NG15', 'NICE'],
    ])('reads the body out of %s', (text, expected) => {
        expect(detectIssuingBody(text)).toBe(expected);
    });

    test('takes the longer name when one abbreviation prefixes another', () => {
        // 'ACC' is listed before 'ACCF'; the trailing boundary must stop it
        // matching the first three letters of ACCF.
        expect(detectIssuingBody('ACCF/AHA guideline')).toBe('ACCF');
    });

    test('falls through the arguments in order until one names a body', () => {
        expect(detectIssuingBody('', null, 'Published by KDIGO')).toBe('KDIGO');
    });

    test.each([
        'Dig Dis Sci',
        'Trauma surgery & acute care open',
        'Clinical trial',
        'Zhonghua Gan Zang Bing Za Zhi',
        '',
        null,
    ])('finds no body in %s', (text) => {
        expect(detectIssuingBody(text)).toBeNull();
    });
});

describe('isIssuingBodyValue', () => {
    test.each(['NICE', 'EASL', 'AGA Institute', 'WHO'])('%s is an issuing body', (body) => {
        expect(isIssuingBodyValue(body)).toBe(true);
    });

    test.each(['Dig Dis Sci', 'Hepatol Int', 'Gastroenterology', 'Clinical trial', 'Unknown'])(
        '%s is not',
        (body) => {
            expect(isIssuingBodyValue(body)).toBe(false);
        },
    );
});

describe('partitionGuidelinesForDocument', () => {
    const rows = [
        { sourceBody: 'AGA Institute', recommendationText: 'IV albumin in SBP.' },
        { sourceBody: 'NICE', recommendationText: 'Consider TIPS.' },
        { sourceBody: 'Trauma surgery & acute care open', recommendationText: 'PPI in ventilated cirrhosis.' },
        { sourceBody: 'Clinical trial', recommendationText: 'The 90-day mortality rate was 14%.' },
        { sourceBody: 'EASL', recommendationText: 'Terlipressin plus albumin for HRS-AKI.' },
    ];

    test("a guideline's own body becomes what this document says", () => {
        const { own } = partitionGuidelinesForDocument({ documentBody: 'EASL', guidelines: rows });
        expect(own.map((r) => r.sourceBody)).toEqual(['EASL']);
    });

    test('other organisations stay separate, so nothing is misattributed', () => {
        const { related } = partitionGuidelinesForDocument({ documentBody: 'EASL', guidelines: rows });
        expect(related.map((r) => r.sourceBody)).toEqual(['AGA Institute', 'NICE']);
    });

    test('journals and trial labels are guidance for nobody', () => {
        const { own, related } = partitionGuidelinesForDocument({ documentBody: 'EASL', guidelines: rows });
        const shown = [...own, ...related].map((r) => r.sourceBody);
        expect(shown).not.toContain('Trauma surgery & acute care open');
        expect(shown).not.toContain('Clinical trial');
    });

    test('matches a row body to a document body written differently', () => {
        const { own } = partitionGuidelinesForDocument({
            documentBody: detectIssuingBody('AGA Institute guideline on ascites'),
            guidelines: [{ sourceBody: 'AGA', recommendationText: 'x' }],
        });
        expect(own).toHaveLength(1);
    });

    test('an unidentifiable document claims nothing as its own', () => {
        // A trial or a journal article has no issuing body, so every
        // recommendation is another body's.
        const { own, related } = partitionGuidelinesForDocument({ documentBody: null, guidelines: rows });
        expect(own).toHaveLength(0);
        expect(related).toHaveLength(3);
    });

    test('two bodies that merely share a topic are never merged', () => {
        const { own } = partitionGuidelinesForDocument({
            documentBody: 'EASL',
            guidelines: [{ sourceBody: 'AASLD', recommendationText: 'Different body, same topic.' }],
        });
        expect(own).toHaveLength(0);
    });

    test('handles snake_case rows straight from the database', () => {
        const { own } = partitionGuidelinesForDocument({
            documentBody: 'NICE',
            guidelines: [{ source_body: 'NICE', recommendation_text: 'y' }],
        });
        expect(own).toHaveLength(1);
    });

    test('empty input is empty output, not a crash', () => {
        expect(partitionGuidelinesForDocument()).toEqual({ own: [], related: [] });
    });
});

describe('toRecommendation', () => {
    test('normalises a snake_case row and flags the body', () => {
        expect(toRecommendation({
            source_body: 'AGA Institute',
            source_year: 2024,
            source_url: 'https://example.org/g',
            recommendation_text: 'IV albumin in SBP.',
            recommendation_strength: 'strong',
        })).toEqual({
            sourceBody: 'AGA Institute',
            sourceYear: 2024,
            sourceUrl: 'https://example.org/g',
            isIssuingBody: true,
            recommendationText: 'IV albumin in SBP.',
            recommendationStrength: 'strong',
        });
    });

    test('missing fields become null rather than undefined', () => {
        const out = toRecommendation({ sourceBody: 'NICE', recommendationText: 'x' });
        expect(out.sourceYear).toBeNull();
        expect(out.recommendationStrength).toBeNull();
    });
});
