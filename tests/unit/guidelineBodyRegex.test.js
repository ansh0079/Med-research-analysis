'use strict';

/**
 * GUIDELINE_BODY decides whether a source counts as a real guideline-issuing
 * organisation. It gates the "Guideline" trust badge on MCQs
 * (computeMcqClaimKey / isRealGuideline) and the guideline count shown at the
 * top of the search page.
 *
 * It was silently broken for most of its entries. They were written as
 * `'WHO\b'` inside single-quoted JS strings, where `\b` is a literal backspace
 * (U+0008), not a regex word boundary -- so 39 of ~100 bodies never matched
 * anything. WHO, ESC, AHA, ADA, AGA, CDC, ATS, NIH and around thirty others
 * were treated as ordinary journals for as long as the list existed, while
 * NICE, EULAR, KDIGO and the other boundary-free entries worked fine. Nothing
 * failed loudly; guidance was just quietly labelled as weaker evidence.
 *
 * Fixing that by anchoring only the end introduced the opposite error: `EAN\b`
 * matched "Korean". Both ends are needed, which is why the boundaries now wrap
 * the whole alternation.
 */

const { GUIDELINE_BODY } = require('../../server/utils/mcqClaimKey');

// Every one of these appears in production topic_guidelines.source_body.
const REAL_BODIES = [
    'NICE', 'WHO', 'ESC', 'AHA/ACC', 'ADA', 'EULAR', 'KDIGO', 'ESICM', 'IDSA', 'NCCN',
    'ESMO', 'ERS', 'CDC', 'ATS', 'NIH', 'ACG', 'SIGN', 'AASLD', 'EASL', 'AGA Institute',
    'IPNA', 'Endocrine Society', 'European Academy of Neurology', 'American College of Radiology',
    // Added from the 2026-09-10 bulk discovery run across 174 previously
    // zero-guideline topics. These are the spelled-out forms that actually
    // appeared -- an acronym already on the list (AAP, SOGC, USPSTF, ATS,
    // IDSA, ACR, AAN, ASCO, ERS) does not also match its own name in full.
    'Surviving Sepsis Campaign', 'American College of Chest Physicians', 'American Thoracic Society',
    'Infectious Diseases Society of America', 'American College of Rheumatology',
    'American Academy of Neurology', 'International Society for Peritoneal Dialysis',
    'Canadian Thoracic Society', 'American Thyroid Association', 'American Society of Nephrology',
    'American College of Physicians', 'American Academy of Pediatrics',
    'US Preventive Services Task Force', 'Society of Obstetricians and Gynaecologists of Canada',
    'American Society for Gastrointestinal Endoscopy', 'European Stroke Organisation',
    'European Respiratory Society', 'American Society of Clinical Oncology',
];

// Also all real values from that column -- journals, labels and placeholders.
const NOT_BODIES = [
    'Dig Dis Sci', 'Vnitr Lek', 'Cureus', 'Gut', 'Journal of clinical medicine',
    'Clinical trial', 'Unknown', 'Korean', 'Nature reviews. Nephrology',
    'The Cochrane database of systematic reviews', 'British journal of haematology',
    'British journal of cancer', 'Critical care (London, England)',
    'Journal of neurology, neurosurgery, and psychiatry', 'Journal of personalized medicine',
    // From the 2026-09-10 bulk run: journal titles the extraction prompt copied
    // wholesale as source_body (see "if unclear, use the journal name" in
    // guidelineService.js's extraction prompt) -- some embed a real society's
    // name as their own subtitle, which is exactly why this must stay a
    // literal-substring check on the whole value rather than "contains a real
    // body's name somewhere in it".
    'Nefrologia : publicacion oficial de la Sociedad Espanola Nefrologia',
    'Infectious diseases now', 'Revue medicale de Liege', 'Acta medica portuguesa',
];

describe('GUIDELINE_BODY', () => {
    test('contains no literal backspace, which is what \\b becomes in a quoted string', () => {
        // Compared against the character itself rather than a regex literal: as a
        // raw character inside //, this assertion is invisible in a diff -- which is
        // how the original bug survived review in the first place.
        expect(GUIDELINE_BODY.source.includes(String.fromCharCode(8))).toBe(false);
    });

    test('uses real word boundaries', () => {
        expect(GUIDELINE_BODY.source).toContain('\\b');
    });

    test.each(REAL_BODIES)('recognises %s', (body) => {
        expect(GUIDELINE_BODY.test(body)).toBe(true);
    });

    test.each(NOT_BODIES)('does not mistake %s for a guideline body', (body) => {
        expect(GUIDELINE_BODY.test(body)).toBe(false);
    });

    test('does not match an acronym buried inside a longer word', () => {
        // "Korean" contains EAN; "Against" contains AGA... boundaries on both
        // ends are the only thing preventing this class of false positive.
        expect(GUIDELINE_BODY.test('Korean')).toBe(false);
        expect(GUIDELINE_BODY.test('Against medical advice')).toBe(false);
    });

    test('matches an acronym that is followed by punctuation or more words', () => {
        expect(GUIDELINE_BODY.test('AHA/ACC 2024')).toBe(true);
        expect(GUIDELINE_BODY.test('NICE guideline NG238')).toBe(true);
        expect(GUIDELINE_BODY.test('Journal of hepatology / EASL')).toBe(true);
    });
});
