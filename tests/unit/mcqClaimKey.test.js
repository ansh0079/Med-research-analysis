const { computeMcqClaimKey } = require('../../server/utils/mcqClaimKey');

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
