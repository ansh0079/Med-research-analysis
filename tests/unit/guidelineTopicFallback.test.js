'use strict';

/**
 * getGuidelinesByTopic matched normalized_topic by exact equality, so a
 * guideline was only found if the query was worded exactly like the stored
 * topic (or hit a synonym group).
 *
 * Measured on production: searching "hepatorenal syndrome terlipressin"
 * returned nothing, while topic_guidelines held four AGA Institute 2025
 * recommendations under "hepatorenal syndrome diagnosis and management" --
 * one naming terlipressin directly. The page reported "0 guidelines".
 *
 * For a product whose promise is "all the evidence we could find", a silent
 * under-report is the worst failure mode available: it is indistinguishable
 * from the evidence genuinely not existing.
 */

const GuidelinesMixin = require('../../database/mixins/m02a-guidelines');

const AGA_ROW = {
    id: 1,
    normalized_topic: 'hepatorenal syndrome diagnosis and management',
    topic: 'Hepatorenal syndrome diagnosis and management',
    source_body: 'AGA Institute',
    source_year: 2025,
    status: 'ai_extracted',
    superseded_by_id: null,
    recommendation_text: 'Vasoactive drugs (eg, terlipressin, norepinephrine) should be used with albumin in patients with hepatorenal syndrome to improve renal function.',
};

const UNRELATED_ROW = {
    id: 2,
    normalized_topic: 'atrial fibrillation anticoagulation',
    topic: 'Atrial fibrillation anticoagulation',
    source_body: 'ESC',
    source_year: 2024,
    status: 'ai_extracted',
    superseded_by_id: null,
    recommendation_text: 'Anticoagulation should be offered to patients with atrial fibrillation and elevated stroke risk.',
};

/**
 * Stands in for the SQL layer: the exact-equality query returns only rows whose
 * normalized_topic is in the key list, the LIKE fallback returns rows whose
 * normalized_topic contains any probe word.
 */
/**
 * Matches the query wording exactly but says little about it -- the shape that
 * masked the AGA recommendations in production.
 */
const WEAK_JOURNAL_ROW = {
    id: 3,
    normalized_topic: 'hepatorenal syndrome terlipressin',
    topic: 'Hepatorenal syndrome terlipressin',
    source_body: 'Dig Dis Sci',
    source_year: 2019,
    status: 'ai_extracted',
    superseded_by_id: null,
    recommendation_text: 'Recommendations on the diagnosis and initial management of acute variceal bleeding should be followed in cirrhosis.',
};

/**
 * The real AGA Institute shape: filed under the hepatorenal topic, but the
 * recommendation sentence never says "hepatorenal" -- the source document
 * supplied that context. 21 of 21 production rows look like this.
 */
const AGA_NO_DISEASE_WORD_ROW = {
    id: 4,
    normalized_topic: 'hepatorenal syndrome diagnosis and management',
    topic: 'Hepatorenal syndrome diagnosis and management',
    source_body: 'AGA Institute',
    source_year: 2024,
    status: 'ai_extracted',
    superseded_by_id: null,
    recommendation_text: 'IV albumin is the volume expander of choice in hospitalized patients with cirrhosis and should be given with vasoconstrictors.',
};

function makeDb(rows) {
    const Base = class {
        normalizeTopic(t) { return String(t || '').trim().toLowerCase(); }
        async run() { return { changes: 0 }; }
        async all(sql, params) {
            if (/normalized_topic IN/.test(sql)) {
                const keys = params.slice(0, params.length - 3);
                return rows.filter((r) => keys.includes(r.normalized_topic));
            }
            if (/normalized_topic LIKE/.test(sql)) {
                const likes = params
                    .filter((p) => typeof p === 'string' && p.startsWith('%') && p.endsWith('%'))
                    .map((p) => p.slice(1, -1));
                return rows.filter((r) => likes.some((w) => r.normalized_topic.includes(w)));
            }
            return [];
        }
    };
    return new (GuidelinesMixin(Base))();
}

describe('getGuidelinesByTopic', () => {
    test('still returns an exact topic match', async () => {
        const db = makeDb([AGA_ROW]);
        const out = await db.getGuidelinesByTopic('hepatorenal syndrome diagnosis and management');
        expect(out.map((g) => g.sourceBody)).toEqual(['AGA Institute']);
    });

    test('finds the guideline when the query is worded differently', async () => {
        // The production miss, exactly.
        const db = makeDb([AGA_ROW]);
        const out = await db.getGuidelinesByTopic('hepatorenal syndrome terlipressin');
        expect(out).toHaveLength(1);
        expect(out[0].sourceBody).toBe('AGA Institute');
    });

    test('does not drag in unrelated topics that merely share the table', async () => {
        // The relevance floor is what makes a wider net safe; without it this
        // would return atrial fibrillation guidance for a liver query.
        const db = makeDb([AGA_ROW, UNRELATED_ROW]);
        const out = await db.getGuidelinesByTopic('hepatorenal syndrome terlipressin');
        expect(out.map((g) => g.sourceBody)).toEqual(['AGA Institute']);
    });

    test('returns nothing when the corpus genuinely has nothing on the topic', async () => {
        const db = makeDb([UNRELATED_ROW]);
        const out = await db.getGuidelinesByTopic('hepatorenal syndrome terlipressin');
        expect(out).toEqual([]);
    });

    test('widens even when the exact match already returned something', async () => {
        // The production case: two weak journal rows matched the query exactly,
        // so gating the wider search on an empty result meant the four AGA
        // Institute 2025 recommendations were never looked for at all.
        const db = makeDb([WEAK_JOURNAL_ROW, AGA_ROW]);
        const out = await db.getGuidelinesByTopic('hepatorenal syndrome terlipressin');
        expect(out.map((g) => g.sourceBody)).toContain('AGA Institute');
    });

    test('ranks the on-topic recommendation above a weakly matching one', async () => {
        const db = makeDb([WEAK_JOURNAL_ROW, AGA_ROW]);
        const out = await db.getGuidelinesByTopic('hepatorenal syndrome terlipressin');
        expect(out[0].sourceBody).toBe('AGA Institute');
    });

    test('does not return the same guideline twice when both pools match it', async () => {
        const db = makeDb([AGA_ROW]);
        const out = await db.getGuidelinesByTopic('hepatorenal syndrome diagnosis and management');
        expect(out).toHaveLength(1);
    });

    test('keeps a recommendation filed under the topic that never restates it', async () => {
        // "syndrome" is a stopword, so this query reduces to ["hepatorenal"] --
        // a word that appears nowhere in the recommendation text. Scoring text
        // alone discarded every AGA row in production.
        const db = makeDb([AGA_NO_DISEASE_WORD_ROW]);
        const out = await db.getGuidelinesByTopic('hepatorenal syndrome');
        expect(out.map((g) => g.sourceBody)).toEqual(['AGA Institute']);
    });

    test('still ranks an on-topic recommendation above one that only shares a topic label', async () => {
        const db = makeDb([AGA_NO_DISEASE_WORD_ROW, AGA_ROW]);
        const out = await db.getGuidelinesByTopic('hepatorenal syndrome terlipressin');
        // AGA_ROW names terlipressin in its text; the other only matches by filing.
        expect(out[0].id).toBe(AGA_ROW.id);
    });

    test('a genuinely unrelated topic is still excluded', async () => {
        const db = makeDb([UNRELATED_ROW]);
        const out = await db.getGuidelinesByTopic('hepatorenal syndrome');
        expect(out).toEqual([]);
    });
});
