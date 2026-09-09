'use strict';

/**
 * "In a merged synopsis of all guidelines everything should be recommended
 * together."
 *
 * A clinician was given twenty separate recommendation rows from five
 * organisations and left to merge them mentally. This groups them by clinical
 * decision so agreement and disagreement are visible together.
 *
 * Two properties are load-bearing and are what these tests actually protect:
 *
 * 1. The model never writes recommendation text -- it returns indices, and
 *    every group is rebuilt from the original rows. Fabrication is therefore
 *    unrepresentable rather than merely discouraged.
 * 2. Nothing is silently dropped. Under "we show you all the evidence", a
 *    recommendation the model forgot to assign is the product failing, and it
 *    fails invisibly. Every unassigned row is swept into a final theme and
 *    counted.
 */

const {
    selectMergeableRecommendations,
    reconcileThemes,
    parseThemesJson,
} = require('../../server/services/ai/guidelineMergeService');

const rec = (over = {}) => ({
    sourceBody: 'EASL',
    sourceYear: 2018,
    recommendationText: 'Terlipressin plus albumin is recommended as first-line therapy for HRS-AKI.',
    recommendationStrength: 'strong',
    ...over,
});

describe('selectMergeableRecommendations', () => {
    test('keeps recommendations from real issuing bodies', () => {
        const out = selectMergeableRecommendations([rec(), rec({ sourceBody: 'AGA Institute' })]);
        expect(out.map((r) => r.sourceBody)).toEqual(['EASL', 'AGA Institute']);
    });

    test('drops journals, which issue no guidance', () => {
        const out = selectMergeableRecommendations([
            rec(),
            rec({ sourceBody: 'Dig Dis Sci' }),
            rec({ sourceBody: 'Trauma surgery & acute care open' }),
        ]);
        expect(out).toHaveLength(1);
    });

    test('drops trial findings stored in the same table', () => {
        const out = selectMergeableRecommendations([
            rec(),
            rec({ sourceBody: 'Clinical trial', recommendationText: 'The 90-day mortality rate was 14% in the endovascular group.' }),
        ]);
        expect(out).toHaveLength(1);
    });

    test('drops scraped abstract fragments even from a real body', () => {
        const out = selectMergeableRecommendations([
            rec({ sourceBody: 'NICE', recommendationText: '<h4>Objective</h4>To assess thrombectomy timing in acute stroke.' }),
        ]);
        expect(out).toHaveLength(0);
    });

    test('deduplicates the same recommendation from the same body', () => {
        const out = selectMergeableRecommendations([rec(), rec(), rec({ sourceBody: 'AGA' })]);
        expect(out).toHaveLength(2);
    });

    test('keeps the same text from two different bodies -- that is agreement, not duplication', () => {
        const out = selectMergeableRecommendations([rec(), rec({ sourceBody: 'AASLD' })]);
        expect(out).toHaveLength(2);
    });

    test('drops text too short to be a recommendation', () => {
        expect(selectMergeableRecommendations([rec({ recommendationText: 'Use albumin.' })])).toHaveLength(0);
    });

    test('reads snake_case rows straight from the database', () => {
        const out = selectMergeableRecommendations([{
            source_body: 'NICE',
            source_year: 2020,
            recommendation_text: 'Offer terlipressin with albumin to people with hepatorenal syndrome.',
            recommendation_strength: 'strong',
        }]);
        expect(out[0]).toMatchObject({ sourceBody: 'NICE', sourceYear: 2020, recommendationStrength: 'strong' });
    });

    test('caps the list rather than sending an unbounded prompt', () => {
        const many = Array.from({ length: 80 }, (_, i) => rec({ recommendationText: `Distinct recommendation number ${i} about management.` }));
        expect(selectMergeableRecommendations(many).length).toBeLessThanOrEqual(40);
    });
});

