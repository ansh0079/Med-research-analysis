'use strict';

/**
 * Guideline discovery asks an LLM to name the issuing body from a paper
 * abstract and stored the answer unvalidated. Production accumulated 2,399 rows
 * with source_body "Clinical trial" carrying text like "The 90-day mortality
 * rate was 14% in the endovascular-therapy group" and
 * "<h4>Importance</h4>Whether intravenous thrombolysis is needed...".
 *
 * Those are trial results and scraped abstract fragments. Under a "Guidelines"
 * heading they tell a clinician that one trial's outcome is guidance, which is
 * the specific way this product could mislead someone.
 *
 * The guard is deliberately narrow. Real issuing bodies are chronically
 * under-listed, so "not in the curated list" must never be grounds for throwing
 * a recommendation away -- only values that cannot denote an organisation at
 * all, and text that is visibly an abstract.
 */

const {
    isRejectedSourceBody,
    looksLikeScrapedAbstract,
    assessGuidelineCandidate,
} = require('../../server/utils/guidelineQuality');

describe('isRejectedSourceBody', () => {
    test.each([
        'Clinical trial',
        'clinical trial',
        'Randomized Controlled Trial',
        'Systematic review',
        'Unknown',
        'N/A',
        'not specified',
        'Guideline',
        '',
        null,
    ])('rejects %s', (value) => {
        expect(isRejectedSourceBody(value)).toBe(true);
    });

    test('rejects a decorated trial label', () => {
        expect(isRejectedSourceBody('Clinical trial (NCT01234567)')).toBe(true);
    });

    test.each([
        'NICE',
        'WHO',
        'AGA Institute',
        'KDIGO',
        'Chinese Society of Hepatology, Chinese Medical Association',
        'Endocrine Society',
    ])('keeps %s', (value) => {
        expect(isRejectedSourceBody(value)).toBe(false);
    });

    test('keeps a real body that is absent from the curated GUIDELINE_BODY list', () => {
        // This is the whole reason the guard is separate from that list: being
        // unlisted means "do not badge it as a guideline body", never "discard
        // the recommendation".
        expect(isRejectedSourceBody('Chinese Society of Hepatology, Chinese Medical Association')).toBe(false);
    });
});

describe('looksLikeScrapedAbstract', () => {
    test('catches structured-abstract HTML', () => {
        expect(looksLikeScrapedAbstract('<h4>Importance</h4>Whether intravenous thrombolysis is needed')).toBe(true);
    });

    test('catches a structured-abstract heading without markup', () => {
        expect(looksLikeScrapedAbstract('Objective: to determine whether early reperfusion improves outcome.')).toBe(true);
    });

    test('leaves a normal recommendation alone', () => {
        expect(looksLikeScrapedAbstract(
            'IV albumin is the volume expander of choice in hospitalized patients with cirrhosis.',
        )).toBe(false);
    });

    test('does not trip on a recommendation that merely mentions results', () => {
        expect(looksLikeScrapedAbstract(
            'Vasoactive drugs should be used with albumin; results from randomised trials support this.',
        )).toBe(false);
    });
});

describe('assessGuidelineCandidate', () => {
    test('rejects the exact production shape, and says why', () => {
        expect(assessGuidelineCandidate({
            sourceBody: 'Clinical trial',
            recommendationText: 'The 90-day mortality rate was 14% in the endovascular-therapy group.',
        })).toEqual({ ok: false, reason: 'source_body_not_an_organisation' });
    });

    test('rejects an abstract fragment from a real body', () => {
        expect(assessGuidelineCandidate({
            sourceBody: 'NICE',
            recommendationText: '<h4>Objective</h4>To assess thrombectomy timing.',
        })).toEqual({ ok: false, reason: 'recommendation_text_is_abstract_fragment' });
    });

    test('accepts a genuine recommendation', () => {
        expect(assessGuidelineCandidate({
            sourceBody: 'AGA Institute',
            recommendationText: 'IV albumin is the volume expander of choice in hospitalized patients with cirrhosis.',
        })).toEqual({ ok: true, reason: null });
    });
});
