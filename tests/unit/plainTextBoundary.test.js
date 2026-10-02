'use strict';

/**
 * Search queries and article text are plain text on the way in and on the way out.
 *
 * Production, 2026-09-27: "crohn's disease biologics" reached PubMed/OpenAlex as
 * "crohn&#039;s disease biologics" and returned 1 article (10 without the apostrophe), and
 * abstracts reached readers as "Crohn&amp;#039;s" and "P &amp;lt; .001". React escapes on render;
 * escaping on the server as well is what put entities in front of users.
 */

const { decodeHtmlEntities } = require('../../server/utils/sanitization');
const { validateQuery, sanitizeArticleOutput } = require('../../server/utils/articles');

describe('decodeHtmlEntities', () => {
    test('decodes named and numeric entities', () => {
        expect(decodeHtmlEntities('Crohn&#039;s &amp; colitis, P &lt; .05, &quot;x&quot;, &#x27;y&#x27;'))
            .toBe(`Crohn's & colitis, P < .05, "x", 'y'`);
    });

    test('undoes text that was escaped twice', () => {
        expect(decodeHtmlEntities('Ringer&amp;#039;s Acetate')).toBe("Ringer's Acetate");
        expect(decodeHtmlEntities('P &amp;lt; .001')).toBe('P < .001');
    });

    test('leaves plain text and unknown entities alone', () => {
        expect(decodeHtmlEntities("Crohn's disease")).toBe("Crohn's disease");
        expect(decodeHtmlEntities('R&D &madeup; A & B')).toBe('R&D &madeup; A & B');
        expect(decodeHtmlEntities(null)).toBe(null);
    });
});

describe('search queries are not HTML-escaped', () => {
    test.each([
        ["crohn's disease biologics", "crohn's disease biologics"],
        ["Graves' disease", "Graves' disease"],
        ['age < 65 sepsis', 'age < 65 sepsis'],
        ['crohn&#039;s disease', "crohn's disease"],
    ])('%s', (input, expected) => {
        const result = validateQuery(input);
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBe(expected);
    });

    test('script-shaped input is still refused, including when entity-encoded', () => {
        expect(validateQuery('<script>alert(1)</script>').valid).toBe(false);
        expect(validateQuery('&lt;script&gt;alert(1)').valid).toBe(false);
    });
});

describe('article output is plain text', () => {
    test('unknown publication metadata is labelled unverified rather than cross-sectional', () => {
        const out = sanitizeArticleOutput({ uid: 'unknown', title: 'Sparse provider record' });
        expect(out._ebmScore).toBe(-1);
        expect(out._ebmLabel).toEqual({ label: 'Study type unverified', short: 'Type unverified' });
    });

    test('title, abstract and source come back decoded, whatever state they were stored in', () => {
        const out = sanitizeArticleOutput({
            uid: 'x',
            title: 'Hydroxyethyl Starch versus Ringer&amp;#039;s Acetate',
            abstract: "Crohn's disease (P &lt; .001)",
            source: 'Obstetrics &amp; Gynecology',
        });
        expect(out.title).toBe("Hydroxyethyl Starch versus Ringer's Acetate");
        expect(out.abstract).toBe("Crohn's disease (P < .001)");
        expect(out.source).toBe('Obstetrics & Gynecology');
    });

    test('sanitising twice is harmless', () => {
        const once = sanitizeArticleOutput({ uid: 'x', title: "Parkinson's disease" });
        expect(sanitizeArticleOutput(once).title).toBe("Parkinson's disease");
    });
});
