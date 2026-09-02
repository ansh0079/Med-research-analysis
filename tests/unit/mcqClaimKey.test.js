const { computeMcqClaimKey, hasSuspectFutureCitation, looksLikeGenerationRefusal } = require('../../server/utils/mcqClaimKey');

describe('computeMcqClaimKey', () => {
    test('returns the existing claimKey unchanged when already set', () => {
        const mcq = { claimKey: 'existing-key', question: 'anything' };
        expect(computeMcqClaimKey(mcq, 'guideline_mcq', 'topic')).toBe('existing-key');
    });

    test('never returns null or empty for any object type', () => {
        const types = ['guideline_mcq', 'paper_mcq', 'cold_start_mcq', 'live_quiz_mcq', null, undefined];
        for (const t of types) {
            const key = computeMcqClaimKey({ question: 'What is the treatment?' }, t, 'topic-a');
            expect(key).toBeTruthy();
            expect(typeof key).toBe('string');
        }
    });

    test('groups guideline_mcq by identical ref naming a real body', () => {
        const a = computeMcqClaimKey({ guidelineRef: 'NICE TA694, 2021', question: 'Question A' }, 'guideline_mcq', 'topic');
        const b = computeMcqClaimKey({ guidelineRef: 'NICE TA694, 2021', question: 'Question B' }, 'guideline_mcq', 'topic');
        expect(a).toBe(b);
    });

    test('does not group different recommendations under the same body', () => {
        const a = computeMcqClaimKey({ guidelineRef: 'ESC 2026 — Recommendation one about drug X', question: 'Q1' }, 'guideline_mcq', 'topic');
        const b = computeMcqClaimKey({ guidelineRef: 'ESC 2026 — Recommendation two about drug Y', question: 'Q2' }, 'guideline_mcq', 'topic');
        expect(a).not.toBe(b);
    });

    test('falls back to per-question when the ref only names a journal', () => {
        // "Seizure 2019" is a journal, not an issuing body -- must not be treated as shared provenance.
        const a = computeMcqClaimKey({ guidelineRef: 'Seizure 2019', question: 'Question A' }, 'guideline_mcq', 'topic');
        const b = computeMcqClaimKey({ guidelineRef: 'Seizure 2019', question: 'Question B' }, 'guideline_mcq', 'topic');
        expect(a).not.toBe(b);
    });

    test('groups paper_mcq by paperIndex', () => {
        const a = computeMcqClaimKey({ paperIndex: 2, question: 'Question A' }, 'paper_mcq', 'topic');
        const b = computeMcqClaimKey({ paperIndex: 2, question: 'Question B' }, 'paper_mcq', 'topic');
        const c = computeMcqClaimKey({ paperIndex: 3, question: 'Question C' }, 'paper_mcq', 'topic');
        expect(a).toBe(b);
        expect(a).not.toBe(c);
    });

    test('is deterministic across calls with identical input', () => {
        const mcq = { question: 'What is the target INR?' };
        expect(computeMcqClaimKey(mcq, 'cold_start_mcq', 'afib'))
            .toBe(computeMcqClaimKey(mcq, 'cold_start_mcq', 'afib'));
    });

    test('different topics never collide for the same question text', () => {
        const mcq = { question: 'What is first-line treatment?' };
        expect(computeMcqClaimKey(mcq, 'cold_start_mcq', 'topic-a'))
            .not.toBe(computeMcqClaimKey(mcq, 'cold_start_mcq', 'topic-b'));
    });
});

describe('hasSuspectFutureCitation', () => {
    test('flags a fabricated future-dated guideline citation', () => {
        expect(hasSuspectFutureCitation({ question: 'Per NICE 2026 guidance, what is first-line?' })).toBe(true);
        expect(hasSuspectFutureCitation({ explanation: 'A 2027 Dutch nationwide cohort study found...' })).toBe(true);
    });

    test('does not flag a real, already-published year', () => {
        // 2025 is deliberately below the flagged range (SUSPECT_CITATION_YEAR = 2026) --
        // conservative by design, so a genuinely early-2026-published or older guideline
        // is never wrongly rejected. It will miss some fabrications dated just before the
        // cutoff, which is the accepted tradeoff for zero false positives on real content.
        expect(hasSuspectFutureCitation({ question: 'Per NICE NG12 (2019), what is first-line?' })).toBe(false);
        expect(hasSuspectFutureCitation({ explanation: 'The 2018 Cochrane review found...' })).toBe(false);
        expect(hasSuspectFutureCitation({ explanation: 'A 2025 Dutch nationwide cohort study found...' })).toBe(false);
    });

    test('covers every year in the flagged range, not just the boundary', () => {
        for (const year of [2026, 2027, 2028, 2029, 2030, 2099]) {
            expect(hasSuspectFutureCitation({ question: `guideline ${year}` })).toBe(true);
        }
    });

    test('checks guidelineRef and sourceReference, not just question/explanation', () => {
        expect(hasSuspectFutureCitation({ guidelineRef: 'ESICM 2026' })).toBe(true);
        expect(hasSuspectFutureCitation({ sourceReference: 'ERS 2026 unified approach' })).toBe(true);
    });

    test('returns false when no fields are present', () => {
        expect(hasSuspectFutureCitation({})).toBe(false);
    });
});

describe('looksLikeGenerationRefusal', () => {
    test('flags a refusal describing missing source content', () => {
        expect(looksLikeGenerationRefusal({ question: 'This MCQ cannot be generated because the SOURCE_PAPERS lacks specific content.' })).toBe(true);
    });

    test('flags meta-commentary about the generation task itself', () => {
        expect(looksLikeGenerationRefusal({ question: "A medical education expert is tasked with creating MCQs about 'Steroids in pneumonia'..." })).toBe(true);
    });

    test('does not flag a real clinical vignette', () => {
        expect(looksLikeGenerationRefusal({ question: 'A 62-year-old male presents with dyspnea and is found to have a pleural effusion.' })).toBe(false);
    });
});
