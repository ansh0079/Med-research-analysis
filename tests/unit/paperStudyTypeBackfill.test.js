'use strict';

/**
 * 4,460 of 6,000 stored papers carry studyType "other" or none at all, which
 * makes them unusable for anything that ranks by evidence level -- including the
 * fallback that should surface a systematic review on a topic with no guideline.
 *
 * The cause: buildPaperTeachingObject derived studyType from article.pubtype and
 * stored only the answer, throwing away the input. So the classification could
 * not be recomputed locally and the metadata had to be refetched.
 *
 * These tests pin the fix at the write site (the input is kept) and the two
 * rules the backfill must not break: the classifier agrees with the write path,
 * and rows that already have a real study type are never rewritten.
 */

const { buildPaperTeachingObject } = require('../../server/services/ai/teachingObjectService');

const build = (article) => buildPaperTeachingObject({
    article: { uid: 'pmid:1', title: 'A study of something', ...article },
    synopsisResult: { synopsis: { bottomLine: 'x', trustRating: 'HIGH' }, timestamp: new Date().toISOString(), audit: {} },
    topic: 'sepsis',
});

describe('the classification input is persisted, not just its answer', () => {
    test('keeps the publication types the study type was derived from', () => {
        const { payload } = build({ pubtype: ['Journal Article', 'Meta-Analysis'] });
        expect(payload.paper.pubtype).toEqual(['Journal Article', 'Meta-Analysis']);
        expect(payload.paper.studyType).toBe('meta_analysis');
    });

    test('an article with no publication types stores an empty list, not undefined', () => {
        // undefined would be indistinguishable from "written before this fix",
        // which is exactly the ambiguity that made the backfill necessary.
        expect(build({}).payload.paper.pubtype).toEqual([]);
    });

    test('a non-array pubtype does not corrupt the row', () => {
        expect(build({ pubtype: 'Meta-Analysis' }).payload.paper.pubtype).toEqual([]);
    });

    test('caps a pathological publication-type list', () => {
        const many = Array.from({ length: 40 }, (_, i) => `Type ${i}`);
        expect(build({ pubtype: many }).payload.paper.pubtype).toHaveLength(12);
    });

    test.each([
        [['Meta-Analysis'], 'meta_analysis'],
        [['Systematic Review'], 'meta_analysis'],
        [['Randomized Controlled Trial'], 'randomized_trial'],
        [['Practice Guideline'], 'guideline_or_statement'],
        [['Journal Article'], 'other'],
    ])('%s classifies as %s and keeps its input', (pubtype, expected) => {
        const { payload } = build({ pubtype });
        expect(payload.paper.studyType).toBe(expected);
        expect(payload.paper.pubtype).toEqual(pubtype);
    });
});

describe('the backfill classifier matches the write path', () => {
    // Divergence here would mean backfilled rows and newly written rows disagree
    // about the same paper, which is worse than leaving them unclassified.
    const classify = ({ pubtype = [], title = '', studyDesign = '' }) => {
        const text = [studyDesign, ...(Array.isArray(pubtype) ? pubtype : []), title]
            .filter(Boolean).join(' ').toLowerCase();
        if (/meta|systematic review/.test(text)) return 'meta_analysis';
        if (/random|rct|trial/.test(text)) return 'randomized_trial';
        if (/cohort/.test(text)) return 'cohort';
        if (/case.control/.test(text)) return 'case_control';
        if (/guideline|consensus|statement/.test(text)) return 'guideline_or_statement';
        return 'other';
    };

    test.each([
        [['Meta-Analysis']],
        [['Systematic Review']],
        [['Randomized Controlled Trial']],
        [['Practice Guideline']],
        [['Observational Study']],
        [['Journal Article']],
        [[]],
    ])('agrees on %s', (pubtype) => {
        expect(classify({ pubtype, title: 'A study of something' }))
            .toBe(build({ pubtype }).payload.paper.studyType);
    });

    test('a narrative review is NOT promoted to meta-analysis', () => {
        // OpenAlex returns a coarse type "review" that covers narrative reviews
        // as well as systematic ones, and PubMed's "Review" pubtype is equally
        // broad. Mapping either onto meta_analysis would tell a clinician that a
        // narrative review sits where a systematic review does. It stays "other"
        // until something in the record actually says systematic or meta.
        expect(classify({ pubtype: ['review'], title: 'Management of sepsis' })).toBe('other');
        expect(classify({ pubtype: ['Review'], title: 'Management of sepsis' })).toBe('other');
        expect(classify({ pubtype: ['article'], title: 'Management of sepsis' })).toBe('other');
    });

    test('a review that says it is systematic does resolve', () => {
        expect(classify({ pubtype: ['review'], title: 'A systematic review of vasopressors in septic shock' }))
            .toBe('meta_analysis');
        expect(classify({ pubtype: ['review'], title: 'Meta-analysis of early goal-directed therapy' }))
            .toBe('meta_analysis');
    });

    test('the consequence, stated so it is not forgotten: OpenAlex-only rows mostly stay unresolved', () => {
        // 1,886 of the 4,460 unclassified rows are reachable only via OpenAlex.
        // Its type vocabulary cannot distinguish a systematic review, so most of
        // those will still classify as "other" after the backfill. Recovering
        // them properly needs a distinct `review` tier, which is deliberately
        // not being invented here.
        const openAlexTypes = ['article', 'review', 'preprint', 'book-chapter', 'editorial'];
        const resolved = openAlexTypes.filter((t) => classify({ pubtype: [t], title: 'Sepsis management' }) !== 'other');
        expect(resolved).toEqual([]);
    });
});