describe('reconcileThemes', () => {
    const four = [
        rec({ sourceBody: 'EASL', recommendationText: 'Terlipressin plus albumin is first-line for HRS-AKI.' }),
        rec({ sourceBody: 'AGA', recommendationText: 'Norepinephrine is an acceptable alternative to terlipressin.' }),
        rec({ sourceBody: 'NICE', recommendationText: 'Offer large-volume paracentesis with albumin cover.' }),
        rec({ sourceBody: 'AASLD', recommendationText: 'Assess for infection before starting vasoconstrictors.' }),
    ];

    test('rebuilds each theme from the original rows, not from model text', () => {
        const { themes } = reconcileThemes(
            [{ label: 'Vasoconstrictor therapy', agreement: 'conflict', conflictNote: 'EASL and AGA differ.', recommendationIndexes: [0, 1] }],
            four,
        );
        expect(themes[0].recommendations.map((r) => r.recommendationText)).toEqual([
            'Terlipressin plus albumin is first-line for HRS-AKI.',
            'Norepinephrine is an acceptable alternative to terlipressin.',
        ]);
        // Every returned recommendation is object-identical to an input row.
        expect(themes[0].recommendations[0]).toBe(four[0]);
    });

    test('sweeps up recommendations the model never assigned, and counts them', () => {
        const { themes, unassignedCount } = reconcileThemes(
            [{ label: 'Vasoconstrictor therapy', agreement: 'agree', recommendationIndexes: [0, 1] }],
            four,
        );
        expect(unassignedCount).toBe(2);
        const all = themes.flatMap((t) => t.recommendations);
        expect(all).toHaveLength(4);
        expect(themes.at(-1).label).toBe('Other recommendations');
    });

    test('every recommendation survives even when the model returns nothing usable', () => {
        const { themes, unassignedCount } = reconcileThemes([], four);
        expect(themes.flatMap((t) => t.recommendations)).toHaveLength(4);
        expect(unassignedCount).toBe(4);
    });

    test('ignores an index that does not exist', () => {
        const { themes } = reconcileThemes(
            [{ label: 'Bogus', agreement: 'agree', recommendationIndexes: [0, 99, -1, 'x', null] }],
            four,
        );
        expect(themes[0].recommendations).toEqual([four[0]]);
    });

    test('a recommendation claimed by two themes is placed once', () => {
        const { themes } = reconcileThemes([
            { label: 'First', agreement: 'agree', recommendationIndexes: [0, 1] },
            { label: 'Second', agreement: 'agree', recommendationIndexes: [1, 2] },
        ], four);
        const all = themes.flatMap((t) => t.recommendations);
        expect(all).toHaveLength(4);
        expect(new Set(all).size).toBe(4);
    });

    test('drops a theme left empty after validation rather than showing a blank heading', () => {
        const { themes } = reconcileThemes(
            [{ label: 'Empty', agreement: 'agree', recommendationIndexes: [99] }],
            four,
        );
        expect(themes.every((t) => t.recommendations.length > 0)).toBe(true);
    });

    describe('agreement is corrected from the data, not taken on trust', () => {
        test('one organisation cannot conflict with itself', () => {
            const same = [rec({ sourceBody: 'EASL' }), rec({ sourceBody: 'EASL', recommendationText: 'Another EASL recommendation about albumin dosing.' })];
            const { themes } = reconcileThemes(
                [{ label: 'Albumin', agreement: 'conflict', conflictNote: 'They differ.', recommendationIndexes: [0, 1] }],
                same,
            );
            expect(themes[0].agreement).toBe('single');
            expect(themes[0].conflictNote).toBeNull();
        });

        test('"single" is corrected to "agree" when several bodies are present', () => {
            const { themes } = reconcileThemes(
                [{ label: 'Vasoconstrictors', agreement: 'single', recommendationIndexes: [0, 1] }],
                four,
            );
            expect(themes[0].agreement).toBe('agree');
        });

        test('a real conflict between two bodies is kept, with its note', () => {
            const { themes } = reconcileThemes(
                [{ label: 'Vasoconstrictors', agreement: 'conflict', conflictNote: 'EASL prefers terlipressin; AGA allows norepinephrine.', recommendationIndexes: [0, 1] }],
                four,
            );
            expect(themes[0].agreement).toBe('conflict');
            expect(themes[0].conflictNote).toMatch(/EASL/);
        });

        test('an unrecognised agreement value falls back rather than reaching the UI', () => {
            const { themes } = reconcileThemes(
                [{ label: 'X', agreement: 'wildly-disagree', recommendationIndexes: [0, 1] }],
                four,
            );
            expect(['agree', 'conflict', 'single']).toContain(themes[0].agreement);
        });
    });

    test('lists the distinct bodies in each theme', () => {
        const { themes } = reconcileThemes(
            [{ label: 'Vasoconstrictors', agreement: 'conflict', recommendationIndexes: [0, 1] }],
            four,
        );
        expect(themes[0].bodies).toEqual(['EASL', 'AGA']);
    });

    test('an unlabelled theme still gets a heading', () => {
        const { themes } = reconcileThemes([{ agreement: 'agree', recommendationIndexes: [0] }], four);
        expect(themes[0].label).toBeTruthy();
    });
});

describe('parseThemesJson', () => {
    test('parses a plain object', () => {
        expect(parseThemesJson('{"themes":[]}')).toEqual({ themes: [] });
    });

    test('parses through a markdown fence, which models add unbidden', () => {
        expect(parseThemesJson('```json\n{"themes":[{"label":"A"}]}\n```')).toEqual({ themes: [{ label: 'A' }] });
    });

    test('parses through leading prose', () => {
        expect(parseThemesJson('Here you go:\n{"themes":[]}')).toEqual({ themes: [] });
    });

    test.each(['', null, 'not json at all', '{"themes":'])('returns null for %p rather than throwing', (input) => {
        expect(parseThemesJson(input)).toBeNull();
    });
});
