'use strict';

const { evaluateWrite, applyWritePolicy, REASON_CODES } = require('../../server/services/policy/writePolicyEngine');

const balancedMcq = {
    correctAnswer: 'A',
    options: [
        'A: Start a beta-blocker after confirming euvolaemia on examination',
        'B: Start an ACE inhibitor after checking renal function and potassium',
        'C: Start a loop diuretic after documenting orthopnoea and oedema',
        'D: Start spironolactone after confirming potassium below 5.0 mmol/L',
    ],
};

const cuedMcq = {
    correctAnswer: 'B',
    options: [
        'A: Standard YEARS algorithm',
        'B: Pregnancy-adapted YEARS algorithm, which is validated in pregnancy and avoids unnecessary imaging while remaining safe and effective',
        'C: Immediate CT angiography',
        'D: V/Q scintigraphy first',
    ],
};

describe('write-policy engine', () => {
    test('rejects a guideline missing issuer, date, or provenance', () => {
        const verdict = evaluateWrite({
            writer: 'createGuideline',
            payload: {
                topic: 'acute kidney injury',
                recommendationText: 'Use KDIGO staging.',
            },
        });
        expect(verdict.allowed).toBe(false);
        expect(verdict.reasons.map((r) => r.code)).toEqual(expect.arrayContaining([
            REASON_CODES.SCHEMA_MISSING_ISSUER,
            REASON_CODES.SCHEMA_MISSING_EDITION,
            REASON_CODES.SCHEMA_MISSING_PROVENANCE,
        ]));
    });

    test('rejects a guideline filed under a task-word topic', () => {
        const verdict = evaluateWrite({
            writer: 'createGuideline',
            payload: {
                topic: 'management',
                sourceBody: 'KDIGO',
                sourceYear: 2012,
                sourceUrl: 'https://kdigo.org/guidelines/acute-kidney-injury/',
                recommendationText: 'Stage AKI.',
            },
        });
        expect(verdict.allowed).toBe(false);
        expect(verdict.reasons.map((r) => r.code)).toContain(REASON_CODES.CONCEPT_TASK_WORD_KEY);
    });

    test('accepts a named-body guideline on a real condition', () => {
        const verdict = evaluateWrite({
            writer: 'createGuideline',
            payload: {
                topic: 'hepatorenal syndrome',
                sourceBody: 'AGA Institute',
                sourceYear: 2024,
                sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/12345/',
                recommendationText: 'Terlipressin plus albumin is recommended for HRS-AKI.',
            },
        });
        expect(verdict.allowed).toBe(true);
        expect(verdict.action).toBe('accept');
    });

    test('a longest-answer cue is a review signal, not a rejection: a correct item is not rejected for being longest', () => {
        const cued = evaluateWrite({
            writer: 'upsertTeachingObject',
            payload: { objectType: 'guideline_mcq', payload: { mcqs: [cuedMcq] } },
        });
        expect(cued.allowed).toBe(true);
        expect(cued.reasons).toEqual([]);
        expect(cued.review.map((r) => r.code)).toEqual([REASON_CODES.ITEM_FORM_CUED]);
    });

    test('the cue blocks only when POLICY_ITEM_CUE_MODE=block is set', () => {
        process.env.POLICY_ITEM_CUE_MODE = 'block';
        try {
            const cued = evaluateWrite({
                writer: 'upsertTeachingObject',
                payload: { objectType: 'guideline_mcq', payload: { mcqs: [cuedMcq] } },
            });
            expect(cued.allowed).toBe(false);
            expect(cued.reasons.map((r) => r.code)).toContain(REASON_CODES.ITEM_FORM_CUED);
        } finally {
            delete process.env.POLICY_ITEM_CUE_MODE;
        }
    });

    test('deterministic item failures still block: no key, key not among options, duplicate options, too few options', () => {
        const blocks = (mcq) => evaluateWrite({
            writer: 'upsertTeachingObject',
            payload: { objectType: 'guideline_mcq', payload: { mcqs: [mcq] } },
        });
        expect(blocks({ options: ['A: one', 'B: two'] }).reasons.map((r) => r.code)).toContain(REASON_CODES.ITEM_FORM_NO_ANSWER);
        expect(blocks({ correctAnswer: 'E', options: ['A: one', 'B: two'] }).reasons.map((r) => r.code)).toContain(REASON_CODES.ITEM_FORM_NO_ANSWER);
        expect(blocks({ correctAnswer: 'A', options: ['A: one'] }).reasons.map((r) => r.code)).toContain(REASON_CODES.ITEM_FORM_NO_ANSWER);
        const dup = blocks({ correctAnswer: 'A', options: ['A: Same answer', 'B: Same answer', 'C: Other thing'] });
        expect(dup.allowed).toBe(false);
        expect(dup.reasons.map((r) => r.code)).toContain(REASON_CODES.ITEM_FORM_MALFORMED);
    });

    describe('verified serving needs an evidence reference on every question', () => {
        const write = (extra, mcq = balancedMcq) => evaluateWrite({
            writer: 'upsertTeachingObject',
            payload: { objectType: 'guideline_mcq', topic: 'heart failure', ...extra, payload: { mcqs: [mcq] } },
        });

        test('an object that claims to be verified while a question points at nothing is rejected', () => {
            for (const claim of [{ reviewState: 'machine_checked' }, { reviewState: 'human_reviewed' }]) {
                const verdict = write(claim);
                expect(verdict.allowed).toBe(false);
                expect(verdict.reasons.map((r) => r.code)).toContain(REASON_CODES.EVIDENCE_REFERENCE_MISSING);
                expect(verdict.verifiedEligible).toBe(false);
            }
            const labelled = write({}, { ...balancedMcq, claimVerificationStatus: 'guideline_supported' });
            expect(labelled.allowed).toBe(false);
        });

        test('an absent claims array does not make an unanchored question verifiable', () => {
            const verdict = write({ reviewState: 'machine_checked' });
            expect(verdict.verifiedEligible).toBe(false);
            expect(verdict.allowed).toBe(false);
        });

        test('an unverified object with no references is stored, and is marked not verified-eligible', () => {
            const verdict = write({});
            expect(verdict.allowed).toBe(true);
            expect(verdict.verifiedEligible).toBe(false);
        });

        test.each([
            ['a source article uid', { sourceArticleUid: 'pubmed-1' }],
            ['source indices', { sourceIndices: [1] }],
            ['a claim key', { claimKey: 'c-1' }],
            ['a source reference', { sourceReference: 'KDIGO 2012 s2.1' }],
        ])('an anchored question (%s) may be verified, and the missing claim check is recorded, not hidden', (_label, ref) => {
            const verdict = write({ reviewState: 'machine_checked' }, { ...balancedMcq, ...ref });
            expect(verdict.allowed).toBe(true);
            expect(verdict.verifiedEligible).toBe(true);
            expect(verdict.shadow.map((r) => r.detail)).toContain('not_checked:no_claims_array');
        });

        test('every question in the object must be anchored, not just one', () => {
            const verdict = evaluateWrite({
                writer: 'upsertTeachingObject',
                payload: {
                    objectType: 'guideline_mcq', topic: 'heart failure', reviewState: 'machine_checked',
                    payload: { mcqs: [{ ...balancedMcq, claimKey: 'c-1' }, balancedMcq] },
                },
            });
            expect(verdict.allowed).toBe(false);
            expect(verdict.reasons[0].detail).toMatch(/1 of 2/);
        });
    });

    test('accepts a balanced MCQ', () => {
        const verdict = evaluateWrite({
            writer: 'upsertTeachingObject',
            payload: { objectType: 'guideline_mcq', topic: 'heart failure', payload: { mcqs: [balancedMcq] } },
        });
        expect(verdict.allowed).toBe(true);
    });

    test('records entailment findings in shadow without rejecting', () => {
        const previous = process.env.POLICY_ENTAILMENT_MODE;
        delete process.env.POLICY_ENTAILMENT_MODE;
        const verdict = evaluateWrite({
            writer: 'upsertTeachingObject',
            payload: {
                objectType: 'paper',
                payload: {
                    claims: [{
                        sourcePath: 'synopsis.bottomLine',
                        claimText: 'Mortality fell by 32% with the intervention.',
                        evidenceQuote: '',
                    }],
                },
            },
        });
        expect(verdict.allowed).toBe(true);
        expect(verdict.shadow.map((r) => r.code)).toContain(REASON_CODES.ENTAILMENT_UNSUPPORTED);
        if (previous == null) delete process.env.POLICY_ENTAILMENT_MODE;
        else process.env.POLICY_ENTAILMENT_MODE = previous;
    });

    test('logs accept and reject through the decision store', async () => {
        const recorded = [];
        const db = {
            recordPolicyDecision: jest.fn(async (row) => {
                recorded.push(row);
                return row;
            }),
        };
        const rejected = await applyWritePolicy(db, {
            writer: 'createGuideline',
            payload: { topic: 'sg', recommendationText: 'Do a thing.' },
        });
        const accepted = await applyWritePolicy(db, {
            writer: 'createGuideline',
            payload: {
                topic: 'acute kidney injury',
                sourceBody: 'KDIGO',
                sourceYear: 2012,
                sourceUrl: 'https://kdigo.org/guidelines/acute-kidney-injury/',
                recommendationText: 'Stage AKI using serum creatinine.',
            },
        });
        expect(rejected.allowed).toBe(false);
        expect(accepted.allowed).toBe(true);
        expect(recorded.map((row) => row.action)).toEqual(['reject', 'accept']);
    });
});
